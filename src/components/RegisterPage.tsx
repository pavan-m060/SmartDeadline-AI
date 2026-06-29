import { useState, FormEvent } from "react";
import { GraduationCap, Mail, Lock, User, BookOpen, Calendar, Loader2, ArrowLeft } from "lucide-react";
import { registerUser } from "../services/api";
import { UserProfile } from "../types";

interface RegisterPageProps {
  onNavigate: (screen: "landing" | "login" | "app") => void;
  onRegisterSuccess: (user: UserProfile) => void;
}

export default function RegisterPage({ onNavigate, onRegisterSuccess }: RegisterPageProps) {
  // Fields
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatar, setAvatar] = useState("🎓");

  // Interaction states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emojis = ["🎓", "💻", "🧪", "📚", "🎨", "🧠", "🔭", "🚀", "✍️", "🧬", "🎸", "🌱"];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!fullName.trim() || !university.trim() || !major.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all information fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please input a valid student or institutional email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password security score low. Must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password inputs do not match. Please verify.");
      return;
    }

    setLoading(true);

    registerUser({
      fullName: fullName.trim(),
      university: university.trim(),
      major: major.trim(),
      graduationYear: graduationYear.toString(),
      email: email.trim(),
      password: password,
      avatar: avatar
    })
      .then((result) => {
        setLoading(false);
        onRegisterSuccess(result.user);
      })
      .catch((err: any) => {
        setLoading(false);
        setError(err.message || "Failed to register profile. Email might already be taken or server offline.");
      });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-y-auto">
      {}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="flex justify-center">
          <button 
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 group text-xs font-mono text-slate-500 hover:text-slate-300 mb-4 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition" />
            <span>Return to Landing Page</span>
          </button>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl shadow-sm shadow-sm mb-3">
            <GraduationCap className="w-6 h-6 text-slate-100" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-100 tracking-tight font-sans">
            Create Student Profile
          </h2>
          <p className="mt-1.5 text-sm text-slate-400">
            Map out your coursework and deadlines under an advanced study co-pilot.
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="bg-slate-900 border border-slate-800/50 py-8 px-6 shadow-sm border-slate-800 rounded-xl  space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="text-xs font-mono font-bold text-slate-400 font-medium block">
                Choose Academy Avatar Symbol
              </span>
              <div className="flex flex-wrap gap-2.5">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setAvatar(e)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition border cursor-pointer ${
                      avatar === e
                        ? "bg-indigo-600/20 border-indigo-500 scale-110 shadow"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Clara Oswald"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">University / College</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="E.g., MIT, Oxford"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">Academic Major</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="E.g., Quantum Physics"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">Graduation Year</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    min={2026}
                    max={2036}
                    required
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {}
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold text-slate-400 font-medium block">University Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="student@domain.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-400 font-medium block">Confirm Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing roadmap & study plans...</span>
                </>
              ) : (
                <span>Register & Setup Workspace</span>
              )}
            </button>

            <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
              Already possess a Smart Deadline AI credential?{" "}
              <button
                type="button"
                onClick={() => onNavigate("login")}
                className="font-semibold text-slate-300 hover:text-indigo-300 transition"
              >
                Sign In
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
