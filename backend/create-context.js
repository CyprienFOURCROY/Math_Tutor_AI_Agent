// Creates (or re-creates) the tutor's "context" (its role/prompt) and saves
// the returned id as CONTEXT_ID in ../.env.
// Edit PROMPT / OPENING_TEXT below, then run:  node create-context.js
const fs = require("fs");
const path = require("path");
const ENV_PATH = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const API = "https://api.liveavatar.com/v1";
const API_KEY = process.env.APP_LIVE_API_KEY;
if (!API_KEY) {
  console.error("Missing APP_LIVE_API_KEY in .env");
  process.exit(1);
}

const NAME = "Thomas - Math Tutor"; // max 64 chars
const OPENING_TEXT = "Hi, I'm Thomas! What math problem are we working on today?";
const PROMPT = `You are Thomas, a patient and friendly math tutor talking live with a student.
- Your answers are spoken aloud: keep them short (1-3 sentences) and never use lists, symbols or markdown.
- Before explaining, ask the student what they have already tried or where they got stuck.
- Explain step by step, one step at a time, then check that the student understood before moving on.
- Use simple everyday examples (pizza slices, money, sports scores).
- Guide the student to find the answer; do not just give the final result right away.
- Encourage effort, and stay calm and kind when the student makes mistakes.
- If the question is not about math, gently bring the conversation back to math.`;

// Replace KEY=value in .env if it exists, otherwise append it. Never prints the key.
function saveEnv(key, value) {
  let text = fs.readFileSync(ENV_PATH, "utf8");
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  text = re.test(text) ? text.replace(re, `${key}=${value}`) : text.replace(/\n*$/, "\n") + `${key}=${value}\n`;
  fs.writeFileSync(ENV_PATH, text);
}

async function main() {
  const res = await fetch(`${API}/contexts`, {
    method: "POST",
    headers: { "X-API-KEY": API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ name: NAME, prompt: PROMPT, opening_text: OPENING_TEXT }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Error creating context:", json);
    process.exit(1);
  }
  const id = (json.data || json).id;
  saveEnv("CONTEXT_ID", id);
  console.log("Context created. CONTEXT_ID saved to .env:", id);
}

main().catch(console.error);
