import { Flame, LayoutDashboard, Target, LogOut, BarChart3, User, CheckCircle2, Sparkles, BookOpen, CalendarDays, Gauge, Bell, FileText, Download, History } from "lucide-react";
import { UserProfile } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  stats: {
    total: number;
    completed: number;
    streak: number;
    totalHours: number;
  };
  userProfile?: UserProfile | null;
  onLogout?: () => void;
  unreadNotificationsCount?: number;
}

export default function Sidebar({ currentTab, setCurrentTab, stats, userProfile, onLogout, unreadNotificationsCount = 0 }: SidebarProps) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assignments", label: "Assignments", icon: CheckCircle2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "academic-calendar", label: "Calendar", icon: CalendarDays },
    { id: "syllabus-scanner", label: "Syllabus Scanner", icon: BookOpen },
    { id: "assignment-scanner", label: "Assignment Scanner", icon: FileText },
    { id: "study-planner", label: "AI Planner", icon: Target },
    { id: "copilot", label: "AI Co-Pilot", icon: Sparkles },
    { id: "deadline-predictor", label: "AI Predictor", icon: Gauge },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "weekly-review", label: "Weekly Review", icon: History },
    { id: "export-center", label: "Export Center", icon: Download },
    { id: "profile", label: "Profile", icon: User },
  ];



  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const renderAvatarSource = () => {
    const avatar = userProfile?.avatar || "🎓";
    if (avatar.startsWith("linear-gradient")) {
      return (
        <div 
          className="w-full h-full rounded-full" 
          style={{ background: avatar }} 
        />
      );
    } else if (avatar.startsWith("http") || avatar.startsWith("data:")) {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          className="w-full h-full rounded-full object-cover" 
        />
      );
    }
    return <span className="text-lg select-none">{avatar}</span>;
  };

  return (
    <div className="w-64 bg-slate-900 border-r border-slate-800/50 flex flex-col h-screen text-slate-300 select-none">
      {}
      <div className="p-6 border-b border-slate-800/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800/50 flex items-center justify-center shadow-sm shadow-sm">
          <Sparkles className="w-4.5 h-4.5 text-slate-100 " />
        </div>
        <div>
          <h1 className="font-sans font-bold text-lg text-slate-100 tracking-tight">Smart Deadline AI</h1>
          <p className="text-[11px] text-slate-500 font-medium">AI Academic Co-Pilot</p>
        </div>
      </div>

      {}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-xs text-slate-500 font-mono font-bold tracking-wider uppercase px-3 mb-2">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-slate-800 text-slate-100"
                  : "hover:bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? "text-slate-300" : "text-slate-500 group-hover:text-slate-300"}`} />
              <span className="flex-grow text-left">{item.label}</span>
              {item.id === "notifications" && unreadNotificationsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-slate-100 rounded-full text-[11px] font-mono font-bold leading-none ">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-slate-900 border border-slate-800/50 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400 font-semibold font-sans">Today's Progress</span>
          <div className="flex items-center gap-1 text-slate-300 bg-brand-purple/10 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border border-indigo-500/15">
            <CheckCircle2 className="w-3 h-3 text-slate-300" />
            <span>{stats.completed} DONE</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span className="font-mono">Completion Rate</span>
            <span className="text-slate-300 font-mono font-semibold">{completionRate}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-slate-800 text-center">
          <div>
            <div className="text-[11px] text-slate-500 font-mono font-medium">Daily Streak</div>
            <div className="text-sm font-bold text-orange-400 font-mono mt-0.5 flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-orange-400 stroke-none" />
              <span>{stats.streak}d</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-mono font-medium">Study Hours</div>
            <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">{stats.totalHours.toFixed(1)}h</div>
          </div>
        </div>
      </div>

      {}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/35 flex items-center justify-center text-lg select-none overflow-hidden">
            {renderAvatarSource()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-100 truncate" title={userProfile?.fullName || "Academic Scholar"}>
              {userProfile?.fullName || "Academic Scholar"}
            </div>
            <div className="text-[11px] text-slate-500 truncate" title={userProfile?.major ? `${userProfile.major} (${userProfile.graduationYear})` : "Smart Deadline AI Workspace"}>
              {userProfile?.major ? `${userProfile.major} (${userProfile.graduationYear})` : "Smart Deadline AI Workspace"}
            </div>
          </div>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer shrink-0 ml-1"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
