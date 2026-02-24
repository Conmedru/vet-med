
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const apiKey = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
  const login = process.env.UNISENDER_LOGIN;

  if (!apiKey) {
    console.error("UNISENDER API key missing");
    return;
  }

  const params = new URLSearchParams();
  params.append("format", "json");
  params.append("api_key", apiKey);
  if (login) {
    params.append("login", login);
  }

  console.log("Probing getUserInfo with login:", login || "<missing>");

  try {
    const res = await fetch("https://api.unisender.com/ru/api/getUserInfo", {
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
