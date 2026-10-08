const path = require("path");
// .env is in the project root (one level above backend/)
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const API = "https://api.liveavatar.com/v1";
const API_KEY = process.env.APP_LIVE_API_KEY;

if (!API_KEY) {
  console.error("Missing APP_LIVE_API_KEY in .env");
  process.exit(1);
}

const headers = { "X-API-KEY": API_KEY, accept: "application/json" };

async function getJson(url) {
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok) {
    console.error("Error from LiveAvatar:", json);
    process.exit(1);
  }
  return json;
}

async function main() {
  // Avatars
  const a = await getJson(`${API}/avatars/public?page_size=100`);
  console.log("\n=== AVATARS ===");
  for (const av of a.data.results) {
    const voiceName = av.default_voice ? av.default_voice.name : "-";
    const voiceId = av.default_voice ? av.default_voice.id : "-";
    console.log(`${av.name} | id: ${av.id} | default voice: ${voiceName} (${voiceId})`);
  }

  // Voices
  const v = await getJson(`${API}/voices?page_size=100`);
  console.log("\n=== VOICES ===");
  for (const vo of v.data.results) {
    console.log(`${vo.name} | ${vo.language} | ${vo.gender} | id: ${vo.id}`);
  }
}

main().catch(console.error);