import { useState, FormEvent } from "react";
import { UserProfile } from "../types";
import { User, GraduationCap, BookOpen, Calendar, Mail, Check, Loader2, Lock, Flame, Clock, Sparkles, LogOut, Trash2, ShieldAlert, Palette, Bell, Sliders, Key, School, FileText } from "lucide-react";
import { changePassword, deleteAccount } from "../services/api";

interface ProfileProps {
  userProfile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  stats: {
    total: number;
    completed: number;
    streak: number;
    totalHours: number;
  };
  onLogout?: () => void;
}

type SettingsTab = "profile" | "preferences" | "security" | "danger";

export default function Profile({ userProfile, onUpdateProfile, stats, onLogout }: ProfileProps) {
  // Tabs state
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Edit Profile fields
  const [fullName, setFullName] = useState(userProfile?.fullName || "Academic Scholar");
  const [university, setUniversity] = useState(userProfile?.university || "Stanford University");
  const [major, setMajor] = useState(userProfile?.major || "Computer Science");
  const [department, setDepartment] = useState(userProfile?.department || "School of Engineering");
  const [semester, setSemester] = useState(userProfile?.semester || "Fall 2026");
  const [graduationYear, setGraduationYear] = useState(userProfile?.graduationYear || "2028");
  const [email ] = useState(userProfile?.email || "scholar@stanford.edu");
  const [avatar, setAvatar] = useState(userProfile?.avatar || "🎓");
  const [customAvatarUrl, setCustomAvatarUrl] = useState(
    userProfile?.avatar && (userProfile.avatar.startsWith("http") || userProfile.avatar.startsWith("data:"))
      ? userProfile.avatar
      : ""
  );

  // Preference Settings
  const [theme, setTheme] = useState(userProfile?.settings?.theme || "indigo");
  const [emailAlerts, setEmailAlerts] = useState(userProfile?.settings?.notifications?.emailAlerts ?? true);
  const [pushNotifications, setPushNotifications] = useState(userProfile?.settings?.notifications?.pushNotifications ?? false);
  const [dailySummary, setDailySummary] = useState(userProfile?.settings?.notifications?.dailySummary ?? true);
  
  const [preferredStartTime, setPreferredStartTime] = useState(userProfile?.settings?.studyHours?.preferredStartTime || "09:00");
  const [preferredEndTime, setPreferredEndTime] = useState(userProfile?.settings?.studyHours?.preferredEndTime || "22:00");
  const [targetHoursPerWeek, setTargetHoursPerWeek] = useState(userProfile?.settings?.studyHours?.targetHoursPerWeek ?? 15);
  const [preferredDuration, setPreferredDuration] = useState(userProfile?.settings?.studyHours?.preferredDuration ?? 45);
  
  const [aiPersonality, setAiPersonality] = useState(userProfile?.settings?.aiPersonality || "supportive");

  // Password fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Deletion fields
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Save feedback
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Preset emojis for Profile Picture
  const emojis = ["🎓", "💻", "🧪", "📚", "🎨", "🧠", "🔭", "🚀", "✍️", "🧬", "🎸", "🌱", "🏆", "🌟", "🔥"];

  // Custom visual gradient background presets for Avatar
  const gradientAvatars = [
    { name: "Cyber Blue", value: "linear-gradient(135deg, #1e3a8a, #3b82f6)" },
    { name: "Sunset Haze", value: "linear-gradient(135deg, #7c2d12, #f97316)" },
    { name: "Emerald Forest", value: "linear-gradient(135deg, #064e3b, #10b981)" },
    { name: "Royal Magenta", value: "linear-gradient(135deg, #581c87, #c084fc)" },
    { name: "Crimson Rose", value: "linear-gradient(135deg, #881337, #f43f5e)" }
  ];

  // Tab configurations
  const tabs = [
    { id: "profile", label: "Academic Profile", icon: User },
    { id: "preferences", label: "Preferences & Vibe", icon: Sliders },
    { id: "security", label: "Security", icon: Key },
    { id: "danger", label: "Danger Zone", icon: ShieldAlert }
  ] as const;

  const handleUpdateProfileSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Form avatar source
    const finalAvatar = customAvatarUrl.trim() !== "" ? customAvatarUrl.trim() : avatar;

    const updatedProfile: UserProfile = {
      fullName: fullName.trim(),
      university: university.trim(),
      major: major.trim(),
      department: department.trim(),
      semester: semester.trim(),
      graduationYear: graduationYear,
      email: email.trim(),
      avatar: finalAvatar,
      settings: {
        theme,
        notifications: {
          emailAlerts,
          pushNotifications,
          dailySummary
        },
        studyHours: {
          preferredStartTime,
          preferredEndTime,
          targetHoursPerWeek: Number(targetHoursPerWeek),
          preferredDuration: Number(preferredDuration)
        },
        aiPersonality
      }
    };

    setTimeout(() => {
      onUpdateProfile(updatedProfile);
      setSaving(false);
      setSuccessMsg("Academic profile and preferences saved successfully!");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(null), 3000);
    }, 1000);
  };

  const handlePasswordChangeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword({ oldPassword, newPassword });
      setPasswordSuccess("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password. Ensure old password is correct.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (deleteConfirmationText !== "DELETE") {
      setDeleteError("Please type DELETE to confirm account removal.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await deleteAccount();
      setIsDeleteModalOpen(false);
      if (onLogout) {
        onLogout();
      }
    } catch (err: any) {
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setDeleteLoading(false);
    }
  };

  // Determine current display avatar
  const renderAvatarSource = () => {
    if (customAvatarUrl.trim() !== "") {
      if (customAvatarUrl.startsWith("linear-gradient")) {
        return (
          <div 
            className="w-full h-full rounded-full" 
            style={{ background: customAvatarUrl }} 
          />
        );
      }
      return (
        <img 
          src={customAvatarUrl} 
          alt="Avatar" 
          referrerPolicy="no-referrer"
          className="w-full h-full rounded-full object-cover" 
          onError={() => setCustomAvatarUrl("")}
        />
      );
    }
    return <span className="text-5xl select-none">{avatar}</span>;
  };

  // Achievements based on stats
  const academicAchievements = [
    {
      title: "Consistent Scholar",
      desc: "Logged study time on SmartDeadline AI",
      unlocked: stats.totalHours > 0,
      icon: Clock,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "Streak Master",
      desc: "Held a continuous 3+ day streak",
      unlocked: stats.streak >= 3,
      icon: Flame,
      color: "text-orange-400 bg-orange-500/10 border-orange-500/20"
    },
    {
      title: "Task Finisher",
      desc: "Completed 2+ syllabus assignments",
      unlocked: stats.completed >= 2,
      icon: Check,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "Workspace Pioneer",
      desc: "Initialized academic scholar workspace",
      unlocked: true,
      icon: Sparkles,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/20"
    }
  ];

  return (
    <div className="space-y-8 pb-16 animate-fade-in max-w-6xl mx-auto">
      {}
      <div className="relative overflow-hidden bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:justify-between gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left z-10">
          <div className="relative w-24 h-24 flex items-center justify-center rounded-full bg-slate-950 border-2 border-indigo-500/20 shadow-2xl">
            {renderAvatarSource()}
          </div>
          <div>
            <h2 className="font-display font-extrabold text-2xl text-white tracking-tight">
              {fullName}
            </h2>
            <p className="text-slate-400 text-xs font-mono mt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span>{email}</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-semibold">{semester}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {university || "No Institution Specified"} — {department || "General Department"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0 z-10">
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2.5 shadow-sm animate-fade-in">
          <Check className="w-4 h-4 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2.5 shadow-sm animate-fade-in">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-2xl flex flex-row lg:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 lg:flex-initial flex items-center justify-center lg:justify-start gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/45"
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">Academic Stats</h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center">
                <span className="block text-slate-500 text-[10px] font-mono">HOURS STUDIED</span>
                <span className="text-base font-bold text-white font-mono mt-0.5 block">{stats.totalHours.toFixed(1)}</span>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-900 text-center">
                <span className="block text-slate-500 text-[10px] font-mono">STREAK DAY</span>
                <span className="text-base font-bold text-orange-400 font-mono mt-0.5 block">🔥 {stats.streak}</span>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="lg:col-span-3">
          {activeTab === "profile" && (
            <form onSubmit={handleUpdateProfileSubmit} className="space-y-6">
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Academic Identity</h3>
                  <p className="text-slate-400 text-xs mt-1">Configure your course metadata, institution info, and custom avatar styling.</p>
                </div>

                {}
                <div className="space-y-4">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Choose Profile Picture / Avatar</label>
                  
                  {}
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Emoji Symbols</span>
                    <div className="flex flex-wrap gap-2">
                      {emojis.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => {
                            setAvatar(e);
                            setCustomAvatarUrl(""); // Reset custom image
                          }}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center text-base transition border cursor-pointer ${
                            avatar === e && customAvatarUrl === ""
                              ? "bg-indigo-600/20 border-indigo-500 scale-110 shadow"
                              : "bg-slate-950 border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  {}
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-3">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Gradient Presets</span>
                    <div className="flex flex-wrap gap-2">
                      {gradientAvatars.map((grad) => (
                        <button
                          key={grad.name}
                          type="button"
                          onClick={() => setCustomAvatarUrl(grad.value)}
                          className={`w-9 h-9 rounded-full transition border cursor-pointer p-0.5 overflow-hidden ${
                            customAvatarUrl === grad.value
                              ? "border-indigo-500 scale-110 shadow-lg"
                              : "border-slate-800 hover:border-slate-700"
                          }`}
                          title={grad.name}
                        >
                          <div className="w-full h-full rounded-full" style={{ background: grad.value }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {}
                  <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Custom Profile Image URL</span>
                    <input
                      type="url"
                      value={customAvatarUrl.startsWith("linear-gradient") ? "" : customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      placeholder="e.g. https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Full Name</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5 opacity-60">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Academic Email (Read-only)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Mail className="w-4 h-4" />
                      </span>
                      <input
                        type="email"
                        disabled
                        value={email}
                        className="w-full bg-slate-950/80 border border-slate-900 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-400 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">University / Institution</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <School className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Academic Department</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <FileText className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Computer Science Dept"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Major Field of Study</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <BookOpen className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={major}
                        onChange={(e) => setMajor(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Current Term / Semester</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        required
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        placeholder="e.g. Fall 2026, Year 3"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Expected Graduation Year</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <GraduationCap className="w-4 h-4" />
                      </span>
                      <input
                        type="number"
                        min={2026}
                        max={2040}
                        required
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-600/10 active:scale-[0.99] cursor-pointer"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Academic Profile...</span>
                      </>
                    ) : (
                      <span>Save Profile Settings</span>
                    )}
                  </button>
                </div>
              </div>

              {}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Academic Accomplishments</h3>
                  <p className="text-xs text-slate-400">Unlock these medals by actively organizing and tracking your courses.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {academicAchievements.map((badge, idx) => {
                    const Icon = badge.icon;
                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-xl border flex gap-3.5 transition ${
                          badge.unlocked 
                            ? "bg-slate-950/40 border-slate-800/80" 
                            : "bg-slate-950/10 border-slate-900/60 opacity-35 select-none"
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 h-fit ${
                          badge.unlocked ? badge.color : "text-slate-700 bg-slate-900 border border-slate-800/40"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white leading-tight">{badge.title}</h4>
                            {badge.unlocked && (
                              <span className="text-[8px] font-mono font-bold bg-indigo-500/15 text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-500/15">
                                UNLOCKED
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{badge.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          )}

          {activeTab === "preferences" && (
            <form onSubmit={handleUpdateProfileSubmit} className="space-y-6">
              {}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Workspace Theme</h3>
                    <p className="text-slate-400 text-xs mt-1">Select the theme color accents applied throughout your student dashboard.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                  {[
                    { id: "indigo", name: "Royal Indigo", color: "bg-indigo-500", glow: "indigo" },
                    { id: "emerald", name: "Emerald Moss", color: "bg-emerald-500", glow: "emerald" },
                    { id: "amber", name: "Sunset Amber", color: "bg-amber-500", glow: "amber" },
                    { id: "rose", name: "Rose Gold", color: "bg-rose-500", glow: "rose" },
                    { id: "violet", name: "Cosmic Purple", color: "bg-violet-500", glow: "violet" }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTheme(preset.id)}
                      className={`p-4 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                        theme === preset.id
                          ? "bg-slate-950 border-indigo-500 shadow-xl"
                          : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full block border border-slate-800 ${preset.color} shadow-lg`} />
                      <span className="text-[11px] font-semibold text-slate-200">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Study Hour & Target Preferences</h3>
                    <p className="text-slate-400 text-xs mt-1">Fine-tune your preferred study times and continuous focus block durations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Preferred Daily Start Time</label>
                    <input
                      type="time"
                      value={preferredStartTime}
                      onChange={(e) => setPreferredStartTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Preferred Daily End Time</label>
                    <input
                      type="time"
                      value={preferredEndTime}
                      onChange={(e) => setPreferredEndTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Target Study Hours Per Week</label>
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={targetHoursPerWeek}
                      onChange={(e) => setTargetHoursPerWeek(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Continuous Sprint Duration (mins)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      value={preferredDuration}
                      onChange={(e) => setPreferredDuration(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Notification Preferences</h3>
                    <p className="text-slate-400 text-xs mt-1">Configure when and how SmartDeadline AI notifies you about approaching deadlines.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: "emailAlerts",
                      label: "Email Delivery Notifications",
                      desc: "Receive prompt warning notifications directly on your academic email.",
                      checked: emailAlerts,
                      setter: setEmailAlerts
                    },
                    {
                      id: "pushNotifications",
                      label: "Browser Push Alerts",
                      desc: "Deploy quick toast summaries and live reminders directly inside this browser window.",
                      checked: pushNotifications,
                      setter: setPushNotifications
                    },
                    {
                      id: "dailySummary",
                      label: "Daily Smart Summary Digest",
                      desc: "Acquire a single high-level AI diagnostic rundown of pending targets every morning.",
                      checked: dailySummary,
                      setter: setDailySummary
                    }
                  ].map((notif) => (
                    <label
                      key={notif.id}
                      className="flex items-start gap-4 p-4 bg-slate-950/60 border border-slate-900 rounded-xl cursor-pointer hover:border-slate-800 transition"
                    >
                      <input
                        type="checkbox"
                        checked={notif.checked}
                        onChange={(e) => notif.setter(e.target.checked)}
                        className="mt-1 accent-indigo-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="-mt-0.5">
                        <span className="text-xs font-bold text-white block">{notif.label}</span>
                        <span className="text-[11px] text-slate-400 mt-0.5 block leading-relaxed">{notif.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {}
              <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">AI Co-Pilot Personality Vibe</h3>
                    <p className="text-slate-400 text-xs mt-1">Select the guidance approach and voice matching your ideal academic mentor.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "supportive", name: "Supportive Motivator", desc: "A soft, encouraging tutor celebrating micro-successes and promoting mental balance." },
                    { id: "strict", name: "Strict Accountability Coach", desc: "A direct, demanding taskmaster checking on deadline risks and highlighting procrastination errors." },
                    { id: "academic", name: "Structured Scholar", desc: "A methodical, clinical educator focused on research rigor, clear milestones, and deep analytics." },
                    { id: "direct", name: "Direct & Concise Guide", desc: "Brief, high-speed instructions stripped of flowery summaries to let you focus immediately." }
                  ].map((persona) => (
                    <button
                      key={persona.id}
                      type="button"
                      onClick={() => setAiPersonality(persona.id)}
                      className={`p-4 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1.5 h-full ${
                        aiPersonality === persona.id
                          ? "bg-slate-950 border-indigo-500 shadow-lg"
                          : "bg-slate-950/40 border-slate-900 hover:border-slate-800"
                      }`}
                    >
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${aiPersonality === persona.id ? "bg-indigo-500" : "bg-slate-700"}`} />
                        {persona.name}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed pl-4">{persona.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {}
              <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-600/10 active:scale-[0.99] cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Workspace Preferences...</span>
                    </>
                  ) : (
                    <span>Save Preference Settings</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === "security" && (
            <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Credential Integrity</h3>
                <p className="text-slate-400 text-xs mt-1">Regularly update your login passcode to guarantee academic workspace safety.</p>
              </div>

              {passwordSuccess && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                  <Check className="w-4 h-4" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Current Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">New Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Confirm New Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                        <Lock className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50 hover:shadow-lg active:scale-[0.99] cursor-pointer"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "danger" && (
            <div className="bg-slate-900/40 border border-rose-950/40 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider font-display">Irreversible Academic Actions</h3>
                <p className="text-slate-400 text-xs mt-1">Caution: Removing your account deletes all stored syllabi, assignments, timers, and statistics forever.</p>
              </div>

              <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl flex items-start gap-3">
                <Trash2 className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold text-white block">Delete Your Scholar Profile</span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    This action will wipe all your custom metrics from the server instantly. This cannot be undone. Please copy your records if you intend to restore them manually in future.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-5 py-3 bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Academic Account...</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 max-w-md w-full p-6 rounded-2xl space-y-5 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display font-extrabold text-base text-white tracking-wide">Absolute Account Wipeout</h4>
                <p className="text-[11px] text-rose-400/80 uppercase font-mono mt-0.5 tracking-wider">Warning: Permanent Deletion</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to remove all syllabi scans, calculated risk predictions, timed milestones, and profile records from the database. 
              To proceed, please type <strong className="text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">DELETE</strong> in the box below.
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white text-center focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono tracking-widest"
              />
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-[11px] leading-relaxed">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmationText("");
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition border border-slate-800 cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="button"
                disabled={deleteLoading || deleteConfirmationText !== "DELETE"}
                onClick={handleDeleteAccountConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Delete Forever</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
