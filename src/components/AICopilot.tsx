import { useState, useEffect, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Send, RefreshCw, Download, Save, CalendarDays, AlertTriangle, Compass, Award, Clock, Coffee, ChevronRight, ArrowRight, BookOpen, CheckCircle2, Brain, Trash2, Activity, Paperclip, Loader2 } from "lucide-react";
import { generateCopilotPlan, fetchCopilotMessages, saveCopilotMessage, clearCopilotMessages, extractSyllabusText } from "../services/api";
import { Assignment, StudySession, CopilotPlanResult } from "../types";
import { useToast } from "./Toast";
import { SkeletonPulse } from "./Skeleton";
import { jsPDF } from "jspdf";

interface AICopilotProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  setCurrentTab: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  plan?: CopilotPlanResult;
}

export default function AICopilot({ assignments, studySessions }: AICopilotProps) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activePlan, setActivePlan] = useState<CopilotPlanResult | null>(null);
  const [lastUserQuery, setLastUserQuery] = useState("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Suggested quick prompts
  const suggestions = [
    {
      title: "Exams & Assignments",
      text: "I have two exams next week and three assignments due Friday.",
      icon: BookOpen,
      color: "from-blue-500/20 to-indigo-500/10 border-blue-500/20 text-blue-400"
    },
    {
      title: "Limited Time",
      text: "I only have four hours free tomorrow to study.",
      icon: Clock,
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400"
    },
    {
      title: "Fast-Track Target",
      text: "I want to finish my project before Monday.",
      icon: TargetPlanIcon,
      color: "from-purple-500/20 to-pink-500/10 border-purple-500/20 text-purple-400"
    }
  ];

  // Helper placeholder for custom icon since Target is already imported as study-planner icon
  function TargetPlanIcon(props: any) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    );
  }

  // Load saved plan or conversation history from database on mount
  useEffect(() => {
    const savedPlan = localStorage.getItem("smartdeadline_saved_copilot_plan");
    const savedQuery = localStorage.getItem("smartdeadline_saved_copilot_query");

    if (savedPlan) {
      try {
        setActivePlan(JSON.parse(savedPlan));
      } catch (e) {

      }
    }

    if (savedQuery) {
      setLastUserQuery(savedQuery);
    }

    const loadMessages = async () => {
      try {
        const dbMsgs = await fetchCopilotMessages();
        if (dbMsgs && dbMsgs.length > 0) {
          setMessages(dbMsgs.map((m: any) => ({
            id: m.id,
            role: m.role === "model" ? "assistant" : m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            plan: m.plan
          })));
        } else {
          // Set default initial greeting from Copilot
          const initialWelcome: ChatMessage = {
            id: "welcome",
            role: "assistant",
            content: "Hello! I am your AI Academic Co-Pilot. Describe your current workload pressure, tight deadlines, or available study hours, and I'll generate a fully personalized study schedule, recommended task priority, suggested breaks, risk analysis, and motivation! Try one of the suggestions below to start.",
            timestamp: new Date()
          };
          setMessages([initialWelcome]);
          // Save welcome message to DB so it persists
          await saveCopilotMessage("assistant", initialWelcome.content);
        }
      } catch (err) {

        // Fallback to local welcome message if not logged in / fetch fails
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Hello! I am your AI Academic Co-Pilot. Describe your current workload pressure, tight deadlines, or available study hours, and I'll generate a fully personalized study schedule, recommended task priority, suggested breaks, risk analysis, and motivation! Try one of the suggestions below to start.",
            timestamp: new Date()
          }
        ]);
      }
    };

    loadMessages();
  }, []);

  const [isExtractingFile, setIsExtractingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSyllabusUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsExtractingFile(true);
    showToast(`Uploading and extracting "${file.name}"...`, "info");
    
    try {
      const result = await extractSyllabusText(file);
      setIsExtractingFile(false);
      showToast("Syllabus text extracted! Generating AI analysis...", "success");
      
      const autoPrompt = `I have uploaded my syllabus file: "${file.name}".\n\n` +
        `Here is the extracted text of the syllabus:\n` +
        `"""\n${result.extractedText.slice(0, 4500)}\n"""\n\n` +
        `Please provide a comprehensive summary of this syllabus, outline the grading weights, list key assignments, suggest optimal priorities, recommend high-yield study techniques, and generate a weekly study strategy to tackle this course successfully.`;
        
      handleSubmit(autoPrompt);
    } catch (err: any) {

      setIsExtractingFile(false);
      showToast(err.message || "Failed to extract text from syllabus.", "error");
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isExtractingFile]);

  const handleSubmit = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);
    setLastUserQuery(text);

    // Save user message to database
    try {
      await saveCopilotMessage("user", text);
    } catch (saveErr) {

    }

    try {
      // Build history payload for Gemini
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const plan = await generateCopilotPlan(text, historyPayload, assignments, studySessions);
      
      const content = `I've analyzed your academic situation and updated your co-pilot strategic plan on the right. Here is my strategic summary: ${plan.motivation}`;
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
        plan
      };

      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      setActivePlan(plan);
      
      // Save assistant message and generated plan to database
      try {
        await saveCopilotMessage("assistant", content, plan);
      } catch (saveErr) {

      }
      
      // Auto-save generated plan as the active one
      localStorage.setItem("smartdeadline_saved_copilot_plan", JSON.stringify(plan));
      localStorage.setItem("smartdeadline_saved_copilot_query", text);
      
      showToast("Personalized strategic plan generated successfully!", "success");
    } catch (err: any) {

      const errContent = `I encountered an issue analyzing your situation: ${err.message || "Failed to contact Gemini server"}. Please try again shortly.`;
      const errorMsg: ChatMessage = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        content: errContent,
        timestamp: new Date()
      };
      const updatedMessages = [...newMessages, errorMsg];
      setMessages(updatedMessages);

      try {
        await saveCopilotMessage("assistant", errContent);
      } catch (saveErr) {

      }

      showToast("Failed to generate strategic plan.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = () => {
    if (!lastUserQuery) {
      showToast("Provide an initial academic description first.", "info");
      return;
    }
    handleSubmit(lastUserQuery);
  };

  const handleSavePlan = () => {
    if (!activePlan) return;
    localStorage.setItem("smartdeadline_saved_copilot_plan", JSON.stringify(activePlan));
    localStorage.setItem("smartdeadline_saved_copilot_query", lastUserQuery);
    showToast("Active study plan securely saved to workspace storage! 💾", "success");
  };

  const handleClearHistory = async () => {
    try {
      await clearCopilotMessages();
      
      const initialMsg: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I am your AI Academic Co-Pilot. Describe your current workload pressure, tight deadlines, or available study hours, and I'll generate a fully personalized study schedule, recommended task priority, suggested breaks, risk analysis, and motivation!",
        timestamp: new Date()
      };
      setMessages([initialMsg]);
      await saveCopilotMessage("assistant", initialMsg.content);
      
      setActivePlan(null);
      setLastUserQuery("");
      localStorage.removeItem("smartdeadline_saved_copilot_plan");
      localStorage.removeItem("smartdeadline_saved_copilot_query");
      localStorage.removeItem("smartdeadline_saved_copilot_messages");
      showToast("Co-Pilot session reset successfully in database.", "info");
    } catch (err: any) {

      showToast("Failed to clear history from database, resetting interface state.", "error");
      
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hello! I am your AI Academic Co-Pilot. Describe your current workload pressure, tight deadlines, or available study hours, and I'll generate a fully personalized study schedule, recommended task priority, suggested breaks, risk analysis, and motivation!",
          timestamp: new Date()
        }
      ]);
      setActivePlan(null);
      setLastUserQuery("");
    }
  };

  // 3. Export PDF using jsPDF
  const handleExportPDF = () => {
    if (!activePlan) return;

    const doc = new jsPDF();
    const margin = 15;
    let y = 15;
    const printableWidth = 180;

    const addNewPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight > 280) {
        doc.addPage();
        y = 15;
      }
    };

    // Header styling
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.text("AI ACADEMIC CO-PILOT STRATEGIC PLAN", margin, 24);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(156, 163, 175); // gray-400
    doc.text(`Generated on: ${new Date().toLocaleDateString()} | Active Workspace`, margin, 32);

    y = 50;

    // Student prompt query
    if (lastUserQuery) {
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, printableWidth, 18, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text("STUDENT SITUATION:", margin + 4, y + 6);
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`"${lastUserQuery.slice(0, 75)}${lastUserQuery.length > 75 ? '...' : ''}"`, margin + 4, y + 12);
      y += 26;
    }

    // Risk and Completion Probability
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("I. Workload Risk & Completion Prediction", margin, y);
    y += 8;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Estimated Completion Probability: ${activePlan.completion_probability}%`, margin, y);
    y += 6;
    doc.text(`Workload Risk Level: ${activePlan.risk_analysis.level} (Score: ${activePlan.risk_analysis.score}/100)`, margin, y);
    y += 6;
    
    const explanationLines = doc.splitTextToSize(activePlan.risk_analysis.explanation, printableWidth);
    doc.text(explanationLines, margin, y);
    y += (explanationLines.length * 5) + 8;

    // Priorities
    addNewPageIfNeeded(40);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("II. Strategic Task Priorities", margin, y);
    y += 8;

    activePlan.priorities.forEach((p ) => {
      addNewPageIfNeeded(16);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241); // indigo-500
      doc.text(`#${p.rank} - ${p.title}`, margin, y);
      y += 5;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const reasonLines = doc.splitTextToSize(p.reason, printableWidth - 6);
      doc.text(reasonLines, margin + 4, y);
      y += (reasonLines.length * 4.5) + 5;
    });
    y += 4;

    // Schedule
    addNewPageIfNeeded(50);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("III. Personalized Study Schedule Blocks", margin, y);
    y += 8;

    activePlan.schedule.forEach((block ) => {
      addNewPageIfNeeded(25);
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, printableWidth, 18, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(block.time_block, margin + 4, y + 6);
      
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text(`Focus: ${block.focus_area}`, margin + 85, y + 6);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Tasks: ${block.tasks.join(", ")}`, margin + 4, y + 12);
      y += 22;

      const detailsLines = doc.splitTextToSize(block.details, printableWidth);
      doc.text(detailsLines, margin, y);
      y += (detailsLines.length * 4.5) + 6;
    });

    // Breaks
    addNewPageIfNeeded(30);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("IV. Suggested Spaced Break Strategy", margin, y);
    y += 8;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Methodology: ${activePlan.breaks.type}`, margin, y);
    y += 5;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const breakLines = doc.splitTextToSize(activePlan.breaks.description, printableWidth);
    doc.text(breakLines, margin, y);
    y += (breakLines.length * 4.5) + 8;

    // Motivation
    addNewPageIfNeeded(25);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("V. Co-Pilot Motivational Advice", margin, y);
    y += 8;

    doc.setFont("Helvetica", "oblique");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const motivationLines = doc.splitTextToSize(activePlan.motivation, printableWidth);
    doc.text(motivationLines, margin, y);

    doc.save("Academic_Copilot_Strategic_Plan.pdf");
    showToast("Strategic plan PDF generated and downloaded!", "success");
  };

  // Dynamic ICS download for adding blocks to student calendar
  const handleAddToCalendar = () => {
    if (!activePlan || activePlan.schedule.length === 0) return;

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//SmartDeadline AI//Academic Co-Pilot//EN\n";
    
    activePlan.schedule.forEach((block, index) => {
      const tomorrow = new Date();
      // Distribute blocks day-by-day starting tomorrow
      tomorrow.setDate(tomorrow.getDate() + 1 + index);
      
      // Set to 2:00 PM for study sessions
      tomorrow.setHours(14, 0, 0, 0);
      const startStr = tomorrow.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";
      
      // 2-hour study block
      const end = new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000);
      const endStr = end.toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15) + "Z";

      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:copilot-${Date.now()}-${index}@smartdeadline\n`;
      icsContent += `DTSTAMP:${new Date().toISOString().replace(/-|:|\.\d\d\d/g, "").slice(0, 15)}Z\n`;
      icsContent += `DTSTART:${startStr}\n`;
      icsContent += `DTEND:${endStr}\n`;
      icsContent += `SUMMARY:AI Study Block: ${block.focus_area}\n`;
      icsContent += `DESCRIPTION:Associated Tasks: ${block.tasks.join(", ")}\\n\\nDetails: ${block.details.replace(/\n/g, "\\n")}\\n\\nStrategy: ${activePlan.breaks.type}\\n\\nGenerated by SmartDeadline AI Academic Co-Pilot\n`;
      icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Academic_Copilot_Schedule.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("ICS file downloaded! Sync these study blocks directly with your Calendar.", "success");
  };

  // Get risk colored styling
  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "HIGH":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "MEDIUM":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden text-slate-100"
    >
      {}
      <div className="w-full lg:w-5/12 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col h-full overflow-hidden shadow-xl backdrop-blur-md">
        
        {}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-white">Co-Pilot Consultation</h2>
              <p className="text-[10px] text-slate-400 font-mono">Real-Time Cognitive Tutor</p>
            </div>
          </div>
          {messages.length > 1 && (
            <button 
              onClick={handleClearHistory}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition duration-200 cursor-pointer"
              title="Reset Session"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/20 flex items-center justify-center shrink-0 self-start mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                )}
                <div 
                  className={`max-w-[85%] p-3.5 rounded-2xl border text-sm shadow-md leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 border-indigo-500 text-white rounded-br-none"
                      : "bg-slate-900 border-slate-800 text-slate-300 rounded-bl-none"
                  }`}
                >
                  <p>{m.content}</p>
                  
                  {m.role === "assistant" && m.plan && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/10">
                        <Activity className="w-3 h-3 animate-pulse" /> Strategic Plan Updated
                      </span>
                      <button 
                        onClick={() => {
                          setActivePlan(m.plan!);
                          localStorage.setItem("smartdeadline_saved_copilot_plan", JSON.stringify(m.plan));
                          showToast("Loaded selected historical plan view.", "success");
                        }}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer"
                      >
                        Inspect Plan <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {isExtractingFile && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex gap-3 justify-start"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/20 flex items-center justify-center shrink-0 self-start">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                </div>
                <div className="bg-slate-900 border border-slate-800 max-w-[85%] p-4 rounded-2xl rounded-bl-none space-y-2 flex-1">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-indigo-400 font-medium">Extracting syllabus details...</span>
                  </div>
                  <SkeletonPulse className="w-full h-3" />
                </div>
              </motion.div>
            )}

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex gap-3 justify-start"
              >
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-500/20 flex items-center justify-center shrink-0 self-start">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                </div>
                <div className="bg-slate-900 border border-slate-800 max-w-[85%] p-4 rounded-2xl rounded-bl-none space-y-2 flex-1">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-xs text-indigo-400 font-medium">Co-Pilot is analyzing details...</span>
                  </div>
                  <SkeletonPulse className="w-full h-3" />
                  <SkeletonPulse className="w-5/6 h-3" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={chatEndRef} />
        </div>

        {}
        {messages.length <= 1 && !isLoading && !isExtractingFile && (
          <div className="px-4 pb-3 pt-2 shrink-0 border-t border-slate-800 bg-slate-900/30">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2.5">Suggested Prompts</span>
            <div className="flex flex-col gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubmit(s.text)}
                  className={`p-2.5 text-left rounded-xl bg-gradient-to-r border text-xs flex items-start gap-2.5 transition duration-200 hover:scale-[1.01] hover:brightness-110 cursor-pointer ${s.color}`}
                >
                  <s.icon className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-slate-400 mt-0.5 truncate max-w-xs">{s.text}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 self-center opacity-40" />
                </button>
              ))}
            </div>
          </div>
        )}

        {}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleSyllabusUpload}
            className="hidden"
            accept=".pdf,.docx,.doc,.txt"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isExtractingFile}
            title="Upload Syllabus PDF/Doc to summarize"
            className="w-11 h-11 bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-50 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(inputValue)}
            placeholder={isLoading ? "Generating strategic study plan..." : "Tell your Co-Pilot what's on your mind..."}
            disabled={isLoading || isExtractingFile}
            className="flex-1 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-50"
          />
          <button
            onClick={() => handleSubmit(inputValue)}
            disabled={!inputValue.trim() || isLoading || isExtractingFile}
            className="w-11 h-11 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800/80 disabled:text-slate-600 rounded-xl flex items-center justify-center transition shrink-0 cursor-pointer text-white"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {}
      <div className="flex-1 bg-slate-900/10 border border-slate-800/40 rounded-2xl flex flex-col h-full overflow-hidden">
        
        {}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex flex-wrap gap-3 items-center justify-between shrink-0">
          <div>
            <h2 className="font-display font-semibold text-sm text-white flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-indigo-400" /> Active Strategic Plan
            </h2>
            <p className="text-[10px] text-slate-400 font-mono">Dynamic Academic Roadmap</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {activePlan && (
              <>
                <button
                  onClick={handleSavePlan}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Save to Storage"
                >
                  <Save className="w-3.5 h-3.5" /> Save Plan
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Download PDF Summary"
                >
                  <Download className="w-3.5 h-3.5" /> Export PDF
                </button>
                <button
                  onClick={handleAddToCalendar}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title="Sync ICS blocks with external calendar"
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Sync Calendar
                </button>
              </>
            )}
            <button
              onClick={handleRegenerate}
              disabled={!lastUserQuery || isLoading}
              className="px-3 py-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/30 text-indigo-400 hover:text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} /> Regenerate
            </button>
          </div>
        </div>

        {}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-slate-950/20">
          <AnimatePresence mode="wait">
            {activePlan ? (
              <motion.div
                key="plan-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between items-center text-center shadow-md relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition" />
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Completion Chance</span>
                    <div className="relative flex items-center justify-center my-4 h-24 w-24">
                      {}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="rgba(30, 41, 59, 0.5)"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="url(#copilotGrad)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * activePlan.completion_probability) / 100}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="copilotGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <span className="absolute font-display font-black text-2xl text-white">
                        {activePlan.completion_probability}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Predicted likelihood of timely submission</p>
                  </div>

                  {}
                  <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Workload Risk Assessment</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getRiskColor(activePlan.risk_analysis.level)}`}>
                        {activePlan.risk_analysis.level} RISK
                      </span>
                    </div>
                    <div className="my-3">
                      <div className="flex items-center gap-2 text-white font-semibold text-sm">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-500" /> Key Insights & Bottlenecks
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                        {activePlan.risk_analysis.explanation}
                      </p>
                    </div>
                    {}
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800/40">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${activePlan.risk_analysis.score}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          activePlan.risk_analysis.score > 75 
                            ? "bg-rose-500" 
                            : activePlan.risk_analysis.score > 45 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/20 via-indigo-900/10 to-slate-900/50 border border-indigo-500/15 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                  <div className="absolute top-2 right-3 opacity-5 shrink-0 select-none">
                    <Sparkles className="w-24 h-24 text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-xs text-indigo-300 uppercase font-mono tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-indigo-400" /> Co-Pilot Motivational Mindset
                  </h3>
                  <p className="text-sm italic text-slate-200 mt-2.5 leading-relaxed relative z-10 font-medium">
                    "{activePlan.motivation}"
                  </p>
                </div>

                {}
                <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 shadow-lg">
                  <h3 className="font-semibold text-sm text-white border-b border-slate-800 pb-2.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-indigo-400" /> Task Priority & Strategic Ordering
                  </h3>
                  <div className="mt-4 space-y-3">
                    {activePlan.priorities.map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start gap-3.5 hover:border-indigo-500/10 transition duration-200"
                      >
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          {item.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-white truncate">{item.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <CalendarDays className="w-4.5 h-4.5 text-indigo-400" /> Personalized Study blocks
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activePlan.schedule.map((block, idx) => (
                      <div 
                        key={idx}
                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between hover:bg-slate-900/80 transition duration-200 shadow-md relative overflow-hidden"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-indigo-400 font-semibold uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                              {block.time_block}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> 2h block
                            </span>
                          </div>
                          <h4 className="font-semibold text-xs text-white mt-2.5 flex items-center gap-1.5">
                            <Brain className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> {block.focus_area}
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">{block.details}</p>
                        </div>
                        <div className="border-t border-slate-800/60 mt-3 pt-2.5 flex flex-wrap gap-1">
                          {block.tasks.map((t, tIdx) => (
                            <span key={tIdx} className="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800/80 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {}
                <div className="p-4 rounded-xl bg-slate-900/30 border border-slate-800 flex gap-4 items-start shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Coffee className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-white flex items-center gap-1.5">
                      Spaced Break Methodology: <span className="text-emerald-400 font-bold">{activePlan.breaks.type}</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                      {activePlan.breaks.description}
                    </p>
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-indigo-400 animate-pulse" />
                </div>
                <h3 className="font-display font-semibold text-base text-white">No Active Strategic Plan</h3>
                <p className="text-slate-400 text-xs mt-1.5 max-w-sm leading-relaxed">
                  Describe your academic situation, exam timeline pressure, or free study hours in the Co-Pilot Consultation feed to instantly formulate your study roadmap.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
