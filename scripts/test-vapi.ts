/**
 * Test script to verify Vapi API connection
 * Run with: npx tsx scripts/test-vapi.ts
 */

import "dotenv/config";

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_API_URL = "https://api.vapi.ai";

async function testVapiConnection() {
  console.log("\n🔍 Testing Vapi API Connection...\n");

  // Check if API key is set
  if (!VAPI_API_KEY) {
    console.error("❌ VAPI_API_KEY is not set in your .env file");
    process.exit(1);
  }

  console.log(`✅ VAPI_API_KEY found: ${VAPI_API_KEY.slice(0, 8)}...${VAPI_API_KEY.slice(-4)}`);

  // Test 1: List assistants
  console.log("\n📋 Test 1: Listing assistants...");
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to list assistants: ${response.status} - ${error}`);
    } else {
      const assistants = await response.json();
      console.log(`✅ Successfully connected! Found ${assistants.length} assistant(s)`);
      if (assistants.length > 0) {
        console.log("   Assistants:", assistants.map((a: { name: string }) => a.name).join(", "));
      }
    }
  } catch (error) {
    console.error("❌ Network error:", error);
  }

  // Test 2: Create a test assistant
  console.log("\n🤖 Test 2: Creating test assistant...");
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "VoxForge Test Agent",
        model: {
          provider: "openai",
          model: "gpt-4-turbo",
          systemPrompt: "You are a helpful test assistant for VoxForge AI.",
        },
        voice: {
          provider: "11labs",
          voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel voice
        },
        firstMessage: "Hello! This is a test call from VoxForge AI.",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create assistant: ${response.status}`);
      console.error(`   Error: ${error}`);

      // Parse common errors
      if (response.status === 401) {
        console.log("\n💡 Your API key is invalid or expired. Get a new one from https://dashboard.vapi.ai");
      } else if (response.status === 402) {
        console.log("\n💡 Payment required - you may have run out of credits. Check https://dashboard.vapi.ai/billing");
      } else if (response.status === 400) {
        console.log("\n💡 Bad request - the API format may have changed. Check Vapi docs.");
      }
    } else {
      const assistant = await response.json();
      console.log(`✅ Successfully created assistant!`);
      console.log(`   ID: ${assistant.id}`);
      console.log(`   Name: ${assistant.name}`);

      // Clean up - delete the test assistant
      console.log("\n🧹 Cleaning up test assistant...");
      await fetch(`${VAPI_API_URL}/assistant/${assistant.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${VAPI_API_KEY}`,
        },
      });
      console.log("✅ Test assistant deleted");
    }
  } catch (error) {
    console.error("❌ Network error:", error);
  }

  // Test 3: Check phone number provisioning capability
  console.log("\n📞 Test 3: Checking phone number availability...");
  try {
    const response = await fetch(`${VAPI_API_URL}/phone-number`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to list phone numbers: ${response.status} - ${error}`);
    } else {
      const phoneNumbers = await response.json();
      console.log(`✅ Phone number API accessible! You have ${phoneNumbers.length} number(s)`);
      if (phoneNumbers.length > 0) {
        console.log("   Numbers:", phoneNumbers.map((p: { number: string }) => p.number).join(", "));
      }
    }
  } catch (error) {
    console.error("❌ Network error:", error);
  }

  console.log("\n✨ Vapi API test complete!\n");
}

testVapiConnection();
