
import dotenv from "dotenv";
dotenv.config();

async function verifyFix() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  
  console.log("Verifying fix with List ID:", listId);

  // 1. Check getContactCount
  console.log("\n1. Testing getContactCount...");
  try {
      const countRes = await unisender.getContactCount({ list_id: listId, status: "active" });
      console.log("getContactCount Result:", JSON.stringify(countRes, null, 2));
  } catch (e) {
      console.error("getContactCount Failed:", e);
  }

  // 2. Check getLists
  console.log("\n2. Testing getLists...");
  try {
      const listsRes = await unisender.getLists();
      console.log("getLists Result:", JSON.stringify(listsRes, null, 2));
  } catch (e) {
      console.error("getLists Failed:", e);
  }
}

verifyFix();
