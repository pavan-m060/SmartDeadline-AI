import { aiVoiceAssistant } from "./src/services/api.js";

async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/gemini/voice-assistant", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        transcript: "show me my assignments",
        context: {}
      })
    });
    const text = await res.text();
    console.log("RESPONSE:", text);
  } catch(e) {
    console.error(e);
  }
}

run();
