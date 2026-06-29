import { useMemo, useState, useEffect, FormEvent } from "react";
import { Assignment, StudySession, Notification } from "../types";
import { Calendar, CheckCircle2, Clock, Flame, ArrowUpRight, Sparkles, Play, TrendingUp, ListTodo, CheckSquare, Bookmark, Bell, Check, Plus, BookOpen, CalendarDays, Target, ChevronRight, ArrowRight, PlusCircle, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { fetchNotifications, markNotificationAsRead, fetchNextTaskRecommendation, RecommendationResult } from "../services/api";
import { NotificationSkeleton } from "./Skeleton";

import { formatDueDate } from "../utils";

interface DashboardProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  stats: {
    total: number;
    completed: number;
    streak: number;
    totalHours: number;
  };
  onNavigateToTab: (tab: string) => void;
  onSelectAssignmentForTimer: (assignmentId: string) => void;
  onAddAssignment?: (formData: any) => void;
}

export default function Dashboard({ 
  assignments, 
  studySessions, 
  stats, 
  onNavigateToTab,
  onSelectAssignmentForTimer,
  onAddAssignment
}: DashboardProps) {

  // Live Notifications State
  const [dashboardNotifs, setDashboardNotifs] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Live AI Recommendation State
  const [aiRec, setAiRec] = useState<RecommendationResult | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState("");
  const [quickCourse, setQuickCourse] = useState("");
  const [quickDueDate, setQuickDueDate] = useState("");
  const [quickPriority, setQuickPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  // Helper function to get today's date in local ISO style (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Date().toISOString().substring(0, 10);
  }, []);

  // Check if dates match today
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    return dateString.substring(0, 10) === todayStr;
  };

  // Check if date is within past N days
  const isWithinPastDays = (dateString: string, numDays: number) => {
    if (!dateString) return false;
    const dateObj = new Date(dateString);
    const diffTime = new Date().getTime() - dateObj.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= numDays;
  };

  // Fetch Live Notifications
  useEffect(() => {
    const loadDashboardNotifs = async () => {
      setLoadingNotifs(true);
      try {
        const data = await fetchNotifications();
        const sorted = [...data].sort((a, b) => {
          if (a.read !== b.read) {
            return a.read ? 1 : -1; // Unread first
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // Then newest
        });
        setDashboardNotifs(sorted.slice(0, 4)); // Get up to 4
      } catch (err) {

      } finally {
        setLoadingNotifs(false);
      }
    };

    loadDashboardNotifs();
  }, [assignments]); // Refresh notifications when assignments update

  // Fetch Live AI Recommendation
  useEffect(() => {
    const loadAiRecommendation = async () => {
      setLoadingRec(true);
      try {
        const recommendation = await fetchNextTaskRecommendation(assignments, studySessions);
        setAiRec(recommendation);
      } catch (err) {

      } finally {
        setLoadingRec(false);
      }
    };

    if (assignments.length > 0) {
      loadAiRecommendation();
    }
  }, [assignments, studySessions]);

  // Mark single notification as read locally
  const handleMarkAsReadLocal = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setDashboardNotifs(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {

    }
  };

  // Handle Quick Add Submit
  const handleQuickAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!quickTitle || !quickCourse || !quickDueDate) return;

    setQuickSubmitting(true);
    try {
      if (onAddAssignment) {
        await onAddAssignment({
          title: quickTitle,
          course: quickCourse,
          dueDate: quickDueDate.includes("T") ? quickDueDate : `${quickDueDate}T23:59`,
          priority: quickPriority,
          difficulty: "MEDIUM",
          weight: 10,
          estimatedHours: 4,
          description: "Quick-added from the academic performance dashboard.",
          attachments: [],
          suggestedMilestones: []
        });

        // Form feedback
        setQuickTitle("");
        setQuickCourse("");
        setQuickDueDate("");
        setQuickPriority("MEDIUM");
        setQuickAddSuccess(true);
        setTimeout(() => setQuickAddSuccess(false), 5000);
      }
    } catch (err) {

    } finally {
      setQuickSubmitting(false);
    }
  };

  // Apply AI recommended assignment to timer and navigate
  const handleApplyAiRecommendation = () => {
    if (!aiRec) return;
    if (aiRec.recommended_assignment_id && aiRec.recommended_assignment_id !== "none") {
      onSelectAssignmentForTimer(aiRec.recommended_assignment_id);
    } else {
      // General focus
      onSelectAssignmentForTimer("");
    }
  };

  // --- DERIVED METRICS FROM LIVE BACKEND DATA ---

  // Sort assignments by proximity to due date (non-completed only)
  const upcomingDeadlines = useMemo(() => {
    return assignments
      .filter(a => a.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [assignments]);

  // Filter 4 most recently added/updated assignments
  const recentAssignments = useMemo(() => {
    return [...assignments]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [assignments]);

  // Assignments completed
  const completedTasks = useMemo(() => {
    return assignments.filter(a => a.status === 'COMPLETED');
  }, [assignments]);

  // Today's schedule elements
  const assignmentsDueToday = useMemo(() => {
    return assignments.filter(a => isToday(a.dueDate) && a.status !== 'COMPLETED');
  }, [assignments]);

  const studySessionsToday = useMemo(() => {
    return studySessions.filter(s => isToday(s.date));
  }, [studySessions]);

  const totalMinutesToday = useMemo(() => {
    return studySessionsToday.reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [studySessionsToday]);

  // Weekly stats
  const weeklyStudyMinutes = useMemo(() => {
    return studySessions
      .filter(s => isWithinPastDays(s.date, 7))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [studySessions]);

  const weeklyGoalMinutes = 300; // 5 hours target
  const weeklyProgressPercentage = Math.min(100, Math.round((weeklyStudyMinutes / weeklyGoalMinutes) * 100));

  const weeklyCompletedTasks = useMemo(() => {
    return completedTasks.filter(a => isWithinPastDays(a.dueDate, 7)).length;
  }, [completedTasks]);

  // Monthly stats
  const monthlyStudyMinutes = useMemo(() => {
    return studySessions
      .filter(s => isWithinPastDays(s.date, 30))
      .reduce((sum, s) => sum + s.durationMinutes, 0);
  }, [studySessions]);

  const monthlyGoalMinutes = 1200; // 20 hours target
  const monthlyProgressPercentage = Math.min(100, Math.round((monthlyStudyMinutes / monthlyGoalMinutes) * 100));

  const monthlyCompletedTasks = useMemo(() => {
    return completedTasks.filter(a => isWithinPastDays(a.dueDate, 30)).length;
  }, [completedTasks]);

  // Dynamic Productivity Score (0 to 100)
  const productivityScore = useMemo(() => {
    const totalCount = assignments.length;
    if (totalCount === 0) return 85; 
    
    const completionRate = completedTasks.length / totalCount;
    const hoursFactor = Math.min(1.0, stats.totalHours / 20);
    const streakFactor = Math.min(1.0, stats.streak / 10);
    
    const score = Math.round(
      (completionRate * 45) + 
      (hoursFactor * 35) + 
      (streakFactor * 20)
    );
    
    return Math.max(40, Math.min(100, score));
  }, [assignments, completedTasks, stats]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8 pb-16"
    >
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-sans font-semibold text-3xl text-slate-100 tracking-tight">
            Academic Performance Dashboard
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Empower your studies with live analytics, adaptive feedback, and strategic task breakdowns.
          </p>
        </div>
        
        {}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigateToTab("syllabus-scanner")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-800 hover:border-slate-700 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-300" />
            <span>Scan Syllabus</span>
          </button>
          
          <button
            onClick={() => onNavigateToTab("study-planner")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 rounded-xl text-xs font-semibold shadow-sm shadow-sm transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-100 " />
            <span>AI Study Planner</span>
          </button>
        </div>
      </div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        
        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-purple/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Assignments</span>
            <Bookmark className="w-4 h-4 text-slate-300" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-100">{assignments.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total track list</p>
          </div>
        </motion.div>

        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Pending</span>
            <ListTodo className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-100">
              {assignments.filter(a => a.status !== 'COMPLETED').length}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Remaining active</p>
          </div>
        </motion.div>

        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Completed</span>
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-emerald-400">{completedTasks.length}</div>
            <p className="text-[11px] text-slate-400 mt-1">Finished syllabus items</p>
          </div>
        </motion.div>

        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-sky-500/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Study Hours</span>
            <Clock className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-100">{stats.totalHours.toFixed(1)}h</div>
            <p className="text-[11px] text-slate-400 mt-1">Focused duration</p>
          </div>
        </motion.div>

        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Streak</span>
            <Flame className={`w-4 h-4 ${stats.streak > 0 ? "text-orange-500 " : "text-slate-500"}`} />
          </div>
          <div>
            <div className="text-2xl font-semibold text-slate-100 flex items-center gap-1">
              {stats.streak} <span className="text-xs text-slate-400 font-sans">days</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              {stats.streak > 0 ? "🔥 Keep it burning!" : "Log a focus block"}
            </p>
          </div>
        </motion.div>

        {}
        <motion.div whileHover={{ scale: 1.02, y: -2 }} className="bg-slate-900 border border-slate-800/50 p-4 rounded-xl flex flex-col justify-between hover:border-slate-800 transition-colors shadow-sm  relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full " />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-slate-500 font-medium">Prod. Score</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <div className="text-2xl font-semibold text-indigo-400">{productivityScore}</div>
              <span className="text-xs text-slate-500 font-mono">/100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Calculated efficiency</p>
          </div>
        </motion.div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {}
        <div className="lg:col-span-2 space-y-6">

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm  space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-slate-300" />
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">Today's Schedule</h3>
                  <p className="text-xs text-slate-400">Your agenda and activities for today ({todayStr})</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold bg-brand-purple/10 text-indigo-300 px-2 py-0.5 rounded">
                {totalMinutesToday}m Focused Today
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Due/Pending Today
                </h4>
                
                {assignmentsDueToday.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-center text-xs text-slate-500 italic">
                    ✅ No major deadlines due today!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {assignmentsDueToday.map(assignment => (
                      <div key={assignment.id} className="p-3 bg-slate-950 border border-rose-500/10 rounded-xl flex justify-between items-center">
                        <div className="min-w-0 pr-2">
                          <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10 uppercase">
                            {assignment.course}
                          </span>
                          <p className="text-xs font-bold text-slate-100 mt-1 truncate">{assignment.title}</p>
                        </div>
                        <button
                          onClick={() => onSelectAssignmentForTimer(assignment.id)}
                          className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 hover:border-rose-500/40 rounded text-xs font-bold text-rose-300 transition shrink-0"
                        >
                          Focus Now
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-slate-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Logged Sessions Today
                </h4>

                {studySessionsToday.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 text-center text-xs text-slate-400">
                    <p className="italic text-slate-500">No focus blocks recorded today yet.</p>
                    <button 
                      onClick={() => onNavigateToTab("focus-timer")}
                      className="text-xs text-slate-300 hover:text-indigo-300 font-bold mt-1.5 underline"
                    >
                      Launch timer and study
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {studySessionsToday.map(session => {
                      const boundAssignment = assignments.find(a => a.id === session.assignmentId);
                      return (
                        <div key={session.id} className="p-2.5 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[11px] font-mono text-slate-500 uppercase">
                              {boundAssignment ? boundAssignment.course : "General Study"}
                            </span>
                            <p className="text-xs font-semibold text-slate-200 truncate">
                              {boundAssignment ? boundAssignment.title : "Self-driven study block"}
                            </p>
                            {session.notes && <p className="text-[11px] text-slate-500 italic truncate mt-0.5">"{session.notes}"</p>}
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 shrink-0">
                            +{session.durationMinutes}m
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm ">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-sans">Upcoming Deadlines</h3>
                <p className="text-xs text-slate-400">Pending tasks prioritized chronologically</p>
              </div>
              <button 
                onClick={() => onNavigateToTab("assignments")}
                className="text-xs font-semibold text-slate-300 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                ✨ Zero imminent deadlines. Perfect slate!
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((item) => {
                  const daysLeft = Math.ceil(
                    (new Date(item.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div 
                      key={item.id}
                      className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-300 bg-brand-purple/10 px-2 py-0.5 rounded border border-indigo-500/10 uppercase tracking-wide">
                            {item.course}
                          </span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${
                            item.priority === 'URGENT' ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                            item.priority === 'HIGH' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                            "text-slate-400 bg-slate-500/10 border-slate-800"
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-100 mt-1">{item.title}</h4>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-left sm:text-right">
                          <div className={`text-xs font-semibold ${
                            daysLeft < 0 ? "text-rose-400" :
                            daysLeft <= 2 ? "text-amber-400 " :
                            "text-slate-300"
                          }`}>
                            {daysLeft < 0 ? "Overdue" :
                             daysLeft === 0 ? "Due Today" :
                             daysLeft === 1 ? "Due Tomorrow" :
                             `Due in {daysLeft} days`}
                          </div>
                          <span className="text-xs text-slate-500 font-mono">{formatDueDate(item.dueDate)}</span>
                        </div>
                        <button
                          onClick={() => onSelectAssignmentForTimer(item.id)}
                          className="p-2 bg-slate-900 hover:bg-indigo-600/20 text-slate-400 hover:text-slate-300 rounded-lg border border-slate-800 hover:border-indigo-500/30 transition cursor-pointer"
                          title="Launch Focus Block Timer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm ">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 font-sans">Recent Assignments</h3>
                <p className="text-xs text-slate-400">Latest additions to your curriculum catalog</p>
              </div>
              <button 
                onClick={() => onNavigateToTab("assignments")}
                className="text-xs font-semibold text-slate-300 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <span>Manage Coursework</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentAssignments.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                📂 No assignments logged yet. Create one with Quick Add!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {recentAssignments.map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl space-y-2 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wide truncate max-w-[120px]">
                          {assignment.course}
                        </span>
                        
                        <span className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                          assignment.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                          assignment.status === 'REVIEW' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20' :
                          assignment.status === 'IN_PROGRESS' ? 'text-sky-400 bg-sky-500/10 border-sky-500/20' :
                          'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>
                          {assignment.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 mt-1 line-clamp-1">{assignment.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{assignment.description || "No description provided."}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs font-mono text-slate-500">
                      <span>Due: {formatDueDate(assignment.dueDate)}</span>
                      <span className="text-slate-300 font-semibold">{assignment.estimatedHours} hrs est.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm  space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-100 font-sans">Focus Progress Tracking</h3>
              <p className="text-xs text-slate-400">Consolidated analytics based on historical session intervals</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <span className="text-xs font-bold text-slate-100 font-sans">Weekly Progress</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-slate-300">
                    {weeklyStudyMinutes}/{weeklyGoalMinutes} mins
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-brand-purple h-full rounded-full transition-all duration-500"
                      style={{ width: `${weeklyProgressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>{weeklyProgressPercentage}% of goal met</span>
                    <span>Goal: 5 hrs</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-center">
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <span className="text-xs text-slate-400 block font-mono">COMPLETED</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{weeklyCompletedTasks} tasks</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <span className="text-xs text-slate-400 block font-mono">HOURS</span>
                    <span className="text-sm font-bold text-slate-300 font-mono">{(weeklyStudyMinutes/60).toFixed(1)} hrs</span>
                  </div>
                </div>
              </div>

              {}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-3.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-100 font-sans">Monthly Progress</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-purple-400">
                    {monthlyStudyMinutes}/{monthlyGoalMinutes} mins
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className="bg-purple-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${monthlyProgressPercentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-slate-500">
                    <span>{monthlyProgressPercentage}% of goal met</span>
                    <span>Goal: 20 hrs</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-center">
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <span className="text-xs text-slate-400 block font-mono">COMPLETED</span>
                    <span className="text-sm font-bold text-slate-100 font-mono">{monthlyCompletedTasks} tasks</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <span className="text-xs text-slate-400 block font-mono">HOURS</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{(monthlyStudyMinutes/60).toFixed(1)} hrs</span>
                  </div>
                </div>
              </div>

            </div>

            {}
            <div className="p-4 bg-indigo-950/20 border border-indigo-500/10 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-brand-purple/10 text-slate-300 shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-100 font-sans block">Total Achievements</span>
                  <span className="text-xs text-indigo-300">Successfully completed {completedTasks.length} curriculum obligations!</span>
                </div>
              </div>

              {completedTasks.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 max-w-xs overflow-hidden">
                  {completedTasks.slice(0, 2).map(task => (
                    <div key={task.id} className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 truncate" title={task.title}>
                      ✓ {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>


        {}
        <div className="space-y-6">

          {}
          <div className="bg-slate-900 border border-slate-800/50 from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30 p-6 rounded-xl shadow-sm border-slate-800 relative overflow-hidden flex flex-col justify-between">
            
            
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-purple/20 border border-indigo-500/30 flex items-center justify-center text-slate-300">
                  <Sparkles className="w-4 h-4 " />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 font-sans">AI Recommendations</h3>
                  <p className="text-xs font-mono text-slate-300 font-medium font-semibold">AI Study Coach</p>
                </div>
              </div>

              {loadingRec ? (
                <div className="py-12 text-center space-y-3 bg-slate-950 border border-slate-850 rounded-xl">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <span className="text-xs text-slate-400 block font-mono">Analyzing syllabus and workload...</span>
                </div>
              ) : aiRec ? (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-[11px] font-mono font-bold text-indigo-300 bg-brand-purple/10 px-1.5 py-0.5 rounded border border-indigo-500/10 uppercase">
                      Recommended: {aiRec.course}
                    </span>
                    <h4 className="text-xs font-bold text-slate-100">{aiRec.recommended_assignment_title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed italic mt-1">"{aiRec.reason}"</p>
                    {aiRec.message && (
                      <p className="text-xs text-slate-400 pt-1 border-t border-slate-900 mt-2 leading-relaxed">
                        💡 {aiRec.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleApplyAiRecommendation}
                      className="w-full py-2.5 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-semibold rounded-xl text-xs transition cursor-pointer text-center flex items-center justify-center gap-2"
                    >
                      <span>Focus on Suggested Task ({aiRec.suggested_duration}m)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  ✨ No custom recommendations calculated yet. Create some assignments to activate!
                </div>
              )}
            </div>
          </div>

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm  space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-medium font-mono">Quick Add Assignment</h3>
                <p className="text-xs text-slate-500">Add to your live schedule instantly</p>
              </div>
            </div>

            {quickAddSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Assignment added and synced!</span>
              </div>
            )}

            <form onSubmit={handleQuickAddSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Assignment Title</label>
                <input 
                  type="text" 
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="e.g., Final Research Proposal"
                  className="w-full text-xs bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 outline-none transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Course Code</label>
                  <input 
                    type="text" 
                    value={quickCourse}
                    onChange={(e) => setQuickCourse(e.target.value)}
                    placeholder="e.g., CS-101"
                    className="w-full text-xs bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-2 outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400 uppercase">Priority</label>
                  <select 
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as any)}
                    className="w-full text-xs bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-1.8 outline-none transition cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-400 uppercase">Due Date</label>
                <input 
                  type="date" 
                  value={quickDueDate}
                  onChange={(e) => setQuickDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-indigo-500 text-slate-100 rounded-lg px-3 py-1.8 outline-none transition cursor-pointer"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={quickSubmitting}
                className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {quickSubmitting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create & Sync Task</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {}
          <div className="bg-slate-900 border border-slate-800/50 p-6 rounded-xl shadow-sm  relative overflow-hidden" id="dashboard-notifications-card">
            
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-slate-100 font-sans">Live Notifications</h3>
                  <p className="text-[11px] text-slate-400">Intelligent system logs</p>
                </div>
              </div>
              
              <button 
                onClick={() => onNavigateToTab("notifications")}
                className="text-xs font-semibold text-slate-300 hover:text-indigo-300 flex items-center gap-0.5 transition cursor-pointer"
                id="view-all-notifications-btn"
              >
                <span>Full Center</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            
            {loadingNotifs ? (
              <NotificationSkeleton />
            ) : dashboardNotifs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                🔔 All caught up! No notifications.
              </div>
            ) : (
              <div className="space-y-2.5">
                {dashboardNotifs.map((notif) => (
                  <div 
                    key={notif.id}
                    className={`p-3 rounded-xl border flex items-start gap-2 transition relative ${
                      notif.read 
                        ? "bg-slate-950 border-slate-800" 
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    {!notif.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0 " />
                    )}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className="text-[11px] font-bold text-slate-100 truncate">{notif.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsReadLocal(notif.id);
                        }}
                        className="p-1 rounded bg-brand-purple/10 hover:bg-brand-purple/20 text-slate-300 hover:text-indigo-300 border border-indigo-500/10 transition flex-shrink-0 cursor-pointer"
                        title="Mark Read"
                      >
                        <Check className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </motion.div>
  );
}
