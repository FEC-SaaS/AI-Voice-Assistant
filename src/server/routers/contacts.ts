import { z } from "zod";
import { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

// Phone number validation and normalization (E.164 international format)
function normalizePhoneNumber(phone: string): string {
  let phoneStr = phone.trim();

  // Handle scientific notation (e.g., 2.33558E+11 from Excel)
  if (/^[\d.]+[eE][+-]?\d+$/.test(phoneStr)) {
    try {
      const num = parseFloat(phoneStr);
      if (!isNaN(num) && isFinite(num)) {
        phoneStr = Math.round(num).toString();
      }
    } catch {
      // If parsing fails, continue with original string
    }
  }

  // Remove all non-numeric characters except leading +
  const hasPlus = phoneStr.startsWith("+");
  const digits = phoneStr.replace(/\D/g, "");

  // If already has + prefix, keep it
  if (hasPlus) {
    return `+${digits}`;
  }

  // Handle US numbers (10 digits without country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Handle US numbers with country code
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // For other international numbers, add + prefix
  // Most international numbers are 8-15 digits including country code
  return `+${digits}`;
}

// Validate phone number in E.164 format (international)
function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  // E.164 format: + followed by 7-15 digits (country code + number)
  // Minimum: +1234567 (7 digits - some small countries)
  // Maximum: +123456789012345 (15 digits - ITU-T E.164 max)
  return /^\+\d{7,15}$/.test(normalized);
}

