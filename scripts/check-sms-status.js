const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

const TWILIO_API_URL = "https://api.twilio.com/2010-04-01";

async function checkSmsStatus() {
  // Get orgs with subaccounts
  const orgs = await db.organization.findMany({
    where: {
      twilioSubaccountSid: { not: null },
      twilioAuthToken: { not: null },
    },
    select: {
      id: true,
      name: true,
      twilioSubaccountSid: true,
      twilioAuthToken: true,
    },
  });

  for (const org of orgs) {
    console.log("=== Org:", org.name, "===");
    const sid = org.twilioSubaccountSid;
    const token = org.twilioAuthToken;

    // Fetch recent outbound messages from this subaccount
    const url = `${TWILIO_API_URL}/Accounts/${sid}/Messages.json?PageSize=5`;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });

      if (!resp.ok) {
        const err = await resp.text();
        console.log("  Error fetching messages:", resp.status, err);
        continue;
      }

      const data = await resp.json();
      const messages = data.messages || [];

      if (messages.length === 0) {
        console.log("  No SMS messages found in this subaccount");
        continue;
      }

      console.log("  Recent messages:");
      for (const msg of messages) {
        console.log(
          "  SID:", msg.sid,
          "| From:", msg.from,
          "| To:", msg.to,
          "| Status:", msg.status,
          "| Error:", msg.error_code || "none",
          "| ErrorMsg:", msg.error_message || "none",
          "| Date:", msg.date_sent || msg.date_created
        );
        // Truncate body for readability
        const body = msg.body.length > 60 ? msg.body.slice(0, 57) + "..." : msg.body;
        console.log("    Body:", body);
      }
    } catch (e) {
      console.log("  Fetch error:", e.message);
    }

    console.log("");
  }

  // Also check master account messages (the test that worked)
  const masterSid = process.env.TWILIO_ACCOUNT_SID;
  const masterToken = process.env.TWILIO_AUTH_TOKEN;
  if (masterSid && masterToken) {
    console.log("=== Master Account ===");
    const url = `${TWILIO_API_URL}/Accounts/${masterSid}/Messages.json?PageSize=5`;
    const auth = Buffer.from(`${masterSid}:${masterToken}`).toString("base64");
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const data = await resp.json();
      const messages = data.messages || [];
      console.log("  Recent messages:");
      for (const msg of messages) {
        console.log(
          "  SID:", msg.sid,
          "| From:", msg.from,
          "| To:", msg.to,
          "| Status:", msg.status,
          "| Error:", msg.error_code || "none",
          "| Date:", msg.date_sent || msg.date_created
        );
      }
    } catch (e) {
      console.log("  Fetch error:", e.message);
    }
  }

  await db.$disconnect();
}

checkSmsStatus().catch(function (e) {
  console.error(e);
  process.exit(1);
});
