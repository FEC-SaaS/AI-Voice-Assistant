const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function diagnose() {
  const orgs = await db.organization.findMany({
    select: {
      id: true,
      name: true,
      twilioSubaccountSid: true,
      twilioAuthToken: true,
    },
  });

  for (const org of orgs) {
    console.log("=== Org:", org.name, "===");
    console.log(
      "Subaccount SID:",
      org.twilioSubaccountSid
        ? org.twilioSubaccountSid.slice(0, 10) + "..."
        : "NOT SET"
    );
    console.log(
      "Subaccount Token:",
      org.twilioAuthToken ? "SET" : "NOT SET"
    );

    const numbers = await db.phoneNumber.findMany({
      where: { organizationId: org.id, isActive: true },
      select: { number: true, provider: true, type: true, twilioSid: true },
    });

    console.log("Phone numbers:");
    for (const n of numbers) {
      console.log(
        " ",
        n.number,
        "| provider:",
        n.provider,
        "| type:",
        n.type,
        "| twilioSid:",
        n.twilioSid || "none"
      );
    }

    const twilioNum = numbers.find(function (n) {
      return (
        n.provider === "twilio-managed" || n.provider === "twilio-imported"
      );
    });
    const fallback = numbers[0];

    if (twilioNum) {
      console.log(
        "SMS will send FROM:",
        twilioNum.number,
        "(" + twilioNum.provider + ")"
      );
      if (twilioNum.provider === "twilio-managed") {
        const hasCreds = org.twilioSubaccountSid && org.twilioAuthToken;
        console.log(
          "Using subaccount creds:",
          hasCreds
            ? "YES"
            : "MISSING - will use master account (may cause error 21660)"
        );
      }
    } else if (fallback) {
      console.log(
        "SMS will send FROM:",
        fallback.number,
        "(" + fallback.provider + ")",
        "-- WARNING: not a Twilio number, SMS will likely fail silently"
      );
    } else {
      console.log("NO phone numbers found");
    }

    console.log("");
  }

  await db.$disconnect();
}

diagnose().catch(function (e) {
  console.error(e);
  process.exit(1);
});
