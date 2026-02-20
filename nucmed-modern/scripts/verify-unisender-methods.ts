
import dotenv from "dotenv";
dotenv.config();

async function verifyMethods() {
  const { unisender } = await import("../lib/unisender");
  
  console.log("Verifying Unisender Methods...");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Target List ID:", listId);

  // 1. Test getLists
  console.log("\n1. Testing getLists...");
  const lists = await unisender.getLists();
  console.log("getLists result:", JSON.stringify(lists, null, 2));

  // 2. Test getContactCount
  console.log("\n2. Testing getContactCount...");
  const count = await unisender.getContactCount({ list_id: listId, status: "active" });
  console.log("getContactCount result:", JSON.stringify(count, null, 2));

  // 3. Test getCampaignCommonStats (mock ID if needed, or skip if no campaign known)
  // We can try to use an invalid ID to see error format at least
  console.log("\n3. Testing getCampaignCommonStats (invalid ID)...");
  const stats = await unisender.getCampaignCommonStats("999999999");
  console.log("getCampaignCommonStats result:", JSON.stringify(stats, null, 2));
}

verifyMethods();
