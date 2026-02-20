
import dotenv from "dotenv";
dotenv.config();

async function probeV3() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing V3 with List ID:", listId);

  // 1. getContactCount with params[0]
  console.log("\n1. getContactCount params[0][list_id]...");
  try {
      // Manual request to control keys exactly
      const res = await unisender.request("getContactCount", {
          "params[0][list_id]": listId,
          "params[0][status]": "active"
      });
      console.log("Res1:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }

  // 2. getLists with extras
  console.log("\n2. getLists with include_details...");
  try {
      const res = await unisender.request("getLists", { "include_details": 1 });
      console.log("Res2:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }

    // 3. getLists with extra=1
  console.log("\n3. getLists with extra=1...");
  try {
      const res = await unisender.request("getLists", { "extra": 1 });
      console.log("Res3:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }
}

probeV3();
