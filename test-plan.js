async function run() {
  const res = await fetch("http://localhost:3000/api/gemini/generate-plan", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      assignment: {
        title: "Calculus Homework",
        course: "Math",
        dueDate: "2026-07-01",
        estimatedHours: 2,
        priority: "High"
      }
    })
  });
  const text = await res.text();
  console.log("PLAN RESPONSE:", text);
}

run();
