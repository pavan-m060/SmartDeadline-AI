import { useState, FormEvent } from "react";
import { Assignment, Priority, SyllabusParseResult, Difficulty, Attachment } from "../types";
import { parseSyllabus } from "../services/api";
import { Sparkles, Loader2, Check } from "lucide-react";
import AttachmentManager from "./AttachmentManager";

interface AssignmentFormProps {
  onSave: (assignmentData: Omit<Assignment, "id" | "createdAt" | "milestones" | "actualHoursSpent" | "status"> & { suggestedMilestones?: string[], attachments?: Attachment[] }) => void;
  onCancel: () => void;
  initialAssignment?: Assignment;
}

export default function AssignmentForm({ onSave, onCancel, initialAssignment }: AssignmentFormProps) {
  const [activeTab, setActiveTab] = useState<"manual" | "syllabus">("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form states
  const initialDateStr = initialAssignment?.dueDate || "2026-07-03T23:59";
  const [initialDatePart, initialTimePart] = initialDateStr.includes("T") 
    ? initialDateStr.split("T") 
    : [initialDateStr, "23:59"];

  const [title, setTitle] = useState(initialAssignment?.title || "");
  const [course, setCourse] = useState(initialAssignment?.course || "");
  const [dueDate, setDueDate] = useState(initialDatePart);
  const [dueTime, setDueTime] = useState(initialTimePart.substring(0, 5)); // HH:MM
  const [priority, setPriority] = useState<Priority>(initialAssignment?.priority || "MEDIUM");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialAssignment?.difficulty || "MEDIUM");
  const [weight, setWeight] = useState<number>(initialAssignment?.weight || 10);
  const [estimatedHours, setEstimatedHours] = useState<number>(initialAssignment?.estimatedHours || 10);
  const [description, setDescription] = useState(initialAssignment?.description || "");
  const [attachments, setAttachments] = useState<Attachment[]>(initialAssignment?.attachments || []);
  const [reminderEnabled, setReminderEnabled] = useState(initialAssignment?.reminderSettings?.enabled || false);
  const [reminderOffset, setReminderOffset] = useState<number>(initialAssignment?.reminderSettings?.timeOffset || 60);

  // Syllabus parsing raw text
  const [syllabusText, setSyllabusText] = useState("");
  const [parseSuccessMessage, setParseSuccessMessage] = useState<string | null>(null);

  // Handle parsing syllabus with Gemini
  const handleParseSyllabus = async () => {
    if (!syllabusText.trim()) {
      setError("Please paste some text before launching the parser.");
      return;
    }
    setLoading(true);
    setError(null);
    setParseSuccessMessage(null);

    try {
      const result: SyllabusParseResult = await parseSyllabus(syllabusText);
      
      // Auto-populate parsed values
      setTitle(result.title || "");
      setCourse(result.course || "");
      if (result.dueDate) {
        const parsedDateStr = result.dueDate;
        const [parsedDate, parsedTime] = parsedDateStr.includes("T") 
          ? parsedDateStr.split("T") 
          : [parsedDateStr, "23:59"];
        setDueDate(parsedDate);
        setDueTime(parsedTime.substring(0, 5));
      }
      setPriority(result.priority || "MEDIUM");
      setWeight(result.weight || 10);
      setEstimatedHours(result.estimatedHours || 10);
      setDescription(result.description || "");

      // Record temporary suggested milestones and notify
      setParseSuccessMessage(`Successfully parsed "${result.title || "assignment"}" from ${result.course || "course"}! Form fields have been filled.`);
      setActiveTab("manual");
    } catch (err: any) {

      setError(err.message || "Failed to parse syllabus. The model could not structure this text.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !course.trim() || !dueDate || !dueTime) {
      setError("Assignment Title, Subject, Deadline Date, and Deadline Time are mandatory.");
      return;
    }

    const fullDueDate = `${dueDate}T${dueTime}`;

    onSave({
      title,
      course,
      dueDate: fullDueDate,
      priority,
      difficulty,
      weight,
      estimatedHours,
      description,
      attachments,
      reminderSettings: {
        enabled: reminderEnabled,
        timeOffset: reminderOffset,
        customTime: ![5, 15, 30, 60, 1440].includes(reminderOffset)
      },
      // Pass milestones if we were parsing a syllabus
      suggestedMilestones: initialAssignment ? undefined : [
        "Read criteria and create initial outline",
        "Gather research articles & draft body paragraphs",
        "Formulate conclusion and proofread guidelines"
      ]
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800/50 rounded-xl overflow-hidden shadow-sm border-slate-800">
      {}
      <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
        <div>
          <h3 className="font-sans font-bold text-xl text-slate-100">
            {initialAssignment ? "Edit Assignment" : "Add Assignment"}
          </h3>
          <p className="text-slate-400 text-xs mt-1">
            {initialAssignment ? "Modify assignment specifications" : "Create a new assignment using manual or AI-assisted parsing"}
          </p>
        </div>
        <button 
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 font-medium transition"
        >
          Cancel
        </button>
      </div>

      {}
      {!initialAssignment && (
        <div className="flex border-b border-slate-800/50 px-6 bg-slate-950">
          <button
            onClick={() => setActiveTab("manual")}
            className={`py-3.5 px-4 text-xs font-semibold tracking-wide border-b-2 transition font-mono cursor-pointer ${
              activeTab === "manual"
                ? "border-indigo-500 text-slate-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            MANUAL INPUT
          </button>
          <button
            onClick={() => setActiveTab("syllabus")}
            className={`py-3.5 px-4 text-xs font-semibold tracking-wide border-b-2 transition flex items-center gap-1.5 font-mono cursor-pointer ${
              activeTab === "syllabus"
                ? "border-indigo-500 text-slate-300"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-300" />
            <span>AI SYLLABUS PARSER</span>
          </button>
        </div>
      )}

      {}
      <div className="p-6">
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs mb-5 font-mono">
            ⚠️ {error}
          </div>
        )}

        {parseSuccessMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs mb-5 flex items-start gap-2.5">
            <Check className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{parseSuccessMessage}</span>
          </div>
        )}

        {activeTab === "syllabus" ? (
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-bold text-slate-400 font-medium">Paste Syllabus Snippet or Assignment Prompt</label>
              <textarea
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                placeholder="Paste assignment description, syllabus timeline, grading guidelines, or class email here... Let Smart Deadline AI extract the parameters."
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            <button
              onClick={handleParseSyllabus}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-slate-100 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Parsing syllabus with Smart Deadline AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  <span>Execute Smart AI Extraction</span>
                </>
              )}
            </button>
          </div>
        ) : (
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="space-y-1.5 sm:col-span-6">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Subject / Course</label>
                <input
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. CS-101 / Computer Science"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Deadline (Due Date)</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-3">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Deadline Time</label>
                <input
                  type="time"
                  required
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Assignment Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Final Term Research Paper"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Grade Weight (%)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Est. Hours</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Description & Core Brief</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include assignment details, grading rubrics, or notes to help Smart Deadline AI customize the generated study schedule."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Smart Reminder Settings */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono font-semibold text-slate-400 font-medium">Smart Reminder</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reminder-enable"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-slate-400 focus:ring-indigo-500 focus:ring-offset-slate-950"
                  />
                  <label htmlFor="reminder-enable" className="text-sm text-slate-300 select-none cursor-pointer">Enable</label>
                </div>
              </div>
              
              {reminderEnabled && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={[5, 15, 30, 60, 1440].includes(reminderOffset) ? reminderOffset : 'custom'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== 'custom') setReminderOffset(Number(val));
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                    <option value="custom">Custom time...</option>
                  </select>
                  
                  {![5, 15, 30, 60, 1440].includes(reminderOffset) && (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        min={1}
                        value={reminderOffset}
                        onChange={(e) => setReminderOffset(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        placeholder="Minutes"
                      />
                      <span className="text-sm text-slate-400">min</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {}
            <div className="pt-2 border-t border-slate-800">
              <AttachmentManager 
                attachments={attachments}
                onChange={setAttachments}
                title="Assignment Attachments"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-slate-100 font-semibold rounded-lg text-sm transition-all cursor-pointer"
              >
                {initialAssignment ? "Save Changes" : "Save Assignment"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
