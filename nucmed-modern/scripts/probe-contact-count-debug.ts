
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
    
    // 1. Standard Nested
    await testFormat("Standard Nested (params[list_id])", {
        "params[list_id]": LIST_ID,
        "params[status]": "active"
    });

    // 2. Direct keys (unlikely but possible)
    await testFormat("Direct Keys (list_id)", {
        "list_id": LIST_ID,
        "status": "active"
    });

    // 3. JSON encoded params (some APIs allow this)
    await testFormat("JSON Encoded params", {
        "params": JSON.stringify({ list_id: LIST_ID, status: "active" })
    });
    
    // 5. JSON Encoded params as ARRAY
    await testFormat("JSON Encoded params (Array)", {
        "params": JSON.stringify([{ list_id: LIST_ID, status: "active" }])
    });

    // 6. JSON Encoded params (Array of filters style?)
    // Sometimes it is [[field, operator, value]] ? No, that is getContacts.
    
    // 7. Check getLists with extra params
    console.log("\n--- Checking getLists (with details) ---");
    try {
        // Try to ask for counts if possible (some apis have include_counts)
        const params = new URLSearchParams();
        params.append("format", "json");
        params.append("api_key", API_KEY!);
        params.append("include_details", "1"); // Try this
        
        const res = await fetch("https://api.unisender.com/ru/api/getLists", {
            method: "POST",
            body: params
        });
        const data = await res.json();
        console.log("getLists (detailed) result:", JSON.stringify(data, null, 2));
    } catch(e) { console.error(e); }

    // 8. Filter Array Style
    // params[0][field]=list_id&params[0][operator]=equal&params[0][value]=3
    await testFormat("Filter Array Style", {
        "params[0][field]": "list_id",
        "params[0][operator]": "=",
        "params[0][value]": LIST_ID
    });

    // 9. Bracket array without index
    await testFormat("Bracket Array (params[][list_id])", {
        "params[][list_id]": LIST_ID,
        "params[][status]": "active"
    });
}

run();
