
import dotenv from "dotenv";
dotenv.config();

async function probeGetContactCount() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing getContactCount with listId:", listId);

  // Attempt 1: Standard flat params
  console.log("\n1. Standard flat params:");
  const res1 = await unisender.request("getContactCount", { list_id: listId });
  console.log("Res1:", JSON.stringify(res1, null, 2));

  // Attempt 2: With status
  console.log("\n2. With status 'active':");
  const res2 = await unisender.request("getContactCount", { list_id: listId, status: "active" });
  console.log("Res2:", JSON.stringify(res2, null, 2));

  // Attempt 3: Params as JSON in 'params' field (unlikely but error suggested it)
  console.log("\n3. Nested in 'params':");
  const res3 = await unisender.request("getContactCount", { params: JSON.stringify({ list_id: listId }) });
  console.log("Res3:", JSON.stringify(res3, null, 2));
}

probeGetContactCount();
