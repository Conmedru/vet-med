
import dotenv from "dotenv";
dotenv.config();

async function probeV6() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  console.log("Probing V6 with List ID:", listId);

  // Attempt verbose filter syntax
  // params[0][field]=list_id
  // params[0][operator]==
  // params[0][value]=3
  console.log("\n1. getContactCount with verbose filter params...");
  try {
      const res = await unisender.request("getContactCount", {
          "params[0][field]": "list_id",
          "params[0][operator]": "=",
          "params[0][value]": listId
      });
      console.log("Res1:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }

  // Attempt without any params just to see if it defaults to all
  console.log("\n2. getContactCount empty...");
  try {
      const res = await unisender.request("getContactCount", {});
      console.log("Res2:", JSON.stringify(res, null, 2));
  } catch(e) { console.error(e); }
}

probeV6();
