import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { spawn, execSync } from "child_process";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Spawn the Flask backend in the background on port 5000
const backendCwd = path.join(process.cwd(), "backend");

// Automatically install Python dependencies inside the container if needed
try {
  // Ensure pip is installed first
  try {
    execSync("python3 -c \"import pip\"", { stdio: "ignore" });
  } catch (e) {
    console.log("pip not found, installing...");
    execSync("curl -sS https://bootstrap.pypa.io/get-pip.py | python3 - --break-system-packages", { stdio: "inherit" });
  }

  // Attempt with --break-system-packages (needed on newer debian/ubuntu systems)
  try {
    execSync("python3 -m pip install -r requirements.txt --break-system-packages", {
      cwd: backendCwd,
      stdio: "inherit"
    });
  } catch (e) {

    execSync("python3 -m pip install -r requirements.txt", {
      cwd: backendCwd,
      stdio: "inherit"
    });
  }

} catch (err) {

}


const flaskProcess = spawn("python3", ["run.py"], {
  cwd: backendCwd,
  env: {
    ...process.env,
    PORT: "5000",
  },
  stdio: "inherit"
});

flaskProcess.on("error", () => {

});

flaskProcess.on("exit", () => {

});

// Proxy routes to Flask on port 5000 for Auth and AI
app.all(["/api/auth/*", "/api/ai/*"], async (req: Request, res: Response): Promise<void> => {
  const targetUrl = `http://127.0.0.1:5000${req.originalUrl}`;
  try {
    const headers = new Headers();
    const headersToIgnore = [
      "host",
      "connection",
      "keep-alive",
      "proxy-authenticate",
      "proxy-authorization",
      "te",
      "trailer",
      "transfer-encoding",
      "upgrade"
    ];

    Object.entries(req.headers).forEach(([key, val]) => {
      const lowerKey = key.toLowerCase();
      if (val !== undefined && !headersToIgnore.includes(lowerKey)) {
        if (Array.isArray(val)) {
          val.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, val);
        }
      }
    });

    const body = ["GET", "HEAD"].includes(req.method) 
      ? undefined 
      : JSON.stringify(req.body);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: body,
    });

    res.status(response.status);
    
    // Copy headers back to client
    response.headers.forEach((value, name) => {
      res.setHeader(name, value);
    });

    const resText = await response.text();
    res.send(resText);
  } catch (err: any) {
    console.error(`[PROXY ERROR] Failed to fetch ${targetUrl}:`, err.message);
    res.status(502).json({ error: "Failed to communicate with Auth/AI backend service. Please try again." });
  }
});

// Initialize Google Gen AI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// AI Endpoint: Generate Custom Study Plan & Milestones
app.post("/api/gemini/generate-plan", async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignment } = req.body;
    if (!assignment) {
      res.status(400).json({ error: "Assignment details are required" });
      return;
    }

    const prompt = `
      You are an elite academic productivity coach specializing in helping university students beat procrastination and study strategically.
      
      Generate an incredibly detailed, step-by-step academic study plan for the following assignment:
      - Title: ${assignment.title}
      - Course: ${assignment.course}
      - Due Date: ${assignment.dueDate}
      - Priority: ${assignment.priority}
      - Estimated Hours Needed: ${assignment.estimatedHours}
      - Description/Brief: ${assignment.description}
      
      In your plan, output Markdown formatted text detailing:
      1. **Strategic Approach**: An explanation of how to tackle this assignment efficiently (e.g., research phase, writing, debugging, etc.).
      2. **Time Boxing Suggestion**: How to divide the estimated ${assignment.estimatedHours} hours.
      3. **Overcoming Common Pitfalls**: Specific advice on what traps to avoid for this type of task.
      4. **Study Sprints**: Recommended Pomodoro or focus block sizes.
      
      Keep the tone highly encouraging, professional, and practical.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic tutor and student productivity coach. Provide clear, highly actionable, and motivational guidance."
      }
    });

    const text = response.text || "Failed to generate plan. Please try again.";
    res.json({ plan: text });
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error during plan generation" });
  }
});

// AI Endpoint: Overcome Procrastination (Get Nudges & Micro-steps)
app.post("/api/gemini/nudge", async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignment, blockReason, currentMood } = req.body;
    if (!assignment) {
      res.status(400).json({ error: "Assignment details are required" });
      return;
    }

    const prompt = `
      The student is severely procrastinating on the following assignment:
      - Title: "${assignment.title}"
      - Course: "${assignment.course}"
      - Description: "${assignment.description}"
      - Due in: ${assignment.dueDate}
      
      The student's reported blocking reason is: "${blockReason || "unknown resistance"}"
      The student's current emotional mood is: "${currentMood || "neutral"}"
      
      Provide a procrastination-busting response. You MUST break down this formidable assignment into tiny, ridiculously simple, 5-minute micro-steps to bypass their psychological friction (getting started is the hardest part).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive, warm academic psychologist. You use Cognitive Behavioral Therapy (CBT) and academic coaching techniques to help students reduce emotional resistance to starting assignments.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            milestoneTitle: {
              type: Type.STRING,
              description: "The name of the immediate small milestone they will tackle right now."
            },
            explanation: {
              type: Type.STRING,
              description: "Brief psychological explanation of why they are feeling blocked and how to bypass it based on their specific blockReason."
            },
            microSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 3 to 5 micro-steps, each taking no more than 5 minutes. E.g., 'Open Google Docs and write a working title', 'Write 1 single sentence explaining your thesis'."
            },
            encouragement: {
              type: Type.STRING,
              description: "A super warm, motivating, high-energy 1-2 sentence pep talk to get them moving."
            }
          },
          required: ["milestoneTitle", "explanation", "microSteps", "encouragement"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from AI model");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error during nudge generation" });
  }
});

