
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
const LIST_ID = process.env.UNISENDER_LIST_ID || "3";

async function testFormat(name: string, bodyObj: Record<string, string>) {
  console.log(`\n--- Testing ${name} ---`);
  const params = new URLSearchParams();
  params.append("format", "json");
  params.append("api_key", API_KEY!);
  
  for (const [k, v] of Object.entries(bodyObj)) {
    params.append(k, v);
  }
  
  console.log("Body:", params.toString());

  try {
    const res = await fetch("https://api.unisender.com/ru/api/getContactCount", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
    });
    
    const text = await res.text();
    console.log("Response:", text);
  } catch (e) {
    console.error("Error:", e);
  }
}

async function run() {
    if (!API_KEY) {
        console.error("No API KEY");
        return;
    }

    // Hypothesis 1: params should be a JSON string
    await testFormat("params as JSON string", {
        "params": JSON.stringify({ list_id: LIST_ID, status: "active" })
    });

    // Hypothesis 2: request wrapper
    await testFormat("request[params][list_id]", {
        "request[params][list_id]": LIST_ID,
        "request[params][status]": "active"
    });
    
    // Hypothesis 3: request as JSON string (some methods use 'request' param)
    await testFormat("request as JSON string", {
        "request": JSON.stringify({ params: { list_id: LIST_ID } })
    });
}

run();
