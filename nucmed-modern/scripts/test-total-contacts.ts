
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const apiKey = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
  const listId = process.env.UNISENDER_LIST_ID || "3";
  const login = process.env.UNISENDER_LOGIN;

  if (!apiKey) {
    console.error("UNISENDER API key missing");
    return;
  }

  console.log("Testing getTotalContactsCount with login:", login || "<missing>");

  const params = new URLSearchParams();
  params.append("format", "json");
  params.append("api_key", apiKey);
  if (login) {
    params.append("login", login);
  }

  try {
    const res = await fetch("https://api.unisender.com/ru/api/getTotalContactsCount", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const text = await res.text();
    console.log("Response:", text);
  } catch (error) {
    console.error("Request failed:", error);
  }
}

run();
