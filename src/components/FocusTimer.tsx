import { useState, useEffect, useRef, useMemo } from "react";
import { Assignment, StudySession } from "../types";
import { Play, Pause, RotateCcw, CheckCircle2, Volume2, Sparkles, Settings, Award, TrendingUp, SkipForward, RefreshCw } from "lucide-react";
import { fetchNextTaskRecommendation, RecommendationResult } from "../services/api";

interface FocusTimerProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  activeAssignmentId: string;
  onSelectAssignment: (id: string) => void;
  onLogStudySession: (assignmentId: string, minutes: number, notes?: string) => void;
  startingSprint?: {
    assignmentId: string;
    title: string;
    minutes: number;
  } | null;
  onClearStartingSprint: () => void;
}

export default function FocusTimer({
  assignments,
  studySessions,
  activeAssignmentId,
  onSelectAssignment,
  onLogStudySession,
  startingSprint,
  onClearStartingSprint
}: FocusTimerProps) {
  // Preset types
  type PresetType = "POMODORO" | "SHORT" | "LONG" | "SPRINT";

  // Configuration state
  const [customStudyMins, setCustomStudyMins] = useState(25);
  const [customBreakMins, setCustomBreakMins] = useState(5);
  const [customLongBreakMins, setCustomLongBreakMins] = useState(15);
  const [showConfig, setShowConfig] = useState(false);

  // Core timer state
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [preset, setPreset] = useState<PresetType>("POMODORO");
  const [ambientSound, setAmbientSound] = useState("Lofi Beats");
  const [completedStudyCount, setCompletedStudyCount] = useState(0);

  // Recommendation state
  const [aiRecommendation, setAiRecommendation] = useState<RecommendationResult | null>(null);
  const [isFetchingRec, setIsFetchingRec] = useState(false);
  const [recentLoggedBadge, setRecentLoggedBadge] = useState<{ minutes: number; assignmentTitle: string } | null>(null);

  const ambientPresets = [
    "Lofi Beats 🎧",
    "Rain & Thunderstorm ⛈️",
    "Library Ambience 📚",
    "White Noise Static 🌪️",
    "None (Mute Silence) 🔕"
  ];

  // Ref for the countdown interval
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync timers to configurations when presets or customs change
  useEffect(() => {
    if (!isActive && preset !== "SPRINT") {
      if (preset === "POMODORO") {
        setMinutes(customStudyMins);
      } else if (preset === "SHORT") {
        setMinutes(customBreakMins);
      } else if (preset === "LONG") {
        setMinutes(customLongBreakMins);
      }
      setSeconds(0);
    }
  }, [customStudyMins, customBreakMins, customLongBreakMins, preset, isActive]);

  // Load starting sprint if triggered from Procrastination Buster
  useEffect(() => {
    if (startingSprint) {
      onSelectAssignment(startingSprint.assignmentId);
      setMinutes(startingSprint.minutes);
      setSeconds(0);
      setPreset("SPRINT");
      setIsActive(true);
    }
  }, [startingSprint]);

  // Play audio chime
  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = "sine";
      osc.frequency.value = 520;
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {

    }
  };

  // Handle ticking mechanics
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished!
            setIsActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds]);

  // Handle automatic or completed timer transition
  const handleTimerComplete = async () => {
    playChime();

    // Log if it is a study session
    if (preset === "POMODORO" || preset === "SPRINT") {
      const loggedMins = preset === "POMODORO" ? customStudyMins : (startingSprint?.minutes || 10);
      const targetId = activeAssignmentId || "unassigned";
      const targetTitle = assignments.find(a => a.id === targetId)?.title || "General Study";

      // Automatically log to DB/state
      onLogStudySession(targetId, loggedMins, `Completed FocusTimer Pomodoro session on ${targetTitle}`);
      
      // Show confirmation badge
      setRecentLoggedBadge({ minutes: loggedMins, assignmentTitle: targetTitle });
      setTimeout(() => setRecentLoggedBadge(null), 8000);

      // Increment completed cycles
      const nextCount = completedStudyCount + 1;
      setCompletedStudyCount(nextCount);

      // Trigger AI next task recommendation
      fetchAIRecommendation(targetId);

      // Transition to BREAK
      if (nextCount > 0 && nextCount % 4 === 0) {
        setPreset("LONG");
        setMinutes(customLongBreakMins);
      } else {
        setPreset("SHORT");
        setMinutes(customBreakMins);
      }
      setSeconds(0);
    } else {
      // Break finished, return to study mode
      setPreset("POMODORO");
      setMinutes(customStudyMins);
      setSeconds(0);
    }

    if (startingSprint) {
      onClearStartingSprint();
    }
  };

  // Skip the current timer session immediately
  const handleSkipSession = () => {
    setIsActive(false);
    if (preset === "POMODORO" || preset === "SPRINT") {
      // Skip study to break
      const nextCount = completedStudyCount + 1;
      setCompletedStudyCount(nextCount);

      if (nextCount > 0 && nextCount % 4 === 0) {
        setPreset("LONG");
        setMinutes(customLongBreakMins);
      } else {
        setPreset("SHORT");
        setMinutes(customBreakMins);
      }
      setSeconds(0);
    } else {
      // Skip break to study
      setPreset("POMODORO");
      setMinutes(customStudyMins);
      setSeconds(0);
    }

    if (startingSprint) {
      onClearStartingSprint();
    }
  };

  // Toggle active timer state
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  // Reset timer
  const resetTimer = () => {
    setIsActive(false);
    if (preset === "POMODORO") {
      setMinutes(customStudyMins);
    } else if (preset === "SHORT") {
      setMinutes(customBreakMins);
    } else if (preset === "LONG") {
      setMinutes(customLongBreakMins);
    } else {
      setMinutes(10);
    }
    setSeconds(0);
    if (startingSprint) {
      onClearStartingSprint();
    }
  };

  // Manually switch presets
  const handlePresetChange = (type: PresetType) => {
    setIsActive(false);
    setPreset(type);
    setSeconds(0);
    if (type === "POMODORO") setMinutes(customStudyMins);
    else if (type === "SHORT") setMinutes(customBreakMins);
    else if (type === "LONG") setMinutes(customLongBreakMins);
    if (startingSprint) {
      onClearStartingSprint();
    }
  };

  // Preset configuration to classic 25/5
  const resetToClassicPomodoro = () => {
    setCustomStudyMins(25);
    setCustomBreakMins(5);
    setCustomLongBreakMins(15);
  };

  // Get next recommendation from AI
  const fetchAIRecommendation = async (justStudiedId?: string) => {
    setIsFetchingRec(true);
    try {
      const rec = await fetchNextTaskRecommendation(
        assignments,
        studySessions,
        justStudiedId || activeAssignmentId
      );
      if (rec) {
        setAiRecommendation(rec);
      }
    } catch (error) {

    } finally {
      setIsFetchingRec(false);
    }
  };

  // Apply the AI recommendation target and suggested duration
  const handleApplyRecommendation = () => {
    if (!aiRecommendation) return;

    if (aiRecommendation.recommended_assignment_id && aiRecommendation.recommended_assignment_id !== "none") {
      onSelectAssignment(aiRecommendation.recommended_assignment_id);
    }
    if (aiRecommendation.suggested_duration) {
      setCustomStudyMins(aiRecommendation.suggested_duration);
      setMinutes(aiRecommendation.suggested_duration);
      setSeconds(0);
    }
    setPreset("POMODORO");
    setAiRecommendation(null);
  };

  // Compute stats from study sessions
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().substring(0, 10);

    // Calculate start of current week (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let dailyMins = 0;
    let dailyCount = 0;
    let weeklyMins = 0;
    let weeklyCount = 0;

    studySessions.forEach((session) => {
      const sessDate = new Date(session.date);
      const sessDateStr = session.date.substring(0, 10);

      // Daily
      if (sessDateStr === todayStr) {
        dailyMins += session.durationMinutes;
        dailyCount += 1;
      }

      // Weekly
      if (sessDate >= sevenDaysAgo) {
        weeklyMins += session.durationMinutes;
        weeklyCount += 1;
      }
    });

    return {
      dailyMinutes: dailyMins,
      dailySessions: dailyCount,
      weeklyMinutes: weeklyMins,
      weeklySessions: weeklyCount
    };
  }, [studySessions]);

  // Calculate circular progress indicator
  const totalDurationSeconds = useMemo(() => {
    if (preset === "POMODORO") return customStudyMins * 60;
    if (preset === "SHORT") return customBreakMins * 60;
    if (preset === "LONG") return customLongBreakMins * 60;
    if (preset === "SPRINT" && startingSprint) return startingSprint.minutes * 60;
    return 10 * 60;
  }, [preset, customStudyMins, customBreakMins, customLongBreakMins, startingSprint]);

  const currentRemainingSeconds = minutes * 60 + seconds;
  const progressPercent = totalDurationSeconds > 0 ? (currentRemainingSeconds / totalDurationSeconds) : 0;
  const strokeDashoffset = 283 * progressPercent;

  const activeAssignmentObj = assignments.find(a => a.id === activeAssignmentId);

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {}
      <div className="text-center">
        <h2 className="font-display font-bold text-3xl text-white tracking-tight">Focus Block Timer</h2>
        <p className="text-slate-400 text-sm mt-1">
          Eliminate procrastination with customizable study loops and intelligent task guidance.
        </p>
      </div>

      {}
      {recentLoggedBadge && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="font-semibold block">Completed Session Logged!</span>
            Successfully added <span className="font-mono font-bold">+{recentLoggedBadge.minutes}m</span> focus block for <span className="underline">"{recentLoggedBadge.assignmentTitle}"</span>.
          </div>
        </div>
      )}

      {}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Award className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Today's Focus</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-white font-mono">{stats.dailyMinutes} <span className="text-xs text-slate-400 font-sans">mins</span></span>
            <span className="text-xs text-slate-400">{stats.dailySessions} {stats.dailySessions === 1 ? 'block' : 'blocks'}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Weekly Focus</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-2xl font-bold text-white font-mono">{stats.weeklyMinutes} <span className="text-xs text-slate-400 font-sans">mins</span></span>
            <span className="text-xs text-slate-400">{stats.weeklySessions} {stats.weeklySessions === 1 ? 'block' : 'blocks'}</span>
          </div>
        </div>
      </div>

      {}
      {aiRecommendation ? (
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-950/50 to-slate-950/80 border border-indigo-500/30 space-y-3 animate-fadeIn shadow-lg shadow-indigo-500/5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <h3 className="text-xs font-mono font-bold tracking-wider text-indigo-300 uppercase">AI NEXT ACTION RECOMMENDATION</h3>
            </div>
            <button 
              onClick={() => setAiRecommendation(null)}
              className="text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕ Hide
            </button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-mono text-indigo-200">
              [{aiRecommendation.course}] <span className="text-white font-sans font-semibold text-sm">{aiRecommendation.recommended_assignment_title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{aiRecommendation.reason}"
            </p>
            {aiRecommendation.message && (
              <p className="text-[11px] text-slate-400 mt-1">
                💡 {aiRecommendation.message}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleApplyRecommendation}
              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Apply Assignment & Set {aiRecommendation.suggested_duration}m Timer</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={() => fetchAIRecommendation()}
            disabled={isFetchingRec}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium font-mono flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition"
          >
            {isFetchingRec ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>AI is choosing best next task...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ask AI What to Study Next</span>
              </>
            )}
          </button>
        </div>
      )}

      {}
      <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
        
        {}
        <div className="flex items-center justify-between">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 justify-between flex-1 mr-3">
            {[
              { id: "POMODORO", label: "Study" },
              { id: "SHORT", label: "Short Break" },
              { id: "LONG", label: "Long Break" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as any)}
                disabled={preset === "SPRINT" || isActive}
                className={`flex-1 text-center py-1.5 text-[10px] font-mono font-bold tracking-wider uppercase transition rounded cursor-pointer ${
                  preset === p.id
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-300 disabled:opacity-30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`p-2 rounded-lg border transition ${
              showConfig 
                ? "bg-slate-800 border-slate-700 text-white" 
                : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200"
            }`}
            title="Configure Timer Durations"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {}
        {showConfig && (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-850 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-slate-850">
              <span className="text-xs font-mono font-bold text-slate-300">⚙️ TIMING CONFIGURATION</span>
              <button 
                onClick={resetToClassicPomodoro}
                className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300"
              >
                Reset to Classic (25/5/15)
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Study Work Block:</span>
                  <span className="font-mono text-white font-bold">{customStudyMins} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={customStudyMins}
                  onChange={(e) => setCustomStudyMins(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-900 rounded-lg appearance-none h-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Short Break:</span>
                  <span className="font-mono text-white font-bold">{customBreakMins} mins</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={customBreakMins}
                  onChange={(e) => setCustomBreakMins(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-900 rounded-lg appearance-none h-1.5"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Long Break:</span>
                  <span className="font-mono text-white font-bold">{customLongBreakMins} mins</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={customLongBreakMins}
                  onChange={(e) => setCustomLongBreakMins(Number(e.target.value))}
                  className="w-full accent-indigo-500 bg-slate-900 rounded-lg appearance-none h-1.5"
                />
              </div>
            </div>
          </div>
        )}

        {}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block text-center">Bind Timer to Assignment</label>
          <select
            value={activeAssignmentId}
            onChange={(e) => onSelectAssignment(e.target.value)}
            disabled={isActive}
            className="w-full text-center bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">-- Study block without specific assignment --</option>
            {assignments.filter(a => a.status !== 'COMPLETED').map((a) => (
              <option key={a.id} value={a.id}>{a.course} - {a.title}</option>
            ))}
          </select>
        </div>

        {}
        <div className="flex justify-center items-center py-2">
          <div className="relative w-52 h-52 flex items-center justify-center">
            {}
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="104"
                cy="104"
                r="45"
                className="stroke-slate-800 fill-none"
                strokeWidth="6"
                style={{ transform: "scale(2)", transformOrigin: "center" }}
              />
              <circle
                cx="104"
                cy="104"
                r="45"
                className="stroke-indigo-500 fill-none transition-all duration-300 ease-linear"
                strokeWidth="6"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                style={{ transform: "scale(2)", transformOrigin: "center" }}
              />
            </svg>

            {}
            <div className="text-center z-10">
              {preset === "SPRINT" && (
                <span className="text-[9px] font-mono font-bold text-brand-magenta uppercase bg-magenta-500/10 px-1.5 py-0.5 rounded animate-pulse">
                  AI SPRINT ACTIVE
                </span>
              )}
              {preset === "SHORT" && (
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  SHORT BREAK
                </span>
              )}
              {preset === "LONG" && (
                <span className="text-[9px] font-mono font-bold text-indigo-300 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded">
                  LONG BREAK
                </span>
              )}
              <div className="text-4xl font-bold font-mono text-white tracking-tight mt-1.5">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase">
                {isActive ? "Ticking Away..." : "Ready"}
              </p>
            </div>
          </div>
        </div>

        {}
        <div className="text-center space-y-1.5">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Pomodoro Cycle Progress: {completedStudyCount % 4} of 4 sessions
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4].map((step) => {
              const activeStep = completedStudyCount % 4;
              const isFilled = step <= activeStep || activeStep === 0 && completedStudyCount > 0;
              return (
                <div 
                  key={step} 
                  className={`w-3 h-3 rounded-full border transition-all ${
                    isFilled 
                      ? "bg-indigo-500 border-indigo-400 shadow-sm shadow-indigo-500/50" 
                      : "bg-slate-950 border-slate-850"
                  }`}
                  title={step === 4 ? "4th focus session yields a long break" : `Session ${step}`}
                />
              );
            })}
          </div>
        </div>

        {}
        <div className="flex justify-center gap-3">
          <button
            onClick={toggleTimer}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition transform active:scale-95 shadow cursor-pointer ${
              isActive 
                ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10"
            }`}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Session</span>
              </>
            )}
          </button>

          <button
            onClick={handleSkipSession}
            className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-700 transition"
            title="Skip current session"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={resetTimer}
            className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-700 transition"
            title="Reset timer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {}
        <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-400">Background Ambience:</span>
          </div>
          <select
            value={ambientSound}
            onChange={(e) => setAmbientSound(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
          >
            {ambientPresets.map((sound) => (
              <option key={sound} value={sound}>{sound}</option>
            ))}
          </select>
        </div>

        {}
        <div className="p-3.5 bg-gradient-to-r from-indigo-950/10 to-slate-950/10 rounded-lg border border-indigo-500/5 text-center text-xs text-slate-400 italic">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 inline mr-1.5 -mt-0.5 animate-pulse" />
          {preset === "SPRINT" && startingSprint 
            ? `Your target sprint: ${startingSprint.title}`
            : activeAssignmentObj 
              ? `Current Objective: "${activeAssignmentObj.title}"`
              : "Hyper-focus mode activated. Maintain steady posture and take deep breaths."}
        </div>
      </div>
    </div>
  );
}