// AI Endpoint: Parse Syllabus Paste / Assignment Brief
app.post("/api/gemini/parse-syllabus", async (req: Request, res: Response): Promise<void> => {
  try {
    const { rawText } = req.body;
    if (!rawText || rawText.trim().length < 10) {
      res.status(400).json({ error: "Please provide a more substantial syllabus or assignment description." });
      return;
    }

    const prompt = `
      Analyze the following syllabus segment or assignment brief pasted by a student:
      
      """
      ${rawText}
      """
      
      Extract the assignment details and output a clean JSON object according to the schema.
      Estimate the typical hours a university student would need to achieve an A grade based on complexity.
      Generate 3 to 5 clear sequential milestones required to complete this assignment.
      Set due date relative to the current local date of today: 2026-06-26. (Output as YYYY-MM-DD string).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional educational parser. You read messy text from college syllabi, assignment emails, or project briefs, and structure them into neat, logical database-ready fields. If a due date is mentioned, resolve it relative to today's date (2026-06-26). If the course is not found, guess a logical abbreviation from the content (e.g., CS-101).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The parsed name of the assignment."
            },
            course: {
              type: Type.STRING,
              description: "The course code or title, e.g., 'CS-101 Introduction to CS' or 'MATH-241'."
            },
            dueDate: {
              type: Type.STRING,
              description: "Calculated YYYY-MM-DD due date. If not found in text, set it to a realistic date e.g., 7 days from today (2026-07-03)."
            },
            priority: {
              type: Type.STRING,
              description: "Priority category based on high weight or urgent timeline. Allowed values: LOW, MEDIUM, HIGH, URGENT."
            },
            weight: {
              type: Type.INTEGER,
              description: "Percentage weight of total grade, e.g., 15 for 15%. Default to 10 if not found."
            },
            estimatedHours: {
              type: Type.INTEGER,
              description: "Total estimated study hours needed. Usually 5 to 30 hours."
            },
            description: {
              type: Type.STRING,
              description: "A summary of what is required to complete this assignment."
            },
            suggestedMilestones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 sequential milestones needed to complete it."
            }
          },
          required: ["title", "course", "dueDate", "priority", "weight", "estimatedHours", "description", "suggestedMilestones"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from educational parser");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error during brief parsing" });
  }
});

// AI Endpoint: Generate Export Recommendations
app.post("/api/gemini/export-recommendations", async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignments = [], studySessions = [], reportType = "all" } = req.body;

    const summaryData = {
      totalAssignments: assignments.length,
      completedAssignments: assignments.filter((a: any) => a.status === "COMPLETED").length,
      pendingAssignments: assignments.filter((a: any) => a.status !== "COMPLETED").length,
      highPriorityCount: assignments.filter((a: any) => a.priority === "HIGH").length,
      totalStudySessions: studySessions.length,
      totalHoursFocused: studySessions.reduce((acc: number, s: any) => acc + (s.durationMinutes || 0) / 60, 0)
    };

    const prompt = `
      You are an expert academic productivity consultant. Provide custom recommendations for an academic report export.
      Report Type Requested: "${reportType}"
      
      Here is the user's workload & focus session data:
      - Total Assignments: ${summaryData.totalAssignments}
      - Completed: ${summaryData.completedAssignments}
      - Pending: ${summaryData.pendingAssignments} (High Priority: ${summaryData.highPriorityCount})
      - Completed Study Focus Sessions: ${summaryData.totalStudySessions}
      - Total Hours Focused: ${summaryData.totalHoursFocused.toFixed(1)} hours
      
      Recent assignments:
      ${assignments.slice(0, 5).map((a: any) => `- [${a.status}] ${a.title} (${a.course}) - Due: ${a.dueDate}, Priority: ${a.priority}, Difficulty: ${a.difficulty || "MEDIUM"}`).join("\n")}
      
      Based on this data, generate custom academic insights, strengths, and smart recommendations. 
      Tailor the recommendations specifically for the report type "${reportType}".
      - "assignments": Focus on prioritization, workload distribution, and beating upcoming deadlines.
      - "calendar": Focus on time-boxing, spacing out intense study sessions, and milestone schedules.
      - "study-plan": Focus on Pomodoro effectiveness, study sprint block layouts, and execution of study milestones.
      - "analytics": Focus on trends in productivity, completing high-difficulty work, improving streak durations, and time-management optimization.
      - "all": A well-rounded, fully comprehensive mix of the above categories.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a world-class student performance coach and academic psychologist. Deliver structured, highly actionable, personalized insights based on actual student workload and study trends.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A professional, encouraging 2-3 sentence overview of their academic standing and productivity patterns."
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 to 3 key strengths observed from their progress (e.g. diligent focus, great completion rate, high priority management)."
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 4 personalized, actionable advice items to improve focus, avoid crunch time, and study more effectively."
            },
            nextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2 to 3 clear, concrete next steps they should execute immediately inside the SmartDeadline workspace."
            }
          },
          required: ["summary", "strengths", "recommendations", "nextSteps"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from recommendation engine");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error during recommendation generation" });
  }
});

