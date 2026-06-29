import { Assignment, StudySession, UserProfile, ProcrastinationNudge, SyllabusParseResult, Notification, CopilotPlanResult, AIPredictionResult, SyllabusScanResult, ExtractedTask, WeeklyReview } from "../types";

// Token local storage key
const TOKEN_KEY = "smartdeadline_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Request Helper
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch (_e) {
      errorData = { error: `Invalid JSON from ${url}. Status: ${response.status}` };
    }
    const message = errorData?.error || `HTTP error! Status: ${response.status}`;
    throw new Error(message);
  }

  try {
    return (await response.json()) as T;
  } catch (_e) {
    throw new Error(`Failed to parse JSON from ${url}. Status: ${response.status}. Response was HTML or invalid.`, { cause: _e });
  }
}

// --- Auth Endpoints ---
export async function registerUser(formData: any): Promise<{ user: UserProfile; token: string }> {
  const payload = {
    name: formData.fullName,
    email: formData.email,
    password: formData.password,
    university: formData.university,
    major: formData.major,
    grad_year: formData.graduationYear ? parseInt(formData.graduationYear) : undefined,
    avatar: formData.avatar || "🎓"
  };

  const response = await request<{ message: string; access_token: string; user: UserProfile }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  setToken(response.access_token);
  return { user: response.user, token: response.access_token };
}

export async function loginUser(formData: any): Promise<{ user: UserProfile; token: string }> {
  const response = await request<{ message: string; access_token: string; user: UserProfile }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        email: formData.email,
        password: formData.password,
      }),
    }
  );

  setToken(response.access_token);
  return { user: response.user, token: response.access_token };
}

export async function getProfile(): Promise<UserProfile> {  const response = await request<{ user: UserProfile }>("/api/auth/me");
  return response.user;
}

export async function updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {  const response = await request<{ message: string; user: UserProfile }>(
    "/api/auth/profile",
    {
      method: "PUT",
      body: JSON.stringify(profileData),
    }
  );
  return response.user;
}

export async function changePassword(passwordData: { oldPassword: string; newPassword: string }): Promise<{ message: string }> {
  return await request<{ message: string }>(
    "/api/auth/profile/password",
    {
      method: "PUT",
      body: JSON.stringify(passwordData),
    }
  );
}

export async function deleteAccount(): Promise<{ message: string }> {
  return await request<{ message: string }>(
    "/api/auth/profile",
    {
      method: "DELETE",
    }
  );
}

// --- Assignments Endpoints ---
export async function fetchAssignmentsAndSessions(): Promise<{
  assignments: Assignment[];
  studySessions: StudySession[];
}> {  if (!getToken()) {
    return { assignments: [], studySessions: [] };
  }
  const response = await request<{
    assignments: Assignment[];
    studySessions: StudySession[];
  }>("/api/auth/assignments");
  return response;
}

export async function createAssignment(assignment: Assignment): Promise<Assignment> {  if (!getToken()) {
    return assignment;
  }
  const response = await request<{ message: string; assignment: Assignment }>(
    "/api/auth/assignments",
    {
      method: "POST",
      body: JSON.stringify(assignment),
    }
  );
  return response.assignment;
}

export async function updateAssignmentOnServer(assignment: Assignment): Promise<Assignment> {  if (!getToken()) {
    return assignment;
  }
  const response = await request<{ message: string; assignment: Assignment }>(
    `/api/auth/assignments/${assignment.id}`,
    {
      method: "PUT",
      body: JSON.stringify(assignment),
    }
  );
  return response.assignment;
}

export async function deleteAssignmentFromServer(id: string): Promise<void> {  if (!getToken()) {
    return;
  }
  await request<{ message: string }>(`/api/auth/assignments/${id}`, {
    method: "DELETE",
  });
}

export async function logStudySessionOnServer(session: StudySession): Promise<StudySession> {  if (!getToken()) {
    return session;
  }
  const response = await request<{ message: string; studySession: StudySession }>(
    "/api/auth/study-sessions",
    {
      method: "POST",
      body: JSON.stringify(session),
    }
  );
  return response.studySession;
}

// --- AI Endpoints (Flask App) ---
export async function generateStudyPlan(assignment: Assignment): Promise<string> {  if (!getToken()) {
    return "Register or sign in to generate academic study plans using Smart Deadline AI.";
  }
  // Use the Flask backend /api/ai/study-plan
  const data = await request<{ study_plan?: string; plan?: string; reply?: string }>("/api/gemini/generate-plan", {
    method: "POST",
    body: JSON.stringify({ assignment }),
  });
  return data.study_plan || data.plan || "";
}