const contactSchema = z.object({
  phoneNumber: z.string().min(7, "Phone number is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  customData: z.record(z.any()).optional(),
  notificationPreference: z.enum(["email", "sms", "both", "none"]).default("both"),
});

const bulkContactSchema = z.object({
  contacts: z.array(contactSchema),
  campaignId: z.string().optional(),
  skipDuplicates: z.boolean().default(true),
  skipDNC: z.boolean().default(true),
});

const contactFilterSchema = z.object({
  campaignId: z.string().optional(),
  status: z.enum(["pending", "called", "completed", "failed", "dnc"]).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const contactsRouter = router({
  // List contacts with filtering and pagination
  list: protectedProcedure
    .input(contactFilterSchema)
    .query(async ({ ctx, input }) => {
      const { campaignId, status, search, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.ContactWhereInput = {
        organizationId: ctx.orgId,
      };

      if (campaignId) {
        where.campaignId = campaignId;
      }

      if (status) {
        where.status = status;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { phoneNumber: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ];
      }

      const [contacts, total] = await Promise.all([
        ctx.db.contact.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            campaign: {
              select: { id: true, name: true },
            },
            _count: {
              select: { calls: true },
            },
          },
        }),
        ctx.db.contact.count({ where }),
      ]);

      return {
        contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get a single contact
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
        include: {
          campaign: true,
          calls: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      return contact;
    }),

  // Create a single contact
  create: protectedProcedure
    .input(contactSchema.extend({ campaignId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const normalizedPhone = normalizePhoneNumber(input.phoneNumber);

      if (!isValidPhoneNumber(normalizedPhone)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid phone number format. Use international format: +[country code][number]",
        });
      }

      // Check if on DNC list
      const isDNC = await ctx.db.dNCEntry.findFirst({
        where: {
          organizationId: ctx.orgId,
          phoneNumber: normalizedPhone,
        },
      });

      if (isDNC) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This phone number is on the Do Not Call list",
        });
      }

      // Check for duplicate in same campaign
      if (input.campaignId) {
        const existing = await ctx.db.contact.findFirst({
          where: {
            organizationId: ctx.orgId,
            campaignId: input.campaignId,
            phoneNumber: normalizedPhone,
          },
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Contact with this phone number already exists in this campaign",
          });
        }
      }

      const contact = await ctx.db.contact.create({
        data: {
          organizationId: ctx.orgId,
          campaignId: input.campaignId,
          phoneNumber: normalizedPhone,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          company: input.company,
          customData: input.customData || {},
          notificationPreference: input.notificationPreference,
        },
      });

      return contact;
    }),

  // Bulk import contacts (for CSV upload)
  bulkCreate: protectedProcedure
    .input(bulkContactSchema)
    .mutation(async ({ ctx, input }) => {
      const { contacts, campaignId, skipDuplicates, skipDNC } = input;

      // Get DNC list for this org
      const dncList = await ctx.db.dNCEntry.findMany({
        where: { organizationId: ctx.orgId },
        select: { phoneNumber: true },
      });
      const dncSet = new Set(dncList.map((d) => d.phoneNumber));

      // Get existing contacts in the campaign to check duplicates
      let existingPhones = new Set<string>();
      if (campaignId && skipDuplicates) {
        const existing = await ctx.db.contact.findMany({
          where: {
            organizationId: ctx.orgId,
            campaignId,
          },
          select: { phoneNumber: true },
        });
        existingPhones = new Set(existing.map((c) => c.phoneNumber));
      }

      const results = {
        created: 0,
        skippedDuplicate: 0,
        skippedDNC: 0,
        skippedInvalid: 0,
        errors: [] as string[],
      };

      const validContacts: Prisma.ContactCreateManyInput[] = [];

      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        if (!contact) continue;
        const normalizedPhone = normalizePhoneNumber(contact.phoneNumber);

        // Validate phone number
        if (!isValidPhoneNumber(normalizedPhone)) {
          results.skippedInvalid++;
          results.errors.push(`Row ${i + 1}: Invalid phone number ${contact.phoneNumber}`);
          continue;
        }

        // Check DNC
        if (skipDNC && dncSet.has(normalizedPhone)) {
          results.skippedDNC++;
          continue;
        }

        // Check duplicates
        if (skipDuplicates && existingPhones.has(normalizedPhone)) {
          results.skippedDuplicate++;
          continue;
        }

        // Add to valid contacts
        validContacts.push({
          organizationId: ctx.orgId,
          campaignId,
          phoneNumber: normalizedPhone,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email || null,
          company: contact.company,
          customData: contact.customData || {},
          notificationPreference: contact.notificationPreference || "both",
        });

        existingPhones.add(normalizedPhone);
      }

      // Bulk create valid contacts
      if (validContacts.length > 0) {
        await ctx.db.contact.createMany({
          data: validContacts,
          skipDuplicates: true,
        });
        results.created = validContacts.length;
      }

      return results;
    }),

  // Update a contact
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: contactSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // If updating phone number, normalize and validate
      const updateData = { ...input.data };
      if (input.data.phoneNumber) {
        const normalizedPhone = normalizePhoneNumber(input.data.phoneNumber);
        if (!isValidPhoneNumber(normalizedPhone)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid phone number format. Use international format: +[country code][number]",
          });
        }
        updateData.phoneNumber = normalizedPhone;
      }

      const contact = await ctx.db.contact.update({
        where: { id: input.id },
        data: updateData,
      });

      return contact;
    }),

  // Delete a contact
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      await ctx.db.contact.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Bulk delete contacts
  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.contact.deleteMany({
        where: {
          id: { in: input.ids },
          organizationId: ctx.orgId,
        },
      });

      return { deleted: result.count };
    }),

  // Update contact status
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "called", "completed", "failed", "dnc"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contact = await ctx.db.contact.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.orgId,
        },
      });

      if (!contact) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contact not found",
        });
      }

      // If marking as DNC, also add to DNC list
      if (input.status === "dnc") {
        await ctx.db.dNCEntry.upsert({
          where: {
            organizationId_phoneNumber: {
              organizationId: ctx.orgId,
              phoneNumber: contact.phoneNumber,
            },
          },
          create: {
            organizationId: ctx.orgId,
            phoneNumber: contact.phoneNumber,
            source: "internal",
            reason: "Marked as DNC from contacts",
          },
          update: {
            addedAt: new Date(),
            reason: "Marked as DNC from contacts",
          },
        });
      }

      const updated = await ctx.db.contact.update({
        where: { id: input.id },
        data: { status: input.status },
      });

      return updated;
    }),

  // Assign contacts to a campaign
  assignToCampaign: protectedProcedure
    .input(
      z.object({
        contactIds: z.array(z.string()),
        campaignId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify campaign exists and belongs to org
      const campaign = await ctx.db.campaign.findFirst({
        where: {
          id: input.campaignId,
          organizationId: ctx.orgId,
        },
      });

      if (!campaign) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Campaign not found",
        });
      }

      const result = await ctx.db.contact.updateMany({
        where: {
          id: { in: input.contactIds },
          organizationId: ctx.orgId,
        },
        data: {
          campaignId: input.campaignId,
          status: "pending", // Reset status when assigning to new campaign
        },
      });

      return { updated: result.count };
    }),

  // Remove contacts from campaign
  removeFromCampaign: protectedProcedure
    .input(z.object({ contactIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.contact.updateMany({
        where: {
          id: { in: input.contactIds },
          organizationId: ctx.orgId,
        },
        data: {
          campaignId: null,
        },
      });

      return { updated: result.count };
    }),

  // Get contact stats for a campaign
  getCampaignStats: protectedProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(async ({ ctx, input }) => {
      const stats = await ctx.db.contact.groupBy({
        by: ["status"],
        where: {
          organizationId: ctx.orgId,
          campaignId: input.campaignId,
        },
        _count: {
          status: true,
        },
      });

      const total = await ctx.db.contact.count({
        where: {
          organizationId: ctx.orgId,
          campaignId: input.campaignId,
        },
      });

      const statusCounts: Record<string, number> = {
        pending: 0,
        called: 0,
        completed: 0,
        failed: 0,
        dnc: 0,
      };

      for (const stat of stats) {
        statusCounts[stat.status] = stat._count.status;
      }

      return {
        total,
        ...statusCounts,
      };
    }),
});
