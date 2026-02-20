
import dotenv from "dotenv";
dotenv.config();

async function probeV4() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing V4 with List ID:", listId);

  // 1. getContactCount with params as JSON string array
  console.log("\n1. params as JSON string array...");
  try {
      // params=[{"field":"list_id", "operator":"=", "value": "3"}] ? 
      // or just params=[{"list_id": 3}] ?
      // Docs say: params is array of objects. 
      // Let's try the filter format if it exists.
      
      const paramsArray = [{ list_id: listId, status: "active" }];
      const res = await unisender.request("getContactCount", {
          "params": JSON.stringify(paramsArray)
      });
      console.log("Res1 (JSON array):", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }
}

probeV4();
