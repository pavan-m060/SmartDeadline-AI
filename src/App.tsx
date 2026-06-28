import { useState, useEffect, useMemo } from "react";
import { Assignment, StudySession, AssignmentStatus, UserProfile } from "./types";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import AssignmentList from "./components/AssignmentList";
import AssignmentForm from "./components/AssignmentForm";
import StudyPlanner from "./components/StudyPlanner";
import ProcrastinationBuster from "./components/ProcrastinationBuster";
import FocusTimer from "./components/FocusTimer";
import LandingPage from "./components/LandingPage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import Analytics from "./components/Analytics";
import Profile from "./components/Profile";
import SyllabusScanner from "./components/SyllabusScanner";
import AssignmentScanner from "./components/AssignmentScanner";
import AcademicCalendar from "./components/AcademicCalendar";
import DeadlinePredictor from "./components/DeadlinePredictor";
import AICopilot from "./components/AICopilot";
import FloatingAssistant from "./components/FloatingAssistant";
import VoiceAssistant from "./components/VoiceAssistant";
import ExportCenter from "./components/ExportCenter";
import WeeklyReviewPage from "./components/WeeklyReviewPage";
import { Menu, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import NotificationCenter from "./components/NotificationCenter";
import { useToast } from "./components/Toast";
import GlobalSearch from "./components/GlobalSearch";
import { getToken, clearToken, fetchAssignmentsAndSessions, createAssignment, updateAssignmentOnServer, deleteAssignmentFromServer, logStudySessionOnServer, updateProfile as apiUpdateProfile, fetchNotifications, generateComprehensiveStudyPlan, fetchComprehensiveStudyPlan } from "./services/api";

// --- Seed Data ---
const SEED_ASSIGNMENTS: Assignment[] = [
  {
    id: "seed-1",
    title: "Comparative Tragedy Analysis Essay",
    course: "LIT-204 Shakespearean",
    dueDate: "2026-06-30",
    status: "IN_PROGRESS",
    priority: "HIGH",
    difficulty: "MEDIUM",
    weight: 25,
    estimatedHours: 12,
    actualHoursSpent: 3.5,
    description: "Write a 3,000-word academic comparative research paper analyzing the descent into psychological madness of King Lear and Macbeth.",
    createdAt: "2026-06-20T08:00:00Z",
    milestones: [
      { id: "m1", title: "Select primary source citations & outline structure", completed: true },
      { id: "m2", title: "Draft introduction and Macbeth thematic sections", completed: true },
      { id: "m3", title: "Synthesize Lear comparatives and transition links", completed: false },
      { id: "m4", title: "Refine thesis paragraph & format MLA Bibliography", completed: false }
    ],
    studyPlan: `### STRATEGIC STUDY ROADMAP
    
## Strategic Approach
Comparative essays require solid thematic alignment. Instead of writing about Macbeth and Lear separately, organize your core drafts strictly by thematic blocks (e.g., Bloodlines decay, hubris, sanity boundaries). Tackle research sources first to ground each claim in peer-reviewed text.

## Time Boxing Suggestion
- Research & Outline: 2 hours (Completed)
- Body Drafts Section A: 3 hours (Completed)
- Body Drafts Section B: 4 hours (Scheduled)
- Review & Bibliography: 3 hours (Scheduled)

## Overcoming Common Pitfalls
Avoid merely summarizing plot points. Dedicate 80% of body paragraphs to critical stylistic choices, staging metaphors, and rhetorical breakdowns.`
  },
  {
    id: "seed-2",
    title: "Multi-Layer Perceptron From Scratch",
    course: "CS-310 Neural Networks",
    dueDate: "2026-07-05",
    status: "TODO",
    priority: "URGENT",
    difficulty: "HARD",
    weight: 15,
    estimatedHours: 18,
    actualHoursSpent: 0,
    description: "Construct a feedforward backpropagation neural network from raw linear algebra in Python. No automatic differentiation libraries (PyTorch/Tensorflow) permitted.",
    createdAt: "2026-06-22T09:30:00Z",
    milestones: [
      { id: "m5", title: "Formulate matrix calculus derivatives on paper", completed: false },
      { id: "m6", title: "Code vectorized sigmoid and relu activation classes", completed: false },
      { id: "m7", title: "Write multi-layer forward prop matrix products", completed: false },
      { id: "m8", title: "Implement gradient descent backprop algorithm loops", completed: false }
    ]
  },
  {
    id: "seed-3",
    title: "Bayesian Estimator Problem Set",
    course: "MATH-281 Statistics",
    dueDate: "2026-07-09",
    status: "TODO",
    priority: "MEDIUM",
    difficulty: "EASY",
    weight: 10,
    estimatedHours: 6,
    actualHoursSpent: 0,
    description: "Solve problem sets detailing Maximum Likelihood Estimation, Bayesian priors, posterior distributions, and sample size margins.",
    createdAt: "2026-06-24T14:15:00Z",
    milestones: [
      { id: "m9", title: "Complete problems 1 through 5 on MLE boundaries", completed: false },
      { id: "m10", title: "Graph prior vs posterior density calculations", completed: false },
      { id: "m11", title: "Submit answers via LaTeX document compiler", completed: false }
    ]
  }
];

const SEED_SESSIONS = (): StudySession[] => {
  const sessions: StudySession[] = [];
  const today = new Date();
  
  // Seed various sessions over the past 2 weeks to populate the heat map beautifully
  const offsets = [1, 2, 4, 5, 7, 8, 10, 12, 14];
  const minutes = [25, 45, 50, 15, 60, 30, 25, 70, 20];
  
  offsets.forEach((offset, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - offset);
    sessions.push({
      id: `session-seed-${idx}`,
      assignmentId: "seed-1",
      durationMinutes: minutes[idx],
      date: d.toISOString(),
      notes: "Seeded study block session"
    });
  });
  
  return sessions;
};

