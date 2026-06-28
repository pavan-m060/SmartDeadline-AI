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
  const [title, setTitle] = useState(initialAssignment?.title || "");
  const [course, setCourse] = useState(initialAssignment?.course || "");
  const [dueDate, setDueDate] = useState(initialAssignment?.dueDate || "2026-07-03");
  const [priority, setPriority] = useState<Priority>(initialAssignment?.priority || "MEDIUM");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialAssignment?.difficulty || "MEDIUM");
  const [weight, setWeight] = useState<number>(initialAssignment?.weight || 10);
  const [estimatedHours, setEstimatedHours] = useState<number>(initialAssignment?.estimatedHours || 10);
  const [description, setDescription] = useState(initialAssignment?.description || "");
  const [attachments, setAttachments] = useState<Attachment[]>(initialAssignment?.attachments || []);

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
      setDueDate(result.dueDate || "");
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
    if (!title.trim() || !course.trim() || !dueDate) {
      setError("Assignment Title, Subject, and Deadline are mandatory.");
      return;
    }

    onSave({
      title,
      course,
      dueDate,
      priority,
      difficulty,
      weight,
      estimatedHours,
      description,
      attachments,
      // Pass milestones if we were parsing a syllabus
      suggestedMilestones: initialAssignment ? undefined : [
        "Read criteria and create initial outline",
        "Gather research articles & draft body paragraphs",
        "Formulate conclusion and proofread guidelines"
      ]
    });
  };

  return (
    <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-xl text-white">
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
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40">
          <button
            onClick={() => setActiveTab("manual")}
            className={`py-3.5 px-4 text-xs font-semibold tracking-wide border-b-2 transition font-mono cursor-pointer ${
              activeTab === "manual"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            MANUAL INPUT
          </button>
          <button
            onClick={() => setActiveTab("syllabus")}
            className={`py-3.5 px-4 text-xs font-semibold tracking-wide border-b-2 transition flex items-center gap-1.5 font-mono cursor-pointer ${
              activeTab === "syllabus"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
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
              <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Paste Syllabus Snippet or Assignment Prompt</label>
              <textarea
                value={syllabusText}
                onChange={(e) => setSyllabusText(e.target.value)}
                placeholder="Paste assignment description, syllabus timeline, grading guidelines, or class email here... Let SmartDeadline AI extract the parameters."
                rows={10}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>

            <button
              onClick={handleParseSyllabus}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  <span>Parsing syllabus with SmartDeadline AI...</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Subject / Course</label>
                <input
                  type="text"
                  required
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. CS-101 / Computer Science"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Deadline (Due Date)</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Assignment Title</label>
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
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Priority Level</label>
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
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Difficulty</label>
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
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Grade Weight (%)</label>
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
                <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Est. Hours</label>
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
              <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Description & Core Brief</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include assignment details, grading rubrics, or notes to help SmartDeadline AI customize the generated study schedule."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
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
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all cursor-pointer"
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
