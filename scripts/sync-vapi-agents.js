// Script to sync Vapi assistants back into the database after a DB wipe
// Usage: node scripts/sync-vapi-agents.js

const { PrismaClient } = require("@prisma/client");

const VAPI_API_URL = "https://api.vapi.ai";
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const ORG_ID = "org_398cFCm2RqbvCpl4he75zyCLYCd";

async function main() {
  if (!VAPI_API_KEY) {
    console.error("ERROR: VAPI_API_KEY env variable is not set");
    process.exit(1);
  }

  const db = new PrismaClient();

  try {
    // Verify org exists
    const org = await db.organization.findUnique({ where: { id: ORG_ID } });
    if (!org) {
      console.error(`ERROR: Organization ${ORG_ID} not found in database`);
      process.exit(1);
    }
    console.log(`Found org: ${org.name} (${org.id})`);

    // Fetch all assistants from Vapi
    console.log("\nFetching assistants from Vapi...");
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Vapi API error: ${response.status} - ${error}`);
      process.exit(1);
    }

    const assistants = await response.json();
    console.log(`Found ${assistants.length} assistants in Vapi\n`);

    let created = 0;
    let skipped = 0;

    for (const assistant of assistants) {
      // Check if this assistant is already in the DB
      const existing = await db.agent.findFirst({
        where: { vapiAssistantId: assistant.id },
      });

      if (existing) {
        console.log(`SKIP: "${assistant.name}" (${assistant.id}) — already exists in DB as ${existing.id}`);
        skipped++;
        continue;
      }

      // Extract data from Vapi assistant
      const voiceProvider = assistant.voice?.provider || "vapi";
      const voiceId = assistant.voice?.voiceId || "Elliot";
      const modelProvider = assistant.model?.provider || "openai";
      const model = assistant.model?.model || "gpt-4o";
      const systemPrompt =
        assistant.model?.messages?.find((m) => m.role === "system")?.content ||
        "You are a helpful assistant.";
      const firstMessage = assistant.firstMessage || null;

      // Map Vapi provider names back to our format
      let mappedVoiceProvider = voiceProvider;
      if (voiceProvider === "11labs") mappedVoiceProvider = "elevenlabs";

      const agent = await db.agent.create({
        data: {
          organizationId: ORG_ID,
          vapiAssistantId: assistant.id,
          name: assistant.name || "Unnamed Agent",
          description: null,
          systemPrompt,
          firstMessage,
          voiceProvider: mappedVoiceProvider,
          voiceId,
          language: "en-US",
          modelProvider,
          model,
          isActive: true,
          settings: {},
        },
      });

      console.log(`CREATED: "${agent.name}" (DB: ${agent.id}, Vapi: ${assistant.id})`);
      created++;
    }

    console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Total in Vapi: ${assistants.length}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