export async function generateComprehensiveStudyPlan(
  assignments: Assignment[],
  preferences?: {
    availableHours?: number;
    sessionLength?: number;
    breakInterval?: number;
  }
): Promise<any> {  if (!getToken()) {
    return null;
  }
  // Use Flask /api/ai/comprehensive-study-plan
  const data = await request<any>("/api/ai/comprehensive-study-plan", {
    method: "POST",
    body: JSON.stringify({ 
      assignments,
      available_hours: preferences?.availableHours,
      session_length: preferences?.sessionLength,
      break_interval: preferences?.breakInterval
    }),
  });
  return data;
}

export async function fetchComprehensiveStudyPlan(): Promise<any> {  if (!getToken()) {
    return null;
  }
  // Use Flask GET /api/ai/comprehensive-study-plan
  const data = await request<any>("/api/ai/comprehensive-study-plan", {
    method: "GET",
  });
  return data;
}

export async function fetchAnalyticsInsights(gpaTarget?: number): Promise<any> {  if (!getToken()) {
    return null;
  }
  // Use Flask /api/ai/analytics-insights
  const data = await request<any>("/api/ai/analytics-insights", {
    method: "POST",
    body: JSON.stringify({ gpa_target: gpaTarget }),
  });
  return data;
}

export interface RecommendationResult {
  recommended_assignment_id: string;
  recommended_assignment_title: string;
  course: string;
  reason: string;
  suggested_duration: number;
  message: string;
  fallback?: boolean;
}

export async function fetchNextTaskRecommendation(
  assignments: Assignment[],
  studySessions: StudySession[],
  activeAssignmentId?: string
): Promise<RecommendationResult | null> {  if (!getToken()) {
    return null;
  }
  const data = await request<RecommendationResult>("/api/ai/recommend-next-task", {
    method: "POST",
    body: JSON.stringify({
      assignments,
      studySessions,
      activeAssignmentId,
    }),
  });
  return data;
}

export async function generateMilestones(assignment: Assignment): Promise<any[]> {  if (!getToken()) {
    return [];
  }
  // Use Flask /api/ai/milestones
  const data = await request<{ milestones: any[] }>("/api/ai/milestones", {
    method: "POST",
    body: JSON.stringify({ assignment }),
  });
  return data.milestones;
}

export async function getDeadlineRisk(
  assignment: Assignment,
  studySessions: StudySession[]
): Promise<{
  risk_level: string;
  risk_score: number;
  completion_probability: number;
  analysis: string;
  remedies: string[];
}> {  if (!getToken()) {
    return {
      risk_level: "LOW",
      risk_score: 10,
      completion_probability: 95,
      analysis: "Register to enable AI-powered deadline risk prediction.",
      remedies: ["Create an account to analyze deadline risk."]
    };
  }
  return request<{
    risk_level: string;
    risk_score: number;
    completion_probability: number;
    analysis: string;
    remedies: string[];
  }>("/api/ai/deadline-risk", {
    method: "POST",
    body: JSON.stringify({ 
      assignment,
      study_sessions: studySessions.filter(s => s.assignmentId === assignment.id)
    }),
  });
}

export async function getMotivationNudge(
  assignment: Assignment,
  blockReason: string,
  currentMood: string
): Promise<ProcrastinationNudge> {  if (!getToken()) {
    return {
      milestoneTitle: "Open your project workspace",
      explanation: "Take a look at your assignment overview or outline to get started.",
      microSteps: ["Open the files related to the assignment", "Write down 1 bullet point of progress"],
      encouragement: "Small steps defeat high inertia. You've got this!"
    };
  }
  const data = await request<any>("/api/gemini/nudge", {
    method: "POST",
    body: JSON.stringify({
      assignment,
      block_reason: blockReason,
      current_mood: currentMood,
    }),
  });

  return {
    milestoneTitle: data.immediate_micro_step || "Take a small action step",
    explanation: data.nudge || "Let's work together to make this happen.",
    microSteps: [data.immediate_micro_step || "Open your work file and review."],
    encouragement: "You've got this! Just take the first small step."
  };
}

export async function prioritizeAssignments(assignments: Assignment[]): Promise<any> {
  if (!getToken()) {
    return null;
  }
  return request<any>("/api/ai/priorities", {
    method: "POST",
    body: JSON.stringify({ assignments }),
  });
}

