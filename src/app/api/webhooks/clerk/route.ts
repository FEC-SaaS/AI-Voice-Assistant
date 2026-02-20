import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { slugify } from "@/lib/utils";
import { isDisposableEmail } from "@/constants/plans";

// Dynamic imports to avoid build-time issues
const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

const getCreateStripeCustomer = async () => {
  const { createStripeCustomer } = await import("@/lib/stripe");
  return createStripeCustomer;
};

export async function POST(req: Request) {
  // Support both old and new env variable names for backwards compatibility
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET || process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SIGNING_SECRET to .env");
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occured -- no svix headers", { status: 400 });
  }

  // Get the body
  let body: string;
  try {
    const text = await req.text();
    if (!text) {
      return new Response("Empty body", { status: 400 });
    }
    JSON.parse(text); // Validate JSON
    body = text;
  } catch (e) {
    console.error("Failed to parse webhook body:", e);
    return new Response("Invalid JSON body", { status: 400 });
  }

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", { status: 400 });
  }

  const eventType = evt.type;
  const db = await getDb();

  // Handle organization created
  if (eventType === "organization.created") {
    const { id, name, slug, created_by } = evt.data;

    // Create Stripe customer
    let stripeCustomerId: string | undefined;
    try {
      const createStripeCustomer = await getCreateStripeCustomer();
      const stripeCustomer = await createStripeCustomer(
        `${slug}@org.calltone.ai`,
        name,
        { clerkOrgId: id }
      );
      stripeCustomerId = stripeCustomer.id;
    } catch (error) {
      console.error("Failed to create Stripe customer:", error);
    }

    // Create organization in database with clerkOrgId set
    // Set trialExpiresAt to now + 14 days for all new orgs
    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await db.organization.upsert({
      where: { clerkOrgId: id },
      create: {
        id,
        clerkOrgId: id,
        name,
        slug: slug || slugify(name),
        stripeCustomerId,
        trialExpiresAt,
      },
      update: {
        name,
        slug: slug || undefined,
        stripeCustomerId: stripeCustomerId || undefined,
      },
    });

    // If we have the creator's user ID, mark them as owner
    if (created_by) {
      console.log("📝 Organization created by user:", created_by);
    }
  }

  // Handle organization updated
  if (eventType === "organization.updated") {
    const { id, name, slug } = evt.data;

    await db.organization.update({
      where: { id },
      data: {
        name,
        slug: slug || undefined,
      },
    });
  }

  // Handle organization deleted
  if (eventType === "organization.deleted") {
    const { id } = evt.data;

    if (id) {
      // deleteMany never throws if the record doesn't exist (unlike delete)
      await db.organization.deleteMany({
        where: { id },
      });
    }
  }

  // Handle user created in organization
  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data, role } = evt.data;

    if (organization && public_user_data) {
      // ── Race-condition guard ───────────────────────────────────────────
      // organization.created and organizationMembership.created fire within
      // milliseconds of each other. If this handler runs first, the org row
      // won't exist yet and the user upsert below will fail with a FK error.
      // Upsert the org here so the row is guaranteed to exist regardless of
      // delivery order. organization.created will update it again (harmlessly)
      // and will add the Stripe customer ID when it arrives.
      await db.organization.upsert({
        where: { clerkOrgId: organization.id },
        create: {
          id: organization.id,
          clerkOrgId: organization.id,
          name: organization.name,
          slug: organization.slug || slugify(organization.name),
          trialExpiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        update: { name: organization.name },
      });

      // Map Clerk roles to our roles
      // Clerk sends: "org:admin", "org:member", or "admin", "member"
      // We support: owner, admin, manager, member, viewer
      let userRole = "member";
      const clerkRole = role?.toLowerCase() || "";

      if (clerkRole === "org:admin" || clerkRole === "admin") {
        // Check if this is the first user (org creator) - they should be owner
        const existingUsers = await db.user.count({
          where: { organizationId: organization.id },
        });
        userRole = existingUsers === 0 ? "owner" : "admin";
      }

      console.log("👤 Creating user:", {
        userId: public_user_data.user_id,
        orgId: organization.id,
        clerkRole: role,
        mappedRole: userRole,
      });

      // Use upsert to handle race conditions with auto-provisioning
      await db.user.upsert({
        where: { clerkId: public_user_data.user_id },
        create: {
          clerkId: public_user_data.user_id,
          email: public_user_data.identifier || "",
          name: `${public_user_data.first_name || ""} ${public_user_data.last_name || ""}`.trim() || null,
          imageUrl: public_user_data.image_url,
          role: userRole,
          organizationId: organization.id,
        },
        update: {
          email: public_user_data.identifier || undefined,
          name: `${public_user_data.first_name || ""} ${public_user_data.last_name || ""}`.trim() || undefined,
          imageUrl: public_user_data.image_url || undefined,
        },
      });

      // ── Trial abuse prevention (owner only) ──────────────────────────
      if (userRole === "owner" && public_user_data.identifier) {
        const ownerEmail = public_user_data.identifier;
        const emailDomain = ownerEmail.split("@")[1]?.toLowerCase();
        const flags: Record<string, unknown> = {};

        // Flag disposable email
        if (isDisposableEmail(ownerEmail)) {
          flags.trialAbuseFlag = "disposable_email";
          flags.trialAbuseFlaggedAt = new Date().toISOString();
          console.warn(`[ClerkWebhook] Disposable email on org ${organization.id}: ${ownerEmail}`);
        }

        // Flag if same email domain already has a trial org
        if (emailDomain && !isDisposableEmail(ownerEmail)) {
          const existingTrialWithDomain = await db.user.findFirst({
            where: {
              email: { endsWith: `@${emailDomain}` },
              role: "owner",
              organization: { planId: "free-trial", id: { not: organization.id } },
            },
          });
          if (existingTrialWithDomain) {
            flags.trialAbuseFlag = "duplicate_domain";
            flags.trialAbuseFlaggedAt = new Date().toISOString();
            console.warn(`[ClerkWebhook] Duplicate trial domain on org ${organization.id}: ${emailDomain}`);
          }
        }

        if (Object.keys(flags).length > 0) {
          const org = await db.organization.findUnique({
            where: { id: organization.id },
            select: { settings: true },
          });
          const settings = (org?.settings ?? {}) as Record<string, unknown>;
          await db.organization.update({
            where: { id: organization.id },
            data: { settings: JSON.parse(JSON.stringify({ ...settings, ...flags })) },
          });
        }
      }
    }
  }

  // Handle user role updated
  if (eventType === "organizationMembership.updated") {
    const { organization, public_user_data, role } = evt.data;

    if (organization && public_user_data) {
      // Map Clerk roles to our roles (preserve owner status if already owner)
      const clerkRole = role?.toLowerCase() || "";
      let userRole = "member";

      if (clerkRole === "org:admin" || clerkRole === "admin") {
        // Check if user is already owner - don't downgrade them
        const existingUser = await db.user.findFirst({
          where: {
            clerkId: public_user_data.user_id,
            organizationId: organization.id,
          },
          select: { role: true },
        });
        userRole = existingUser?.role === "owner" ? "owner" : "admin";
      }

      console.log("👤 Updating user role:", {
        userId: public_user_data.user_id,
        orgId: organization.id,
        clerkRole: role,
        mappedRole: userRole,
      });

      await db.user.updateMany({
        where: {
          clerkId: public_user_data.user_id,
          organizationId: organization.id,
        },
        data: {
          role: userRole,
        },
      });
    }
  }

  // Handle user removed from organization
  if (eventType === "organizationMembership.deleted") {
    const { organization, public_user_data } = evt.data;

    if (organization && public_user_data) {
      await db.user.deleteMany({
        where: {
          clerkId: public_user_data.user_id,
          organizationId: organization.id,
        },
      });
    }
  }

  return new Response("", { status: 200 });
}
