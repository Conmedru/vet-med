
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
const LIST_ID = process.env.UNISENDER_LIST_ID || "3";

async function testFormat(name: string, bodyObj: Record<string, string>) {
  console.log(`\n--- ${name} ---`);
  const params = new URLSearchParams();
  params.append("format", "json");
  params.append("api_key", API_KEY!);
  for (const [k, v] of Object.entries(bodyObj)) {
    params.append(k, v);
  }
  console.log("Body:", params.toString());

  const res = await fetch("https://api.unisender.com/ru/api/getContactCount", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const text = await res.text();
  console.log("Response:", text);
}

async function run() {
  if (!API_KEY) {
    console.error("UNISENDER API key missing");
    return;
  }

  await testFormat("params[listId]", {
    "params[listId]": LIST_ID,
  });

  await testFormat("params[listId] + searchParams[type]", {
    "params[listId]": LIST_ID,
    "params[searchParams][type]": "address",
  });

  await testFormat("listId + searchParams[type]", {
    "listId": LIST_ID,
    "searchParams[type]": "address",
  });

  await testFormat("list_id + search_params[type]", {
    "list_id": LIST_ID,
    "search_params[type]": "address",
  });

  await testFormat("params[0][listId]", {
    "params[0][listId]": LIST_ID,
  });

  await testFormat("params[0][listId] + params[0][searchParams][type]", {
    "params[0][listId]": LIST_ID,
    "params[0][searchParams][type]": "address",
  });
}

run();
