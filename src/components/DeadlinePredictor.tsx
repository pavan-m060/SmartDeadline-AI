import React, { useState, useEffect, useMemo } from "react";
import { Assignment, AssignmentStatus, StudySession, AIPredictionResult } from "../types";
import { runAIPrediction, fetchAIPredictions, clearAIPredictions } from "../services/api";
import { useToast } from "./Toast";
import { Sparkles, Clock, AlertTriangle, Gauge, Calendar, CheckCircle2, TrendingUp, Zap, RotateCw, ShieldAlert, ListTodo, Lightbulb, Activity, Award, Brain, History, Trash2, LineChart as LineChartIcon, BarChart3, HeartPulse, Flame } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

interface DeadlinePredictorProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  onToggleMilestone: (assignmentId: string, milestoneId: string) => void;
  onUpdateStatus: (assignmentId: string, status: AssignmentStatus) => void;
}

export default function DeadlinePredictor({ 
  assignments, 
  studySessions, 
  onToggleMilestone, 
 
}: DeadlinePredictorProps) {
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  
  // Cache prediction results by assignment ID
  const [cache, setCache] = useState<Record<string, AIPredictionResult>>({});
  // Stored database prediction history for charting and logging
  const [history, setHistory] = useState<AIPredictionResult[]>([]);
  // Visual tab manager: "analysis", "charts", "history"
  const [activeTab, setActiveTab] = useState<"analysis" | "charts" | "history">("analysis");

  // Filter out completed assignments if preferred, but keep them accessible
  const activeAssignments = useMemo(() => {
    return assignments.filter(a => a.status !== "COMPLETED");
  }, [assignments]);

  const selectedAssignment = useMemo(() => {
    return assignments.find(a => a.id === selectedId) || null;
  }, [assignments, selectedId]);

  // Set default selection if none is active
  useEffect(() => {
    if (!selectedId && activeAssignments.length > 0) {
      setSelectedId(activeAssignments[0].id);
    } else if (!selectedId && assignments.length > 0) {
      setSelectedId(assignments[0].id);
    }
  }, [assignments, activeAssignments, selectedId]);

  // Load prediction history from the database on mount
  const loadHistory = async () => {
    try {
      const data = await fetchAIPredictions();
      setHistory(data);
      
      // Seed cache from history for the current selected assignment if available
      if (data && data.length > 0) {
        const cachedMap: Record<string, AIPredictionResult> = {};
        // Group by assignmentId, keeping the latest prediction
        [...data].reverse().forEach(pred => {
          if (pred.assignmentId) {
            cachedMap[pred.assignmentId] = pred;
          }
        });
        setCache(prev => ({ ...prev, ...cachedMap }));
      }
    } catch (err) {

    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Loading indicator sequence
  useEffect(() => {
    if (!loading) return;
    const steps = [
      "Parsing task parameters...",
      "Analyzing remaining milestones & work...",
      "Evaluating past focus hours and consistency...",
      "Consulting AI cognitive models...",
      "Synthesizing deadline threat reports..."
    ];
    let index = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      index = (index + 1) % steps.length;
      setLoadingStep(steps[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, [loading]);

  const handleRunPrediction = async (force: boolean = false) => {
    if (!selectedAssignment) return;
    
    // Check cache
    if (!force && cache[selectedId]) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await runAIPrediction(selectedAssignment, studySessions);
      setCache(prev => ({
        ...prev,
        [selectedId]: result
      }));
      
      // Reload history to ensure charts sync
      await loadHistory();
      showToast("Advanced predictive analysis completed and securely saved to history!", "success");
    } catch (err: any) {

      setError("Failed to fetch detailed AI predictions. Verify your network or API keys.");
      showToast("Forecasting failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Run prediction immediately on select if not cached
  useEffect(() => {
    if (selectedId && !cache[selectedId] && !loading) {
      handleRunPrediction();
    }
  }, [selectedId]);

  // Calculate local client-side helpers for selected assignment
  const assignmentContext = useMemo(() => {
    if (!selectedAssignment) return null;

    const milestones = selectedAssignment.milestones || [];
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.completed).length;
    
    // Days remaining
    const current_date_str = "2026-06-28";
    let daysLeft = 3;
    try {
      const due = new Date(selectedAssignment.dueDate);
      const curr = new Date(current_date_str);
      const diffTime = due.getTime() - curr.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (e) {}

    // Past sessions
    const relatedSessions = studySessions.filter(s => s.assignmentId === selectedAssignment.id);
    const sessionCount = relatedSessions.length;
    const sessionHours = parseFloat((relatedSessions.reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(1));

    return {
      totalMilestones,
      completedMilestones,
      daysLeft,
      sessionCount,
      sessionHours
    };
  }, [selectedAssignment, studySessions]);

  const currentResult = cache[selectedId] || null;

  // Clear history from database
  const handleClearAllHistory = async () => {
    if (window.confirm("Are you sure you want to clear your prediction history from the database? This is irreversible.")) {
      try {
        await clearAIPredictions();
        setHistory([]);
        setCache({});
        showToast("Historical prediction data cleared.", "info");
      } catch (err) {

        showToast("Failed to clear prediction history.", "error");
      }
    }
  };

  // Helper: colors based on risk level
  const getRiskColors = (level: string) => {
    const l = (level || "MEDIUM").toUpperCase();
    if (l === "LOW") return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", fill: "bg-emerald-500", glow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]" };
    if (l === "MEDIUM") return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", fill: "bg-amber-500", glow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]" };
    if (l === "HIGH") return { text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", fill: "bg-rose-500", glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]" };
    return { text: "text-red-500 font-extrabold animate-pulse", bg: "bg-red-500/20 border-red-500/30", fill: "bg-red-500", glow: "shadow-[0_0_20px_rgba(239,68,68,0.5)]" };
  };

  // Stress level parser for charting
  const parseStressLevel = (stress: string): number => {
    if (!stress) return 50;
    const match = stress.match(/(\d+)\/10/);
    if (match) {
      return parseInt(match[1]) * 10;
    }
    const lower = stress.toLowerCase();
    if (lower.includes("high") || lower.includes("severe") || lower.includes("demanding")) {
      return 80;
    }
    if (lower.includes("moderate") || lower.includes("elevated") || lower.includes("medium")) {
      return 55;
    }
    if (lower.includes("low") || lower.includes("relaxed") || lower.includes("balanced")) {
      return 25;
    }
    return 50;
  };

  // Recharts: current profile data
  const profileChartData = useMemo(() => {
    if (!currentResult) return [];
    return [
      { name: "Risk score", value: currentResult.riskScore, color: "#f43f5e" },
      { name: "Completion Prob", value: currentResult.completionProbability, color: "#06b6d4" },
      { name: "Productivity", value: currentResult.productivityScore, color: "#10b981" },
      { name: "Stress level", value: parseStressLevel(currentResult.stressLevel), color: "#f59e0b" },
      { name: "AI Confidence", value: currentResult.confidenceScore, color: "#8b5cf6" }
    ];
  }, [currentResult]);

  // Recharts: chronological history trend data
  const historyChartData = useMemo(() => {
    const filtered = history
      .filter(h => h.assignmentId === selectedId)
      .slice(0, 8)
      .reverse();

    return filtered.map(item => {
      const dateLabel = new Date(item.timestamp).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      return {
        date: dateLabel,
        "Risk Score": item.riskScore,
        "Completion Probability": item.completionProbability,
        "Productivity": item.productivityScore,
        "Stress Level": parseStressLevel(item.stressLevel),
        "Confidence": item.confidenceScore
      };
    });
  }, [history, selectedId]);

  return (
    <div className="space-y-8 pb-12 animate-fade-in font-sans">
      
      {}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-2.5">
            <Gauge className="w-8 h-8 text-indigo-500" />
            AI Timeline Predictor
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Forecast workload pressure, deadlines, stress, and productivity. SmartDeadline AI uses cognitive modeling and historical study sessions to run real-time predictive auditing.
          </p>
        </div>
        
        {}
        {assignments.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-mono">Select Task:</span>
            <select 
              id="assignment-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition max-w-xs"
            >
              <optgroup label="Active Tasks">
                {assignments.filter(a => a.status !== "COMPLETED").map(a => (
                  <option key={a.id} value={a.id}>{a.course}: {a.title}</option>
                ))}
              </optgroup>
              {assignments.some(a => a.status === "COMPLETED") && (
                <optgroup label="Completed Tasks">
                  {assignments.filter(a => a.status === "COMPLETED").map(a => (
                    <option key={a.id} value={a.id}>{a.course}: {a.title} (Completed)</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        )}
      </div>

      {assignments.length === 0 ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center text-slate-500 mx-auto">
            <ListTodo className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white font-display">No Assignments Found</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            You must add an assignment before we can analyze deadline risk. Import a syllabus or create a new assignment manually to activate the predictor.
          </p>
        </div>
      ) : !selectedAssignment ? (
        <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-12 text-center max-w-xl mx-auto">
          <p className="text-slate-400 text-sm">Please select an assignment from the top dropdown to view its risk prediction.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {}
          <div className="lg:col-span-4 space-y-6">
            
            {}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-8 -mt-8" />
              
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/10">
                  {selectedAssignment.course}
                </span>
                <h3 className="text-xl font-bold text-white mt-2 font-display leading-tight">{selectedAssignment.title}</h3>
                <p className="text-slate-400 text-xs mt-1.5 line-clamp-2 italic">{selectedAssignment.description || "No description provided."}</p>
              </div>

              {}
              <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">Due Date</span>
                    <span className="text-xs font-semibold text-slate-300 font-mono">{selectedAssignment.dueDate}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">Time Left</span>
                    <span className={`text-xs font-bold font-mono ${assignmentContext!.daysLeft <= 2 ? "text-rose-400 animate-pulse" : assignmentContext!.daysLeft <= 5 ? "text-amber-400" : "text-emerald-400"}`}>
                      {assignmentContext!.daysLeft > 0 ? `${assignmentContext!.daysLeft} days` : assignmentContext!.daysLeft === 0 ? "Today!" : "Overdue"}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">Difficulty</span>
                    <span className={`text-xs font-bold ${selectedAssignment.difficulty === "HARD" ? "text-rose-400" : selectedAssignment.difficulty === "MEDIUM" ? "text-amber-400" : "text-emerald-400"}`}>
                      {selectedAssignment.difficulty}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500 block">Estimated Effort</span>
                    <span className="text-xs font-semibold text-slate-300 font-mono">
                      {selectedAssignment.estimatedHours}h <span className="text-[10px] text-slate-500 font-normal font-sans">({selectedAssignment.actualHoursSpent}h done)</span>
                    </span>
                  </div>
                </div>
              </div>

              {}
              <div className="border-t border-slate-800/60 pt-4">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">PAST PRODUCTIVITY</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[11px] text-slate-400 font-medium">Logged Hours</span>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{assignmentContext?.sessionHours}h</div>
                  </div>
                  <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-[11px] text-slate-400 font-medium">Study Sessions</span>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{assignmentContext?.sessionCount} blocks</div>
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white font-display">Remaining Milestones</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Toggle milestones to update the risk baseline.</p>
                </div>
                <div className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                  {assignmentContext?.completedMilestones} / {assignmentContext?.totalMilestones} Done
                </div>
              </div>

              {}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850/50">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-500"
                  style={{ width: `${assignmentContext?.totalMilestones ? (assignmentContext.completedMilestones / assignmentContext.totalMilestones) * 100 : 0}%` }}
                />
              </div>

              {}
              {selectedAssignment.milestones && selectedAssignment.milestones.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {selectedAssignment.milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      onClick={() => onToggleMilestone(selectedAssignment.id, milestone.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                        milestone.completed 
                          ? "bg-indigo-950/10 border-indigo-500/20 text-slate-400 hover:bg-indigo-950/20" 
                          : "bg-slate-900/50 border-slate-800/50 text-slate-200 hover:bg-slate-900/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="pt-0.5 shrink-0">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          milestone.completed 
                            ? "bg-indigo-500 border-indigo-500 text-slate-950" 
                            : "border-slate-600 hover:border-indigo-400"
                        }`}>
                          {milestone.completed && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3] text-white" />}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className={`text-xs font-medium block leading-relaxed ${milestone.completed ? "line-through text-slate-500" : "text-slate-300"}`}>
                          {milestone.title}
                        </span>
                        {milestone.dueDate && (
                          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">Target: {milestone.dueDate}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-xs text-slate-500 italic">No structured milestones loaded.</p>
                  <p className="text-[10px] text-slate-500 mt-1">Generate a study plan in the "AI Planner" to add structured milestones.</p>
                </div>
              )}
            </div>

          </div>

          {}
          <div className="lg:col-span-8 space-y-6">
            
            {}
            <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none" />
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-display">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Advanced Cognitive Forecasting
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Have you logged study hours or updated milestones? Run the AI analytical engine to compute risk profiles, study workloads, and stress models.
                </p>
              </div>
              <button
                id="run-predictor-btn"
                disabled={loading}
                onClick={() => handleRunPrediction(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/15 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] transition duration-200 shrink-0 select-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Evaluating workload...</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4" />
                    <span>Run AI Predictive Analytics</span>
                  </>
                )}
              </button>
            </div>

            {loading ? (
              
              <div className="bg-slate-900/40 border border-slate-800/80 p-12 rounded-3xl text-center space-y-6 animate-pulse">
                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                  <RotateCw className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-md font-bold text-white font-display">Generating AI Predictive Forecast</h4>
                  <p className="text-xs text-indigo-400 font-mono tracking-wide">{loadingStep}</p>
                </div>
                <div className="max-w-xs mx-auto space-y-2.5 pt-4">
                  <div className="h-2 bg-slate-800 rounded-full w-full" />
                  <div className="h-2 bg-slate-850 rounded-full w-4/5 mx-auto" />
                  <div className="h-2 bg-slate-850 rounded-full w-2/3 mx-auto" />
                </div>
              </div>
            ) : error ? (
              
              <div className="bg-rose-950/10 border border-rose-900/30 p-12 rounded-3xl text-center space-y-4">
                <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-white font-display">API Evaluation Failed</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => handleRunPrediction(true)}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : currentResult ? (
              
              <div className="space-y-6">
                
                {}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">DEADLINE RISK</span>
                      <ShieldAlert className={`w-4 h-4 ${getRiskColors(currentResult.riskLevel).text}`} />
                    </div>
                    <div className="my-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-extrabold text-white font-mono">{currentResult.riskScore}%</span>
                        <span className={`text-[10px] font-bold tracking-wider uppercase font-mono ${getRiskColors(currentResult.riskLevel).text}`}>
                          {currentResult.riskLevel}
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-850">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${getRiskColors(currentResult.riskLevel).fill}`} 
                          style={{ width: `${currentResult.riskScore}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1 italic">Threat level relative to remaining hours.</span>
                  </div>

                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">EXPECTED COMPLETION</span>
                      <Calendar className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="my-2">
                      <div className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {currentResult.expectedCompletion}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Projected timeline delay/safety cushion.</span>
                  </div>

                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">STUDY WORKLOAD</span>
                      <Flame className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="my-2">
                      <div className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {currentResult.studyWorkload}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Commitment pace required daily.</span>
                  </div>

                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">STRESS LEVEL</span>
                      <HeartPulse className="w-4 h-4 text-rose-500 animate-pulse" />
                    </div>
                    <div className="my-2">
                      <div className="text-sm font-bold text-white line-clamp-2 leading-snug">
                        {currentResult.stressLevel}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">Cognitive overload prediction.</span>
                  </div>

                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">PRODUCTIVITY SCORE</span>
                      <Award className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-extrabold text-white font-mono">
                        {currentResult.productivityScore}<span className="text-xs text-slate-500">/100</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">Focus Efficiency Rating</span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic">Modeled on focused history.</span>
                  </div>

                  {}
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-bold">PREDICTION CONFIDENCE</span>
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="my-2">
                      <div className="text-2xl font-extrabold text-white font-mono">
                        {currentResult.confidenceScore}%
                      </div>
                      <span className="text-[10px] font-mono font-bold text-purple-400">High Reliability</span>
                    </div>
                    <span className="text-[10px] text-slate-400 italic">Based on available telemetry density.</span>
                  </div>

                </div>

                {}
                <div className="border-b border-slate-800/80 flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "analysis"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    AI Reasoning & Remedies
                  </button>
                  <button
                    onClick={() => setActiveTab("charts")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "charts"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    Prediction Charts ({profileChartData.length > 0 ? "Active" : "None"})
                  </button>
                  <button
                    onClick={() => setActiveTab("history")}
                    className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                      activeTab === "history"
                        ? "border-indigo-500 text-white bg-indigo-500/5"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Secure Logs History ({history.filter(h => h.assignmentId === selectedId).length})
                  </button>
                </div>

                {}
                {activeTab === "analysis" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {}
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-3.5 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                          <Lightbulb className="w-4.5 h-4.5 text-yellow-400 shrink-0" />
                          AI Predictive Logic
                        </h4>
                        <p className="text-slate-300 text-xs leading-relaxed font-sans font-medium text-justify">
                          {currentResult.analysis}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                        📊 Confidence rating computed by analyzing remaining sub-milestones against previous study speed.
                      </div>
                    </div>

                    {}
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                      <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                        <Activity className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                        AI Recommended Interventions
                      </h4>
                      <div className="space-y-2.5">
                        {currentResult.interventions && currentResult.interventions.length > 0 ? (
                          currentResult.interventions.map((remedy, idx) => (
                            <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-start gap-3 hover:border-slate-700/80 transition duration-150 group">
                              <div className="w-5.5 h-5.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 group-hover:bg-emerald-500 group-hover:text-slate-950 transition duration-200">
                                {idx + 1}
                              </div>
                              <p className="text-slate-300 text-xs leading-relaxed font-sans">{remedy}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 text-xs italic">No specific interventions available.</p>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {}
                {activeTab === "charts" && (
                  <div className="grid grid-cols-1 gap-6">
                    
                    {}
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white font-display">Active Prediction Profile</h4>
                          <p className="text-[11px] text-slate-400">Core metrics rating index for current evaluation.</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded">
                          Live Active Data
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl">
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={profileChartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "12px" }}
                              labelStyle={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}
                              itemStyle={{ fontSize: 12 }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={45}>
                              {profileChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {}
                    {historyChartData.length > 1 ? (
                      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-white font-display">Historical Progress Trend</h4>
                          <p className="text-[11px] text-slate-400">Chronological trend of deadline risk vs completion probability.</p>
                        </div>
                        
                        <div className="w-full bg-slate-950/40 border border-slate-850/60 p-4 rounded-xl">
                          <ResponsiveContainer width="100%" height={260}>
                            <AreaChart data={historyChartData} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                              <defs>
                                <linearGradient id="trendRisk" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="trendProb" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                              <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} unit="%" tickLine={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "12px" }} />
                              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                              <Area type="monotone" name="Risk level (%)" dataKey="Risk Score" stroke="#f43f5e" fillOpacity={1} fill="url(#trendRisk)" strokeWidth={2.5} />
                              <Area type="monotone" name="Completion Probability (%)" dataKey="Completion Probability" stroke="#06b6d4" fillOpacity={1} fill="url(#trendProb)" strokeWidth={2.5} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-800 p-12 rounded-2xl text-center text-slate-500">
                        <LineChartIcon className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
                        <p className="text-xs">Timeline Progress History needs at least 2 database entries.</p>
                        <p className="text-[10px] text-slate-500 mt-1">Change milestones status and click 'Run AI Predictive Analytics' again to build logging trends!</p>
                      </div>
                    )}

                  </div>
                )}

                {}
                {activeTab === "history" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white font-display">Database Historical Logs</h4>
                        <p className="text-[11px] text-slate-400">Authentic saved runs loaded from the cloud database.</p>
                      </div>
                      {history.length > 0 && (
                        <button
                          onClick={handleClearAllHistory}
                          className="px-3.5 py-2 border border-rose-950 hover:bg-rose-950/20 text-rose-400 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear Secure History
                        </button>
                      )}
                    </div>

                    <div className="space-y-3.5">
                      {history.filter(h => h.assignmentId === selectedId).length > 0 ? (
                        history
                          .filter(h => h.assignmentId === selectedId)
                          .map((log) => (
                            <div key={log.id} className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850/80 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2.5 h-2.5 rounded-full ${getRiskColors(log.riskLevel).fill}`} />
                                  <span className="text-xs font-bold text-white uppercase font-mono tracking-wide">{log.riskLevel} Risk</span>
                                  <span className="text-slate-500 text-xs font-mono">|</span>
                                  <span className="text-xs text-slate-300 font-mono">Risk Score: {log.riskScore}%</span>
                                  <span className="text-slate-500 text-xs font-mono">|</span>
                                  <span className="text-xs text-slate-300 font-mono">Prob: {log.completionProbability}%</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              
                              <p className="text-xs text-slate-300 italic">"{log.analysis}"</p>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 border-t border-slate-850/40 text-[11px] font-mono">
                                <div>
                                  <span className="text-slate-500 block uppercase text-[9px]">Expected</span>
                                  <span className="text-slate-300 font-bold">{log.expectedCompletion}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block uppercase text-[9px]">Daily Workload</span>
                                  <span className="text-slate-300 font-bold">{log.studyWorkload}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block uppercase text-[9px]">Stress Rating</span>
                                  <span className="text-slate-300 font-bold">{log.stressLevel}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block uppercase text-[9px]">Productivity</span>
                                  <span className="text-slate-300 font-bold">{log.productivityScore}/100</span>
                                </div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl p-12 text-center text-slate-400">
                          <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-xs">No saved predictions found for this task yet.</p>
                          <p className="text-[10px] text-slate-500 mt-1">Run predictions on this assignment to start tracking historical changes!</p>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {}
                <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-500 font-mono">
                    💡 predictions are securely archived in your cloud-native workspace database. Clearing history cleanses charts.
                  </p>
                </div>

              </div>
            ) : (
              
              <div className="bg-slate-900/40 border border-slate-800/80 p-12 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto text-indigo-400">
                  <Sparkles className="w-8 h-8 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-white">Prediction Run Required</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Analyze deadline threat risk, expected completion dates, workloads, stress loads, and productivity curves in one click.
                </p>
                <button
                  onClick={() => handleRunPrediction(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Generate Initial Prediction
                </button>
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
