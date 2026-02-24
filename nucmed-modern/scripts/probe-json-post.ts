
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
const LIST_ID = process.env.UNISENDER_LIST_ID || "3";

async function testJsonPost() {
    console.log("Testing application/json POST...");
    
    // Payload for getContactCount
    // According to docs, params is a list of params? Or maybe just keyed args?
    // Let's try matching the structure implied by "params[list_id]"
    
    const payloads = [
        {
            name: "Direct Object",
            body: {
                format: "json",
                api_key: API_KEY,
                params: {
                    list_id: LIST_ID,
                    status: "active"
                }
            }
        },
        {
            name: "Params as Array",
            body: {
                format: "json",
                api_key: API_KEY,
                params: [
                    {
                        type: "list_id", // guess
                        value: LIST_ID
                    }
                ]
            }
        },
         {
            name: "Params as Array (KV)",
            body: {
                format: "json",
                api_key: API_KEY,
                params: [
                    {
                        list_id: LIST_ID,
                        status: "active"
                    }
                ]
            }
        },
        {
            name: "No Params wrapper (Direct args)",
            body: {
                format: "json",
                api_key: API_KEY,
                list_id: LIST_ID,
                status: "active"
            }
        }
    ];

    for (const p of payloads) {
        console.log(`\n--- ${p.name} ---`);
        try {
            const res = await fetch("https://api.unisender.com/ru/api/getContactCount", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(p.body)
            });
            const text = await res.text();
            console.log("Response:", text);
        } catch (e) {
            console.error(e);
        }
    }
}

async function run() {
    await testJsonPost();
}

run();
