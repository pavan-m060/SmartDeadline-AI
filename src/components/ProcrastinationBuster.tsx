import { useState } from "react";
import { motion } from "motion/react";
import { Assignment, ProcrastinationNudge } from "../types";
import { getMotivationNudge as getProcrastinationNudge } from "../services/api";
import { Sparkles, Loader2, Smile, AlertCircle, Heart, Play } from "lucide-react";

interface ProcrastinationBusterProps {
  assignments: Assignment[];
  onStartStartingSprint: (assignmentId: string, sprintTitle: string, minutes: number) => void;
}

export default function ProcrastinationBuster({ assignments, onStartStartingSprint }: ProcrastinationBusterProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [currentMood, setCurrentMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudge, setNudge] = useState<ProcrastinationNudge | null>(null);

  const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');

  const blockReasons = [
    { id: "overwhelmed", label: "I am overwhelmed by the sheer size/scope of this task." },
    { id: "starting", label: "I literally do not know what the very first step is." },
    { id: "perfectionism", label: "I am anxious about doing it poorly, so I'm avoiding it." },
    { id: "exhaustion", label: "I am feeling burnt out, fatigued, and completely drained." },
    { id: "boredom", label: "This task feels incredibly dry, tedious, and uninteresting." },
  ];

  const moods = [
    "Stressed 😫",
    "Anxious 😰",
    "Exhausted 😴",
    "Distracted 📱",
    "Guilty 😔",
    "Paralyzed 🥶",
  ];

  const handleSeekSupport = async () => {
    const assignment = assignments.find(a => a.id === selectedAssignmentId);
    if (!assignment) {
      setError("Please select the assignment you are procrastinating on.");
      return;
    }
    if (!blockReason) {
      setError("Please select what is blocking you.");
      return;
    }

    setLoading(true);
    setError(null);
    setNudge(null);

    try {
      const result = await getProcrastinationNudge(assignment, blockReason, currentMood);
      setNudge(result);
    } catch (err: any) {

      setError(err.message || "Failed to contact Smart Deadline AI. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchSprint = () => {
    if (!nudge || !selectedAssignmentId) return;
    // Launch a special 10-minute starting sprint in the Focus Timer
    onStartStartingSprint(selectedAssignmentId, `AI Micro-step: ${nudge.milestoneTitle}`, 10);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {}
      <div>
        <h2 className="font-sans font-bold text-3xl text-slate-100 tracking-tight">AI Procrastination Buster</h2>
        <p className="text-slate-400 text-sm mt-1">
          Struggling to start? Overcome emotional paralysis and starting friction through AI CBT nudges and 5-minute microscopic starting targets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {}
        <div className="md:col-span-2 space-y-4 p-5 rounded-xl bg-slate-900 border border-slate-800/50 self-start">
          <h3 className="text-sm font-semibold text-slate-100 font-sans mb-3 flex items-center gap-2">
            <span>Diagnose Your Block</span>
          </h3>

          {}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 font-medium">Assignment Under Friction</label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">-- Choose Assignment --</option>
              {activeAssignments.map((a) => (
                <option key={a.id} value={a.id}>{a.course} - {a.title}</option>
              ))}
            </select>
          </div>

          {}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 font-medium">Core Psychological Barrier</label>
            <div className="space-y-1.5">
              {blockReasons.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setBlockReason(reason.label)}
                  className={`w-full text-left p-2.5 rounded-lg text-xs transition border cursor-pointer ${
                    blockReason === reason.label
                      ? "bg-brand-purple/10 border-indigo-500 text-indigo-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          {}
          <div className="space-y-1.5">
            <label className="text-xs font-mono font-bold text-slate-500 font-medium">Current Emotional State</label>
            <div className="grid grid-cols-3 gap-1.5">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setCurrentMood(mood)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] transition border text-center cursor-pointer ${
                    currentMood === mood
                      ? "bg-brand-purple/20 border-indigo-500 text-indigo-300 font-semibold"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 p-2 bg-red-500/10 border border-red-500/10 rounded text-[11px] text-red-400 font-mono">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSeekSupport}
            disabled={loading || !selectedAssignmentId || !blockReason}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-slate-100 font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition disabled:opacity-40 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Busting paralysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Deploy AI support</span>
              </>
            )}
          </button>
        </div>

        {}
        <div className="md:col-span-3 flex flex-col justify-stretch">
          {nudge ? (
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-xl bg-slate-900 border border-slate-800/50 space-y-6 flex flex-col justify-between h-full"
            >
              <div className="space-y-5">
                {}
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/50">
                  <div className="p-2 bg-brand-purple/10 text-slate-300 rounded-lg">
                    <Heart className="w-5 h-5 fill-indigo-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest">Cognitive Pep Talk</h4>
                    <h3 className="text-sm font-semibold text-slate-100">AI Intervention Active</h3>
                  </div>
                </div>

                {}
                <div className="space-y-1.5">
                  <h5 className="text-[11px] font-mono font-bold text-slate-400 font-medium">CBT Cognitive Reframing</h5>
                  <p className="text-slate-300 text-xs leading-relaxed">{nudge.explanation}</p>
                </div>

                {}
                <div className="p-3 bg-brand-purple/5 rounded-lg border border-indigo-500/10 italic text-indigo-300 text-xs">
                  "{nudge.encouragement}"
                </div>

                {}
                <div className="space-y-3">
                  <h5 className="text-[11px] font-mono font-bold text-slate-400 font-medium">Your 5-Minute Kickstarters</h5>
                  <div className="space-y-2">
                    {nudge.microSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-brand-purple/10 border border-indigo-500/20 flex items-center justify-center text-xs font-mono font-bold text-slate-300 shrink-0">
                          {idx + 1}
                        </span>
                        <span className="mt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {}
              <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-center sm:text-left">
                  <div className="text-xs font-semibold text-slate-100">Target Milestone: {nudge.milestoneTitle}</div>
                  <div className="text-xs text-slate-500">Initiate a customized 10-minute starter sprint to beat resistance.</div>
                </div>
                <button
                  onClick={handleLaunchSprint}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-slate-100 rounded-lg text-xs font-semibold shadow transition duration-200 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Launch 10m Sprint</span>
                </button>
              </div>
            </motion.div>
          ) : (
            
            <div className="h-full border border-slate-800 border-dashed rounded-xl bg-slate-900 flex flex-col items-center justify-center p-8 text-center min-h-[350px]">
              <Smile className="w-10 h-10 text-slate-600 mb-3 " />
              <h4 className="text-sm font-semibold text-slate-300">Awaiting Diagnostics</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select your procrastinated assignment and pinpoint your current roadblock in the left panel to request emotional/practical coaching from Smart Deadline AI.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
