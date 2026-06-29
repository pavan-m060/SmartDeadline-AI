import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight, Trash2, Calendar, Check, Zap, BookOpen, Edit3, Plus, ChevronDown, ChevronUp, GraduationCap, Clock, AlertTriangle } from "lucide-react";
import { extractSyllabusText, extractSyllabusManual, parseSyllabusOnly, saveImportedTasks } from "../services/api";
import { Assignment, UserProfile, ExtractedTask, Priority, Difficulty } from "../types";
import { useToast } from "./Toast";
import { formatDueDate } from "../utils";

interface SyllabusScannerProps {
  onImportComplete: () => Promise<void> | void;
  setCurrentTab: (tab: string) => void;
  userProfile?: UserProfile | null;
}

type ScanStep = "input" | "extracted" | "analyzing" | "preview" | "importing" | "completed";

export default function SyllabusScanner({ onImportComplete, setCurrentTab }: SyllabusScannerProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [step, setStep] = useState<ScanStep>("input");
  
  // File upload states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [_selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  
  // Manual text state
  const [pastedText, setPastedText] = useState<string>("");
  
  // Extracted content
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractedSource, setExtractedSource] = useState<string>("");
  
  // AI processing states
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [courseSummary, setCourseSummary] = useState<string>("");
  const [importedTasks, setImportedTasks] = useState<Assignment[]>([]);

  // Preview & Editing states
  const [parsedCourseName, setParsedCourseName] = useState<string>("");
  const [parsedInstructor, setParsedInstructor] = useState<string>("");
  const [parsedRecommendedSchedule, setParsedRecommendedSchedule] = useState<string>("");
  const [parsedTasks, setParsedTasks] = useState<ExtractedTask[]>([]);
  const [expandedTaskIdx, setExpandedTaskIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag & drop handlers
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const ext = (file.name || '').split(".").pop()?.toLowerCase();
      if (ext === "pdf" || ext === "docx" || ext === "doc" || ext === "txt") {
        setSelectedFile(file);
        handleUploadAndExtract(file);
      } else {
        setAiError("Unsupported file type. Please upload a PDF, DOCX, or TXT file.");
      }
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUploadAndExtract(file);
    }
  };

  // Simulate progress bar and upload
  const handleUploadAndExtract = async (file: File) => {
    setIsExtracting(true);
    setUploadProgress(10);
    setAiError(null);

    // Simulate clean, professional visual progress ticks
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    try {
      const result = await extractSyllabusText(file);
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setExtractedText(result.extractedText);
        setExtractedSource(result.filename || file.name);
        setStep("extracted");
        setIsExtracting(false);
        setUploadProgress(0);
        showToast("Syllabus text extracted successfully!", "success");
      }, 300);
    } catch (err: any) {
      clearInterval(interval);
      setIsExtracting(false);
      setUploadProgress(0);
      setAiError(err.message || "Failed to extract text from the selected document.");
      showToast(err.message || "Failed to extract text", "error");
    }
  };

  // Submit manual pasted text
  const handleManualSubmit = async () => {
    if (!pastedText.trim()) {
      setAiError("Please paste your syllabus text into the input field.");
      return;
    }

    setIsExtracting(true);
    setUploadProgress(20);
    setAiError(null);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 100);

    try {
      const result = await extractSyllabusManual(pastedText);
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        setExtractedText(result.extractedText);
        setExtractedSource("Pasted Manual Text");
        setStep("extracted");
        setIsExtracting(false);
        setUploadProgress(0);
        showToast("Syllabus text parsed successfully!", "success");
      }, 300);
    } catch (err: any) {
      clearInterval(interval);
      setIsExtracting(false);
      setUploadProgress(0);
      setAiError(err.message || "Failed to parse pasted manual syllabus.");
      showToast(err.message || "Failed to parse syllabus", "error");
    }
  };

  // Execute Gemini auto task generation in DB
  const handleProcessWithGemini = async () => {
    setIsConfirming(false);
    setStep("analyzing");
    setAiError(null);

    try {
      const response = await parseSyllabusOnly(extractedText);
      setParsedCourseName(response.courseName || "");
      setParsedInstructor(response.instructor || "Unknown");
      setParsedRecommendedSchedule(response.recommendedStudySchedule || "");
      setCourseSummary(response.summary || "");
      setParsedTasks(response.tasks || []);
      setStep("preview");
      showToast("Syllabus processed! Please review and customize your tasks.", "success");
    } catch (err: any) {
      setStep("extracted");
      setAiError(err.message || "Smart Deadline AI was unable to structure tasks from this syllabus. Please verify document formatting and try again.");
      showToast(err.message || "AI structuring failed", "error");
    }
  };

  // Save the customized tasks list in database
  const handleSaveImportedTasks = async () => {
    setStep("importing");
    setAiError(null);

    try {
      // Map course name from top-level if task course is missing or empty
      const finalizedTasks = parsedTasks.map(task => ({
        ...task,
        course: task.course.trim() || parsedCourseName.trim() || "General Study"
      }));

      const response = await saveImportedTasks(finalizedTasks);
      setImportedTasks(response.tasks || []);
      setStep("completed");
      showToast("Tasks successfully saved and scheduled! 🎉", "success");
    } catch (err: any) {
      setStep("preview");
      setAiError(err.message || "Failed to save tasks. Please verify due dates format (YYYY-MM-DD) and try again.");
      showToast(err.message || "Failed to save tasks", "error");
    }
  };

  // Task editing utility functions
  const handleTaskChange = (idx: number, field: keyof ExtractedTask, value: any) => {
    setParsedTasks(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const handleMilestoneChange = (taskIdx: number, mIdx: number, value: string) => {
    setParsedTasks(prev => {
      const updated = [...prev];
      const updatedMilestones = [...updated[taskIdx].milestones];
      updatedMilestones[mIdx] = value;
      updated[taskIdx] = { ...updated[taskIdx], milestones: updatedMilestones };
      return updated;
    });
  };

  const addMilestone = (taskIdx: number) => {
    setParsedTasks(prev => {
      const updated = [...prev];
      updated[taskIdx] = {
        ...updated[taskIdx],
        milestones: [...updated[taskIdx].milestones, "New Milestone"]
      };
      return updated;
    });
  };

  const removeMilestone = (taskIdx: number, mIdx: number) => {
    setParsedTasks(prev => {
      const updated = [...prev];
      const updatedMilestones = updated[taskIdx].milestones.filter((_, idx) => idx !== mIdx);
      updated[taskIdx] = { ...updated[taskIdx], milestones: updatedMilestones };
      return updated;
    });
  };

  const addTask = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newTask: ExtractedTask = {
      title: "New Custom Task",
      type: "ASSIGNMENT",
      course: parsedCourseName || "Course",
      dueDate: todayStr,
      priority: "MEDIUM",
      difficulty: "MEDIUM",
      weight: 10,
      estimatedHours: 4,
      description: "Enter a brief task description",
      milestones: ["Prepare draft", "Review guidelines"]
    };
    setParsedTasks(prev => [...prev, newTask]);
    setExpandedTaskIdx(parsedTasks.length); // auto expand the new task
    showToast("Blank task appended to schedule.", "info");
  };

  const removeTask = (idx: number) => {
    setParsedTasks(prev => prev.filter((_, i) => i !== idx));
    if (expandedTaskIdx === idx) {
      setExpandedTaskIdx(null);
    } else if (expandedTaskIdx !== null && expandedTaskIdx > idx) {
      setExpandedTaskIdx(expandedTaskIdx - 1);
    }
    showToast("Task removed from preview.", "info");
  };

  const resetScanner = () => {
    setSelectedFile(null);
    setPastedText("");
    setExtractedText("");
    setExtractedSource("");
    setAiError(null);
    setCourseSummary("");
    setImportedTasks([]);
    setParsedCourseName("");
    setParsedInstructor("");
    setParsedRecommendedSchedule("");
    setParsedTasks([]);
    setExpandedTaskIdx(null);
    setStep("input");
    showToast("Syllabus scanner reset.", "info");
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto space-y-8" id="syllabus-scanner-page">
      {}
      <div className="flex items-center justify-between border-b border-slate-800/50 pb-6">
        <div>
          <span className="text-xs text-slate-300 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Syllabus Scanner
          </span>
          <h2 className="text-2xl font-sans font-bold text-slate-100 tracking-tight">Syllabus Scanner & Task Importer</h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload your course syllabus PDF, DOCX, or paste the text. Our AI will automatically identify academic deliverables and schedule them for you.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {}
        {step === "input" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {}
            <div className="flex border-b border-slate-800/50 bg-slate-900 p-1.5 rounded-lg max-w-md">
              <button
                onClick={() => setActiveTab("upload")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "upload"
                    ? "bg-indigo-600 text-slate-100 shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Upload Syllabus Document
              </button>
              <button
                onClick={() => setActiveTab("paste")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "paste"
                    ? "bg-indigo-600 text-slate-100 shadow-md shadow-indigo-600/10"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                Paste Plain Text
              </button>
            </div>

            {aiError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Scanner Warning</h4>
                  <p className="text-xs text-rose-300/80 mt-0.5">{aiError}</p>
                </div>
              </div>
            )}

            {}
            {activeTab === "upload" ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                  dragActive
                    ? "border-indigo-500 bg-brand-purple/10 scale-[0.99]"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.docx,.doc,.txt"
                  className="hidden"
                />

                {isExtracting ? (
                  <div className="space-y-4 w-full max-w-sm">
                    <Loader2 className="w-12 h-12 text-slate-300 animate-spin mx-auto" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">Extracting Syllabus Content</h4>
                      <p className="text-xs text-slate-400 mt-1">Reading files and decoding course objectives...</p>
                    </div>
                    {}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-purple transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 font-mono font-bold uppercase">{uploadProgress}% COMPLETE</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800/50 flex items-center justify-center mx-auto text-slate-300 shadow-md">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-100 font-sans">Drag & Drop Syllabus File</h3>
                      <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                        Supports PDF, Word Documents (DOCX), or plain text (.txt) files. Max size 15MB.
                      </p>
                    </div>
                    <button className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-lg transition border border-slate-700 shadow-inner">
                      Browse Files
                    </button>
                  </div>
                )}
              </div>
            ) : (
              
              <div className="space-y-4">
                <div className="bg-slate-900 border border-slate-800/50 rounded-xl overflow-hidden p-4">
                  <div className="flex items-center justify-between border-b border-slate-800/50 pb-3 mb-4">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-slate-300" /> Syllabus Content
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{pastedText.length} characters</span>
                  </div>
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste the course grading breakdown, schedule of assignments, or calendar contents directly here..."
                    rows={12}
                    className="w-full bg-slate-950 text-slate-200 border-none outline-none text-sm placeholder-slate-600 focus:ring-0 resize-y font-mono"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleManualSubmit}
                    disabled={isExtracting}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-medium text-sm rounded-lg transition shadow-sm shadow-indigo-600/15 cursor-pointer disabled:opacity-50"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Extracting... {uploadProgress}%</span>
                      </>
                    ) : (
                      <>
                        <span>Load Syllabus Text</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {}
        {step === "extracted" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-indigo-500/15 flex items-center justify-center text-slate-300 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-sans">Syllabus Text Loaded</h3>
                  <p className="text-xs text-slate-400">Successfully extracted from: <strong className="text-slate-300">{extractedSource}</strong></p>
                </div>
              </div>
              <button
                onClick={resetScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-100 text-xs font-medium rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Re-upload
              </button>
            </div>

            {aiError && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300/80">{aiError}</p>
              </div>
            )}

            {}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Extracted Text Content (Pre-AI Review)</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 h-96 overflow-y-auto text-slate-300 text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                {extractedText}
              </div>
            </div>

            {}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsConfirming(true)}
                className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 border border-slate-800/50 from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-slate-100 font-semibold text-sm rounded-xl transition shadow-sm shadow-indigo-600/20 hover:scale-[1.01] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 " />
                <span>Process & Generate Tasks with AI</span>
              </button>
            </div>
          </motion.div>
        )}

        {}
        {step === "analyzing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 space-y-6"
          >
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <div className="w-16 h-16 rounded-full bg-brand-purple/10 flex items-center justify-center text-slate-300">
                <Sparkles className="w-8 h-8 " />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-sans font-bold text-slate-100">AI Academic Co-Pilot is Scanning</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Analyzing course dates, weights, requirements, and mapping optimal priority levels. Auto-scheduling academic milestones into database...
              </p>
            </div>
          </motion.div>
        )}

        {}
        {step === "preview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {}
            <div className="p-5 bg-brand-purple/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-indigo-500/15 flex items-center justify-center text-slate-300 shrink-0">
                <Sparkles className="w-5 h-5 " />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100 font-sans">Review Extracted Course Details</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Smart Deadline AI successfully parsed your syllabus! Review and customize the course info, study schedule, or add/edit tasks below before final import.
                </p>
              </div>
            </div>

            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {}
              <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5 mb-2">
                  <GraduationCap className="w-4 h-4" /> Course Metadata
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Course Name</label>
                    <input
                      type="text"
                      value={parsedCourseName}
                      onChange={(e) => setParsedCourseName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition font-sans"
                      placeholder="e.g. CS 101: Intro to Computer Science"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Instructor / Professor</label>
                    <input
                      type="text"
                      value={parsedInstructor}
                      onChange={(e) => setParsedInstructor(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition font-sans"
                      placeholder="e.g. Dr. Jane Doe"
                    />
                  </div>
                </div>
              </div>

              {}
              <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-6 space-y-4">
                <h4 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5 mb-2">
                  <Clock className="w-4 h-4" /> Recommended Study Schedule
                </h4>
                <div>
                  <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">AI Suggested Study Guidelines</label>
                  <textarea
                    value={parsedRecommendedSchedule}
                    onChange={(e) => setParsedRecommendedSchedule(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 transition resize-none font-sans"
                    placeholder="Provide recommendations..."
                  />
                </div>
              </div>
            </div>

            {}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-100 font-sans">Academic Tasks & Deliverables</h4>
                  <p className="text-xs text-slate-400">Review, modify due dates, weights, or add milestones for each task.</p>
                </div>
                <button
                  onClick={addTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-purple/10 hover:bg-brand-purple/20 text-slate-300 hover:text-indigo-300 border border-indigo-500/20 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Deliverable</span>
                </button>
              </div>

              {parsedTasks.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800/50 rounded-xl text-slate-500 text-sm">
                  No tasks found. Click "Add Deliverable" to add one manually.
                </div>
              ) : (
                <div className="space-y-3">
                  {parsedTasks.map((task, idx) => {
                    const isExpanded = expandedTaskIdx === idx;
                    // Highlight logic: Exam/Project OR High/Urgent priority OR weight >= 15%
                    const isCrucial = task.type === "EXAM" || task.type === "PROJECT" || task.priority === "URGENT" || task.priority === "HIGH" || (task.weight && task.weight >= 15);

                    return (
                      <div
                        key={idx}
                        className={`bg-slate-950 border transition rounded-xl overflow-hidden ${
                          isExpanded 
                            ? "border-indigo-500 shadow-sm shadow-indigo-500/5" 
                            : isCrucial 
                            ? "border-amber-500/40 hover:border-amber-500/60" 
                            : "border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        {}
                        <div 
                          className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none ${
                            isCrucial ? "bg-amber-500/[0.02]" : ""
                          }`}
                          onClick={() => setExpandedTaskIdx(isExpanded ? null : idx)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {task.type === "EXAM" ? (
                                <span className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-xs font-bold font-mono">EX</span>
                              ) : task.type === "PROJECT" ? (
                                <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xs font-bold font-mono">PR</span>
                              ) : task.type === "QUIZ" ? (
                                <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-xs font-bold font-mono">QZ</span>
                              ) : (
                                <span className="w-7 h-7 rounded-lg bg-brand-purple/10 border border-indigo-500/20 flex items-center justify-center text-slate-300 text-xs font-bold font-mono">AS</span>
                              )}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-slate-300 font-mono bg-slate-900 border border-slate-800/50 px-1.5 py-0.5 rounded">
                                  {task.course || parsedCourseName || "Course"}
                                </span>
                                {isCrucial && (
                                  <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" /> CRITICAL DEADLINE
                                  </span>
                                )}
                              </div>
                              <h5 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                                {task.title || "Untitled Deliverable"}
                              </h5>
                              <p className="text-xs text-slate-400 line-clamp-1">{task.description || "No description provided."}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-slate-900 pt-3 md:pt-0">
                            <div className="text-left md:text-right">
                              <span className="text-[11px] text-slate-500 block font-mono font-semibold">DUE DATE</span>
                              <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDueDate(task.dueDate)}
                              </span>
                            </div>

                            <div className="text-left md:text-right min-w-16">
                              <span className="text-[11px] text-slate-500 block font-mono font-semibold">WEIGHT</span>
                              <span className="text-xs font-mono text-slate-300 font-bold block mt-0.5">
                                {task.weight}%
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedTaskIdx(isExpanded ? null : idx);
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-100 transition cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTask(idx);
                                }}
                                className="p-1.5 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/50 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <div className="text-slate-500 pl-1">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>
                        </div>

                        {}
                        {isExpanded && (
                          <div className="p-5 border-t border-slate-900 bg-slate-950 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-2">
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Title</label>
                                <input
                                  type="text"
                                  value={task.title}
                                  onChange={(e) => handleTaskChange(idx, "title", e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                              
                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Deliverable Type</label>
                                <select
                                  value={task.type}
                                  onChange={(e) => handleTaskChange(idx, "type", e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                >
                                  <option value="ASSIGNMENT">Assignment</option>
                                  <option value="EXAM">Exam</option>
                                  <option value="QUIZ">Quiz</option>
                                  <option value="PROJECT">Project</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Course Code</label>
                                <input
                                  type="text"
                                  value={task.course}
                                  onChange={(e) => handleTaskChange(idx, "course", e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Due Date (YYYY-MM-DD)</label>
                                <input
                                  type="text"
                                  value={task.dueDate}
                                  onChange={(e) => handleTaskChange(idx, "dueDate", e.target.value)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                                  placeholder="YYYY-MM-DD"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Grade Weight (%)</label>
                                <input
                                  type="number"
                                  value={task.weight || 0}
                                  onChange={(e) => handleTaskChange(idx, "weight", parseInt(e.target.value) || 0)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                />
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Priority</label>
                                <select
                                  value={task.priority}
                                  onChange={(e) => handleTaskChange(idx, "priority", e.target.value as Priority)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                >
                                  <option value="LOW">Low</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HIGH">High</option>
                                  <option value="URGENT">Urgent</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Difficulty</label>
                                <select
                                  value={task.difficulty}
                                  onChange={(e) => handleTaskChange(idx, "difficulty", e.target.value as Difficulty)}
                                  className="w-full bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                >
                                  <option value="EASY">Easy</option>
                                  <option value="MEDIUM">Medium</option>
                                  <option value="HARD">Hard</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {}
                              <div className="md:col-span-2 space-y-3">
                                <div>
                                  <label className="text-xs font-semibold text-slate-400 font-mono uppercase block mb-1">Description / Details</label>
                                  <textarea
                                    value={task.description}
                                    onChange={(e) => handleTaskChange(idx, "description", e.target.value)}
                                    rows={3}
                                    className="w-full bg-slate-900 border border-slate-800/50 rounded-lg p-2.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 font-sans"
                                    placeholder="Deliverable description or textbook chapters..."
                                  />
                                </div>
                              </div>

                              {}
                              <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400 font-mono uppercase flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-slate-300" /> Milestones
                                  </span>
                                  <button
                                    onClick={() => addMilestone(idx)}
                                    className="text-xs font-bold text-slate-300 hover:text-indigo-300 transition flex items-center gap-0.5 cursor-pointer font-sans"
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Add
                                  </button>
                                </div>

                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                  {task.milestones.length === 0 ? (
                                    <span className="text-xs text-slate-500 italic block font-sans">No milestones added.</span>
                                  ) : (
                                    task.milestones.map((milestone, mIdx) => (
                                      <div key={mIdx} className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-slate-500 font-mono">{mIdx + 1}.</span>
                                        <input
                                          type="text"
                                          value={milestone}
                                          onChange={(e) => handleMilestoneChange(idx, mIdx, e.target.value)}
                                          className="flex-1 min-w-0 bg-slate-900 border border-slate-800/50 rounded px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-indigo-500 font-sans"
                                        />
                                        <button
                                          onClick={() => removeMilestone(idx, mIdx)}
                                          className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {}
            <div className="flex justify-between items-center border-t border-slate-900 pt-6 font-sans">
              <button
                onClick={resetScanner}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 text-xs font-semibold rounded-lg transition"
              >
                Start Over
              </button>
              <button
                onClick={handleSaveImportedTasks}
                className="flex items-center gap-2 px-8 py-3.5 bg-slate-900 border border-slate-800/50 from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-100 font-bold text-sm rounded-xl transition shadow-sm shadow-emerald-600/20 hover:scale-[1.01] cursor-pointer"
              >
                <span>Confirm & Import to Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {}
        {step === "importing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center py-20 space-y-6"
          >
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin" />
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-sans font-bold text-slate-100">Scheduling Academic Plan...</h3>
              <p className="text-sm text-slate-400 leading-relaxed font-sans">
                Importing tasks, creating dynamic study schedules, and auto-populating sub-milestones safely into your database.
              </p>
            </div>
          </motion.div>
        )}

        {}
        {step === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100 font-sans">Tasks Successfully Generated</h3>
                <p className="text-sm text-slate-300">
                  AI has successfully parsed the syllabus, generated optimal deadlines and milestones, and saved <strong className="text-emerald-400 font-mono">{importedTasks.length} tasks</strong> directly to your database.
                </p>
              </div>
            </div>

            {}
            <div className="bg-slate-900 border border-slate-800/50 rounded-xl p-6 space-y-3">
              <h4 className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Course Overview Summary
              </h4>
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line italic">
                "{courseSummary}"
              </p>
            </div>

            {}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 font-mono font-medium">Generated Academic Schedule ({importedTasks.length} Tasks)</h4>
              <div className="space-y-3.5 max-h-96 overflow-y-auto pr-1">
                {importedTasks.map((task) => (
                  <div key={task.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-800 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-300 bg-brand-purple/10 border border-indigo-500/15 px-2 py-0.5 rounded-full font-mono font-bold">
                          {task.course}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                          task.priority === "URGENT" 
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/15" 
                            : task.priority === "HIGH" 
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/15" 
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}>
                          {task.priority} PRIORITY
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-100">{task.title}</h5>
                      <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-t md:border-t-0 border-slate-900 pt-3 md:pt-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">DUE DATE</span>
                        <span className="text-xs font-mono text-slate-200 font-bold flex items-center gap-1 mt-0.5 justify-end">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" /> {formatDueDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="text-right min-w-16">
                        <span className="text-xs text-slate-500 block">WEIGHT</span>
                        <span className="text-xs font-mono text-slate-300 font-bold block mt-0.5">
                          {task.weight}% of Grade
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {}
            <div className="flex justify-between items-center border-t border-slate-900 pt-6">
              <button
                onClick={resetScanner}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-100 text-xs font-semibold rounded-lg transition"
              >
                Scan Another Syllabus
              </button>
              <button
                onClick={async () => {
                  await onImportComplete();
                  setCurrentTab("dashboard");
                }}
                className="flex items-center gap-2 px-8 py-3 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-bold text-sm rounded-xl transition shadow-sm shadow-indigo-600/20 cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {isConfirming && (
          <div className="fixed inset-0 bg-slate-950  flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800/50 rounded-xl w-full max-w-md overflow-hidden shadow-sm border-slate-800"
            >
              <div className="p-6 border-b border-slate-800/50 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-purple/10 border border-indigo-500/15 flex items-center justify-center text-slate-300 shrink-0">
                  <Sparkles className="w-5 h-5 " />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-100 font-sans">Create Tasks Automatically?</h3>
                  <p className="text-xs text-indigo-300 font-mono font-medium mt-1 uppercase tracking-widest flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-indigo-400 stroke-none" /> AI Orchestrator
                  </p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-300 leading-relaxed">
                  Smart Deadline AI will extract assignments, exams, projects, weights, estimated study hours, and schedule sequential milestones automatically.
                </p>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Identified course deliverables will be inserted immediately into your workspace calendar. This operation cannot be bulk-reversed.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 border-t border-slate-800 flex gap-3 justify-end">
                <button
                  onClick={() => setIsConfirming(false)}
                  className="px-4 py-2 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProcessWithGemini}
                  className="flex items-center gap-1.5 px-5 py-2 bg-brand-purple hover:bg-brand-purple-dark shadow-sm text-slate-100 font-bold text-xs rounded-lg transition shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <span>Proceed & Import</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
