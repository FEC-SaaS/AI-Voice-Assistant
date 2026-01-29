import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { createStripeCustomer } from "@/lib/stripe";
import { slugify } from "@/lib/utils";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to .env");
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
  let payload;
  let body: string;
  try {
    const text = await req.text();
    if (!text) {
      return new Response("Empty body", { status: 400 });
    }
    payload = JSON.parse(text);
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

  // Handle organization created
  if (eventType === "organization.created") {
    const { id, name, slug } = evt.data;

    // Create Stripe customer
    let stripeCustomerId: string | undefined;
    try {
      const stripeCustomer = await createStripeCustomer(
        `${slug}@org.voxforge.ai`,
        name,
        { clerkOrgId: id }
      );
      stripeCustomerId = stripeCustomer.id;
    } catch (error) {
      console.error("Failed to create Stripe customer:", error);
    }

    // Create organization in database
    await db.organization.create({
      data: {
        id,
        name,
        slug: slug || slugify(name),
        stripeCustomerId,
      },
    });
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
      await db.organization.delete({
        where: { id },
      });
    }
  }

  // Handle user created in organization
  if (eventType === "organizationMembership.created") {
    const { organization, public_user_data, role } = evt.data;

    if (organization && public_user_data) {
      await db.user.create({
        data: {
          clerkId: public_user_data.user_id,
          email: public_user_data.identifier || "",
          name: `${public_user_data.first_name || ""} ${public_user_data.last_name || ""}`.trim() || null,
          imageUrl: public_user_data.image_url,
          role: role === "admin" ? "admin" : "member",
          organizationId: organization.id,
        },
      });
    }
  }

  // Handle user role updated
  if (eventType === "organizationMembership.updated") {
    const { organization, public_user_data, role } = evt.data;

    if (organization && public_user_data) {
      await db.user.updateMany({
        where: {
          clerkId: public_user_data.user_id,
          organizationId: organization.id,
        },
        data: {
          role: role === "admin" ? "admin" : "member",
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
