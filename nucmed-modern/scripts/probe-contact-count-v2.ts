
import dotenv from "dotenv";
dotenv.config();

async function probeGetContactCountV2() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing getContactCount V2 with listId:", listId);

  // Attempt 1: params[list_id]
  console.log("\n1. params[list_id]:");
  const res1 = await unisender.request("getContactCount", { 
    "params[list_id]": listId,
    "params[status]": "active"
  });
  console.log("Res1:", JSON.stringify(res1, null, 2));

  // Attempt 2: request param with list_id (some APIs do this)
  console.log("\n2. request[list_id]:");
  const res2 = await unisender.request("getContactCount", { 
    "request[list_id]": listId 
  });
  console.log("Res2:", JSON.stringify(res2, null, 2));

  // Attempt 3: Try getTotalContactsCount
  console.log("\n3. getTotalContactsCount:");
  const res3 = await unisender.request("getTotalContactsCount", { 
    list_id: listId 
  });
  console.log("Res3:", JSON.stringify(res3, null, 2));
}

probeGetContactCountV2();
