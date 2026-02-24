
import dotenv from "dotenv";
dotenv.config();

async function probeV5() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing V5 with List ID:", listId);

  // Structure based on advanced filter syntax
  const paramsStructure = {
      params: [
          { field: "list_id", operator: "=", value: listId },
          { field: "status", operator: "=", value: "active" }
      ]
  };

  console.log("\n1. getContactCount with detailed params structure...");
  try {
      const res = await unisender.request("getContactCount", paramsStructure);
      console.log("Res1:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }
}

probeV5();
