import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, Calendar, BookOpen, CheckSquare, Bell, Sparkles, ArrowRight, History, FileText, Bookmark, Activity } from "lucide-react";
import { motion } from "motion/react";
import { Assignment, StudySession, Notification } from "../types";
import { fetchNotifications } from "../services/api";

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: Assignment[];
  studySessions: StudySession[];
  masterStudyPlan: any | null;
  onNavigateToTab: (tab: string, state?: any) => void;
  onEditAssignment?: (assignment: Assignment) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  category: "assignments" | "courses" | "milestones" | "notifications" | "calendar" | "study_plans";
  icon: any;
  tab: string;
  details?: string;
  originalData: any;
}

export default function GlobalSearch({
  isOpen,
  onClose,
  assignments,
  studySessions,
  masterStudyPlan,
  onNavigateToTab,
  onEditAssignment
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [ setLoadingNotifications] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("smartdeadline_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  // Fetch notifications to ensure up-to-date notifications search
  useEffect(() => {
    if (isOpen) {
      setLoadingNotifications(true);
      fetchNotifications()
        .then((data) => {
          setNotifications(data);
        })
        .catch(() => {
          // Fallback gracefully
        })
        .finally(() => {
          setLoadingNotifications(false);
        });
    }
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    const filtered = [trimmed, ...recentSearches.filter((s) => s !== trimmed)].slice(0, 5);
    setRecentSearches(filtered);
    localStorage.setItem("smartdeadline_recent_searches", JSON.stringify(filtered));
  };

  const removeRecentSearch = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const filtered = recentSearches.filter((s) => s !== item);
    setRecentSearches(filtered);
    localStorage.setItem("smartdeadline_recent_searches", JSON.stringify(filtered));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("smartdeadline_recent_searches");
  };

  // Build searchable index dynamically
  const searchResults = useMemo(() => {
    const results: SearchResult[] = [];
    const term = query.toLowerCase().trim();

    // 1. Index Assignments
    assignments.forEach((assignment) => {
      results.push({
        id: `assignment-${assignment.id}`,
        title: assignment.title,
        subtitle: `${assignment.course} • Due ${assignment.dueDate} • ${assignment.status.replace("_", " ")}`,
        category: "assignments",
        icon: CheckSquare,
        tab: "assignments",
        details: assignment.description,
        originalData: assignment
      });

      // 2. Index Courses
      const isCourseIndexed = results.some((r) => r.category === "courses" && r.title === assignment.course);
      if (assignment.course && !isCourseIndexed) {
        results.push({
          id: `course-${assignment.course}`,
          title: assignment.course,
          subtitle: "Course Subject Profile",
          category: "courses",
          icon: BookOpen,
          tab: "assignments",
          originalData: assignment.course
        });
      }

      // 3. Index Milestones
      if (assignment.milestones) {
        assignment.milestones.forEach((m) => {
          results.push({
            id: `milestone-${m.id}`,
            title: m.title,
            subtitle: `Milestone of "${assignment.title}" (${m.completed ? "Completed" : "Incomplete"})`,
            category: "milestones",
            icon: Sparkles,
            tab: "assignments",
            originalData: { assignment, milestone: m }
          });
        });
      }

      // 4. Index assignment study plan markdown
      if (assignment.studyPlan) {
        results.push({
          id: `assignment-plan-${assignment.id}`,
          title: `Syllabus Roadmap: ${assignment.title}`,
          subtitle: `Study plan details for ${assignment.course}`,
          category: "study_plans",
          icon: FileText,
          tab: "assignments",
          details: assignment.studyPlan,
          originalData: assignment
        });
      }
    });

    // 5. Index Notifications
    notifications.forEach((notif) => {
      results.push({
        id: `notif-${notif.id}`,
        title: notif.title,
        subtitle: notif.message,
        category: "notifications",
        icon: Bell,
        tab: "notifications",
        originalData: notif
      });
    });

    // 6. Index Study Sessions (Calendar Events)
    studySessions.forEach((session) => {
      const linkedAssignment = assignments.find((a) => a.id === session.assignmentId);
      results.push({
        id: `session-${session.id}`,
        title: session.notes || `Focus block session`,
        subtitle: `${session.durationMinutes} minutes focus • Date: ${session.date.substring(0, 10)}${
          linkedAssignment ? ` • For ${linkedAssignment.title}` : ""
        }`,
        category: "calendar",
        icon: Calendar,
        tab: "academic-calendar",
        originalData: session
      });
    });

    // 7. Index Master Study Plan Daily & Weekly blocks
    if (masterStudyPlan) {
      if (masterStudyPlan.overall_summary) {
        results.push({
          id: "master-plan-summary",
          title: "Master Plan Strategy Summary",
          subtitle: masterStudyPlan.overall_summary,
          category: "study_plans",
          icon: Activity,
          tab: "study-planner",
          originalData: masterStudyPlan
        });
      }

      if (masterStudyPlan.daily_plan) {
        masterStudyPlan.daily_plan.forEach((dp: any, idx: number) => {
          results.push({
            id: `master-plan-daily-${idx}`,
            title: `Daily Plan Focus: ${dp.day}`,
            subtitle: `${dp.focus} (${dp.hours} hrs expected)`,
            category: "study_plans",
            icon: Bookmark,
            tab: "study-planner",
            details: dp.tasks?.join(", "),
            originalData: dp
          });
        });
      }

      if (masterStudyPlan.weekly_plan) {
        masterStudyPlan.weekly_plan.forEach((wp: any, idx: number) => {
          results.push({
            id: `master-plan-weekly-${idx}`,
            title: `Weekly Strategy: ${wp.week}`,
            subtitle: wp.focus,
            category: "study_plans",
            icon: Bookmark,
            tab: "study-planner",
            originalData: wp
          });
        });
      }

      if (masterStudyPlan.revision_plan) {
        masterStudyPlan.revision_plan.forEach((rp: any, idx: number) => {
          results.push({
            id: `master-plan-revision-${idx}`,
            title: `Revision Topic: ${rp.topic}`,
            subtitle: rp.strategy,
            category: "study_plans",
            icon: Sparkles,
            tab: "study-planner",
            originalData: rp
          });
        });
      }

      if (masterStudyPlan.exam_prep_strategy) {
        masterStudyPlan.exam_prep_strategy.forEach((ep: any, idx: number) => {
          results.push({
            id: `master-plan-exam-${idx}`,
            title: `Exam Prep Strategy: ${ep.course}`,
            subtitle: ep.focus,
            category: "study_plans",
            icon: Sparkles,
            tab: "study-planner",
            originalData: ep
          });
        });
      }
    }

    // Filter index based on query text & activeCategory
    if (!term) {
      // If query is empty, return initial items (or nothing if we want to show suggestions)
      return [];
    }

    const filtered = results.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const textMatch = 
        item.title.toLowerCase().includes(term) ||
        item.subtitle.toLowerCase().includes(term) ||
        (item.details && item.details.toLowerCase().includes(term));
      return categoryMatch && textMatch;
    });

    return filtered;
  }, [query, activeCategory, assignments, studySessions, masterStudyPlan, notifications]);

  // Adjust active index on filtered list update
  useEffect(() => {
    setActiveIndex(0);
  }, [searchResults]);

  // Handle key listeners for navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults[activeIndex]) {
        handleSelectItem(searchResults[activeIndex]);
      }
    }
  };

  // Execute selecting search result
  const handleSelectItem = (item: SearchResult) => {
    saveRecentSearch(query || item.title);
    onClose();

    if (item.category === "assignments" && item.tab === "assignments") {
      if (onEditAssignment) {
        // Switch tab & trigger edit view of assignment
        onNavigateToTab("assignments");
        setTimeout(() => {
          onEditAssignment(item.originalData);
        }, 150);
      } else {
        onNavigateToTab("assignments");
      }
    } else if (item.category === "courses") {
      // Navigate to assignments and filter by course
      onNavigateToTab("assignments", { filterCourse: item.title });
    } else if (item.category === "milestones") {
      // Edit the assignment that belongs to this milestone
      onNavigateToTab("assignments");
      if (onEditAssignment && item.originalData.assignment) {
        setTimeout(() => {
          onEditAssignment(item.originalData.assignment);
        }, 150);
      }
    } else {
      // General tab navigation
      onNavigateToTab(item.tab);
    }
  };

  // Suggestions list when search query is empty
  const suggestions = useMemo(() => {
    const items = [];
    if (assignments.length > 0) {
      items.push({ text: `Review ${assignments[0].course || "active syllabus"}`, query: assignments[0].title });
    }
    items.push({ text: "Syllabus AI Scan Roadmap", query: "Syllabus" });
    items.push({ text: "Academic Focus Session", query: "Focus" });
    items.push({ text: "Sustained study calendar strategy", query: "Study Plans" });
    return items;
  }, [assignments]);

  // Regex Highlighter helper function
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery) return <span>{text}</span>;
    
    try {
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = text.split(regex);
      
      return (
        <span>
          {parts.map((part, i) => 
            regex.test(part) ? (
              <mark key={i} className="bg-indigo-500/30 text-indigo-200 font-semibold px-0.5 rounded-sm">
                {part}
              </mark>
            ) : (
              part
            )
          )}
        </span>
      );
    } catch (e) {
      return <span>{text}</span>;
    }
  };

  // Close search when background is clicked
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-4 md:p-12 bg-slate-950/85 backdrop-blur-md"
      onClick={handleOverlayClick}
      id="global-search-overlay"
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
        id="global-search-container"
      >
        {}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/50 shrink-0">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, courses, milestones, notifications, study plans..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-400 focus:outline-hidden"
            id="global-search-input"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition shrink-0 cursor-pointer"
              title="Clear text"
              type="button"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900 text-[10px] font-mono text-slate-500 shrink-0 select-none">
            <span>ESC</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition shrink-0 cursor-pointer sm:hidden"
            title="Close Search"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {}
        <div className="flex gap-1.5 px-4 py-2 bg-slate-900/50 border-b border-slate-850 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { id: "all", label: "All Items" },
            { id: "assignments", label: "Assignments" },
            { id: "courses", label: "Courses" },
            { id: "milestones", label: "Milestones" },
            { id: "notifications", label: "Alerts" },
            { id: "calendar", label: "Calendar" },
            { id: "study_plans", label: "Study Plans" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-slate-400 hover:text-slate-200 bg-slate-850/40 hover:bg-slate-800/60"
              }`}
              type="button"
            >
              {cat.label}
            </button>
          ))}
        </div>

        {}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[250px]"
          id="global-search-results-list"
        >
          {query ? (
            searchResults.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-1 pb-1">
                  <span>Search Matches ({searchResults.length})</span>
                  <span>Use ↑↓ keys to navigate</span>
                </div>
                {searchResults.map((item, index) => {
                  const IconComp = item.icon;
                  const isSelected = index === activeIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`group p-3 rounded-xl border flex items-start gap-3 transition cursor-pointer ${
                        isSelected
                          ? "bg-slate-800/80 border-indigo-500/40 shadow-lg"
                          : "bg-slate-950/20 border-slate-850 hover:bg-slate-950/40 hover:border-slate-800"
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 transition ${
                        isSelected ? "bg-indigo-500/20 text-indigo-400" : "bg-slate-900 text-slate-400 group-hover:text-slate-300"
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-100 truncate">
                            {highlightMatch(item.title, query)}
                          </h4>
                          <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.25 rounded-md bg-slate-800 text-slate-400 tracking-wider">
                            {item.category.replace("_", " ")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {highlightMatch(item.subtitle, query)}
                        </p>
                        {item.details && (
                          <p className="text-[11px] text-slate-500 font-mono line-clamp-1 border-t border-slate-800/40 pt-1 mt-1">
                            {highlightMatch(item.details, query)}
                          </p>
                        )}
                      </div>
                      <div className={`self-center opacity-0 group-hover:opacity-100 transition pl-1 shrink-0 ${
                        isSelected ? "text-indigo-400" : "text-slate-500"
                      }`}>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950/40 border border-slate-850 flex items-center justify-center text-slate-500 text-lg">
                  🔍
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-300">No matching indexes found</h4>
                  <p className="text-xs text-slate-500 max-w-xs mt-1">
                    Your search term "{query}" didn't return any results in the {activeCategory === "all" ? "entire database" : `${activeCategory} category`}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                  }}
                  className="px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/20 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 transition"
                  type="button"
                >
                  Clear filters
                </button>
              </div>
            )
          ) : (
            // Suggestions or Recent searches state
            <div className="space-y-5">
              {recentSearches.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-1">
                    <span>Recent Searches</span>
                    <button
                      onClick={clearRecentSearches}
                      className="hover:text-rose-400 transition cursor-pointer"
                      title="Clear recent searches list"
                      type="button"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {recentSearches.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setQuery(item)}
                        className="p-2.5 rounded-xl border border-slate-850 bg-slate-950/20 hover:bg-slate-950/40 hover:border-slate-800 flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-300 truncate group-hover:text-slate-200">
                            {item}
                          </span>
                        </div>
                        <button
                          onClick={(e) => removeRecentSearch(e, item)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition shrink-0 cursor-pointer"
                          title="Remove from history"
                          type="button"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div className="space-y-2">
                <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-1">
                  <span>Suggested Searches</span>
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(item.query)}
                      className="w-full p-2.5 rounded-xl border border-slate-850 bg-slate-950/20 hover:bg-slate-950/40 hover:border-slate-800 flex items-center justify-between text-left transition cursor-pointer group"
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="text-xs text-slate-300 group-hover:text-slate-200">
                          {item.text}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400 font-bold">
                        Try "{item.query}"
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div className="p-3 bg-indigo-950/10 border border-indigo-500/10 rounded-xl flex items-center gap-3">
                <span className="text-lg">💡</span>
                <p className="text-[11px] text-slate-400 leading-normal">
                  You can open this Global Smart Search panel anytime across the application using the <kbd className="px-1 py-0.25 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[9px]">Ctrl</kbd> + <kbd className="px-1 py-0.25 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[9px]">K</kbd> keyboard shortcut.
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
