import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Sparkles, CheckCircle2, AlertCircle, ArrowLeft, Trash2, Check, Zap, FileText, Plus, Trash, Clock, BookOpen, Sliders, ChevronRight, Target } from "lucide-react";
import { scanAssignmentOcr, identifyAssignmentFields, createAssignment } from "../services/api";
import { Assignment, Milestone, Priority, Difficulty } from "../types";
import { useToast } from "./Toast";

interface AssignmentScannerProps {
  onImportComplete: () => Promise<void> | void;
  setCurrentTab: (tab: string) => void;
}

type ScanStep = "input" | "extracted" | "analyzing" | "review" | "completed";

export default function AssignmentScanner({ onImportComplete, setCurrentTab }: AssignmentScannerProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<ScanStep>("input");
  
  // File upload / Drag-and-drop state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [ setSelectedFile] = useState<File | null>(null);
  
  // OCR Extracted states
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractedSource, setExtractedSource] = useState<string>("");
  const [ setIsImageFile] = useState<boolean>(true);
  
  // AI identified fields (Form fields reviewed by the user)
  const [formTitle, setFormTitle] = useState<string>("");
  const [formCourse, setFormCourse] = useState<string>("");
  const [formDueDate, setFormDueDate] = useState<string>("");
  const [formPriority, setFormPriority] = useState<Priority>("MEDIUM");
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>("MEDIUM");
  const [formEstimatedHours, setFormEstimatedHours] = useState<number>(5);
  const [formWeight, setFormWeight] = useState<number>(10);
  const [formDescription, setFormDescription] = useState<string>("");
  const [formMilestones, setFormMilestones] = useState<string[]>([]);
  const [formSummary, setFormSummary] = useState<string>("");
  const [formRequirements, setFormRequirements] = useState<string[]>([]);
  const [formStudyPlan, setFormStudyPlan] = useState<string>("");
  
  // Local state for adding a new milestone manually
  const [newMilestoneText, setNewMilestoneText] = useState<string>("");
  const [newRequirementText, setNewRequirementText] = useState<string>("");

  // Error tracking
  const [errorText, setErrorText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and Drop handlers
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
      handleUploadAndOcr(file);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleUploadAndOcr(file);
    }
  };

  // Perform upload + OCR API extraction
  const handleUploadAndOcr = async (file: File) => {
    setSelectedFile(file);
    setErrorText(null);

    try {
      const result = await scanAssignmentOcr(file);

      setTimeout(() => {
        setExtractedText(result.extractedText);
        setExtractedSource(result.filename || file.name);
        setIsImageFile(result.isImage);
        setStep("extracted");
        showToast("Text successfully extracted via AI OCR!", "success");
      }, 250);
    } catch (err: any) {
      setErrorText(err.message || "Failed to parse assignment image. Please try again or use another format.");
      showToast("OCR Extraction failed", "error");
    }
  };

  // Analyze the OCR text and auto-identify fields
  const handleIdentifyFields = async () => {
    if (!extractedText.trim()) {
      setErrorText("Extracted text is empty. Please enter or extract text first.");
      return;
    }

    setStep("analyzing");
    setErrorText(null);

    try {
      const currentDateStr = new Date().toISOString().split('T')[0];
      const parsedData = await identifyAssignmentFields(extractedText, currentDateStr);

      // Pre-populate fields
      setFormTitle(parsedData.title || "New Assignment");
      setFormCourse(parsedData.course || "General");
      setFormDueDate(parsedData.dueDate || currentDateStr);
      setFormPriority(parsedData.priority || "MEDIUM");
      
      // Map difficulty from LOW/MEDIUM/HIGH to EASY/MEDIUM/HARD
      let difficultyMapped: Difficulty = "MEDIUM";
      if (parsedData.difficulty === "LOW" || (parsedData.difficulty as any) === "EASY") {
        difficultyMapped = "EASY";
      } else if (parsedData.difficulty === "HIGH" || (parsedData.difficulty as any) === "HARD") {
        difficultyMapped = "HARD";
      }
      setFormDifficulty(difficultyMapped);
      
      setFormEstimatedHours(parsedData.estimatedHours || 3);
      setFormWeight(parsedData.weight || 10);
      setFormDescription(parsedData.description || "");
      setFormMilestones(parsedData.milestones || []);
      setFormSummary(parsedData.summary || "");
      setFormRequirements(parsedData.requirements || []);
      setFormStudyPlan(parsedData.studyPlan || "");

      setStep("review");
      showToast("Assignment fields successfully auto-extracted!", "success");
    } catch (err: any) {
      setStep("extracted");
      setErrorText(err.message || "The AI was unable to identify assignment fields. Please review text and try again.");
      showToast("AI identification failed", "error");
    }
  };

  // Save the assignment and its milestones to the database
  const handleSaveAssignment = async () => {
    if (!formTitle.trim()) {
      showToast("Please enter a title for the assignment.", "error");
      return;
    }

    try {
      const assignmentId = `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      
      // Convert simple milestone strings to Milestone objects
      const milestonesList: Milestone[] = formMilestones.map((title, index) => ({
        id: `milestone-${assignmentId}-${index}`,
        title: title,
        completed: false
      }));

      // Combine summary, description, and requirements into final description gracefully
      let finalDescription = formDescription;
      if (formSummary) {
        finalDescription = `SUMMARY:\n${formSummary}\n\nDESCRIPTION:\n${finalDescription}`;
      }
      if (formRequirements && formRequirements.length > 0) {
        finalDescription += `\n\nIMPORTANT REQUIREMENTS:\n${formRequirements.map(req => `• ${req}`).join('\n')}`;
      }

      const newAssignment: Assignment = {
        id: assignmentId,
        title: formTitle,
        course: formCourse || "General",
        dueDate: formDueDate,
        status: "TODO",
        priority: formPriority,
        difficulty: formDifficulty,
        weight: formWeight,
        estimatedHours: Number(formEstimatedHours) || 3,
        actualHoursSpent: 0,
        description: finalDescription,
        milestones: milestonesList,
        studyPlan: formStudyPlan,
        createdAt: new Date().toISOString()
      };

      await createAssignment(newAssignment);
      setStep("completed");
      showToast("Assignment scanner task created successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save scanned assignment.", "error");
    }
  };

  // Modify milestones locally in the form
  const handleAddMilestone = () => {
    if (newMilestoneText.trim()) {
      setFormMilestones([...formMilestones, newMilestoneText.trim()]);
      setNewMilestoneText("");
    }
  };

  const handleRemoveMilestone = (index: number) => {
    const updated = [...formMilestones];
    updated.splice(index, 1);
    setFormMilestones(updated);
  };

  // Modify requirements locally
  const handleAddRequirement = () => {
    if (newRequirementText.trim()) {
      setFormRequirements([...formRequirements, newRequirementText.trim()]);
      setNewRequirementText("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    const updated = [...formRequirements];
    updated.splice(index, 1);
    setFormRequirements(updated);
  };

  const resetScanner = () => {
    setSelectedFile(null);
    setExtractedText("");
    setExtractedSource("");
    setErrorText(null);
    setFormTitle("");
    setFormCourse("");
    setFormDueDate("");
    setFormPriority("MEDIUM");
    setFormDifficulty("MEDIUM");
    setFormEstimatedHours(5);
    setFormWeight(10);
    setFormDescription("");
    setFormMilestones([]);
    setFormSummary("");
    setFormRequirements([]);
    setFormStudyPlan("");
    setNewMilestoneText("");
    setNewRequirementText("");
    setStep("input");
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto space-y-8" id="assignment-scanner-page">
      {}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs text-indigo-400 font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" /> AI Assignment Scanner
          </span>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Image & Note OCR Scanner</h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload images, handwritten notes, or screenshots of your assignments. SmartDeadline AI will automatically extract instructions, structure fields, and save them.
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
            {errorText && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Scanner Error</h4>
                  <p className="text-xs text-rose-300/80 mt-0.5">{errorText}</p>
                </div>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
                  : "border-slate-800 bg-slate-900/25 hover:border-slate-700 hover:bg-slate-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*, application/pdf"
                className="hidden"
              />
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Upload Syllabus</h3>
              <p className="text-slate-400 max-w-sm mb-6">Drag & drop your syllabus PDF, DOCX, or Image file here, or click to browse</p>
            </div>
            <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Have plain text instead?</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">You can also write or paste raw text content directly by skipping upload.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setExtractedText("");
                  setExtractedSource("Pasted Manual Entry");
                  setIsImageFile(false);
                  setStep("extracted");
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition border border-slate-700"
              >
                Manual Entry
              </button>
            </div>
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
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Extracted Assignment Text</h3>
                  <p className="text-xs text-slate-400">Successfully loaded from: <strong className="text-slate-300">{extractedSource}</strong></p>
                </div>
              </div>
              <button
                onClick={resetScanner}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear / Re-upload
              </button>
            </div>

            {errorText && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300/80">{errorText}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-400">Review & Refine Raw Extracted Content</label>
                <span className="text-[10px] text-slate-500 font-mono">You can edit the text before scanning with AI</span>
              </div>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="No text extracted. Write or paste details of the assignment instructions, requirements, or syllabus specifications here..."
                rows={12}
                className="w-full p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl text-slate-200 text-xs font-mono whitespace-pre-wrap leading-relaxed outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-inner"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={resetScanner}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition"
              >
                Back
              </button>
              <button
                onClick={handleIdentifyFields}
                disabled={!extractedText.trim()}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 hover:scale-[1.01] cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>Auto-Identify Fields with AI</span>
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
            className="flex flex-col items-center justify-center text-center py-24 space-y-6"
          >
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
              <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-display font-bold text-white">Structuring Assignment Fields</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The AI is identifying the course, estimating hours, assigning priority, and mapping sequential milestone steps...
              </p>
            </div>
          </motion.div>
        )}

        {}
        {step === "review" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">Review Assignment Metadata</h3>
                <p className="text-xs text-slate-400">Verify extracted attributes, schedules, and step milestones before creating the task.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {}
              <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Assignment Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium outline-none focus:border-indigo-500/50"
                    placeholder="Enter assignment title"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Course / Subject</label>
                    <input
                      type="text"
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium outline-none focus:border-indigo-500/50"
                      placeholder="e.g. CS 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Due Date</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Priority</label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as Priority)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Difficulty</label>
                    <select
                      value={formDifficulty}
                      onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white outline-none focus:border-indigo-500/50 cursor-pointer"
                    >
                      <option value="EASY">EASY</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HARD">HARD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Estimated Hours</label>
                      <Clock className="w-3 h-3 text-slate-500" />
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      value={formEstimatedHours}
                      onChange={(e) => setFormEstimatedHours(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Grade Weight</label>
                      <Target className="w-3 h-3 text-slate-500" />
                    </div>
                    <input
                      type="number"
                      value={formWeight}
                      onChange={(e) => setFormWeight(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono outline-none focus:border-indigo-500/50"
                      placeholder="e.g. 15%"
                    />
                  </div>
                </div>                 <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Assignment Description</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed outline-none focus:border-indigo-500/50"
                    placeholder="Provide a summary of guidelines or special instructions"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">AI Generated Summary</label>
                  <textarea
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    rows={2}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 leading-relaxed outline-none focus:border-indigo-500/50"
                    placeholder="Brief high level summary..."
                  />
                </div>
              </div>

              {}
              <div className="lg:col-span-5 space-y-6">
                {}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-400 fill-indigo-400/10" />
                    <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider">Sequential Task Milestones</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Micro-steps suggested by SmartDeadline AI to guide you from start to finish.</p>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {formMilestones.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-900 rounded-lg group">
                        <span className="text-[11px] text-slate-200 font-medium flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-[9px] font-mono font-bold text-indigo-300 shrink-0">
                            {idx + 1}
                          </span>
                          {m}
                        </span>
                        <button
                          onClick={() => handleRemoveMilestone(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {formMilestones.length === 0 && (
                      <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-[11px]">
                        No milestones added yet. Add one below!
                      </div>
                    )}
                  </div>

                  {}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMilestoneText}
                      onChange={(e) => setNewMilestoneText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMilestone()}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500/50"
                      placeholder="Add milestone step..."
                    />
                    <button
                      onClick={handleAddMilestone}
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shrink-0 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider">Key Requirements</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Specific submission rules, format regulations, or important constraints.</p>

                  <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                    {formRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-900 rounded-lg group">
                        <span className="text-[11px] text-slate-200 font-medium flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
                          {req}
                        </span>
                        <button
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-0 group-hover:opacity-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {formRequirements.length === 0 && (
                      <div className="text-center py-6 text-slate-500 border border-dashed border-slate-800 rounded-xl text-[11px]">
                        No requirements listed. Add one below!
                      </div>
                    )}
                  </div>

                  {}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRequirementText}
                      onChange={(e) => setNewRequirementText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddRequirement()}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500/50"
                      placeholder="Add requirement..."
                    />
                    <button
                      onClick={handleAddRequirement}
                      className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {}
                <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                    <h4 className="text-xs font-bold text-white font-display uppercase tracking-wider">Recommended Study Plan</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">AI suggested prep milestones and hours allocation strategy.</p>
                  <textarea
                    value={formStudyPlan}
                    onChange={(e) => setFormStudyPlan(e.target.value)}
                    rows={6}
                    className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 leading-relaxed outline-none focus:border-indigo-500/50"
                    placeholder="AI Suggested study plan (Markdown support)..."
                  />
                </div>

                {}
                <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Original Text Reference</span>
                  <div className="text-[10px] font-mono text-slate-400 max-h-[120px] overflow-y-auto whitespace-pre-wrap leading-relaxed pr-1">
                    {extractedText || "No original text content loaded."}
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="flex justify-between items-center border-t border-slate-900 pt-6">
              <button
                onClick={() => setStep("extracted")}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Edit Raw OCR
              </button>
              <button
                onClick={handleSaveAssignment}
                className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-indigo-600/20 hover:scale-[1.01] cursor-pointer"
              >
                <span>Save Assignment Task</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {}
        {step === "completed" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center text-center py-16 space-y-6 max-w-md mx-auto"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-white">Assignment Created!</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The assignment has been analyzed, parsed into milestones, and scheduled in your master study planner calendar successfully.
              </p>
            </div>

            <div className="flex gap-4 pt-4 w-full">
              <button
                onClick={resetScanner}
                className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition"
              >
                Scan Another Note
              </button>
              <button
                onClick={async () => {
                  await onImportComplete();
                  setCurrentTab("dashboard");
                }}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
              >
                <span>Go to Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
