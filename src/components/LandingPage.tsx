import { motion } from "motion/react";
import { Sparkles, Calendar, Zap, GraduationCap, ArrowRight, Clock } from "lucide-react";

interface LandingPageProps {
  onNavigate: (screen: "login" | "register" | "app") => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  // Testimonials and features data
  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-slate-300" />,
      title: "AI Syllabus Extraction",
      desc: "Paste raw syllabi, class emails, or photo descriptions. Smart Deadline AI automatically pulls out target dates, course contexts, and grading weights."
    },
    {
      icon: <Clock className="w-6 h-6 text-purple-400" />,
      title: "Procrastination Buster",
      desc: "Feeling blocked? Enter your mood or resistance type and get personalized, psychological bite-sized action plans with instant timer triggers."
    },
    {
      icon: <Calendar className="w-6 h-6 text-blue-400" />,
      title: "Adaptive Study Roadmap",
      desc: "Generate full structured chronological sub-tasks and milestones, complete with study time estimations, custom to each deadline."
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: "Interactive Pomodoro Focus",
      desc: "Work on specific assignments utilizing integrated focus sprints. Seamlessly logs hours directly to individual courses for GPA tracking."
    }
  ];

  const stats = [
    { value: "98.4%", label: "On-Time Submission Rate" },
    { value: "12+ Hrs", label: "Average Saved Study Time/Wk" },
    { value: "4.8/5", label: "App Store User Rating" },
    { value: "50k+", label: "Academic Deadlines Optimized" }
  ];

  const testimonials = [
    {
      quote: "Smart Deadline AI completely changed how I track homework. The AI syllabus parser feels like magic; it loaded my entire term schedule in under 10 seconds.",
      author: "Elena Rostov",
      role: "Physics Major",
      uni: "University of Oxford"
    },
    {
      quote: "The Procrastination Buster tool is a lifesaver. When I feel overwhelmed by neural network assignments, it breaks them into tiny, non-scary 10-minute sprints.",
      author: "Marcus Chen",
      role: "Computer Science",
      uni: "Stanford University"
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-brand-purple/30 overflow-x-hidden relative">
      
      {}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {}
      <header className="sticky top-0 z-50 backdrop- bg-[#020617]/80 border-b border-slate-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm shadow-sm">
              <GraduationCap className="w-5 h-5 text-slate-100" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-100 font-sans">Smart Deadline AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#features" className="hover:text-slate-100 transition">Features</a>
            <a href="#stats" className="hover:text-slate-100 transition">Impact</a>
            <a href="#testimonials" className="hover:text-slate-100 transition">Success Stories</a>
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate("login")}
              className="text-sm font-medium text-slate-300 hover:text-slate-100 transition px-4 py-2 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onNavigate("register")}
              className="px-4 py-2 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 text-sm font-semibold rounded-lg shadow-sm shadow-sm transition hover:shadow-indigo-500/30 active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-purple/10 border border-indigo-500/30 rounded-full text-slate-300 text-xs font-mono font-medium tracking-wide uppercase shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-300" />
            <span>Introducing AI Academic Co-Pilot</span>
          </motion.div>

          <div className="max-w-4xl mx-auto space-y-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-6xl font-semibold text-slate-100 tracking-tight leading-[1.1] font-sans"
            >
              Stop Stressing Over Syllabi.<br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent">
                Accelerate Academic Focus.
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              Your ultimate academic mission-control app. Transform messy course syllabi into elegant, automated chronological milestones, personalized study roadmaps, and hyper-focused Pomodoro sessions.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={() => onNavigate("register")}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800/50 from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-slate-100 font-semibold rounded-xl text-base flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/10 transition-all transform active:scale-95 cursor-pointer"
            >
              <span>Initialize Workspace</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>

          {}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.5 }}
            className="max-w-5xl mx-auto pt-12"
          >
            <div className="relative p-2.5 bg-slate-900 border border-slate-800/50 rounded-xl shadow-sm border-slate-800 shadow-indigo-500/5 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[1px] bg-slate-900 border border-slate-800/50 from-transparent via-indigo-500/40 to-transparent" />
              {}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 bg-slate-950 rounded-t-xl">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/40" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
                  <div className="w-3 h-3 rounded-full bg-green-500/40" />
                </div>
                <div className="text-xs font-mono text-slate-500">smartdeadline-ai-dashboard</div>
                <div className="w-12 h-2" />
              </div>
              {}
              <div className="bg-[#020617] p-6 rounded-b-xl text-left grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[360px] select-none">
                <div className="md:col-span-8 space-y-6">
                  {}
                  <div className="bg-slate-900 border border-slate-800/50 from-indigo-900/30 to-purple-900/30 border border-indigo-500/20 p-5 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono uppercase text-slate-300">ACTIVE CO-PILOT FOCUS</span>
                        <h3 className="text-lg font-bold text-slate-100 mt-1">Multi-Layer Perceptron From Scratch</h3>
                        <p className="text-xs text-slate-400 mt-2">Recommended Next Milestone: Vectorized Sigmoid and ReLU calculus formulations.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-rose-400 font-mono text-sm block">4d 08h 12m</span>
                        <span className="text-[11px] uppercase text-slate-500 font-mono">Until Final Submission</span>
                      </div>
                    </div>
                    <div className="mt-4 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-brand-purple h-full w-[45%]" />
                    </div>
                  </div>

                  {}
                  <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold border-b border-slate-800/50 pb-2">
                      <span>Course Milestones</span>
                      <span className="text-slate-300 underline decoration-indigo-400 decoration-2 underline-offset-4">List View</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 border border-slate-600 rounded bg-brand-purple/10" />
                        <span className="text-slate-300">Formulate backprop matrix calculus</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[11px] font-mono">CS-310</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3.5 h-3.5 border border-slate-600 rounded bg-purple-500/10" />
                        <span className="text-slate-300">Research Bibliographic Comparative Citations</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-400 text-[11px] font-mono">LIT-204</span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-4">
                  {}
                  <div className="bg-[#0f172a] border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full " />
                      <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest font-bold">Procrastination Alert</span>
                    </div>
                    <div className="p-3 bg-indigo-900/10 rounded-lg border-l-2 border-indigo-500 text-[11px] text-slate-300 leading-relaxed">
                      "Procrastination risk is high for Bayesian statistcs sample problems. Click to trigger 10-minute starter focus sprint."
                    </div>
                    <div className="w-full py-2 bg-indigo-600 rounded-lg text-xs font-bold font-medium text-center text-slate-100">
                      De-Risk Focus Session
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900 border border-slate-800/50 from-[#1e1b4b]/40 to-slate-900/60 rounded-xl border border-indigo-500/10">
                    <div className="text-xs text-slate-300 font-bold mb-1">Academic Year Streak</div>
                    <div className="text-2xl font-bold font-mono text-slate-100">09 Days</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {}
      <section id="stats" className="py-16 bg-slate-950 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-3xl md:text-3xl font-semibold font-mono bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-slate-400 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section id="features" className="py-20 md:py-28 max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">Architectural Pillars</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-slate-100 font-sans">Engineered For Higher GPAs & Zero Stress</h3>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
            Smart Deadline AI combines advanced generative reasoning with time-blocking mechanics to streamline your semester.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="p-6 md:p-8 bg-slate-900 border border-slate-800/50 rounded-xl space-y-4 hover:border-indigo-500/20 hover:bg-[#0f172a]/40 transition duration-300 group"
            >
              <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center group-hover:border-indigo-500/20 group-hover:bg-brand-purple/5 transition">
                {feature.icon}
              </div>
              <h4 className="text-lg font-bold text-slate-100 font-sans group-hover:text-slate-300 transition">{feature.title}</h4>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {}
      <section id="testimonials" className="py-20 bg-[#020617] border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest font-mono">Academic Trust</h2>
            <h3 className="text-3xl font-bold text-slate-100 font-sans">Voted Best Student Sidekick</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((test, idx) => (
              <div key={idx} className="p-6 bg-[#0f172a] border border-slate-800 rounded-xl flex flex-col justify-between space-y-4 shadow-sm">
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  "{test.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800/50 from-indigo-500 to-purple-500 flex items-center justify-center text-slate-100 font-bold text-xs">
                    {test.author[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">{test.author}</h4>
                    <p className="text-xs text-slate-500">{test.role} — {test.uni}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-6">
        <div className="relative bg-slate-900 border border-slate-800/50 from-indigo-950/40 via-purple-950/20 to-slate-900/40 border border-indigo-500/30 rounded-3xl p-8 md:p-14 text-center space-y-6 overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 to-transparent pointer-events-none" />
          <h2 className="text-3xl md:text-5xl font-semibold text-slate-100 tracking-tight font-sans">Take Control of Your Semesters</h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Stop procrastinating and letting complex syllabi creep up on you. Launch your Smart Deadline AI profile in under 2 minutes.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate("register")}
              className="px-8 py-3.5 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-semibold rounded-xl text-sm shadow-sm shadow-sm transition hover:scale-95 cursor-pointer"
            >
              Sign Up (FREE .EDU Accounts)
            </button>
            <button
              onClick={() => onNavigate("login")}
              className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold rounded-xl text-sm border border-slate-800 hover:border-slate-700 transition hover:scale-95 cursor-pointer"
            >
              Exisiting Student Sign In
            </button>
          </div>
        </div>
      </section>

      {}
      <footer className="border-t border-slate-900 py-8 bg-slate-950 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Smart Deadline AI. Crafted for high-achieving student productivity.</p>
          <p className="font-mono text-xs">SYSTEM STATUS: ACTIVE & ONLINE</p>
        </div>
      </footer>
    </div>
  );
}