// AI Endpoint: Generate Weekly Review
app.post("/api/gemini/generate-weekly-review", async (req: Request, res: Response): Promise<void> => {
  try {
    const params = req.body;
    
    const prompt = `
      You are an expert academic productivity coach.
      Generate a customized weekly review and productivity report based on the following student data for the week (${params.weekStartDate} to ${params.weekEndDate}):
      - Completed Assignments: ${params.completedCount}
      - Pending Assignments: ${params.pendingCount}
      - Missed Deadlines: ${params.missedCount}
      - Total Study Hours Logged: ${params.totalStudyHours}

      Calculate a productivityScore from 0 to 100 based on this performance.
      Provide a highly encouraging but realistic 'motivationSummary'.
      Provide 2-3 specific 'improvementSuggestions' to enhance next week's focus.
      Provide 2-3 specific action items for the 'nextWeekStudyPlan' to tackle pending tasks or prevent missed deadlines.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a supportive academic coach giving weekly feedback. Output clean JSON only.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productivityScore: { type: Type.INTEGER, description: "Calculated score 0-100" },
            motivationSummary: { type: Type.STRING, description: "Encouraging summary of the week" },
            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Suggestions to improve" },
            nextWeekStudyPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Action items for next week" }
          },
          required: ["productivityScore", "motivationSummary", "improvementSuggestions", "nextWeekStudyPlan"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const aiData = JSON.parse(text);
    
    // Merge the AI data with the base params to match the required WeeklyReview schema
    const result = {
      weekStartDate: params.weekStartDate,
      weekEndDate: params.weekEndDate,
      completedWorkCount: params.completedCount,
      pendingWorkCount: params.pendingCount,
      missedDeadlinesCount: params.missedCount,
      studyHours: params.totalStudyHours,
      ...aiData
    };

    res.json(result);
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// AI Endpoint: Voice Assistant
app.post("/api/gemini/voice-assistant", async (req: Request, res: Response): Promise<void> => {
  try {
    const { transcript, context } = req.body;
    
    const prompt = `
      You are the SmartDeadline AI Voice Assistant. Respond to the user's spoken command.
      Be concise, helpful, and speak in a friendly, conversational tone (since your response will be read aloud).
      
      User Command: "${transcript}"
      
      Context (Current State):
      ${JSON.stringify(context || {}, null, 2)}
      
      Analyze the command and provide a response. If the command requires an action in the UI (like navigating to a tab or adding an assignment), specify it in the "action" object.
      
      Supported Action Types:
      - NAVIGATE: { tab: "dashboard" | "assignments" | "calendar" | "study-planner" | "focus-timer" | "syllabus-scanner" | "notifications" | "procrastination" }
      - ADD_ASSIGNMENT: { title: string, course: string, dueDate: string (YYYY-MM-DD), type: string, priority: "High" | "Medium" | "Low" }
      - NONE: If no action is needed, just answer the question based on the context.
      
      Keep your "reply" to 1-3 short sentences. No markdown formatting if possible, just natural spoken text. Do not use asterisks or special characters.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the AI Voice Assistant for SmartDeadline, a student productivity app. Be very concise, helpful, and conversational. Do not use markdown like bolding or bullet points as the response will be synthesized to speech. Output JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: "The conversational text to speak to the user." },
            action: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "Action type: NAVIGATE, ADD_ASSIGNMENT, or NONE" },
                payload: { 
                  type: Type.OBJECT,
                  properties: {
                    tab: { type: Type.STRING },
                    title: { type: Type.STRING },
                    course: { type: Type.STRING },
                    dueDate: { type: Type.STRING },
                    type: { type: Type.STRING },
                    priority: { type: Type.STRING }
                  }
                }
              }
            }
          },
          required: ["reply"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      res.json({ reply: "I didn't quite catch that. Could you try again?" });
      return;
    }
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(text);
    } catch (e) {
      aiResponse = { reply: text };
    }
    
    res.json(aiResponse);
  } catch (error: any) {

    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Serve static assets or use Vite middleware
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {

  });
}

setupVite();
