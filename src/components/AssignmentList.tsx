import { useState, useMemo, useEffect } from "react";
import { Assignment, AssignmentStatus, Priority, Difficulty } from "../types";
import { formatDueDate } from "../utils";
import { motion, AnimatePresence } from "motion/react";
import { Calendar, Trash2, Plus, Edit3, CheckCircle2, Clock, Sparkles, Timer, BookOpen, Circle, ArrowUpDown, Filter, CheckCircle } from "lucide-react";
import AttachmentManager from "./AttachmentManager";

interface AssignmentListProps {
  assignments: Assignment[];
  onAddClick: () => void;
  onEditClick: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: AssignmentStatus) => void;
  onToggleMilestone: (assignmentId: string, milestoneId: string) => void;
  onAddMilestone: (assignmentId: string, milestoneTitle: string) => void;
  onGeneratePlan: (assignment: Assignment) => void;
  onSelectForTimer: (assignmentId: string) => void;
  initialCourseFilter?: string;
  initialSearchQuery?: string;
  onUpdateAssignment?: (assignment: Assignment) => void;
}

export default function AssignmentList({
  assignments,
  onAddClick,
  onEditClick,
  onDelete,
  onUpdateStatus,
  onToggleMilestone,
  onAddMilestone,
  onGeneratePlan,
  onSelectForTimer,
  initialCourseFilter,
  initialSearchQuery,
  onUpdateAssignment
}: AssignmentListProps) {
  // Sort and Filter States
  const [filter, setFilter] = useState<"PENDING" | "COMPLETED" | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<"DEADLINE" | "PRIORITY" | "SUBJECT">("DEADLINE");
  const [search, setSearch] = useState(initialSearchQuery || "");
  const [courseFilter, setCourseFilter] = useState<string>(initialCourseFilter || "ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  useEffect(() => {
    if (initialSearchQuery !== undefined) {
      setSearch(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialCourseFilter !== undefined) {
      setCourseFilter(initialCourseFilter);
    }
  }, [initialCourseFilter]);
  
  // Track which card is showing milestone details
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newMilestoneText, setNewMilestoneText] = useState("");

  // Extract all unique courses
  const uniqueCourses = useMemo(() => {
    const courses = assignments.map((a) => a.course).filter(Boolean);
    return ["ALL", ...Array.from(new Set(courses))];
  }, [assignments]);

  // Process and compute sorted/filtered assignments
  const filteredAndSortedAssignments = useMemo(() => {
    let result = [...assignments];

    // Filter by Pending vs Completed
    if (filter === "PENDING") {
      result = result.filter((a) => a.status !== "COMPLETED");
    } else if (filter === "COMPLETED") {
      result = result.filter((a) => a.status === "COMPLETED");
    }

    // Filter by Course
    if (courseFilter !== "ALL") {
      result = result.filter((a) => (a.course || '').toLowerCase() === (courseFilter || '').toLowerCase());
    }

    // Filter by Priority
    if (priorityFilter !== "ALL") {
      result = result.filter((a) => a.priority === priorityFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = (search || '').toLowerCase();
      result = result.filter(
        (a) =>
          (a.title || '').toLowerCase().includes(q) ||
          (a.course || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q)
      );
    }

    // Sort by Deadline, Priority, Subject
    result.sort((a, b) => {
      if (sortBy === "DEADLINE") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === "PRIORITY") {
        const priorityWeight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      if (sortBy === "SUBJECT") {
        return a.course.localeCompare(b.course);
      }
      return 0;
    });

    return result;
  }, [assignments, filter, sortBy, search, courseFilter, priorityFilter]);

  const handleAddMilestoneSubmit = (assignmentId: string) => {
    if (!newMilestoneText.trim()) return;
    onAddMilestone(assignmentId, newMilestoneText);
    setNewMilestoneText("");
  };

  // Helper colors for badges
  const getPriorityStyles = (p: Priority) => {
    switch (p) {
      case "URGENT":
        return "text-rose-400 bg-rose-500/10 border-rose-500/20";
      case "HIGH":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "MEDIUM":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "LOW":
        return "text-slate-400 bg-slate-500/10 border-slate-800";
    }
  };

  const getDifficultyStyles = (d: Difficulty = "MEDIUM") => {
    switch (d) {
      case "HARD":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      case "MEDIUM":
        return "text-amber-400 bg-amber-500/10 border-amber-500/20";
      case "EASY":
        return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-sans font-semibold text-3xl text-slate-100 tracking-tight">Assignment Management</h2>
          <p className="text-slate-400 text-sm mt-1">Track deadlines, subjects, priorities, and difficulty settings.</p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-2 px-4.5 py-2.5 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 rounded-xl text-xs font-bold transition shadow-sm shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Assignment</span>
        </button>
      </div>

      {}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/50 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {}
          <input
            type="text"
            placeholder="Search assignments or subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 placeholder-slate-500 w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          {}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-500 font-medium hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="DEADLINE">Deadline</option>
              <option value="PRIORITY">Priority</option>
              <option value="SUBJECT">Subject</option>
            </select>
          </div>

          {}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-500 font-medium hidden sm:inline">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-300 focus:outline-none cursor-pointer pr-1 max-w-[130px]"
            >
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All Courses" : c}
                </option>
              ))}
            </select>
          </div>

          {}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs font-mono font-bold text-slate-500 font-medium hidden sm:inline">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {}
        <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 w-full xl:w-auto justify-between sm:justify-start gap-1">
          {(["ALL", "PENDING", "COMPLETED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition cursor-pointer ${
                filter === status
                  ? "bg-indigo-600 text-slate-100 shadow"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {status === "ALL" ? "All" : status}
            </button>
          ))}
        </div>
      </div>

      {}
      {filteredAndSortedAssignments.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900">
          <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-semibold font-sans">No assignments found</p>
          <p className="text-slate-500 text-xs mt-1">Try relaxing filters, adjusting search queries, or creating a new assignment.</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedAssignments.map((assignment) => {
              const isCompleted = assignment.status === "COMPLETED";
              const isExpanded = expandedId === assignment.id;
              
              // Calculate relative days left
              const daysLeft = Math.ceil(
                (new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );
              const isOverdue = !isCompleted && daysLeft < 0;
              const isDueToday = !isCompleted && daysLeft === 0;

              // Compute subtask progress
              const totalMilestones = assignment.milestones?.length || 0;
              const completedMilestones = assignment.milestones?.filter(m => m.completed).length || 0;
              const progressPercent = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                  key={assignment.id}
                  className={`bg-slate-900 border rounded-xl shadow-sm transition-colors duration-300 flex flex-col justify-between relative overflow-hidden  group ${
                    isCompleted 
                      ? "border-slate-800 opacity-80 hover:opacity-100" 
                      : isOverdue
                        ? "border-rose-500/50 hover:border-rose-500 shadow-sm shadow-rose-950/25"
                        : isDueToday
                          ? "border-amber-500/50 hover:border-amber-400 shadow-sm shadow-amber-950/20"
                          : assignment.priority === "URGENT"
                            ? "border-rose-500/30 hover:border-rose-500/50 shadow-rose-950/5"
                            : "border-slate-850 hover:border-indigo-500/30"
                  }`}
                >
                {}
                {!isCompleted && isOverdue && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
                )}
                {!isCompleted && isDueToday && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                )}
                {!isCompleted && !isOverdue && !isDueToday && assignment.priority === "URGENT" && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900 border border-slate-800/50 from-rose-500 to-orange-500" />
                )}

                {}
                <div className="p-5.5 space-y-4">
                  {}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {}
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 max-w-[140px] truncate uppercase">
                      {assignment.course}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isOverdue && (
                        <span className="text-[11px] font-mono font-semibold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md  shrink-0">
                          ⚠️ OVERDUE
                        </span>
                      )}
                      {isDueToday && (
                        <span className="text-[11px] font-mono font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md shrink-0">
                          📅 DUE TODAY
                        </span>
                      )}
                      {}
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border shrink-0 ${getPriorityStyles(assignment.priority)}`}>
                        {assignment.priority}
                      </span>
                      {}
                      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${getDifficultyStyles(assignment.difficulty)}`}>
                        {assignment.difficulty || "MEDIUM"}
                      </span>
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <h3 className={`text-base font-bold font-sans leading-snug transition-colors ${
                      isCompleted ? "text-slate-500 line-through" : "text-slate-100 group-hover:text-indigo-300"
                    }`}>
                      {assignment.title}
                    </h3>
                    <p className={`text-xs leading-relaxed line-clamp-2 ${
                      isCompleted ? "text-slate-600" : "text-slate-400"
                    }`}>
                      {assignment.description || "No description provided."}
                    </p>
                  </div>

                  {}
                  <div className="grid grid-cols-2 gap-3.5 py-3 border-y border-slate-800 text-xs">
                    {}
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <div>
                        <div className="text-[11px] text-slate-500 uppercase font-mono font-semibold">EST. HOURS</div>
                        <div className="text-slate-100 font-mono font-bold mt-0.5">{assignment.estimatedHours}h</div>
                      </div>
                    </div>

                    {}
                    <div className="flex items-center gap-2 text-slate-400 justify-end text-right">
                      <div>
                        <div className="text-[11px] text-slate-500 uppercase font-mono font-semibold">{formatDueDate(assignment.dueDate)}</div>
                        <div className={`font-semibold mt-0.5 ${
                          isCompleted ? "text-slate-500" :
                          daysLeft < 0 ? "text-rose-400 font-bold" :
                          daysLeft === 0 ? "text-amber-400 font-bold" :
                          daysLeft === 1 ? "text-amber-400" :
                          daysLeft <= 3 ? "text-orange-400 font-medium" : "text-slate-200"
                        }`}>
                          {isCompleted ? "Completed" :
                           daysLeft < 0 ? `Overdue by ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "day" : "days"}` :
                           daysLeft === 0 ? "Due Today" :
                           daysLeft === 1 ? "Due Tomorrow" : `${daysLeft} days left`}
                        </div>
                      </div>
                      <Calendar className={`w-4 h-4 ${isCompleted ? "text-slate-600" : isOverdue ? "text-rose-400 " : isDueToday ? "text-amber-400" : "text-slate-300"}`} />
                    </div>
                  </div>

                  {}
                  {totalMilestones > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-mono">SUBTASKS ({completedMilestones}/{totalMilestones})</span>
                        <span className="text-slate-300 font-mono font-bold">{progressPercent}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {}
                {isExpanded && (
                  <div className="px-5.5 pb-5 pt-1 border-t border-slate-800 bg-slate-950 space-y-3.5 animate-fade-in">
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest block">CHECKLIST</span>
                      {assignment.milestones?.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">No milestones defined. Enter one below.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {assignment.milestones?.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => onToggleMilestone(assignment.id, m.id)}
                              className="flex items-center gap-2 text-left w-full text-xs p-1.5 hover:bg-slate-900 rounded-lg transition"
                            >
                              {m.completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-600 hover:text-slate-500 shrink-0" />
                              )}
                              <span className={m.completed ? "text-slate-500 line-through" : "text-slate-300"}>
                                {m.title}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="New checklist subtask..."
                        value={newMilestoneText}
                        onChange={(e) => setNewMilestoneText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMilestoneSubmit(assignment.id)}
                        className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleAddMilestoneSubmit(assignment.id)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {}
                    <div className="pt-2 border-t border-slate-900">
                      <AttachmentManager
                        attachments={assignment.attachments || []}
                        onChange={(newAttachments) => {
                          if (onUpdateAssignment) {
                            onUpdateAssignment({
                              ...assignment,
                              attachments: newAttachments
                            });
                          }
                        }}
                        title="Assignment Attachments"
                      />
                    </div>

                    {}
                    <button
                      onClick={() => onGeneratePlan(assignment)}
                      className="w-full py-1.5 rounded-lg bg-brand-purple/5 hover:bg-brand-purple/10 border border-indigo-500/15 text-xs font-bold text-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{assignment.studyPlan ? "View AI Study Roadmap" : "Generate AI Study Plan"}</span>
                    </button>
                  </div>
                )}

                {}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
                  {}
                  {isCompleted ? (
                    <button
                      onClick={() => onUpdateStatus(assignment.id, "TODO")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(assignment.id, "COMPLETED")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      <Circle className="w-4 h-4 text-slate-500" />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  {}
                  <div className="flex items-center gap-1">
                    {}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        isExpanded 
                          ? "bg-indigo-600/10 text-slate-300 border-indigo-500/20" 
                          : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                      }`}
                      title="Toggle Milestones Subtasks Checklist"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>

                    {}
                    {!isCompleted && (
                      <button
                        onClick={() => onSelectForTimer(assignment.id)}
                        className="p-1.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300 hover:border-indigo-500/20 rounded-lg transition cursor-pointer"
                        title="Start Study Timer Session"
                      >
                        <Timer className="w-4 h-4" />
                      </button>
                    )}

                    {}
                    <button
                      onClick={() => onEditClick(assignment)}
                      className="p-1.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-100 hover:border-slate-700 rounded-lg transition cursor-pointer"
                      title="Edit Assignment Specifications"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {}
                    <button
                      onClick={() => onDelete(assignment.id)}
                      className="p-1.5 bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                      title="Delete Assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
