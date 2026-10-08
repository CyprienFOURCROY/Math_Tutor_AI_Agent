const path = require("path");
// The .env lives in the project root, so load it from there regardless of cwd.
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const express = require("express");

const API = "https://api.liveavatar.com/v1";
const API_KEY = process.env.APP_LIVE_API_KEY;

// Sandbox = free testing (no credits). Sessions stop after ~1 minute and
// only the "Wayne" avatar works. Set SANDBOX=false in .env to go live.
const SANDBOX = process.env.SANDBOX !== "false";
const SANDBOX_AVATAR_ID = "dd73ea75-1218-4ef3-92ce-606d5f7fbc0a";

const AVATAR_ID = SANDBOX ? SANDBOX_AVATAR_ID : process.env.AVATAR_ID;
const VOICE_ID = process.env.VOICE_ID;     // Thomas voice
const CONTEXT_ID = process.env.CONTEXT_ID; // tutor prompt, created by create-context.js
const LANGUAGE = process.env.LANGUAGE || "en";
// Free plan: 2 min real sessions, sandbox allows at most 60 s. Sent to the frontend for its countdown.
const MAX_SESSION_SECONDS = SANDBOX ? 60 : 120;

if (!SANDBOX && !AVATAR_ID) {
  console.error("SANDBOX=false but AVATAR_ID is missing in .env");
  process.exit(1);
}

if (!API_KEY) {
  console.error("Missing APP_LIVE_API_KEY in .env");
  process.exit(1);
}

const app = express();
app.use(express.json());

// Serve the frontend folder so everything runs on http://localhost:3000
app.use(express.static(path.join(__dirname, "..", "frontend")));

// LiveAvatar wraps answers as { code, data, message }. Handle both shapes.
const unwrap = (json) => (json && json.data ? json.data : json);

app.post("/api/session", async (req, res) => {
  try {
    // Step 1: create a session token
    // In sandbox only Wayne works, so don't send Thomas's voice/context there.
    const persona = { language: LANGUAGE };
    if (!SANDBOX) {
      if (VOICE_ID) persona.voice_id = VOICE_ID;
      if (CONTEXT_ID) persona.context_id = CONTEXT_ID;
    }

    const body = {
      mode: "FULL",
      avatar_id: AVATAR_ID,
      avatar_persona: persona,
      max_session_duration: MAX_SESSION_SECONDS, // hard cap on the server side too
    };
    if (SANDBOX) body.is_sandbox = true;

    const tokenRes = await fetch(`${API}/sessions/token`, {
      method: "POST",
      headers: {
        "X-API-KEY": API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token error:", tokenJson);
      return res.status(502).json({ error: "Could not create session token", details: tokenJson });
    }
    const { session_id, session_token } = unwrap(tokenJson);

    // Step 2: start the session
    const startRes = await fetch(`${API}/sessions/start`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${session_token}`,
        accept: "application/json",
      },
    });
    const startJson = await startRes.json();
    if (!startRes.ok) {
      console.error("Start error:", startJson);
      return res.status(502).json({ error: "Could not start session", details: startJson });
    }
    const { livekit_url, livekit_client_token } = unwrap(startJson);

    // Send only what the browser needs. The API key never leaves the server.
    res.json({ session_id, livekit_url, livekit_client_token, max_seconds: MAX_SESSION_SECONDS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Stop the session so billing stops right away.
app.post("/api/stop", async (req, res) => {
  try {
    const { session_id } = req.body || {};
    if (!session_id) return res.status(400).json({ error: "session_id required" });

    const stopRes = await fetch(`${API}/sessions/stop`, {
      method: "POST",
      headers: { "X-API-KEY": API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ session_id, reason: "USER_CLOSED" }),
    });
    res.status(stopRes.ok ? 200 : 502).json({ ok: stopRes.ok });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running on http://localhost:${PORT}  (sandbox: ${SANDBOX})`);
});