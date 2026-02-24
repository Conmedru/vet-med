
import dotenv from "dotenv";
dotenv.config(); // Load env vars first

async function testGetContactCount() {
  const { unisender } = await import("../lib/unisender");
  console.log("Testing getContactCount...");
  const listId = process.env.UNISENDER_LIST_ID;
  if (!listId) {
    console.error("UNISENDER_LIST_ID not set in env");
    return;
  }

  console.log(`Using List ID: ${listId}`);

  try {
    // Test 1: Active contacts
    console.log("\nFetching active contacts...");
    const resActive = await unisender.getContactCount({ list_id: listId, status: "active" });
    console.log("Active Result:", JSON.stringify(resActive, null, 2));

    // Test 2: All contacts (if possible) or just verify structure
    // Unisender getContactCount usually takes params[list_id]
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

async function testSenderConfig() {
    console.log("\nTesting Sender Config...");
    const fromEmail = process.env.UNISENDER_FROM_EMAIL;
    const fromName = process.env.UNISENDER_FROM_NAME;
    console.log(`From Email: ${fromEmail}`);
    console.log(`From Name: ${fromName}`);
    
    // We won't actually send an email here to avoid spam, but we can check if the variables are loaded
    if (!fromEmail || !fromName) {
        console.error("WARNING: Sender email or name not set!");
    } else {
        console.log("Sender config present.");
    }
}

async function run() {
    await testSenderConfig();
    await testGetContactCount();
}

run();
