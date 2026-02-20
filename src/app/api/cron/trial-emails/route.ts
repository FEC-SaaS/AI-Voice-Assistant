/**
 * Trial Email Sequence Cron Job
 * Runs daily at 9am UTC. Sends the 5-email conversion sequence
 * to all active free-trial organizations based on days elapsed since trial start.
 *
 * vercel.json: { "path": "/api/cron/trial-emails", "schedule": "0 9 * * *" }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  sendTrialDay1Email,
  sendTrialDay7Email,
  sendTrialDay11Email,
  sendTrialDay13Email,
  sendTrialDay14Email,
} from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("TrialEmailsCron");

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    log.error("CRON_SECRET not configured");
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  return authHeader.replace("Bearer ", "") === cronSecret;
}

/** Generate a simple coupon code for Day 13 offer */
function generateCouponCode(orgId: string): string {
  const suffix = orgId.slice(-6).toUpperCase();
  return `WELCOME20-${suffix}`;
}

export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { processed: 0, emailsSent: 0, errors: [] as string[] };

  try {
    // Find all active free-trial orgs with trialExpiresAt set
    const trialOrgs = await db.organization.findMany({
      where: {
        planId: "free-trial",
        trialExpiresAt: { not: null, gte: now }, // not yet expired
      },
      select: {
        id: true,
        trialExpiresAt: true,
        settings: true,
        users: {
          where: { role: "owner" },
          take: 1,
          select: { email: true, name: true },
        },
        calls: {
          select: { durationSeconds: true },
          where: { createdAt: { gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } },
        },
      },
    });

    for (const org of trialOrgs) {
      try {
        if (!org.trialExpiresAt || !org.users[0]) continue;

        const ownerEmail = org.users[0].email;
        const ownerName = org.users[0].name || "there";
        const settings = (org.settings ?? {}) as Record<string, unknown>;

        // Calculate days elapsed since trial started
        const trialStartMs = org.trialExpiresAt.getTime() - 14 * 24 * 60 * 60 * 1000;
        const daysElapsed = Math.floor((now.getTime() - trialStartMs) / (24 * 60 * 60 * 1000));

        results.processed++;

        // Day 1 email
        if (daysElapsed >= 1 && !settings.trialEmail_day1) {
          await sendTrialDay1Email(ownerEmail, ownerName);
          await db.organization.update({
            where: { id: org.id },
            data: { settings: { ...settings, trialEmail_day1: true } as object },
          });
          results.emailsSent++;
          log.info(`Day 1 email sent to org ${org.id}`);
        }

        // Day 7 email
        else if (daysElapsed >= 7 && !settings.trialEmail_day7) {
          const totalSeconds = org.calls.reduce((s, c) => s + (c.durationSeconds ?? 0), 0);
          const minutesUsed = Math.ceil(totalSeconds / 60);
          await sendTrialDay7Email(ownerEmail, ownerName, {
            minutesUsed,
            callsHandled: org.calls.length,
            minutesLimit: 100,
          });
          await db.organization.update({
            where: { id: org.id },
            data: { settings: { ...settings, trialEmail_day7: true } as object },
          });
          results.emailsSent++;
          log.info(`Day 7 email sent to org ${org.id}`);
        }

        // Day 11 email
        else if (daysElapsed >= 11 && !settings.trialEmail_day11) {
          await sendTrialDay11Email(ownerEmail, ownerName);
          await db.organization.update({
            where: { id: org.id },
            data: { settings: { ...settings, trialEmail_day11: true } as object },
          });
          results.emailsSent++;
          log.info(`Day 11 email sent to org ${org.id}`);
        }

        // Day 13 email — 20% off offer
        else if (daysElapsed >= 13 && !settings.trialEmail_day13) {
          const coupon = generateCouponCode(org.id);
          await sendTrialDay13Email(ownerEmail, ownerName, coupon);
          await db.organization.update({
            where: { id: org.id },
            data: { settings: { ...settings, trialEmail_day13: true, trialCouponCode: coupon } as object },
          });
          results.emailsSent++;
          log.info(`Day 13 offer email sent to org ${org.id}, coupon: ${coupon}`);
        }

        // Day 14 email — final reminder
        else if (daysElapsed >= 14 && !settings.trialEmail_day14) {
          await sendTrialDay14Email(ownerEmail, ownerName);
          await db.organization.update({
            where: { id: org.id },
            data: { settings: { ...settings, trialEmail_day14: true } as object },
          });
          results.emailsSent++;
          log.info(`Day 14 final email sent to org ${org.id}`);
        }
      } catch (err) {
        const msg = `Failed for org ${org.id}: ${err instanceof Error ? err.message : "Unknown"}`;
        results.errors.push(msg);
        log.error(msg);
      }
    }

    log.info("Trial email cron complete:", results);
    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    log.error("Trial email cron failed:", err);
    return NextResponse.json({ success: false, error: "Cron failed", ...results }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ status: "Trial email cron — use POST with auth" });
  }
  return POST(request);
}
