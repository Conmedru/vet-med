
import dotenv from "dotenv";
dotenv.config();

async function probeJsonRequest() {
  const { unisender } = await import("../lib/unisender");
  const listId = process.env.UNISENDER_LIST_ID || "3";
  const apiKey = process.env.UNISENDER_API_KEY;
  
  console.log("Probing JSON Body Request with List ID:", listId);
  const url = "https://api.unisender.com/ru/api/getContactCount?format=json";

  const payload = {
      api_key: apiKey,
      params: [
          { field: "list_id", operator: "=", value: listId },
          { field: "status", operator: "=", value: "active" }
      ]
  };

  try {
      const response = await fetch(url, {
          method: "POST",
          headers: {
              "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
      });
      
      const text = await response.text();
      console.log("Response:", text);
  } catch (e) {
      console.error("Error:", e);
  }
}

probeJsonRequest();
