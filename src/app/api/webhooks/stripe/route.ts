import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

// Dynamic imports to avoid build-time issues
const getStripe = async () => {
  const { stripe } = await import("@/lib/stripe");
  return stripe;
};

const getDb = async () => {
  const { db } = await import("@/lib/db");
  return db;
};

function resolvePlanId(subscription: Stripe.Subscription): string {
  // Find the non-metered (licensed) price item to determine the plan
  const licensedItem = subscription.items.data.find(
    (item) => item.price.recurring?.usage_type !== "metered"
  );
  const priceId = licensedItem?.price.id;

  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) return "starter";
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) return "professional";
  if (priceId === process.env.STRIPE_BUSINESS_PRICE_ID) return "business";
  return "free-trial";
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("Stripe-Signature") as string;

  const stripe = await getStripe();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  try {
    const db = await getDb();

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const org = await db.organization.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (org) {
          const planId = resolvePlanId(subscription);

          await db.organization.update({
            where: { id: org.id },
            data: {
              stripeSubscriptionId: subscription.id,
              planId,
            },
          });

          console.log(`[Stripe Webhook] Org ${org.id} plan set to ${planId}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await db.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: null,
            planId: "free-trial",
          },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Payment succeeded for invoice: ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Payment failed for invoice: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing event:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