export async function extractSyllabusText(file: File): Promise<{ extractedText: string; filename: string }> {
  if (!getToken()) {
    throw new Error("Syllabus scanning requires an active session. Please sign in or register.");
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("action", "extract");

  return request<{ extractedText: string; filename: string }>("/api/ai/parse-syllabus", {
    method: "POST",
    body: formData,
  });
}

export async function extractSyllabusManual(rawText: string): Promise<{ extractedText: string; filename: string }> {
  if (!getToken()) {
    throw new Error("Syllabus parsing requires an active session. Please sign in or register.");
  }
  return request<{ extractedText: string; filename: string }>("/api/ai/parse-syllabus", {
    method: "POST",
    body: JSON.stringify({
      action: "extract",
      rawText,
    }),
  });
}

export async function parseAndCreateTasks(rawText: string): Promise<{ message: string; summary: string; tasks: Assignment[] }> {
  if (!getToken()) {
    throw new Error("Task parsing requires an active session. Please sign in or register.");
  }
  return request<{ message: string; summary: string; tasks: Assignment[] }>("/api/ai/parse-syllabus", {
    method: "POST",
    body: JSON.stringify({
      action: "parse_and_create",
      rawText,
    }),
  });
}

export async function parseSyllabusOnly(rawText: string): Promise<SyllabusScanResult> {
  if (!getToken()) {
    throw new Error("Syllabus parsing requires an active session. Please sign in or register.");
  }
  return request<SyllabusScanResult>("/api/ai/parse-syllabus", {
    method: "POST",
    body: JSON.stringify({
      action: "parse_only",
      rawText,
    }),
  });
}

export async function saveImportedTasks(tasks: ExtractedTask[]): Promise<{ message: string; tasks: Assignment[] }> {
  if (!getToken()) {
    throw new Error("Syllabus saving requires an active session. Please sign in or register.");
  }
  return request<{ message: string; tasks: Assignment[] }>("/api/ai/parse-syllabus", {
    method: "POST",
    body: JSON.stringify({
      action: "save_imported",
      tasks,
    }),
  });
}

export async function parseSyllabus(rawText: string): Promise<SyllabusParseResult> {
  const response = await fetch("/api/gemini/parse-syllabus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to parse syllabus text");
  }

  return response.json();
}

export async function aiChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  assignments: Assignment[],
  studySessions: StudySession[]
): Promise<{ text: string }> {
  if (!getToken()) {
    return { text: "Hello! I'm your Smart Deadline AI Co-Pilot. To have real interactive coaching conversations and get plan revisions, please register or log in!" };
  }
  return request<{ text: string }>("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      history,
      context: { assignments, studySessions }
    })
  });
}

export async function aiVoiceAssistant(
  transcript: string,
  assignments: Assignment[],
  studySessions: StudySession[],
  masterStudyPlan: any,
  stats: any
): Promise<{ reply: string; action?: any }> {
  // Directly hit the Node backend for Gemini
  const response = await fetch("/api/gemini/voice-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken() || ""}`
    },
    body: JSON.stringify({
  transcript,
  context: {
    assignments: assignments.slice(0, 10),
    studySessions: studySessions.slice(0, 20),
    stats
  }
   })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to process voice command");
  }

  return response.json();
}

export interface VoiceAssistantResponse {
  response_text: string;
  action?: {
    type: "NAVIGATE" | "ADD_ASSIGNMENT" | "NONE";
    tab?: string;
    assignment?: any;
  };
}

