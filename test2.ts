import fetch from "node-fetch";

async function test() {
    const res = await fetch("http://localhost:3000/api/gemini/voice-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text: "Hello",
            assignments: [],
            studySessions: [],
            masterStudyPlan: [],
            stats: {}
        })
    });
    console.log(await res.text());
}
test();