// --- Main App Component ---
export default function App() {
  const { showToast } = useToast();
  const [currentScreen, setCurrentScreen] = useState<"landing" | "login" | "register" | "app">("landing");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  // Global search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [initialCourseFilter, setInitialCourseFilter] = useState<string>("ALL");
  const [initialSearchQuery, setInitialSearchQuery] = useState<string>("");

  const [masterStudyPlan, setMasterStudyPlan] = useState<any | null>(() => {
    const saved = localStorage.getItem("smartdeadline_master_study_plan");
    return saved ? JSON.parse(saved) : null;
  });
  const [isRecalculatingPlan, setIsRecalculatingPlan] = useState(false);
  const [recalculationError, setRecalculationError] = useState<string | null>(null);

  // Automatic study plan recalculation whenever assignments change
  useEffect(() => {
    if (currentScreen !== "app" || assignments.length === 0) return;

    // Filter only active (incomplete) assignments and select planning-critical fields
    const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');
    const activeAssignmentsKey = JSON.stringify(activeAssignments.map(a => ({
      id: a.id,
      title: a.title,
      course: a.course,
      dueDate: a.dueDate,
      status: a.status,
      priority: a.priority,
      difficulty: a.difficulty,
      estimatedHours: a.estimatedHours
    })));

    // Store previous key to prevent duplicate triggering
    const previousKey = localStorage.getItem("smartdeadline_assignments_active_key");
    if (previousKey === activeAssignmentsKey && masterStudyPlan !== null) {
      return; // No structural task changes, avoid redundant api call
    }

    localStorage.setItem("smartdeadline_assignments_active_key", activeAssignmentsKey);

    const recalculatePlan = async () => {
      if (!getToken()) return;
      setIsRecalculatingPlan(true);
      setRecalculationError(null);
      try {
        const savedPrefs = localStorage.getItem("smartdeadline_study_preferences");
        const prefs = savedPrefs ? JSON.parse(savedPrefs) : undefined;

        const res = await generateComprehensiveStudyPlan(activeAssignments, {
          availableHours: prefs?.available_hours,
          sessionLength: prefs?.session_length,
          breakInterval: prefs?.break_interval
        });
        const plan = res?.plan || res;
        setMasterStudyPlan(plan);
        localStorage.setItem("smartdeadline_master_study_plan", JSON.stringify(plan));
        if (res?.preferences) {
          localStorage.setItem("smartdeadline_study_preferences", JSON.stringify(res.preferences));
        }
      } catch (err: any) {

        setRecalculationError(err.message || "Unable to update master study plan automatically.");
      } finally {
        setIsRecalculatingPlan(false);
      }
    };

    // Debounce recalculation slightly in case of multiple rapid updates (e.g. imports or manual creations)
    const timer = setTimeout(() => {
      recalculatePlan();
    }, 1500);

    return () => clearTimeout(timer);
  }, [assignments, currentScreen]);

  // Sync unread notification count
  useEffect(() => {
    if (currentScreen === "app" && getToken()) {
      const getUnread = async () => {
        try {
          const notifs = await fetchNotifications();
          setUnreadNotificationsCount(notifs.filter(n => !n.read).length);
        } catch (err) {

        }
      };
      getUnread();
    }
  }, [currentScreen, assignments, currentTab]);

  
  // States for handling form dialogs
  const [isEditingForm, setIsEditingForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | undefined>(undefined);

  // Focus Timer active bind target
  const [activeTimerAssignmentId, setActiveTimerAssignmentId] = useState("");
  
  // Starting sprint bridge state
  const [startingSprint, setStartingSprint] = useState<{
    assignmentId: string;
    title: string;
    minutes: number;
  } | null>(null);

  // States for confirmation dialogs
  const [assignmentIdToDelete, setAssignmentIdToDelete] = useState<string | null>(null);
  const [studySessionIdToDelete, setStudySessionIdToDelete] = useState<string | null>(null);

  const loadUserData = async () => {
    if (!getToken()) {
      const savedAssignments = localStorage.getItem("smartdeadline_assignments");
      const savedSessions = localStorage.getItem("smartdeadline_sessions");
      if (savedAssignments) setAssignments(JSON.parse(savedAssignments));
      else setAssignments(SEED_ASSIGNMENTS);
      if (savedSessions) setStudySessions(JSON.parse(savedSessions));
      else setStudySessions(SEED_SESSIONS());
      return;
    }

    try {
      const data = await fetchAssignmentsAndSessions();
      if (data.assignments && data.assignments.length > 0) {
        setAssignments(data.assignments);
        setStudySessions(data.studySessions);
      } else {
        // Seed server database with our clean mock layout if empty
        const assignmentsPromises = SEED_ASSIGNMENTS.map(a => createAssignment(a));
        await Promise.all(assignmentsPromises);

        const sessionsPromises = SEED_SESSIONS().map(s => logStudySessionOnServer(s));
        await Promise.all(sessionsPromises);

        const refreshedData = await fetchAssignmentsAndSessions();
        setAssignments(refreshedData.assignments);
        setStudySessions(refreshedData.studySessions);
      }

      // Also load the master study plan and study preferences from SQLite database
      const savedPlanData = await fetchComprehensiveStudyPlan().catch(() => {});
      if (savedPlanData && savedPlanData.plan) {
        setMasterStudyPlan(savedPlanData.plan);
        localStorage.setItem("smartdeadline_master_study_plan", JSON.stringify(savedPlanData.plan));
        if (savedPlanData.preferences) {
          localStorage.setItem("smartdeadline_study_preferences", JSON.stringify(savedPlanData.preferences));
        }
      }
    } catch (err) {

      const savedAssignments = localStorage.getItem("smartdeadline_assignments");
      const savedSessions = localStorage.getItem("smartdeadline_sessions");
      if (savedAssignments) setAssignments(JSON.parse(savedAssignments));
      else setAssignments(SEED_ASSIGNMENTS);
      if (savedSessions) setStudySessions(JSON.parse(savedSessions));
      else setStudySessions(SEED_SESSIONS());
    }
  };

  // Load state from localStorage on boot
  useEffect(() => {
    const savedUser = localStorage.getItem("smartdeadline_user");
    const token = getToken();

    if (savedUser && token) {
      setUserProfile(JSON.parse(savedUser));
      setCurrentScreen("app");
      loadUserData();
    } else {
      const savedAssignments = localStorage.getItem("smartdeadline_assignments");
      const savedSessions = localStorage.getItem("smartdeadline_sessions");

      if (savedAssignments) {
        setAssignments(JSON.parse(savedAssignments));
      } else {
        setAssignments(SEED_ASSIGNMENTS);
      }

      if (savedSessions) {
        setStudySessions(JSON.parse(savedSessions));
      } else {
        setStudySessions(SEED_SESSIONS());
      }
    }
  }, []);

  // Global shortcut Ctrl+K listener for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Dynamic theme injection
  useEffect(() => {
    const theme = userProfile?.settings?.theme || "indigo";
    const existingStyle = document.getElementById("dynamic-theme-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    if (theme !== "indigo") {
      const styleEl = document.createElement("style");
      styleEl.id = "dynamic-theme-style";
      
      let css = "";
      if (theme === "emerald") {
        css = `
          :root {
            --color-indigo-300: #86efac !important;
            --color-indigo-400: #34d399 !important;
            --color-indigo-500: #10b981 !important;
            --color-indigo-600: #059669 !important;
            --color-indigo-700: #047857 !important;
            --color-indigo-800: #065f46 !important;
            --color-indigo-950: #022c22 !important;
            --color-brand-indigo: #10b981 !important;
            --color-brand-purple: #059669 !important;
            --color-brand-purple-dark: #047857 !important;
          }
        `;
      } else if (theme === "amber") {
        css = `
          :root {
            --color-indigo-300: #fde047 !important;
            --color-indigo-400: #fbbf24 !important;
            --color-indigo-500: #f59e0b !important;
            --color-indigo-600: #d97706 !important;
            --color-indigo-700: #b45309 !important;
            --color-indigo-800: #92400e !important;
            --color-indigo-950: #451a03 !important;
            --color-brand-indigo: #f59e0b !important;
            --color-brand-purple: #d97706 !important;
            --color-brand-purple-dark: #b45309 !important;
          }
        `;
      } else if (theme === "rose") {
        css = `
          :root {
            --color-indigo-300: #fca5a5 !important;
            --color-indigo-400: #fb7185 !important;
            --color-indigo-500: #f43f5e !important;
            --color-indigo-600: #e11d48 !important;
            --color-indigo-700: #be123c !important;
            --color-indigo-800: #9f1239 !important;
            --color-indigo-950: #4c0519 !important;
            --color-brand-indigo: #f43f5e !important;
            --color-brand-purple: #e11d48 !important;
            --color-brand-purple-dark: #be123c !important;
          }
        `;
      } else if (theme === "violet") {
        css = `
          :root {
            --color-indigo-300: #d8b4fe !important;
            --color-indigo-400: #c084fc !important;
            --color-indigo-500: #a855f7 !important;
            --color-indigo-600: #9333ea !important;
            --color-indigo-700: #7e22ce !important;
            --color-indigo-800: #6b21a8 !important;
            --color-indigo-950: #3b0764 !important;
            --color-brand-indigo: #a855f7 !important;
            --color-brand-purple: #9333ea !important;
            --color-brand-purple-dark: #7e22ce !important;
          }
        `;
      }
      
      styleEl.innerHTML = css;
      document.head.appendChild(styleEl);
    }
  }, [userProfile?.settings?.theme]);

  // Calculate Metrics and statistics
  const stats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === "COMPLETED").length;
    
    // Calculate streak
    let streak = 0;
    const todayStr = new Date().toISOString().substring(0, 10);
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    
    const uniqueSessionDates = new Set(
      studySessions.map((s) => s.date.substring(0, 10))
    );

    if (uniqueSessionDates.has(todayStr) || uniqueSessionDates.has(yesterdayStr)) {
      streak = 1;
      const checkDate = new Date();
      while (true) {
        checkDate.setDate(checkDate.getDate() - 1);
        const checkStr = checkDate.toISOString().substring(0, 10);
        if (uniqueSessionDates.has(checkStr)) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Total focus hours spent
    const totalMinutes = studySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const totalHours = totalMinutes / 60;

    return {
      total,
      completed,
      streak: streak === 0 ? 3 : streak, // Default to a 3-day active streak to feel warm on first load
      totalHours
    };
  }, [assignments, studySessions]);

  // Handle saving new or edited assignment
  const handleSaveAssignment = async (formData: any) => {
    let updatedList: Assignment[];
    let affected: Assignment;

    if (editingAssignment) {
      // Editing
      affected = {
        ...editingAssignment,
        title: formData.title,
        course: formData.course,
        dueDate: formData.dueDate,
        priority: formData.priority,
        difficulty: formData.difficulty,
        weight: formData.weight,
        estimatedHours: formData.estimatedHours,
        description: formData.description,
        attachments: formData.attachments || []
      };
      updatedList = assignments.map((a) => (a.id === editingAssignment.id ? affected : a));
      setAssignments(updatedList);
      localStorage.setItem("smartdeadline_assignments", JSON.stringify(updatedList));
      showToast(`Updated assignment: "${formData.title}"`, "success");
      if (getToken()) {
        await updateAssignmentOnServer(affected).catch(() => {});
      }
    } else {
      // Creating
      const newId = `assignment-${Date.now()}`;
      
      // Map suggested milestones if created via parser
      const initialMilestones = (formData.suggestedMilestones || []).map((title: string, idx: number) => ({
        id: `milestone-${Date.now()}-${idx}`,
        title,
        completed: false
      }));

      affected = {
        id: newId,
        title: formData.title,
        course: formData.course,
        dueDate: formData.dueDate,
        status: "TODO",
        priority: formData.priority,
        difficulty: formData.difficulty || "MEDIUM",
        weight: formData.weight || 10,
        estimatedHours: formData.estimatedHours || 10,
        actualHoursSpent: 0,
        description: formData.description,
        milestones: initialMilestones,
        attachments: formData.attachments || [],
        createdAt: new Date().toISOString()
      };
      updatedList = [...assignments, affected];
      setAssignments(updatedList);
      localStorage.setItem("smartdeadline_assignments", JSON.stringify(updatedList));
      showToast(`Created assignment: "${formData.title}"`, "success");
      if (getToken()) {
        await createAssignment(affected).catch(() => {});
      }
    }

    setIsEditingForm(false);
    setEditingAssignment(undefined);
    setCurrentTab("assignments");
  };

  // Delete assignment
  const handleDeleteAssignment = (id: string) => {
    setAssignmentIdToDelete(id);
  };

  const handleConfirmDeleteAssignment = async () => {
    if (!assignmentIdToDelete) return;
    const id = assignmentIdToDelete;
    setAssignmentIdToDelete(null);
    const title = assignments.find((a) => a.id === id)?.title || "Assignment";
    const updated = assignments.filter((a) => a.id !== id);
    setAssignments(updated);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
    showToast(`Deleted "${title}"`, "warning");
    if (getToken()) {
      await deleteAssignmentFromServer(id).catch(() => {});
    }
  };

  // Update Status
  const handleUpdateStatus = async (id: string, status: AssignmentStatus) => {
    let affected: Assignment | undefined;
    const updated = assignments.map((a) => {
      if (a.id === id) {
        affected = { ...a, status };
        return affected;
      }
      return a;
    });
    setAssignments(updated);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
    if (affected) {
      if (status === "COMPLETED") {
        showToast(`Congratulations! "${affected.title}" is completed! 🎉`, "success");
      } else {
        showToast(`"${affected.title}" marked as ${status.replace('_', ' ')}`, "info");
      }
    }
    if (getToken() && affected) {
      await updateAssignmentOnServer(affected).catch(() => {});
    }
  };

  // General assignment updates e.g., rescheduling due dates
  const handleUpdateAssignment = async (updatedAssignment: Assignment) => {
    const updated = assignments.map((a) => (a.id === updatedAssignment.id ? updatedAssignment : a));
    setAssignments(updated);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
    if (getToken()) {
      await updateAssignmentOnServer(updatedAssignment).catch(() => {});
    }
  };

  // Toggle milestone checkbox
  const handleToggleMilestone = async (assignmentId: string, milestoneId: string) => {
    let affected: Assignment | undefined;
    let toggledState = false;
    let milestoneTitle = "";
    const updated = assignments.map((a) => {
      if (a.id === assignmentId) {
        const updatedMilestones = a.milestones.map((m) => {
          if (m.id === milestoneId) {
            toggledState = !m.completed;
            milestoneTitle = m.title;
            return { ...m, completed: toggledState };
          }
          return m;
        });
        affected = { ...a, milestones: updatedMilestones };
        return affected;
      }
      return a;
    });
    setAssignments(updated);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
    if (milestoneTitle) {
      showToast(
        toggledState 
          ? `Milestone Completed: "${milestoneTitle}"! 🎯` 
          : `Milestone reopened: "${milestoneTitle}"`, 
        toggledState ? "success" : "info"
      );
    }
    if (getToken() && affected) {
      await updateAssignmentOnServer(affected).catch(() => {});
    }
  };

  // Add milestone manually
  const handleAddMilestone = async (assignmentId: string, title: string) => {
    let affected: Assignment | undefined;
    const updated = assignments.map((a) => {
      if (a.id === assignmentId) {
        const newMilestone = {
          id: `milestone-${Date.now()}`,
          title,
          completed: false
        };
        affected = { ...a, milestones: [...a.milestones, newMilestone] };
        return affected;
      }
      return a;
    });
    setAssignments(updated);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
    showToast(`Added milestone: "${title}"`, "success");
    if (getToken() && affected) {
      await updateAssignmentOnServer(affected).catch(() => {});
    }
  };

  // Log completed focus session minutes
  const handleLogStudySession = async (assignmentId: string, minutes: number, notes?: string) => {
    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      assignmentId,
      durationMinutes: minutes,
      date: new Date().toISOString(),
      notes
    };

    const updatedSessions = [...studySessions, newSession];
    setStudySessions(updatedSessions);
    localStorage.setItem("smartdeadline_sessions", JSON.stringify(updatedSessions));

    let affectedAssignment: Assignment | undefined;
    const updatedAssignments = assignments.map((a) => {
      if (a.id === assignmentId) {
        affectedAssignment = {
          ...a,
          actualHoursSpent: Number((a.actualHoursSpent + minutes / 60).toFixed(1)),
          status: a.status === "TODO" ? "IN_PROGRESS" : a.status
        };
        return affectedAssignment;
      }
      return a;
    });
    setAssignments(updatedAssignments);
    localStorage.setItem("smartdeadline_assignments", JSON.stringify(updatedAssignments));

    if (affectedAssignment) {
      showToast(`Logged study session! +${minutes}m for "${affectedAssignment.title}"`, "success");
    } else {
      showToast(`Logged study session: +${minutes}m focus!`, "success");
    }

    if (getToken()) {
      await logStudySessionOnServer(newSession).catch(() => {});
      if (affectedAssignment) {
        await updateAssignmentOnServer(affectedAssignment).catch(() => {});
      }
    }
  };

  // Add multiple study sessions (supports recurring study sessions from calendar)
  const handleCreateStudySessions = async (newSessions: StudySession[]) => {
    const updatedSessions = [...studySessions, ...newSessions];
    setStudySessions(updatedSessions);
    localStorage.setItem("smartdeadline_sessions", JSON.stringify(updatedSessions));

    // Update assignment spent times if any
    let updatedAssignments = [...assignments];
    const affectedCourseTitles: string[] = [];

    newSessions.forEach(session => {
      updatedAssignments = updatedAssignments.map((a) => {
        if (a.id === session.assignmentId) {
          affectedCourseTitles.push(a.title);
          return {
            ...a,
            actualHoursSpent: Number((a.actualHoursSpent + session.durationMinutes / 60).toFixed(1)),
            status: a.status === "TODO" ? "IN_PROGRESS" : a.status
          };
        }
        return a;
      });
    });

    if (affectedCourseTitles.length > 0) {
      setAssignments(updatedAssignments);
      localStorage.setItem("smartdeadline_assignments", JSON.stringify(updatedAssignments));
    }

    if (newSessions.length === 1) {
      showToast(`Scheduled study session: ${newSessions[0].durationMinutes}m focus block!`, "success");
    } else {
      showToast(`Scheduled ${newSessions.length} recurring study sessions!`, "success");
    }

    if (getToken()) {
      for (const s of newSessions) {
        await logStudySessionOnServer(s).catch(() => {});
      }
      // Sync assignments on server if any were updated
      const uniqueUpdatedAssignmentIds = Array.from(new Set(newSessions.map(s => s.assignmentId)));
      for (const id of uniqueUpdatedAssignmentIds) {
        const aff = updatedAssignments.find(a => a.id === id);
        if (aff) {
          await updateAssignmentOnServer(aff).catch(() => {});
        }
      }
    }
  };

  // Update a study session's date/details
  const handleUpdateStudySession = async (updatedSession: StudySession) => {
    const updated = studySessions.map((s) => (s.id === updatedSession.id ? updatedSession : s));
    setStudySessions(updated);
    localStorage.setItem("smartdeadline_sessions", JSON.stringify(updated));
    showToast("Rescheduled study session successfully!", "success");
  };

  // Delete a study session
  const handleDeleteStudySession = async (sessionId: string) => {
    setStudySessionIdToDelete(sessionId);
  };

  const handleConfirmDeleteStudySession = async () => {
    if (!studySessionIdToDelete) return;
    const sessionId = studySessionIdToDelete;
    setStudySessionIdToDelete(null);

    const targetSession = studySessions.find(s => s.id === sessionId);
    if (!targetSession) return;

    const updated = studySessions.filter((s) => s.id !== sessionId);
    setStudySessions(updated);
    localStorage.setItem("smartdeadline_sessions", JSON.stringify(updated));

    // Deduct duration from assignment hours
    if (targetSession.assignmentId) {
      const updatedAssignments = assignments.map((a) => {
        if (a.id === targetSession.assignmentId) {
          return {
            ...a,
            actualHoursSpent: Math.max(0, Number((a.actualHoursSpent - targetSession.durationMinutes / 60).toFixed(1)))
          };
        }
        return a;
      });
      setAssignments(updatedAssignments);
      localStorage.setItem("smartdeadline_assignments", JSON.stringify(updatedAssignments));
      
      const aff = updatedAssignments.find(a => a.id === targetSession.assignmentId);
      if (getToken() && aff) {
        await updateAssignmentOnServer(aff).catch(() => {});
      }
    }
    showToast("Removed scheduled study session.", "info");
  };

  // Launch procrastination starting sprint
  const handleStartStartingSprint = (assignmentId: string, sprintTitle: string, minutes: number) => {
    setStartingSprint({
      assignmentId,
      title: sprintTitle,
      minutes
    });
    setCurrentTab("focus-timer");
  };

  // Auth Handlers
  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("smartdeadline_user", JSON.stringify(profile));
    setCurrentScreen("app");
    showToast(`Welcome back, ${profile.fullName}! 👋`, "success");
    loadUserData();
  };

  const handleRegisterSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("smartdeadline_user", JSON.stringify(profile));
    setCurrentScreen("app");
    showToast(`Welcome, ${profile.fullName}! Your academic workspace is initialized.`, "success");
    loadUserData();
  };

  const handleLogout = () => {
    setUserProfile(null);
    clearToken();
    localStorage.removeItem("smartdeadline_user");
    localStorage.removeItem("smartdeadline_assignments");
    localStorage.removeItem("smartdeadline_sessions");
    setAssignments([]);
    setStudySessions([]);
    setCurrentScreen("landing");
    showToast("Successfully logged out. See you soon!", "info");
  };

  const handleNavigateFromSearch = (tab: string, navigationState?: any) => {
    setCurrentTab(tab);
    setIsEditingForm(false);
    setEditingAssignment(undefined);
    if (navigationState?.filterCourse) {
      setInitialCourseFilter(navigationState.filterCourse);
    } else {
      setInitialCourseFilter("ALL");
    }
    if (navigationState?.searchQuery) {
      setInitialSearchQuery(navigationState.searchQuery);
    } else {
      setInitialSearchQuery("");
    }
  };

  const handleVoiceAction = async (action: any) => {
    if (!action || !action.type) return;

    if (action.type === "NAVIGATE" && action.payload?.tab) {
      setCurrentTab(action.payload.tab.toLowerCase());
    } else if (action.type === "ADD_ASSIGNMENT" && action.payload) {
      const { title, course, dueDate, type, priority } = action.payload;
      if (title && dueDate) {
        const newAssignment = {
          title,
          course: course || "General",
          dueDate,
          type: (type || "Project") as any,
          priority: (priority?.toUpperCase() || "MEDIUM") as any,
          status: "TODO" as const,
          estimatedHours: 2,
        };
        await handleSaveAssignment(newAssignment);
      }
    }
  };

  const handleUpdateProfile = async (profile: UserProfile) => {
    setUserProfile(profile);
    localStorage.setItem("smartdeadline_user", JSON.stringify(profile));
    showToast("Profile updated successfully!", "success");
    if (getToken()) {
      await apiUpdateProfile(profile).catch(() => {});
    }
  };

  // Render Screens depending on state
  if (currentScreen === "landing") {
    return <LandingPage onNavigate={(screen) => setCurrentScreen(screen)} />;
  }

  if (currentScreen === "login") {
    return (
      <LoginPage 
        onNavigate={(screen) => setCurrentScreen(screen)} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  if (currentScreen === "register") {
    return (
      <RegisterPage 
        onNavigate={(screen) => setCurrentScreen(screen)} 
        onRegisterSuccess={handleRegisterSuccess} 
      />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      {}
      <div className="hidden md:flex shrink-0">
        <Sidebar 
          currentTab={currentTab} 
          setCurrentTab={(tab) => {
            setCurrentTab(tab);
            setIsEditingForm(false);
            setEditingAssignment(undefined);
          }} 
          stats={stats} 
          userProfile={userProfile}
          onLogout={handleLogout}
          unreadNotificationsCount={unreadNotificationsCount}
        />
      </div>

      {}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative z-50 flex h-full"
            >
              <Sidebar 
                currentTab={currentTab} 
                setCurrentTab={(tab) => {
                  setCurrentTab(tab);
                  setIsEditingForm(false);
                  setEditingAssignment(undefined);
                  setIsMobileMenuOpen(false);
                }} 
                stats={stats} 
                userProfile={userProfile}
                onLogout={handleLogout}
                unreadNotificationsCount={unreadNotificationsCount}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition md:hidden shrink-0 cursor-pointer"
              aria-label="Toggle Mobile Sidebar Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse hidden md:block" />
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">Workspace Online</span>
          </div>

          <div className="flex items-center gap-3">
            {}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition text-xs cursor-pointer shrink-0"
              title="Search Workspace (Ctrl+K)"
              type="button"
            >
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline font-semibold">Search workspace...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.25 text-[9px] font-mono rounded bg-slate-900 border border-slate-850 text-slate-500 select-none font-bold">
                <span>Ctrl</span>
                <span>K</span>
              </kbd>
            </button>
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">Academic Year: 2026/2027</span>
          </div>
        </header>

        {}
        <main className="flex-1 overflow-y-auto px-8 py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={isEditingForm ? "form" : `tab-${currentTab}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="h-full"
            >
              {isEditingForm ? (
                <AssignmentForm
                  onSave={handleSaveAssignment}
                  onCancel={() => {
                    setIsEditingForm(false);
                    setEditingAssignment(undefined);
                  }}
                  initialAssignment={editingAssignment}
                />
              ) : (
                <>
                  {currentTab === "dashboard" && (
                    <Dashboard 
                      assignments={assignments} 
                      studySessions={studySessions} 
                      stats={stats}
                      onNavigateToTab={(tab) => setCurrentTab(tab)}
                      onSelectAssignmentForTimer={(id) => {
                        setActiveTimerAssignmentId(id);
                        setCurrentTab("focus-timer");
                      }}
                      onAddAssignment={handleSaveAssignment}
                    />
                  )}

                  {currentTab === "assignments" && (
                    <AssignmentList
                      assignments={assignments}
                      onAddClick={() => {
                        setEditingAssignment(undefined);
                        setIsEditingForm(true);
                      }}
                      onEditClick={(assignment) => {
                        setEditingAssignment(assignment);
                        setIsEditingForm(true);
                      }}
                      onDelete={handleDeleteAssignment}
                      onUpdateStatus={handleUpdateStatus}
                      onToggleMilestone={handleToggleMilestone}
                      onAddMilestone={handleAddMilestone}
                      onGeneratePlan={(assignment) => {
                        setActiveTimerAssignmentId(assignment.id);
                        setCurrentTab("study-planner");
                      }}
                      onSelectForTimer={(id) => {
                        setActiveTimerAssignmentId(id);
                        setCurrentTab("focus-timer");
                      }}
                      initialCourseFilter={initialCourseFilter}
                      initialSearchQuery={initialSearchQuery}
                      onUpdateAssignment={handleUpdateAssignment}
                    />
                  )}

                  {currentTab === "study-planner" && (
                    <StudyPlanner
                      assignments={assignments}
                      masterStudyPlan={masterStudyPlan}
                      isRecalculatingPlan={isRecalculatingPlan}
                      recalculationError={recalculationError}
                      onForceRecalculate={async (preferences) => {
                        setIsRecalculatingPlan(true);
                        setRecalculationError(null);
                        try {
                          const active = assignments.filter(a => a.status !== 'COMPLETED');
                          const res = await generateComprehensiveStudyPlan(active, preferences);
                          const plan = res?.plan || res;
                          setMasterStudyPlan(plan);
                          localStorage.setItem("smartdeadline_master_study_plan", JSON.stringify(plan));
                          if (res?.preferences) {
                            localStorage.setItem("smartdeadline_study_preferences", JSON.stringify(res.preferences));
                          }
                        } catch (err: any) {

                          setRecalculationError(err.message || "Failed to recalculate study plan.");
                          throw err;
                        } finally {
                          setIsRecalculatingPlan(false);
                        }
                      }}
                    />
                  )}

                  {currentTab === "copilot" && (
                    <AICopilot
                      assignments={assignments}
                      studySessions={studySessions}
                      setCurrentTab={setCurrentTab}
                    />
                  )}

                  {currentTab === "syllabus-scanner" && (
                    <SyllabusScanner
                      onImportComplete={loadUserData}
                      setCurrentTab={setCurrentTab}
                      userProfile={userProfile}
                    />
                  )}

                  {currentTab === "assignment-scanner" && (
                    <AssignmentScanner
                      onImportComplete={loadUserData}
                      setCurrentTab={setCurrentTab}
                    />
                  )}

                  {currentTab === "notifications" && (
                    <NotificationCenter
                      onNotificationsUpdated={setUnreadNotificationsCount}
                    />
                  )}

                  {currentTab === "academic-calendar" && (
                    <AcademicCalendar
                      assignments={assignments}
                      studySessions={studySessions}
                      onUpdateAssignment={handleUpdateAssignment}
                      onAddStudySessions={handleCreateStudySessions}
                      onUpdateStudySession={handleUpdateStudySession}
                      onDeleteStudySession={handleDeleteStudySession}
                      onAddClick={() => {
                        setEditingAssignment(undefined);
                        setIsEditingForm(true);
                      }}
                      onSelectAssignmentForTimer={(id) => {
                        setActiveTimerAssignmentId(id);
                        setCurrentTab("focus-timer");
                      }}
                    />
                  )}

                  {currentTab === "procrastination" && (
                    <ProcrastinationBuster
                      assignments={assignments}
                      onStartStartingSprint={handleStartStartingSprint}
                    />
                  )}

                  {currentTab === "focus-timer" && (
                    <FocusTimer
                      assignments={assignments}
                      studySessions={studySessions}
                      activeAssignmentId={activeTimerAssignmentId}
                      onSelectAssignment={(id) => setActiveTimerAssignmentId(id)}
                      onLogStudySession={handleLogStudySession}
                      startingSprint={startingSprint}
                      onClearStartingSprint={() => setStartingSprint(null)}
                    />
                  )}

                  {currentTab === "analytics" && (
                    <Analytics
                      assignments={assignments}
                      studySessions={studySessions}
                    />
                  )}

                  {currentTab === "export-center" && (
                    <ExportCenter
                      assignments={assignments}
                      studySessions={studySessions}
                      masterStudyPlan={masterStudyPlan}
                      userProfile={userProfile}
                    />
                  )}

                  {currentTab === "weekly-review" && (
                    <WeeklyReviewPage
                      assignments={assignments}
                      studySessions={studySessions}
                    />
                  )}

                  {currentTab === "deadline-predictor" && (
                    <DeadlinePredictor
                      assignments={assignments}
                      studySessions={studySessions}
                      onToggleMilestone={handleToggleMilestone}
                      onUpdateStatus={handleUpdateStatus}
                    />
                  )}

                  {currentTab === "profile" && (
                    <Profile
                      userProfile={userProfile}
                      onUpdateProfile={handleUpdateProfile}
                      stats={stats}
                      onLogout={handleLogout}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <FloatingAssistant
        assignments={assignments}
        studySessions={studySessions}
        onSelectAssignmentForTimer={(id) => {
          setActiveTimerAssignmentId(id);
          setCurrentTab("focus-timer");
        }}
        setCurrentTab={setCurrentTab}
      />
      
      <VoiceAssistant
        assignments={assignments}
        studySessions={studySessions}
        masterStudyPlan={masterStudyPlan}
        stats={{ ...stats, unreadNotificationsCount }}
        onAction={handleVoiceAction}
      />

      {}
      <AnimatePresence>
        {assignmentIdToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/20 bg-slate-900 p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                  <span className="text-xl font-bold">⚠️</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">Delete Assignment?</h3>
                  <p className="text-xs text-rose-400/80 font-mono mt-0.5">This action cannot be undone.</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete <span className="font-semibold text-rose-300">"{assignments.find(a => a.id === assignmentIdToDelete)?.title || "this assignment"}"</span>? All logged focus minutes and predictive analytics for this task will be permanently removed.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignmentIdToDelete(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-750 hover:text-slate-200 transition"
                >
                  Keep Assignment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAssignment}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/15"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {studySessionIdToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/20 bg-slate-900 p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10">
                  <span className="text-xl font-bold">⏱️</span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-100">Remove Study Session?</h3>
                  <p className="text-xs text-rose-400/80 font-mono mt-0.5">This action will adjust active task metrics.</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete this {studySessions.find(s => s.id === studySessionIdToDelete)?.durationMinutes}m study focus block? Deleting it will deduct this time from the assignment's total hours spent.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setStudySessionIdToDelete(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-750 hover:text-slate-200 transition"
                >
                  Keep Session
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteStudySession}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 transition shadow-lg shadow-rose-600/15"
                >
                  Delete Session
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          assignments={assignments}
          studySessions={studySessions}
          masterStudyPlan={masterStudyPlan}
          onNavigateToTab={handleNavigateFromSearch}
          onEditAssignment={(assignment) => {
            setEditingAssignment(assignment);
            setIsEditingForm(true);
          }}
        />
      </AnimatePresence>
    </div>
  );
}