export async function sendVoiceCommand(
  message: string,
  history: Array<{ role: string; content: string }>
): Promise<VoiceAssistantResponse> {
  // Real secure network call to Flask endpoint
  return request<VoiceAssistantResponse>("/api/ai/voice-assistant", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export async function generateCopilotPlan(
  message: string,
  history: Array<{ role: string; content: string }>,
  assignments: Assignment[],
  studySessions: StudySession[]
): Promise<CopilotPlanResult> {
  if (!getToken()) {
    return {
      schedule: [
        {
          time_block: "Morning (09:00 - 11:30)",
          focus_area: "Review and Outline",
          tasks: ["Read syllabus", "Create initial milestones"],
          details: "schedule block example."
        }
      ],
      priorities: [
        {
          title: "Select study tasks",
          rank: 1,
          reason: "Prioritization is key to defeating academic procrastination."
        }
      ],
      breaks: {
        type: "Pomodoro",
        description: "5 minutes walk after each 25 minutes block."
      },
      risk_analysis: {
        level: "LOW",
        score: 10,
        explanation: "mock risk analysis."
      },
      completion_probability: 95,
      motivation: "Please register or log in to generate customized co-pilot plans with Smart Deadline AI!"
    };
  }
  return request<CopilotPlanResult>("/api/ai/copilot", {
    method: "POST",
    body: JSON.stringify({
      message,
      history,
      assignments,
      studySessions,
    }),
  });
}

// --- Notification API Calls ---

export async function fetchNotifications(): Promise<Notification[]> {  if (!getToken()) {
    return [];
  }
  return request<Notification[]>("/api/auth/notifications", {
    method: "GET",
  });
}

export async function markNotificationAsRead(id: string): Promise<Notification> {  if (!getToken()) {
    return {} as Notification;
  }
  return request<Notification>(`/api/auth/notifications/${id}/read`, {
    method: "PUT",
  });
}

export async function markAllNotificationsAsRead(): Promise<{ message: string }> {  if (!getToken()) {
    return { message: "Success" };
  }
  return request<{ message: string }>("/api/auth/notifications/mark-all-read", {
    method: "POST",
  });
}

export async function deleteNotificationFromServer(id: string): Promise<{ message: string }> {  if (!getToken()) {
    return { message: "Success" };
  }
  return request<{ message: string }>(`/api/auth/notifications/${id}`, {
    method: "DELETE",
  });
}

export async function generateSmartReminderMessage(title: string, timeRemaining: string): Promise<{ message: string }> {
  if (!getToken()) return { message: `Reminder: Your assignment '${title}' is due in ${timeRemaining}!` };
  return request<{ message: string }>("/api/ai/generate-smart-reminder", {
    method: "POST",
    body: JSON.stringify({ title, timeRemaining }),
  });
}

export async function createSmartReminderNotification(title: string, message: string, assignment_id?: string): Promise<Notification> {
  if (!getToken()) return {} as Notification;
  return request<Notification>("/api/auth/notifications/smart-reminder", {
    method: "POST",
    body: JSON.stringify({ title, message, assignment_id }),
  });
}

export async function clearAllNotificationsFromServer(): Promise<{ message: string }> {  if (!getToken()) {
    return { message: "Success" };
  }
  return request<{ message: string }>("/api/auth/notifications/clear-all", {
    method: "POST",
  });
}

export async function generateAIMotivationalNotification(): Promise<Notification> {  if (!getToken()) {
    return {} as Notification;
  }
  return request<Notification>("/api/auth/notifications/generate-motivation", {
    method: "POST",
  });
}

export async function scanAssignmentOcr(file: File): Promise<{ extractedText: string; filename: string; isImage: boolean }> {
  if (!getToken()) {
    throw new Error("Assignment scanning requires an active session. Please sign in or register.");
  }
  const formData = new FormData();
  formData.append("file", file);

  return request<{ extractedText: string; filename: string; isImage: boolean }>("/api/ai/scan-assignment-ocr", {
    method: "POST",
    body: formData,
  });
}

export async function identifyAssignmentFields(
  extractedText: string,
  currentDate: string
): Promise<{
  title: string;
  course: string;
  dueDate: string;
  difficulty: "LOW" | "MEDIUM" | "HIGH";
  estimatedHours: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  description: string;
  milestones: string[];
  weight?: number;
  requirements?: string[];
  summary?: string;
  studyPlan?: string;
}> {
  if (!getToken()) {
    throw new Error("Assignment fields extraction requires an active session. Please sign in or register.");
  }
  return request<{
    title: string;
    course: string;
    dueDate: string;
    difficulty: "LOW" | "MEDIUM" | "HIGH";
    estimatedHours: number;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    description: string;
    milestones: string[];
    weight?: number;
    requirements?: string[];
    summary?: string;
    studyPlan?: string;
  }>("/api/ai/scan-assignment-fields", {
    method: "POST",
    body: JSON.stringify({ extractedText, currentDate }),
  });
}

export interface DBCopilotMessage {
  id: string;
  role: 'user' | 'assistant' | 'model';
  content: string;
  timestamp: string;
  plan?: CopilotPlanResult;
}

export async function fetchCopilotMessages(): Promise<DBCopilotMessage[]> {  if (!getToken()) {
    return [];
  }
  return request<DBCopilotMessage[]>("/api/ai/copilot/messages", {
    method: "GET",
  });
}

export async function saveCopilotMessage(role: string, content: string, plan?: CopilotPlanResult | null): Promise<DBCopilotMessage> {  if (!getToken()) {
    return {} as DBCopilotMessage;
  }
  return request<DBCopilotMessage>("/api/ai/copilot/messages", {
    method: "POST",
    body: JSON.stringify({ role, content, plan }),
  });
}

export async function clearCopilotMessages(): Promise<{ message: string }> {  if (!getToken()) {
    return { message: "Success" };
  }
  return request<{ message: string }>("/api/ai/copilot/messages", {
    method: "DELETE",
  });
}

export async function runAIPrediction(
  assignment: Assignment,
  studySessions: StudySession[]
): Promise<AIPredictionResult> {  if (!getToken()) {
    return {
      id: "sample-pred",
      userId: 0,
      assignmentId: assignment.id,
      timestamp: new Date().toISOString(),
      riskLevel: assignment.difficulty === "HARD" ? "HIGH" : "LOW",
      riskScore: assignment.difficulty === "HARD" ? 65 : 20,
      completionProbability: assignment.difficulty === "HARD" ? 45 : 85,
      expectedCompletion: assignment.difficulty === "HARD" ? "Risk of minor delay (Expected on due date)" : "Projected 1 day early",
      studyWorkload: "Balanced: 1.5 hours/day required",
      stressLevel: assignment.difficulty === "HARD" ? "Elevated (6/10)" : "Relaxed (2/10)",
      productivityScore: 78,
      confidenceScore: 92,
      analysis: "prediction. Register/login to generate real-time AI forecasting modeled by Smart Deadline AI.",
      interventions: [
        "Register for an account to save prediction historical logs.",
        "Allocate at least 1.5 hours/day to secure completion.",
        "Leverage 25-minute study intervals to track milestones."
      ]
    };
  }
  return request<AIPredictionResult>("/api/ai/predict", {
    method: "POST",
    body: JSON.stringify({
      assignment,
      study_sessions: studySessions.filter(s => s.assignmentId === assignment.id)
    }),
  });
}

export async function fetchAIPredictions(): Promise<AIPredictionResult[]> {  if (!getToken()) {
    return [];
  }
  return request<AIPredictionResult[]>("/api/ai/predictions", {
    method: "GET",
  });
}

export async function clearAIPredictions(): Promise<{ message: string }> {  if (!getToken()) {
    return { message: "Success" };
  }
  return request<{ message: string }>("/api/ai/predictions", {
    method: "DELETE",
  });
}

export interface AIRecommendationsResult {
  summary: string;
  strengths: string[];
  recommendations: string[];
  nextSteps: string[];
}

export async function generateExportRecommendations(
  assignments: Assignment[],
  studySessions: StudySession[],
  reportType: string
): Promise<AIRecommendationsResult> {
  if (!getToken()) {
    // Return high quality dummy recommendations if user is in / unregistered
    return {
      summary: "Workload and productivity patterns show moderate study pacing. You have several pending high-priority tasks requiring focused energy blocks.",
      strengths: [
        "Consistent tracking of assignment details and due dates.",
        "Proactive planning using estimated study duration metrics."
      ],
      recommendations: [
        "Group similar course materials to maximize Pomodoro momentum during deep study sessions.",
        "Initiate high-difficulty, high-weight tasks at least 5 days prior to the deadline to alleviate crunch pressure."
      ],
      nextSteps: [
        "Schedule a focused 45-minute study session for your top pending assignment.",
        "Set custom milestone reminders to distribute task milestones evenly."
      ]
    };
  }
  return request<AIRecommendationsResult>("/api/gemini/export-recommendations", {
    method: "POST",
    body: JSON.stringify({
      assignments,
      studySessions,
      reportType
    })
  });
}

export async function getWeeklyReviews(): Promise<WeeklyReview[]> {  if (!getToken()) {
    // LocalStorage fallback for unregistered users
    const local = localStorage.getItem("weekly_reviews");
    return local ? JSON.parse(local) : [];
  }
  return request<WeeklyReview[]>("/api/auth/weekly-reviews");
}

export async function saveWeeklyReview(review: Omit<WeeklyReview, "id">): Promise<WeeklyReview> {  if (!getToken()) {
    // LocalStorage fallback for unregistered users
    const local = localStorage.getItem("weekly_reviews");
    const reviews: WeeklyReview[] = local ? JSON.parse(local) : [];
    const newReview: WeeklyReview = {
      ...review,
      id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    reviews.push(newReview);
    localStorage.setItem("weekly_reviews", JSON.stringify(reviews));
    return newReview;
  }
  return request<WeeklyReview>("/api/auth/weekly-reviews", {
    method: "POST",
    body: JSON.stringify(review)
  });
}

export async function generateWeeklyReview(params: {
  assignments: Assignment[];
  studySessions: StudySession[];
  weekStartDate: string;
  weekEndDate: string;
  completedCount: number;
  pendingCount: number;
  missedCount: number;
  totalStudyHours: number;
}): Promise<Omit<WeeklyReview, "id" | "createdAt">> {  return request<Omit<WeeklyReview, "id" | "createdAt">>("/api/gemini/generate-weekly-review", {
    method: "POST",
    body: JSON.stringify(params)
  });
}




