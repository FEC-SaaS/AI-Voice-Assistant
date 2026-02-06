import { db } from "@/lib/db";

const DEFAULT_TIMEZONE = "America/New_York";

/**
 * Get the timezone for an organization from its calendar settings.
 * Falls back to organization settings, then to default.
 */
export async function getOrgTimezone(organizationId: string): Promise<string> {
  const calSettings = await db.calendarSettings.findUnique({
    where: { organizationId },
    select: { timeZone: true },
  });

  if (calSettings?.timeZone) {
    return calSettings.timeZone;
  }

  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });

  const settings = org?.settings as Record<string, unknown> | null;
  if (settings?.timezone && typeof settings.timezone === "string") {
    return settings.timezone;
  }

  return DEFAULT_TIMEZONE;
}

export { DEFAULT_TIMEZONE };
