import { useState, FormEvent } from "react";
import { GraduationCap, Mail, Lock, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { loginUser } from "../services/api";
import { UserProfile } from "../types";

interface LoginPageProps {
  onNavigate: (screen: "landing" | "register" | "app") => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export default function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  
  // Interaction states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate email
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid university email address.");
      return;
    }

    setLoading(true);

    loginUser({ email, password })
      .then((result) => {
        setLoading(false);
        onLoginSuccess(result.user);
      })
      .catch((err: any) => {
        setLoading(false);
        setError(err.message || "Failed to authenticate. Incorrect credentials or server offline.");
      });
  };

  const handleForgotSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.includes("@")) {
      setError("Please enter a valid university email to receive reset instructions.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotSent(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <button 
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2 group text-xs font-mono text-slate-500 hover:text-indigo-400 mb-6 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition" />
            <span>Back to main product site</span>
          </button>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20 mb-4">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight font-display">
            {forgotMode ? "Reset Credentials" : "Sign In to Workspace"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {forgotMode 
              ? "We will send recovery keys to your school domain." 
              : "Access your AI-backed deadline maps & focus timers."
            }
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-slate-900/60 border border-slate-800/80 py-8 px-6 shadow-2xl rounded-2xl backdrop-blur-sm space-y-6">
          
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs leading-relaxed">
              ⚠️ {error}
            </div>
          )}

          {forgotMode && forgotSent ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verification Link Broadcasted</span>
              </div>
              <p>
                We've sent a credential override token to <strong className="text-white">{email}</strong>. Please complete the validation inside that inbox.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setForgotSent(false);
                }}
                className="text-xs text-indigo-400 font-bold hover:underline"
              >
                Return to Login form
              </button>
            </div>
          ) : forgotMode ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="forgot-email" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">University Email (.edu / school domain)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Locating account...</span>
                  </>
                ) : (
                  <span>Send Recovery Email</span>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setForgotMode(false)}
                  className="text-xs text-slate-400 hover:text-white transition"
                >
                  Cancel and return to sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="login-email" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">University Email</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    placeholder="you@yourcollege.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label htmlFor="login-password" className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 bg-slate-950 border-slate-800 rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400 select-none">
                    Remember my terminal state
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>Access SmartDeadline AI</span>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-mono">NEW RECRUIT</span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              <div className="text-center text-xs">
                <span className="text-slate-400">Not enrolled in SmartDeadline AI yet? </span>
                <button
                  type="button"
                  onClick={() => onNavigate("register")}
                  className="font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  Create edu account
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
