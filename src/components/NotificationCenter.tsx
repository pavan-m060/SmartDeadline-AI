import { useState, useEffect } from "react";
import { Bell, Check, Trash2, Sparkles, Clock, AlertTriangle, Calendar, Flame, Zap, BookOpen, CheckCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotificationFromServer, clearAllNotificationsFromServer, generateAIMotivationalNotification } from "../services/api";
import { Notification, NotificationType } from "../types";

interface NotificationCenterProps {
  onNotificationsUpdated?: (unreadCount: number) => void;
}

export default function NotificationCenter({ onNotificationsUpdated }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "ALERTS" | "AI">("ALL");
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load notifications from server
  const loadNotifications = async (silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await fetchNotifications();
      setNotifications(data);
      if (onNotificationsUpdated) {
        const unread = data.filter(n => !n.read).length;
        onNotificationsUpdated(unread);
      }
    } catch (err: any) {

      if (!silent) {
        setError("Failed to sync notifications from the server.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time updates: fetch new notifications from database silently every 5 seconds
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      // Trigger update
      const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      if (onNotificationsUpdated) {
        onNotificationsUpdated(updated.filter(n => !n.read).length);
      }
    } catch (err) {

    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (onNotificationsUpdated) {
        onNotificationsUpdated(0);
      }
    } catch (err) {

    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationFromServer(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      const updated = notifications.filter(n => n.id !== id);
      if (onNotificationsUpdated) {
        onNotificationsUpdated(updated.filter(n => !n.read).length);
      }
    } catch (err) {

    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire notification history?")) return;
    try {
      await clearAllNotificationsFromServer();
      setNotifications([]);
      if (onNotificationsUpdated) {
        onNotificationsUpdated(0);
      }
    } catch (err) {

    }
  };

  // Trigger AI to generate a personalized AI Pep Talk
  const handleGenerateAiMotivation = async () => {
    setAiGenerating(true);
    setError(null);
    try {
      const newNotif = await generateAIMotivationalNotification();
      setNotifications(prev => [newNotif, ...prev]);
      if (onNotificationsUpdated) {
        // Increment unread count
        const unread = [newNotif, ...notifications].filter(n => !n.read).length;
        onNotificationsUpdated(unread);
      }
    } catch (err: any) {

      setError("SmartDeadline AI was unable to generate your motivational pep-talk right now. Please try again in a moment.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Helper to map notification type to styling icons and colors
  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case "UPCOMING_DEADLINE":
        return {
          icon: <Clock className="w-4 h-4 text-amber-400" />,
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/20",
          label: "Upcoming Deadline"
        };
      case "OVERDUE_ASSIGNMENT":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
          bgColor: "bg-rose-500/10",
          borderColor: "border-rose-500/20",
          label: "Overdue task"
        };
      case "EXAM_REMINDER":
        return {
          icon: <Calendar className="w-4 h-4 text-teal-400" />,
          bgColor: "bg-teal-500/10",
          borderColor: "border-teal-500/20",
          label: "Exam Prep"
        };
      case "LOW_PRODUCTIVITY":
        return {
          icon: <AlertCircle className="w-4 h-4 text-indigo-400" />,
          bgColor: "bg-indigo-500/10",
          borderColor: "border-indigo-500/20",
          label: "Productivity Alert"
        };
      case "STUDY_STREAK":
        return {
          icon: <Flame className="w-4 h-4 text-orange-500 animate-pulse" />,
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/20",
          label: "Study Streak"
        };
      case "MISSED_STUDY_SESSION":
        return {
          icon: <BookOpen className="w-4 h-4 text-rose-450" />,
          bgColor: "bg-rose-500/10",
          borderColor: "border-rose-500/20",
          label: "Missed Session"
        };
      case "ASSIGNMENT_DUE_TOMORROW":
        return {
          icon: <Clock className="w-4 h-4 text-orange-400 animate-pulse" />,
          bgColor: "bg-orange-500/10",
          borderColor: "border-orange-500/20",
          label: "Due Tomorrow"
        };
      case "PRIORITY_CHANGES":
        return {
          icon: <Zap className="w-4 h-4 text-indigo-400" />,
          bgColor: "bg-indigo-500/10",
          borderColor: "border-indigo-500/20",
          label: "AI Priority Change"
        };
      case "AI_MOTIVATIONAL":
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-400 animate-bounce" />,
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/20",
          label: "AI Pep Talk"
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-slate-400" />,
          bgColor: "bg-slate-500/10",
          borderColor: "border-slate-500/20",
          label: "System Alert"
        };
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === "UNREAD") return !n.read;
    if (filter === "ALERTS") {
      return n.type === "OVERDUE_ASSIGNMENT" || n.type === "UPCOMING_DEADLINE" || n.type === "EXAM_REMINDER";
    }
    if (filter === "AI") return n.type === "AI_MOTIVATIONAL";
    return true; // "ALL"
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 pb-12 animate-fade-in" id="notification-center-container">
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-3xl text-white tracking-tight flex items-center gap-3">
            <Bell className="w-7 h-7 text-indigo-400" />
            Smart Notification Center
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Dynamic timeline reminders, cognitive streak trackers, and AI-powered motivational diagnostics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {}
          <button
            onClick={handleGenerateAiMotivation}
            disabled={aiGenerating}
            id="generate-ai-motivation-btn"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition cursor-pointer"
          >
            {aiGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Analyzing Workload...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Request AI Motivational Pep-Talk</span>
              </>
            )}
          </button>

          {notifications.length > 0 && (
            <>
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 rounded-xl text-xs font-medium border border-slate-800 transition cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark All Read</span>
              </button>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900/40 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-medium border border-slate-800/80 hover:border-rose-900/30 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {}
        <div className="lg:col-span-1 bg-slate-950/40 border border-slate-900 p-4 rounded-2xl space-y-2">
          <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">
            Notification Types
          </div>

          <button
            onClick={() => setFilter("ALL")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
              filter === "ALL" 
                ? "bg-slate-900 text-white shadow-md border-l-2 border-indigo-500" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span>All Logs</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
              {notifications.length}
            </span>
          </button>

          <button
            onClick={() => setFilter("UNREAD")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
              filter === "UNREAD" 
                ? "bg-slate-900 text-white shadow-md border-l-2 border-indigo-500" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Unread Alerts</span>
            </div>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilter("ALERTS")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
              filter === "ALERTS" 
                ? "bg-slate-900 text-white shadow-md border-l-2 border-indigo-500" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Task & Exam Alerts</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
              {notifications.filter(n => n.type === 'OVERDUE_ASSIGNMENT' || n.type === 'UPCOMING_DEADLINE' || n.type === 'EXAM_REMINDER').length}
            </span>
          </button>

          <button
            onClick={() => setFilter("AI")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
              filter === "AI" 
                ? "bg-slate-900 text-white shadow-md border-l-2 border-indigo-500" 
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Pep Talks</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-800">
              {notifications.filter(n => n.type === 'AI_MOTIVATIONAL').length}
            </span>
          </button>
        </div>

        {}
        <div className="lg:col-span-3 space-y-4">
          {loading && notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-slate-900 rounded-3xl space-y-4">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Syncing Smart Notification Engine...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/20 border border-slate-900/80 rounded-3xl p-8 text-center space-y-4">
              <div className="p-4 rounded-full bg-slate-950 border border-slate-900 text-slate-500">
                <Bell className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">No notifications found</h3>
                <p className="text-slate-400 text-xs max-w-sm mt-1 mx-auto">
                  {filter === "UNREAD" 
                    ? "Fantastic work! All of your study alerts and academic notifications are marked as read."
                    : filter === "AI"
                    ? "No AI Motivational Coaches requested yet. Click 'Request AI Motivational Pep-Talk' above to generate an intelligent boost!"
                    : "No notifications triggered yet. Your smart alerts automatically trigger when you have deadlines close, overdue assignments, or low-focus streaks."}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredNotifications.map((notif) => {
                  const config = getNotificationConfig(notif.type);
                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.2 }}
                      className={`group border rounded-2xl p-4 md:p-5 flex gap-4 transition shadow-md relative overflow-hidden ${
                        notif.read 
                          ? "bg-slate-950/25 border-slate-900/80 hover:border-slate-800" 
                          : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80"
                      }`}
                    >
                      {}
                      {!notif.read && (
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
                      )}

                      {}
                      <div className={`p-2.5 h-10 w-10 flex-shrink-0 rounded-xl border flex items-center justify-center ${config.bgColor} ${config.borderColor}`}>
                        {config.icon}
                      </div>

                      {}
                      <div className="flex-grow space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                              {notif.title}
                            </span>
                            <span className="text-[8px] font-mono font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400">
                              {config.label}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                            {(() => {
                              try {
                                const d = new Date(notif.createdAt);
                                return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString(undefined, { hour: '2-digit', minute:'2-digit' });
                              } catch {
                                return notif.createdAt;
                              }
                            })()}
                          </span>
                        </div>

                        <p className={`text-xs leading-relaxed max-w-2xl ${notif.read ? 'text-slate-400' : 'text-slate-200'}`}>
                          {notif.message}
                        </p>

                        {}
                        <div className="flex items-center justify-end gap-3 pt-2">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400 hover:text-emerald-300 px-2 py-1 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 rounded-lg transition cursor-pointer"
                            >
                              <Check className="w-3" />
                              <span>Mark Read</span>
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-500 hover:text-rose-400 px-2 py-1 bg-slate-900 hover:bg-rose-950/10 border border-slate-800 hover:border-rose-900/20 rounded-lg transition opacity-0 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="w-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
