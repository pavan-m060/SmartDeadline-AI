import React, { useState, useMemo, DragEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, CheckCircle2, AlertCircle, Target, FileText, Sparkles, Award, Download, Trash2, Check, CornerDownRight, Flag, Coffee, X, Info } from "lucide-react";
import { Assignment, StudySession, Milestone, Priority, AssignmentStatus } from "../types";
import { useToast } from "./Toast";

interface AcademicCalendarProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  onUpdateAssignment: (assignment: Assignment) => Promise<void>;
  onAddStudySessions?: (sessions: StudySession[]) => Promise<void>;
  onUpdateStudySession?: (session: StudySession) => Promise<void>;
  onDeleteStudySession?: (sessionId: string) => Promise<void>;
  onAddClick?: () => void;
  onSelectAssignmentForTimer?: (id: string) => void;
}

type ViewMode = "month" | "week" | "day";

export default function AcademicCalendar({ 
  assignments, 
  studySessions, 
  onUpdateAssignment,
  onAddStudySessions,
  onUpdateStudySession,
  onDeleteStudySession,
 
  onSelectAssignmentForTimer
}: AcademicCalendarProps) {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  
  // Date states
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 5, 27)); // Base anchor month matching dataset context (June 2026)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 5, 27));
  
  // Drag and drop / UI state
  const [ setDraggedItem] = useState<{ type: "assignment" | "milestone" | "session"; id: string; assignmentId?: string } | null>(null);
  const [isDraggingOverDate, setIsDraggingOverDate] = useState<string | null>(null);
  
  // Slide out sidebar and filter states
  const [showUnscheduledPanel, setShowUnscheduledPanel] = useState(true);
  const [filters, setFilters] = useState({
    assignments: true,
    exams: true,
    sessions: true,
    milestones: true
  });

  // Schedule Study Session Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    assignmentId: "",
    date: "2026-06-27",
    time: "14:00",
    durationMinutes: 60,
    notes: "",
    recurrence: "none", // none | daily | weekly | bi-weekly
    occurrences: 4
  });

  // Detail Modal State
  const [selectedEventDetails, setSelectedEventDetails] = useState<{
    type: "assignment" | "milestone" | "session";
    data: any;
    parentAssignment?: Assignment; // For milestones
  } | null>(null);

  const openEventDetails = (type: "assignment" | "milestone" | "session", data: any, parentAssignment?: Assignment) => {
    setSelectedEventDetails({ type, data, parentAssignment });
  };

  const handleUpdateAssignmentStatus = async (assignment: Assignment, nextStatus: AssignmentStatus) => {
    try {
      const updated = { ...assignment, status: nextStatus };
      await onUpdateAssignment(updated);
      setSelectedEventDetails(prev => prev ? { ...prev, data: updated } : null);
      showToast(`Updated "${assignment.title}" to ${nextStatus}`, "success");
    } catch (e) {

      showToast("Error updating assignment status", "error");
    }
  };

  const handleCancelStudySession = async (sessionId: string) => {
    if (!onDeleteStudySession) return;
    try {
      await onDeleteStudySession(sessionId);
      setSelectedEventDetails(null);
      showToast("Study session canceled successfully", "success");
    } catch (e) {

      showToast("Error canceling study session", "error");
    }
  };

  const isOverdue = (dateStr: string, isCompleted: boolean): boolean => {
    if (isCompleted) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(dateStr);
    deadline.setHours(0, 0, 0, 0);
    return deadline.getTime() < today.getTime();
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Week navigation helpers
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  // Day navigation helpers
  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
    setSelectedDate(d);
  };

  // Reset to relative baseline
  const handleToday = () => {
    const today = new Date();
    // Anchor onto 2026 for cohesive academic syllabus context
    const target = new Date(2026, today.getMonth(), today.getDate());
    setCurrentDate(target);
    setSelectedDate(target);
    showToast("Jipped to baseline calendar space", "info");
  };

  // Get start of the week
  const getStartOfWeek = (date: Date): Date => {
    const temp = new Date(date);
    const day = temp.getDay();
    const diff = temp.getDate() - day; // adjust when day is Sunday
    return new Date(temp.setDate(diff));
  };

  // Format YYYY-MM-DD
  const formatDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Helper function to check if title matches exam definitions
  const checkIsExam = (title: string): boolean => {
    const t = title.toLowerCase();
    return t.includes("exam") || t.includes("quiz") || t.includes("test") || t.includes("midterm") || t.includes("final");
  };

  // Group scheduled elements in single lookup cache for top render performance
  const dailyData = useMemo(() => {
    const data: Record<string, { 
      assignments: Assignment[]; 
      exams: Assignment[]; 
      sessions: StudySession[]; 
      milestones: { assignment: Assignment; milestone: Milestone }[] 
    }> = {};

    const getDayBucket = (dateStr: string) => {
      const clean = dateStr.split("T")[0];
      if (!data[clean]) {
        data[clean] = { assignments: [], exams: [], sessions: [], milestones: [] };
      }
      return data[clean];
    };

    // Classify assignments & exams
    assignments.forEach(a => {
      const bucket = getDayBucket(a.dueDate);
      if (checkIsExam(a.title)) {
        bucket.exams.push(a);
      } else {
        bucket.assignments.push(a);
      }
    });

    // Populate study sessions
    studySessions.forEach(s => {
      const bucket = getDayBucket(s.date);
      bucket.sessions.push(s);
    });

    // Populate scheduled milestones
    assignments.forEach(a => {
      if (a.milestones) {
        a.milestones.forEach(m => {
          if (m.dueDate) {
            const bucket = getDayBucket(m.dueDate);
            bucket.milestones.push({ assignment: a, milestone: m });
          }
        });
      }
    });

    return data;
  }, [assignments, studySessions]);

  // Extract milestones that are NOT yet assigned a due date
  const unscheduledMilestones = useMemo(() => {
    const list: { assignment: Assignment; milestone: Milestone }[] = [];
    assignments.forEach(a => {
      if (a.milestones) {
        a.milestones.forEach(m => {
          if (!m.dueDate && !m.completed) {
            list.push({ assignment: a, milestone: m });
          }
        });
      }
    });
    return list;
  }, [assignments]);

  // Generate Month Days grid
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const totalPrevDays = new Date(year, month, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    
    // Add prefix days from prior month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, totalPrevDays - i),
        isCurrentMonth: false
      });
    }
    
    // Add current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Add suffix days to fill out full 6-week grid
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentDate]);

  // Generate Week Days grid
  const weekDays = useMemo(() => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Color mappings based on priority levels
  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case "URGENT":
        return "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/30 text-rose-400";
      case "HIGH":
        return "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/30 text-amber-400";
      case "MEDIUM":
        return "bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/30 text-indigo-400";
      default:
        return "bg-slate-800/50 hover:bg-slate-800/70 border-slate-700/30 text-slate-300";
    }
  };

  // Check off milestone completion inside the calendar directly!
  const handleToggleMilestone = async (assignmentId: string, milestoneId: string) => {
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    const updatedMilestones = assignment.milestones.map(m => {
      if (m.id === milestoneId) {
        const nextState = !m.completed;
        showToast(
          nextState 
            ? `Milestone Completed: "${m.title}"! 🎯` 
            : `Milestone reopened: "${m.title}"`,
          nextState ? "success" : "info"
        );
        return { ...m, completed: nextState };
      }
      return m;
    });

    const updatedAssignment: Assignment = {
      ...assignment,
      milestones: updatedMilestones
    };

    try {
      await onUpdateAssignment(updatedAssignment);
    } catch (e) {

      showToast("Error updating milestone", "error");
    }
  };

  // Drag and Drop Engine
  const handleDragStart = (
    e: DragEvent, 
    type: "assignment" | "milestone" | "session", 
    id: string, 
    assignmentId?: string
  ) => {
    const payload = JSON.stringify({ type, id, assignmentId });
    e.dataTransfer.setData("text/plain", payload);
    e.dataTransfer.effectAllowed = "move";
    setDraggedItem({ type, id, assignmentId });
  };

  const handleDragOver = (e: DragEvent, dateStr: string) => {
    e.preventDefault();
    setIsDraggingOverDate(dateStr);
  };

  const handleDragLeave = () => {
    setIsDraggingOverDate(null);
  };

  const handleDrop = async (e: DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setIsDraggingOverDate(null);
    setDraggedItem(null);
    
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      const { type, id, assignmentId } = data;

      if (type === "assignment") {
        const assignment = assignments.find(a => a.id === id);
        if (assignment) {
          const updated: Assignment = {
            ...assignment,
            dueDate: targetDateStr
          };
          await onUpdateAssignment(updated);
          showToast(`Rescheduled task "${assignment.title}" to ${targetDateStr}`, "success");
        }
      } else if (type === "milestone") {
        const parentId = assignmentId;
        const assignment = assignments.find(a => a.id === parentId);
        if (assignment) {
          const updatedMilestones = assignment.milestones.map(m => {
            if (m.id === id) {
              return { ...m, dueDate: targetDateStr };
            }
            return m;
          });
          const updated: Assignment = {
            ...assignment,
            milestones: updatedMilestones
          };
          await onUpdateAssignment(updated);
          const targetM = assignment.milestones.find(m => m.id === id);
          showToast(`Scheduled milestone "${targetM?.title}" on ${targetDateStr}`, "success");
        }
      } else if (type === "session") {
        const session = studySessions.find(s => s.id === id);
        if (session && onUpdateStudySession) {
          const originalDate = new Date(session.date);
          const targetDate = new Date(targetDateStr);
          
          if (!isNaN(originalDate.getTime())) {
            targetDate.setHours(originalDate.getHours());
            targetDate.setMinutes(originalDate.getMinutes());
          } else {
            targetDate.setHours(14, 0, 0, 0); // Default to mid-afternoon
          }
          
          const updated = {
            ...session,
            date: targetDate.toISOString()
          };
          await onUpdateStudySession(updated);
          showToast(`Moved study session block to ${targetDateStr}`, "success");
        }
      }
    } catch (err) {

    }
  };

  // Recurring & Single Study Sessions scheduling action
  const handleOpenScheduleModal = (preselectedDateStr?: string) => {
    setScheduleForm(prev => ({
      ...prev,
      date: preselectedDateStr || formatDateString(selectedDate),
      assignmentId: assignments[0]?.id || ""
    }));
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddStudySessions) {
      showToast("Scheduling study sessions is not supported in this view.", "error");
      return;
    }

    const { assignmentId, date, time, durationMinutes, notes, recurrence, occurrences } = scheduleForm;
    if (!date || !time) {
      showToast("Please provide both date and start time.", "error");
      return;
    }

    const baseDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(baseDateTime.getTime())) {
      showToast("Invalid date or time format provided.", "error");
      return;
    }

    const datesList: Date[] = [];
    const count = recurrence === "none" ? 1 : Math.max(1, Math.min(12, occurrences));

    for (let i = 0; i < count; i++) {
      const nextDate = new Date(baseDateTime);
      if (recurrence === "daily") {
        nextDate.setDate(baseDateTime.getDate() + i);
      } else if (recurrence === "weekly") {
        nextDate.setDate(baseDateTime.getDate() + i * 7);
      } else if (recurrence === "bi-weekly") {
        nextDate.setDate(baseDateTime.getDate() + i * 14);
      }
      datesList.push(nextDate);
    }

    const newSessions: StudySession[] = datesList.map((d, index) => ({
      id: `session-scheduled-${Date.now()}-${index}`,
      assignmentId,
      durationMinutes: Number(durationMinutes),
      date: d.toISOString(),
      notes: notes + (count > 1 ? ` (Recurring Block ${index + 1}/${count})` : "")
    }));

    try {
      await onAddStudySessions(newSessions);
      setIsScheduleModalOpen(false);
      setScheduleForm({
        assignmentId: assignments[0]?.id || "",
        date: "2026-06-27",
        time: "14:00",
        durationMinutes: 60,
        notes: "",
        recurrence: "none",
        occurrences: 4
      });
    } catch (err) {

      showToast("Error scheduling study block", "error");
    }
  };

  // Dynamic compliant ICS file exporter
  const handleExportICS = () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SmartDeadline AI//Academic Calendar Exporter//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    const getICSTimestamp = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      const h = String(date.getUTCHours()).padStart(2, "0");
      const min = String(date.getUTCMinutes()).padStart(2, "0");
      const s = String(date.getUTCSeconds()).padStart(2, "0");
      return `${y}${m}${d}T${h}${min}${s}Z`;
    };

    const formatICSText = (text: string) => {
      return text
        .replace(/\\/g, "\\\\")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;")
        .replace(/\n/g, "\\n");
    };

    // 1. Export Assignments and Exams (All Day events)
    assignments.forEach(a => {
      const cleanDate = a.dueDate.split("T")[0].replace(/-/g, "");
      const endDay = new Date(a.dueDate);
      endDay.setDate(endDay.getDate() + 1);
      const cleanEndDate = endDay.toISOString().split("T")[0].replace(/-/g, "");

      const isExam = checkIsExam(a.title);
      const prefix = isExam ? "🚨 EXAM: " : "📚 DEADLINE: ";

      ics.push("BEGIN:VEVENT");
      ics.push(`UID:assignment-${a.id}@smartdeadline`);
      ics.push(`DTSTAMP:${getICSTimestamp(new Date())}`);
      ics.push(`DTSTART;VALUE=DATE:${cleanDate}`);
      ics.push(`DTEND;VALUE=DATE:${cleanEndDate}`);
      ics.push(`SUMMARY:${prefix}${formatICSText(a.title)} (${formatICSText(a.course)})`);
      ics.push(`DESCRIPTION:Course: ${a.course}\\nPriority: ${a.priority}\\nDifficulty: ${a.difficulty}\\nEstimated Hours: ${a.estimatedHours}h\\n\\n${formatICSText(a.description)}`);
      ics.push("END:VEVENT");
    });

    // 2. Export Milestones (All Day events)
    assignments.forEach(a => {
      if (a.milestones) {
        a.milestones.forEach(m => {
          if (m.dueDate) {
            const cleanDate = m.dueDate.split("T")[0].replace(/-/g, "");
            const endDay = new Date(m.dueDate);
            endDay.setDate(endDay.getDate() + 1);
            const cleanEndDate = endDay.toISOString().split("T")[0].replace(/-/g, "");

            ics.push("BEGIN:VEVENT");
            ics.push(`UID:milestone-${m.id}@smartdeadline`);
            ics.push(`DTSTAMP:${getICSTimestamp(new Date())}`);
            ics.push(`DTSTART;VALUE=DATE:${cleanDate}`);
            ics.push(`DTEND;VALUE=DATE:${cleanEndDate}`);
            ics.push(`SUMMARY:🎯 MILESTONE: ${formatICSText(m.title)}`);
            ics.push(`DESCRIPTION:Sub-task milestone for: ${formatICSText(a.title)} (${formatICSText(a.course)})\\nStatus: ${m.completed ? 'Completed' : 'Pending'}`);
            ics.push("END:VEVENT");
          }
        });
      }
    });

    // 3. Export Study Sessions (Timed events)
    studySessions.forEach(s => {
      const start = new Date(s.date);
      const end = new Date(start.getTime() + s.durationMinutes * 60 * 1000);
      const related = assignments.find(a => a.id === s.assignmentId);

      ics.push("BEGIN:VEVENT");
      ics.push(`UID:session-${s.id}@smartdeadline`);
      ics.push(`DTSTAMP:${getICSTimestamp(new Date())}`);
      ics.push(`DTSTART:${getICSTimestamp(start)}`);
      ics.push(`DTEND:${getICSTimestamp(end)}`);
      ics.push(`SUMMARY:🧠 FOCUS BLOCK: ${related ? formatICSText(related.title) : "General Study"}`);
      ics.push(`DESCRIPTION:Study Session duration: ${s.durationMinutes} minutes\\nCourse: ${related ? formatICSText(related.course) : "N/A"}\\n\\nNotes: ${s.notes ? formatICSText(s.notes) : ""}`);
      ics.push("END:VEVENT");
    });

    ics.push("END:VCALENDAR");

    const blob = new Blob([ics.join("\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "SmartDeadline_AI_Academic_Calendar.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("ICS Calendar file exported successfully! Sync with your personal calendar.", "success");
  };

  // Check if dates match
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col lg:flex-row gap-6 text-slate-100 min-h-[calc(100vh-6rem)] relative" id="academic-calendar-wrapper">
      
      {}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        
        {}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
          {}
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={
                viewMode === "month" ? handlePrevMonth : 
                viewMode === "week" ? handlePrevWeek : handlePrevDay
              }
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800/80 transition cursor-pointer"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <h3 className="text-sm md:text-base font-bold text-white min-w-[140px] text-center font-display tracking-tight bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-900">
              {viewMode === "month" && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {viewMode === "week" && `Week of ${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()}`}
              {viewMode === "day" && `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
            </h3>

            <button 
              onClick={
                viewMode === "month" ? handleNextMonth : 
                viewMode === "week" ? handleNextWeek : handleNextDay
              }
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800/80 transition cursor-pointer"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-300 font-mono text-[10px] font-bold rounded-lg border border-slate-800/80 transition cursor-pointer uppercase tracking-wider"
            >
              TODAY
            </button>
          </div>

          {}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-950/40 p-1.5 rounded-xl border border-slate-900 text-[11px] font-medium">
            <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider px-2">Show:</span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, assignments: !prev.assignments }))}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 border ${
                filters.assignments 
                  ? "bg-indigo-950/40 border-indigo-500/20 text-indigo-300" 
                  : "border-transparent text-slate-500"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Deliverables
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, exams: !prev.exams }))}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 border ${
                filters.exams 
                  ? "bg-amber-950/40 border-amber-500/20 text-amber-300" 
                  : "border-transparent text-slate-500"
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" /> Exams
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, milestones: !prev.milestones }))}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 border ${
                filters.milestones 
                  ? "bg-purple-950/40 border-purple-500/20 text-purple-300" 
                  : "border-transparent text-slate-500"
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-purple-400" /> Milestones
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, sessions: !prev.sessions }))}
              className={`px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1 border ${
                filters.sessions 
                  ? "bg-sky-950/40 border-sky-500/20 text-sky-300" 
                  : "border-transparent text-slate-500"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Study Hours
            </button>
          </div>

          {}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              {(["month", "week", "day"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    if (mode === "day") setSelectedDate(currentDate);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer capitalize ${
                    viewMode === mode
                      ? "bg-indigo-600 text-white shadow-md font-bold"
                      : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleOpenScheduleModal()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition shadow-lg cursor-pointer"
              title="Schedule Study Session"
            >
              <Plus className="w-4 h-4" /> <span className="hidden md:inline">Schedule Session</span>
            </button>

            <button
              onClick={handleExportICS}
              className="p-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer"
              title="Export as ICS File"
            >
              <Download className="w-4 h-4" /> <span className="hidden md:inline">Export ICS</span>
            </button>

            <button
              onClick={() => setShowUnscheduledPanel(!showUnscheduledPanel)}
              className={`p-2 border rounded-xl flex items-center justify-center gap-1 text-xs font-bold transition cursor-pointer ${
                showUnscheduledPanel 
                  ? "bg-purple-950/40 border-purple-500/40 text-purple-300" 
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
              title="Toggle Unscheduled Milestones Panel"
            >
              <Flag className="w-4 h-4" /> <span className="hidden xl:inline">Milestones ({unscheduledMilestones.length})</span>
            </button>
          </div>
        </div>

        {}
        <AnimatePresence mode="wait">
          
          {}
          {viewMode === "month" && (
            <motion.div
              key="month-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/20 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl"
            >
              {}
              <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/40">
                {DAYS_SHORT.map((day, idx) => (
                  <div key={idx} className="py-2.5 text-center text-xs font-mono font-bold tracking-widest text-slate-400 border-r border-slate-800/40 last:border-r-0">
                    {day.toUpperCase()}
                  </div>
                ))}
              </div>

              {}
              <div className="grid grid-cols-7">
                {monthDays.map(({ date, isCurrentMonth }, index) => {
                  const dateStr = formatDateString(date);
                  const data = dailyData[dateStr] || { assignments: [], exams: [], sessions: [], milestones: [] };
                  const isDayToday = isToday(date);
                  const isDaySelected = isSameDay(date, selectedDate);
                  const isOver = isDraggingOverDate === dateStr;

                  // Render and calculate visual height
                  const visibleAssignments = filters.assignments ? data.assignments : [];
                  const visibleExams = filters.exams ? data.exams : [];
                  const visibleSessions = filters.sessions ? data.sessions : [];
                  const visibleMilestones = filters.milestones ? data.milestones : [];
                  
                  const totalItems = visibleAssignments.length + visibleExams.length + visibleSessions.length + visibleMilestones.length;

                  return (
                    <div
                      key={index}
                      onDragOver={(e) => handleDragOver(e, dateStr)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr)}
                      onClick={() => {
                        setSelectedDate(date);
                        setCurrentDate(date);
                      }}
                      className={`min-h-[120px] p-2 border-b border-r border-slate-800 flex flex-col justify-between transition relative group cursor-pointer ${
                        isCurrentMonth ? "bg-slate-950/20" : "bg-slate-950/5 text-slate-600 opacity-60"
                      } ${isDayToday ? "bg-indigo-950/15 border-indigo-500/35 border-2" : ""} ${isDaySelected ? "ring-2 ring-indigo-500 z-10 bg-indigo-950/10" : ""} ${
                        isOver ? "bg-indigo-600/10 scale-[0.98] border-dashed border-indigo-500" : ""
                      }`}
                    >
                      {}
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isDayToday 
                            ? "bg-indigo-600 text-white font-black scale-105 shadow-md" 
                            : isCurrentMonth ? "text-slate-300" : "text-slate-600"
                        }`}>
                          {date.getDate()}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenScheduleModal(dateStr);
                            }}
                            className="p-1 hover:bg-indigo-600 hover:text-white bg-slate-950 border border-slate-800 rounded text-[9px] font-bold text-slate-400 flex items-center transition"
                            title="Quick schedule block"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {}
                      <div className="flex-1 mt-1.5 space-y-1 overflow-y-auto max-h-[85px] scrollbar-thin">
                        
                        {}
                        {visibleExams.map(exam => {
                          const isTaskOverdue = isOverdue(exam.dueDate, exam.status === "COMPLETED");
                          return (
                            <div
                              key={exam.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, "assignment", exam.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDetails("assignment", exam);
                              }}
                              className={`px-1.5 py-0.5 rounded-md border text-[10px] font-semibold leading-tight truncate flex items-center gap-1 transition shadow-sm cursor-grab active:cursor-grabbing ${
                                isTaskOverdue 
                                  ? "border-rose-500 bg-rose-500/20 text-rose-300 hover:bg-rose-500/25 animate-pulse" 
                                  : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:border-amber-400"
                              }`}
                              title={`🚨 EXAM: ${exam.title} (${exam.course})${isTaskOverdue ? " - OVERDUE!" : ""}`}
                            >
                              {isTaskOverdue ? (
                                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 animate-bounce" />
                              ) : (
                                <Award className="w-3 h-3 text-amber-400 shrink-0" />
                              )}
                              <span className="truncate">{exam.title}</span>
                            </div>
                          );
                        })}

                        {}
                        {visibleAssignments.map(a => {
                          const isCompleted = a.status === "COMPLETED";
                          const isTaskOverdue = isOverdue(a.dueDate, isCompleted);
                          const style = getPriorityStyle(a.priority);
                          return (
                            <div
                              key={a.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, "assignment", a.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDetails("assignment", a);
                              }}
                              className={`px-1.5 py-0.5 rounded-md border text-[10px] font-medium leading-tight truncate flex items-center gap-1 transition shadow-sm cursor-grab active:cursor-grabbing ${
                                isCompleted 
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400/80 line-through" 
                                  : isTaskOverdue 
                                    ? "bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/25 animate-pulse"
                                    : style
                              }`}
                              title={`Deliverable: ${a.title} (${a.course})${isTaskOverdue ? " - OVERDUE!" : ""}`}
                            >
                              {isTaskOverdue ? (
                                <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                              ) : (
                                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{a.title}</span>
                            </div>
                          );
                        })}

                        {}
                        {visibleMilestones.map(({ assignment, milestone }) => {
                          const isMilestoneOverdue = milestone.dueDate ? isOverdue(milestone.dueDate, milestone.completed) : false;
                          return (
                            <div
                              key={milestone.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, "milestone", milestone.id, assignment.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDetails("milestone", milestone, assignment);
                              }}
                              className={`px-1.5 py-0.5 rounded-md border text-[10px] leading-tight flex items-center justify-between gap-1 transition shadow-sm cursor-grab active:cursor-grabbing ${
                                milestone.completed 
                                  ? "opacity-40 border-purple-500/10 bg-purple-500/5 text-purple-400/70" 
                                  : isMilestoneOverdue
                                    ? "bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/25 animate-pulse"
                                    : "border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10"
                              }`}
                              title={`🎯 Milestone: ${milestone.title}${isMilestoneOverdue ? " - OVERDUE!" : ""}`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                {isMilestoneOverdue ? (
                                  <AlertCircle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                                ) : (
                                  <Flag className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                                )}
                                <span className={`truncate ${milestone.completed ? "line-through text-purple-400" : ""}`}>{milestone.title}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={milestone.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleMilestone(assignment.id, milestone.id);
                                }}
                                className="w-2.5 h-2.5 accent-purple-500 rounded border-slate-700 cursor-pointer"
                              />
                            </div>
                          );
                        })}

                        {}
                        {visibleSessions.map((session, sIdx) => {
                          const related = assignments.find(a => a.id === session.assignmentId);
                          return (
                            <div
                              key={session.id || `sess-${sIdx}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, "session", session.id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEventDetails("session", session);
                              }}
                              className="px-1.5 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/5 text-sky-300 text-[10px] leading-tight truncate flex items-center gap-1 transition shadow-sm cursor-grab active:cursor-grabbing hover:border-sky-400/50"
                              title={`🧠 Focus: ${related ? related.title : "General Focus"} (${session.durationMinutes}m)`}
                            >
                              <Clock className="w-2.5 h-2.5 text-sky-400 shrink-0 animate-pulse" />
                              <span className="truncate">{related ? related.course : "Study"}: {session.durationMinutes}m</span>
                            </div>
                          );
                        })}

                      </div>

                      {}
                      {totalItems > 4 && (
                        <span className="text-[8px] font-mono font-bold text-indigo-400 text-right block pr-1">
                          +{totalItems - 4} MORE
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {}
          {viewMode === "week" && (
            <motion.div
              key="week-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-7 gap-4"
            >
              {weekDays.map((date, idx) => {
                const dateStr = formatDateString(date);
                const data = dailyData[dateStr] || { assignments: [], exams: [], sessions: [], milestones: [] };
                const isDayToday = isToday(date);
                const isDaySelected = isSameDay(date, selectedDate);
                const isOver = isDraggingOverDate === dateStr;

                const visibleAssignments = filters.assignments ? data.assignments : [];
                const visibleExams = filters.exams ? data.exams : [];
                const visibleSessions = filters.sessions ? data.sessions : [];
                const visibleMilestones = filters.milestones ? data.milestones : [];

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    onClick={() => setSelectedDate(date)}
                    className={`bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col min-h-[400px] transition cursor-pointer relative ${
                      isDayToday ? "border-2 border-indigo-500 bg-indigo-950/15 shadow-lg" : ""
                    } ${
                      isDaySelected ? "ring-2 ring-indigo-500 bg-indigo-950/5 shadow-xl" : ""
                    } ${isOver ? "bg-indigo-600/10 border-dashed border-indigo-500 scale-[0.98]" : ""}`}
                  >
                    {}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            {DAYS_SHORT[date.getDay()]}
                          </span>
                          {isDayToday && (
                            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 font-mono text-[8px] font-bold rounded uppercase animate-pulse">
                              Today
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-300 font-display">
                          {MONTHS[date.getMonth()].slice(0, 3)} {date.getDate()}
                        </h4>
                      </div>
                      
                      <span className={`w-7 h-7 flex items-center justify-center font-mono font-bold text-xs rounded-full ${
                        isDayToday 
                          ? "bg-indigo-600 text-white font-extrabold shadow-md" 
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>

                    {}
                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] scrollbar-thin">
                      {visibleExams.length === 0 && 
                       visibleAssignments.length === 0 && 
                       visibleSessions.length === 0 && 
                       visibleMilestones.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4 py-12">
                          <CheckCircle2 className="w-6 h-6 text-slate-800 mb-1.5" />
                          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Clear Agenda</span>
                        </div>
                      )}

                      {}
                      {visibleExams.map(exam => {
                        const isTaskOverdue = isOverdue(exam.dueDate, exam.status === "COMPLETED");
                        return (
                          <div
                            key={exam.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, "assignment", exam.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails("assignment", exam);
                            }}
                            className={`p-3 rounded-xl flex flex-col gap-1.5 text-xs transition cursor-grab active:cursor-grabbing shadow-inner border-2 ${
                              isTaskOverdue
                                ? "bg-rose-500/20 border-rose-500 text-rose-200 hover:border-rose-400 animate-pulse"
                                : "bg-amber-500/10 border-amber-500/40 hover:border-amber-400 text-amber-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] border px-1.5 py-0.5 rounded font-mono font-bold ${
                                isTaskOverdue ? "bg-rose-500/25 border-rose-500/40 text-rose-300" : "bg-amber-500/25 border-amber-500/40 text-amber-300"
                              }`}>
                                {exam.course}
                              </span>
                              <span className={`text-[9px] font-mono font-bold flex items-center gap-1 ${isTaskOverdue ? "text-rose-400" : "text-amber-450"}`}>
                                {isTaskOverdue ? (
                                  <>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> OVERDUE
                                  </>
                                ) : (
                                  <>
                                    <Award className="w-3 h-3 text-amber-400 animate-bounce" /> EXAM
                                  </>
                                )}
                              </span>
                            </div>
                            <h5 className="font-bold text-white leading-snug line-clamp-2">
                              {exam.title}
                            </h5>
                          </div>
                        );
                      })}

                      {}
                      {visibleAssignments.map(a => {
                        const style = getPriorityStyle(a.priority);
                        const isCompleted = a.status === "COMPLETED";
                        const isTaskOverdue = isOverdue(a.dueDate, isCompleted);
                        return (
                          <div
                            key={a.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, "assignment", a.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails("assignment", a);
                            }}
                            className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs transition cursor-grab active:cursor-grabbing ${
                              isCompleted 
                                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400/70" 
                                : isTaskOverdue
                                  ? "bg-rose-500/20 border-rose-500 text-rose-300 hover:border-rose-400 animate-pulse"
                                  : style
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-slate-950/60 text-slate-300">
                                  {a.course}
                                </span>
                                <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-full ${
                                  isCompleted 
                                    ? "bg-emerald-500/20 text-emerald-300" 
                                    : isTaskOverdue 
                                      ? "bg-rose-500/25 text-rose-300" 
                                      : "bg-slate-800 text-slate-400"
                                }`}>
                                  {isCompleted ? "Completed" : isTaskOverdue ? "Overdue" : a.priority}
                                </span>
                              </div>
                              <h5 className={`font-bold text-white leading-snug line-clamp-2 ${isCompleted ? "line-through text-slate-400" : ""}`}>
                                {a.title}
                              </h5>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono border-t border-slate-800/40 pt-1.5 mt-1 text-slate-400">
                              <span className="flex items-center gap-1">
                                {isTaskOverdue ? (
                                  <AlertCircle className="w-3 h-3 text-rose-400 animate-pulse" />
                                ) : (
                                  <FileText className="w-3 h-3" />
                                )}
                                {isTaskOverdue ? "Overdue Deliverable" : "Delivery"}
                              </span>
                              {a.weight && <span className="text-indigo-400">{a.weight}% Grade</span>}
                            </div>
                          </div>
                        );
                      })}

                      {}
                      {visibleMilestones.map(({ assignment, milestone }) => {
                        const isMilestoneOverdue = milestone.dueDate ? isOverdue(milestone.dueDate, milestone.completed) : false;
                        return (
                          <div
                            key={milestone.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, "milestone", milestone.id, assignment.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails("milestone", milestone, assignment);
                            }}
                            className={`p-3 rounded-xl border flex flex-col gap-1.5 transition cursor-grab active:cursor-grabbing ${
                              milestone.completed 
                                ? "opacity-55 border-purple-500/10 bg-purple-500/5 text-purple-400/70" 
                                : isMilestoneOverdue
                                  ? "bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/25 animate-pulse"
                                  : "border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/10"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] font-mono border px-1.5 py-0.5 rounded font-bold ${
                                isMilestoneOverdue ? "bg-rose-500/25 border-rose-500/40 text-rose-300" : "bg-purple-500/10 border-purple-500/20"
                              }`}>
                                {assignment.course} {isMilestoneOverdue ? "OVERDUE" : "MILESTONE"}
                              </span>
                              <input
                                type="checkbox"
                                checked={milestone.completed}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleMilestone(assignment.id, milestone.id);
                                }}
                                className="w-3.5 h-3.5 accent-purple-500 rounded border-slate-700 cursor-pointer"
                              />
                            </div>
                            <h5 className={`font-semibold text-slate-200 ${milestone.completed ? "line-through text-slate-500" : ""}`}>
                              {milestone.title}
                            </h5>
                          </div>
                        );
                      })}

                      {}
                      {visibleSessions.map((session, sIdx) => {
                        const related = assignments.find(a => a.id === session.assignmentId);
                        return (
                          <div 
                            key={session.id || sIdx}
                            draggable
                            onDragStart={(e) => handleDragStart(e, "session", session.id)}
                            onClick={(e) => {
                              e.stopPropagation();
                              openEventDetails("session", session);
                            }}
                            className="p-3 bg-sky-500/5 border border-sky-500/20 hover:border-sky-400 text-sky-400 rounded-xl flex flex-col gap-1 text-xs cursor-grab active:cursor-grabbing hover:bg-sky-500/10 transition"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> STUDY SESSION
                              </span>
                              <span className="text-[10px] font-mono font-bold text-sky-300">{session.durationMinutes} min</span>
                            </div>
                            <p className="text-[11px] text-white font-medium mt-1">
                              {related ? related.title : "Independent Focus"}
                            </p>
                            {session.notes && (
                              <p className="text-[10px] text-sky-300/75 italic line-clamp-2">
                                "{session.notes}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenScheduleModal(dateStr);
                      }}
                      className="mt-3 py-1.5 w-full bg-slate-950 hover:bg-indigo-600 text-[10px] font-mono font-bold text-slate-400 hover:text-white rounded-lg border border-slate-800/80 flex items-center justify-center gap-1 transition"
                    >
                      <Plus className="w-3 h-3" /> ADD BLOCK
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}

          {}
          {viewMode === "day" && (
            <motion.div
              key="day-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {}
              <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <span className="text-xs text-indigo-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1 animate-pulse">
                      <Clock className="w-3.5 h-3.5" /> Hourly Academic Agenda
                    </span>
                    <h4 className="text-xl font-bold font-display text-white">
                      {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                    </h4>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono font-bold">Planned Focus</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold block mt-0.5">
                      {(() => {
                        const dateStr = formatDateString(selectedDate);
                        const daySessions = dailyData[dateStr]?.sessions || [];
                        const sum = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
                        return `${sum} Minutes Logged`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="relative pl-12 border-l-2 border-slate-800/80 space-y-8 py-4">
                  
                  {}
                  <div className="relative">
                    <div className="absolute -left-[54px] w-4 h-4 rounded-full border-4 border-slate-950 bg-indigo-500 shadow-md" />
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">ALL DAY DELIVERABLES & EXAMS</span>
                      
                      {(() => {
                        const dateStr = formatDateString(selectedDate);
                        const data = dailyData[dateStr] || { assignments: [], exams: [], sessions: [], milestones: [] };
                        const visibleA = filters.assignments ? data.assignments : [];
                        const visibleE = filters.exams ? data.exams : [];
                        const total = visibleA.length + visibleE.length;

                        if (total === 0) {
                          return (
                            <p className="text-xs text-slate-500 italic p-3.5 bg-slate-950/25 border border-slate-900 rounded-xl">
                              No key submissions or exam stress points scheduled on this day.
                            </p>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {}
                            {visibleE.map(exam => {
                              const isTaskOverdue = isOverdue(exam.dueDate, exam.status === "COMPLETED");
                              return (
                                <div
                                  key={exam.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEventDetails("assignment", exam);
                                  }}
                                  className={`p-4 rounded-xl flex flex-col justify-between gap-3 shadow border-2 transition hover:scale-[1.01] cursor-pointer ${
                                    isTaskOverdue
                                      ? "bg-rose-500/20 border-rose-500 text-rose-200 animate-pulse animate-duration-1000"
                                      : "bg-amber-500/10 border-amber-500/40 hover:border-amber-400"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                                        isTaskOverdue ? "bg-rose-500/25 border-rose-500/40 text-rose-300" : "bg-slate-950/60 text-amber-300"
                                      }`}>
                                        {exam.course}
                                      </span>
                                      <span className={`text-[9px] font-mono font-bold flex items-center gap-1 ${isTaskOverdue ? "text-rose-400 animate-pulse" : "text-amber-400"}`}>
                                        {isTaskOverdue ? (
                                          <>
                                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> OVERDUE EXAM
                                          </>
                                        ) : (
                                          <>
                                            <Award className="w-3.5 h-3.5" /> EXAM
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-white text-sm">{exam.title}</h5>
                                  </div>
                                  <div className="border-t border-slate-800/40 pt-2 flex items-center justify-between">
                                    <span className={`text-[10px] font-mono ${isTaskOverdue ? "text-rose-450 font-bold" : "text-amber-400"}`}>Weight: {exam.weight}%</span>
                                    {onSelectAssignmentForTimer && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectAssignmentForTimer(exam.id);
                                        }}
                                        className={`px-2 py-1 text-[10px] font-semibold rounded-lg font-mono transition cursor-pointer ${
                                          isTaskOverdue ? "bg-rose-500/30 hover:bg-rose-500/45 text-rose-200" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                                        }`}
                                      >
                                        Start Focus
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {}
                            {visibleA.map(a => {
                              const style = getPriorityStyle(a.priority);
                              const isCompleted = a.status === "COMPLETED";
                              const isTaskOverdue = isOverdue(a.dueDate, isCompleted);
                              return (
                                <div
                                  key={a.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEventDetails("assignment", a);
                                  }}
                                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 shadow transition hover:scale-[1.01] cursor-pointer ${
                                    isCompleted 
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                                      : isTaskOverdue
                                        ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse animate-duration-1000"
                                        : style
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-950/60 text-slate-300">
                                        {a.course}
                                      </span>
                                      <span className="text-[9px] font-mono font-bold uppercase">
                                        {isCompleted ? "COMPLETED" : isTaskOverdue ? "OVERDUE" : a.priority}
                                      </span>
                                    </div>
                                    <h5 className={`font-bold text-sm text-white ${isCompleted ? "line-through text-slate-400" : ""}`}>{a.title}</h5>
                                  </div>
                                  <div className="border-t border-slate-800/40 pt-2 flex items-center justify-between text-[10px]">
                                    <span className="text-slate-400 font-mono">Weight: {a.weight || 0}%</span>
                                    {onSelectAssignmentForTimer && !isCompleted && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSelectAssignmentForTimer(a.id);
                                        }}
                                        className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600 text-[10px] font-semibold rounded-lg text-indigo-300 hover:text-white font-mono transition cursor-pointer"
                                      >
                                        Start Focus
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                    </div>
                  </div>

                  {}
                  <div className="relative">
                    <div className="absolute -left-[54px] w-4 h-4 rounded-full border-4 border-slate-950 bg-purple-500 shadow-md" />
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">ACTIVE SYLLABUS MILESTONES</span>

                      {(() => {
                        const dateStr = formatDateString(selectedDate);
                        const dayMilestones = filters.milestones ? (dailyData[dateStr]?.milestones || []) : [];

                        if (dayMilestones.length === 0) {
                          return (
                            <p className="text-xs text-slate-500 italic p-3.5 bg-slate-950/25 border border-slate-900 rounded-xl">
                              No structured sequential milestones scheduled for this day.
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-2">
                            {dayMilestones.map(({ assignment, milestone }) => {
                              const isMilestoneOverdue = milestone.dueDate ? isOverdue(milestone.dueDate, milestone.completed) : false;
                              return (
                                <div
                                  key={milestone.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEventDetails("milestone", milestone, assignment);
                                  }}
                                  className={`p-3.5 border rounded-xl flex items-center justify-between shadow transition hover:scale-[1.01] cursor-pointer ${
                                    milestone.completed 
                                      ? "opacity-55 border-purple-500/10 bg-purple-500/5 text-purple-400/70" 
                                      : isMilestoneOverdue
                                        ? "bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse"
                                        : "bg-purple-950/15 border-purple-500/20 hover:border-purple-500/40"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={milestone.completed}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        handleToggleMilestone(assignment.id, milestone.id);
                                      }}
                                      className="w-4.5 h-4.5 accent-purple-500 rounded border-slate-800 cursor-pointer"
                                    />
                                    <div>
                                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                                        isMilestoneOverdue ? "bg-rose-500/25 border-rose-500/40 text-rose-300" : "bg-purple-500/20 text-purple-300"
                                      }`}>
                                        {assignment.course} {isMilestoneOverdue ? "Overdue Milestone" : "Milestone"}
                                      </span>
                                      <h5 className={`font-bold text-sm text-slate-200 mt-1 ${milestone.completed ? "line-through text-slate-500" : ""}`}>
                                        {milestone.title}
                                      </h5>
                                      <p className="text-[10px] text-slate-400">Parent Task: {assignment.title}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {}
                  <div className="relative">
                    <div className="absolute -left-[54px] w-4 h-4 rounded-full border-4 border-slate-950 bg-sky-500 shadow-md" />
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider uppercase">SCHEDULED STUDY LOGS & FOCUS SESSIONS</span>

                      {(() => {
                        const dateStr = formatDateString(selectedDate);
                        const daySessions = filters.sessions ? (dailyData[dateStr]?.sessions || []) : [];

                        if (daySessions.length === 0) {
                          return (
                            <p className="text-xs text-slate-500 italic p-3.5 bg-slate-950/25 border border-slate-900 rounded-xl">
                              No focus hours scheduled. Book a study session above!
                            </p>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {daySessions.map((session, sIdx) => {
                              const related = assignments.find(a => a.id === session.assignmentId);
                              return (
                                <div
                                  key={session.id || sIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEventDetails("session", session);
                                  }}
                                  className="p-4 bg-sky-500/5 border border-sky-500/20 rounded-xl flex items-start justify-between gap-4 shadow hover:bg-sky-500/10 transition cursor-pointer hover:scale-[1.01]"
                                >
                                  <div className="space-y-1.5">
                                    <span className="text-[9px] bg-sky-500/15 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono font-bold text-sky-300 uppercase">
                                      {related ? related.course : "General Study"}
                                    </span>
                                    <h5 className="font-bold text-white text-sm">
                                      {related ? related.title : "Independent Focus Block"}
                                    </h5>
                                    {session.notes && (
                                      <p className="text-xs text-slate-400 italic">"{session.notes}"</p>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <span className="text-lg font-black text-white font-mono block">{session.durationMinutes}m</span>
                                      <span className="text-[9px] font-mono text-sky-400 uppercase tracking-wider block font-bold">Focus Target</span>
                                    </div>

                                    {onDeleteStudySession && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteStudySession(session.id);
                                        }}
                                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                        title="Remove scheduled block"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </div>

              {}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-400" /> Day Summary Checklist
                </h4>

                {(() => {
                  const dateStr = formatDateString(selectedDate);
                  const data = dailyData[dateStr] || { assignments: [], exams: [], sessions: [], milestones: [] };
                  const dayAssignments = [...data.assignments, ...data.exams];
                  const completed = dayAssignments.filter(a => a.status === "COMPLETED").length;
                  const total = dayAssignments.length;
                  
                  return (
                    <div className="space-y-6">
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900 space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-400">Timely Submissions</span>
                          <span className="text-white font-bold">{completed} / {total} Completed</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 transition-all duration-300"
                            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">Day Tasks</span>
                        {dayAssignments.length === 0 ? (
                          <p className="text-xs text-slate-500 italic text-center py-4">No tasks due today.</p>
                        ) : (
                          dayAssignments.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-900">
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${task.status === "COMPLETED" ? "text-emerald-500" : "text-slate-600"}`} />
                                <span className={`text-xs font-medium truncate ${task.status === "COMPLETED" ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[9px] font-mono text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/15 shrink-0">
                                {task.course}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {}
      <AnimatePresence>
        {showUnscheduledPanel && (
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 25 }}
            className="w-full lg:w-3/12 xl:w-80 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col h-[calc(100vh-6rem)] overflow-hidden shadow-xl backdrop-blur-md shrink-0"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/15 border border-purple-500/30 rounded-lg text-purple-400">
                  <Flag className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xs text-white">Unscheduled Milestones</h4>
                  <p className="text-[9px] text-slate-400 font-mono">Drag on day to schedule</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUnscheduledPanel(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {}
            <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/10 text-[10px] text-purple-300 leading-relaxed mb-4 flex gap-2 items-start">
              <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <p>These are AI-generated syllabus milestones without designated dates. Drag and drop them onto any day in the calendar to structure your deadlines!</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-thin">
              {unscheduledMilestones.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-700 mx-auto" />
                  <p className="text-xs font-semibold">Cognitive Buffer Empty!</p>
                  <p className="text-[10px] leading-relaxed max-w-[180px] mx-auto">Generate a master study plan in the AI Planner to load milestone sequences.</p>
                </div>
              ) : (
                unscheduledMilestones.map(({ assignment, milestone }) => (
                  <div
                    key={milestone.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, "milestone", milestone.id, assignment.id)}
                    className="p-3 bg-slate-950/40 border border-slate-850 hover:border-purple-500/30 rounded-xl cursor-grab active:cursor-grabbing transition duration-200 hover:bg-purple-950/5 group flex flex-col gap-1 shadow"
                    title="Drag to calendar grid"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono font-bold bg-purple-500/15 border border-purple-500/25 px-1.5 py-0.5 rounded text-purple-300 uppercase">
                        {assignment.course}
                      </span>
                      <CornerDownRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition" />
                    </div>
                    <h5 className="font-semibold text-xs text-slate-200 mt-1 leading-snug">
                      {milestone.title}
                    </h5>
                    <p className="text-[9px] text-slate-500 truncate">For: {assignment.title}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-display font-bold text-sm text-white">Schedule Study Session</h3>
                </div>
                <button
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="p-5 space-y-4 text-slate-200">
                
                {}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Associated Course/Task</label>
                  <select
                    value={scheduleForm.assignmentId}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, assignmentId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>
                        [{a.course}] {a.title}
                      </option>
                    ))}
                    <option value="">Independent Study Focus (No Task)</option>
                  </select>
                </div>

                {}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Target Date</label>
                    <input
                      type="date"
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                    <input
                      type="time"
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                {}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Block Duration</label>
                  <select
                    value={scheduleForm.durationMinutes}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, durationMinutes: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value={25}>25 minutes (Pomodoro Block)</option>
                    <option value={50}>50 minutes (Deep Work Standard)</option>
                    <option value={60}>60 minutes (1 Hour Focus)</option>
                    <option value={90}>90 minutes (Cognitive Limit Block)</option>
                    <option value={120}>120 minutes (2 Hours Focus)</option>
                    <option value={180}>180 minutes (3 Hours Marathon)</option>
                  </select>
                </div>

                {}
                <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Recurrence Rule</label>
                  <select
                    value={scheduleForm.recurrence}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, recurrence: e.target.value }))}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="none">No Recurrence (Single Session)</option>
                    <option value="daily">Daily (Consecutive Days)</option>
                    <option value="weekly">Weekly (Same Day Every Week)</option>
                    <option value="bi-weekly">Bi-weekly (Same Day Every 2 Weeks)</option>
                  </select>

                  {scheduleForm.recurrence !== "none" && (
                    <div className="mt-3 space-y-1">
                      <label className="text-[10px] font-mono text-slate-400 block">Number of Occurrences (Max 12)</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={scheduleForm.occurrences}
                        onChange={(e) => setScheduleForm(prev => ({ ...prev, occurrences: Number(e.target.value) }))}
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}
                </div>

                {}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Focus Goal / Notes</label>
                  <input
                    type="text"
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Read Chapter 4 and take quiz prep drafts"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Schedule Focus
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {selectedEventDetails && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="event-details-modal">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-2">
                  {selectedEventDetails.type === "assignment" && (
                    checkIsExam(selectedEventDetails.data.title) ? (
                      <Award className="w-5 h-5 text-amber-400 animate-pulse" />
                    ) : (
                      <FileText className="w-5 h-5 text-indigo-400" />
                    )
                  )}
                  {selectedEventDetails.type === "milestone" && (
                    <Flag className="w-5 h-5 text-purple-400" />
                  )}
                  {selectedEventDetails.type === "session" && (
                    <Clock className="w-5 h-5 text-sky-400" />
                  )}
                  <h3 className="font-display font-bold text-sm text-white capitalize">
                    {selectedEventDetails.type} Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {}
              <div className="p-6 space-y-5 overflow-y-auto text-slate-200 scrollbar-thin">
                {selectedEventDetails.type === "assignment" && (() => {
                  const assignment = selectedEventDetails.data as Assignment;
                  const isCompleted = assignment.status === "COMPLETED";
                  const isTaskOverdue = isOverdue(assignment.dueDate, isCompleted);

                  return (
                    <div className="space-y-4">
                      {}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/15 text-indigo-300">
                            {assignment.course}
                          </span>
                          <div className="flex gap-1.5">
                            {isTaskOverdue && (
                              <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 animate-pulse">
                                <AlertCircle className="w-3 h-3 text-rose-400" /> OVERDUE
                              </span>
                            )}
                            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                              isCompleted ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-300"
                            }`}>
                              {isCompleted ? "Completed" : assignment.priority}
                            </span>
                          </div>
                        </div>
                        <h4 className="text-lg font-bold text-white font-display leading-snug mt-1">
                          {assignment.title}
                        </h4>
                      </div>

                      {}
                      <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-xs font-medium">
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Due Date</span>
                          <span className="text-white flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                            {new Date(assignment.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Course Weight</span>
                          <span className="text-white">
                            {assignment.weight ? `${assignment.weight}% of Final Grade` : "N/A"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Estimated Hours</span>
                          <span className="text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            {assignment.estimatedHours} Hours
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Difficulty</span>
                          <span className={`font-semibold ${
                            assignment.difficulty === "HARD" ? "text-rose-400" :
                            assignment.difficulty === "MEDIUM" ? "text-amber-400" : "text-emerald-400"
                          }`}>
                            {assignment.difficulty}
                          </span>
                        </div>
                      </div>

                      {}
                      {assignment.description && (
                        <div className="space-y-1.5">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Description</span>
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-900/60 max-h-[120px] overflow-y-auto scrollbar-thin">
                            {assignment.description}
                          </p>
                        </div>
                      )}

                      {}
                      {assignment.milestones && assignment.milestones.length > 0 && (
                        <div className="space-y-2.5">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Syllabus Milestones</span>
                          <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin">
                            {assignment.milestones.map(m => (
                              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/30 border border-slate-900">
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={m.completed}
                                    onChange={() => handleToggleMilestone(assignment.id, m.id)}
                                    className="w-4 h-4 accent-purple-500 rounded border-slate-800 cursor-pointer"
                                  />
                                  <span className={`text-xs font-semibold truncate ${m.completed ? "text-slate-500 line-through" : "text-slate-200"}`}>
                                    {m.title}
                                  </span>
                                </div>
                                {m.dueDate && (
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {new Date(m.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {}
                      <div className="flex gap-2.5 pt-4 border-t border-slate-850">
                        <button
                          onClick={() => {
                            const nextStatus = isCompleted ? "TODO" : "COMPLETED";
                            handleUpdateAssignmentStatus(assignment, nextStatus);
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            isCompleted 
                              ? "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750" 
                              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/10"
                          }`}
                        >
                          {isCompleted ? (
                            <>Reopen Deliverable</>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Mark Completed
                            </>
                          )}
                        </button>
                        {onSelectAssignmentForTimer && !isCompleted && (
                          <button
                            onClick={() => {
                              onSelectAssignmentForTimer(assignment.id);
                              setSelectedEventDetails(null);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-4 h-4" /> Start Focus Timer
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selectedEventDetails.type === "session" && (() => {
                  const session = selectedEventDetails.data as StudySession;
                  const related = assignments.find(a => a.id === session.assignmentId);

                  return (
                    <div className="space-y-4">
                      {}
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/15 text-sky-300">
                          Focus Block
                        </span>
                        <h4 className="text-lg font-bold text-white font-display mt-1">
                          {related ? related.title : "Independent Study Focus"}
                        </h4>
                        {related && (
                          <p className="text-xs text-slate-400">Course: <span className="text-indigo-400 font-semibold">{related.course}</span></p>
                        )}
                      </div>

                      {}
                      <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-xs font-medium">
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Session Date</span>
                          <span className="text-white flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-sky-400" />
                            {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Start Time</span>
                          <span className="text-white flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-sky-400" />
                            {new Date(session.date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Duration</span>
                          <span className="text-white text-sm font-bold flex items-center gap-1.5">
                            <Coffee className="w-4 h-4 text-sky-400 animate-bounce" />
                            {session.durationMinutes} Minutes Focus Time
                          </span>
                        </div>
                      </div>

                      {}
                      {session.notes && (
                        <div className="space-y-1.5">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Session Goals / Notes</span>
                          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/20 p-3.5 rounded-xl border border-slate-900/60">
                            "{session.notes}"
                          </p>
                        </div>
                      )}

                      {}
                      <div className="flex gap-2.5 pt-4 border-t border-slate-850">
                        {onDeleteStudySession && (
                          <button
                            onClick={() => handleCancelStudySession(session.id)}
                            className="flex-1 py-2.5 bg-rose-950/30 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" /> Cancel Focus Session
                          </button>
                        )}
                        {onSelectAssignmentForTimer && related && (
                          <button
                            onClick={() => {
                              onSelectAssignmentForTimer(related.id);
                              setSelectedEventDetails(null);
                            }}
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Clock className="w-4 h-4" /> Start Focus Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selectedEventDetails.type === "milestone" && (() => {
                  const milestone = selectedEventDetails.data as Milestone;
                  const parentAssignment = selectedEventDetails.parentAssignment as Assignment;
                  const isMOverdue = milestone.dueDate ? isOverdue(milestone.dueDate, milestone.completed) : false;

                  return (
                    <div className="space-y-4">
                      {}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/15 text-purple-300">
                            Syllabus Milestone
                          </span>
                          {isMOverdue && (
                            <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/20 flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-3 h-3 text-rose-400" /> OVERDUE
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-bold text-white font-display mt-1 leading-snug">
                          {milestone.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                          For Task: <span className="text-indigo-400 font-semibold">{parentAssignment.title}</span> ({parentAssignment.course})
                        </p>
                      </div>

                      {}
                      <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-xs font-medium">
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Scheduled Date</span>
                          <span className="text-white flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                            {milestone.dueDate ? (
                              new Date(milestone.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                            ) : (
                              "Unscheduled"
                            )}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-slate-500 text-[10px] font-mono uppercase tracking-wider block">Milestone Status</span>
                          <span className={`font-semibold flex items-center gap-1 ${
                            milestone.completed ? "text-emerald-400" : "text-amber-400"
                          }`}>
                            <Check className="w-3.5 h-3.5" />
                            {milestone.completed ? "Completed" : "Pending"}
                          </span>
                        </div>
                      </div>

                      {}
                      <div className="flex gap-2.5 pt-4 border-t border-slate-850">
                        <button
                          onClick={() => {
                            handleToggleMilestone(parentAssignment.id, milestone.id);
                            // Update our local state to mirror the change in modal
                            setSelectedEventDetails(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                data: { ...prev.data, completed: !milestone.completed }
                              };
                            });
                          }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                            milestone.completed 
                              ? "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750" 
                              : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/10"
                          }`}
                        >
                          {milestone.completed ? (
                            <>Reopen Milestone</>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" /> Mark as Completed
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
