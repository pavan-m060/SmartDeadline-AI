import { useState } from "react";
import { Assignment } from "../types";
import { Sparkles, Loader2, Calendar, Target, CheckCircle, ChevronRight, AlertCircle, Download, RefreshCw, Clock, TrendingUp, BookOpen, Coffee, AlertTriangle, Flame, GraduationCap, Hourglass, Award } from "lucide-react";
import { generateStudyPlan } from "../services/api";
import { jsPDF } from "jspdf";
import { StudyPlanSkeleton } from "./Skeleton";

interface StudyPlannerProps {
  assignments: Assignment[];
  masterStudyPlan: any | null;
  isRecalculatingPlan: boolean;
  recalculationError: string | null;
  onForceRecalculate: (preferences?: { availableHours: number; sessionLength: number; breakInterval: number }) => Promise<void>;
}

export default function StudyPlanner({ 
  assignments, 
  masterStudyPlan, 
  isRecalculatingPlan, 
  recalculationError,
  onForceRecalculate 
}: StudyPlannerProps) {
  const [activeSubTab, setActiveSubTab] = useState<"master" | "legacy">("master");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  // Load initial preferences from local storage if any
  const [availableHours, setAvailableHours] = useState<number>(() => {
    const saved = localStorage.getItem("smartdeadline_study_preferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.available_hours) return Number(parsed.available_hours);
      } catch (e) {}
    }
    return 20; // Default
  });

  const [sessionLength, setSessionLength] = useState<number>(() => {
    const saved = localStorage.getItem("smartdeadline_study_preferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.session_length) return Number(parsed.session_length);
      } catch (e) {}
    }
    return 45; // Default (minutes)
  });

  const [breakInterval, setBreakInterval] = useState<number>(() => {
    const saved = localStorage.getItem("smartdeadline_study_preferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.break_interval) return Number(parsed.break_interval);
      } catch (e) {}
    }
    return 10; // Default (minutes)
  });

  // Filter out assignments that are completed
  const activeAssignments = assignments.filter(a => a.status !== 'COMPLETED');
  const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

  // Legacy individual study plan generator
  const handleGenerateIndividualPlan = async () => {
    if (!selectedAssignmentId || !selectedAssignment) return;
    setLegacyLoading(true);
    setLegacyError(null);

    try {
      const planText = await generateStudyPlan(selectedAssignment);
      
      // Inject directly into assignment study plan
      selectedAssignment.studyPlan = planText;
      
      // Add milestones automatically if found in lines
      const lines = planText.split("\n");
      const suggestedMilestones: string[] = [];
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const clean = trimmed.replace(/^-\s*\[\s*\]\s*/, "").replace(/^-\s*/, "").replace(/^\*\s*/, "").trim();
          if (clean && clean.length > 5 && clean.length < 100 && !clean.includes("**")) {
            suggestedMilestones.push(clean);
          }
        }
      });

      if (suggestedMilestones.length > 0) {
        const generated = suggestedMilestones.slice(0, 4).map((mTitle, idx) => ({
          id: `milestone-ai-${Date.now()}-${idx}`,
          title: mTitle,
          completed: false
        }));
        selectedAssignment.milestones = [...(selectedAssignment.milestones || []), ...generated];
      }

      // Sync and save
      const saved = localStorage.getItem("smartdeadline_assignments");
      if (saved) {
        const parsed: Assignment[] = JSON.parse(saved);
        const updated = parsed.map(a => a.id === selectedAssignmentId ? selectedAssignment : a);
        localStorage.setItem("smartdeadline_assignments", JSON.stringify(updated));
      }
      
      setActiveSubTab("legacy");
    } catch (err: any) {

      setLegacyError(err.message || "Failed to generate individual plan.");
    } finally {
      setLegacyLoading(false);
    }
  };

  // Premium PDF Exporter
  const handleExportPDF = () => {
    if (!masterStudyPlan) return;
    
    const plan = masterStudyPlan;
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    let y = 15;
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const printableWidth = pageWidth - (margin * 2);

    const addNewPageIfNeeded = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 15) {
        doc.addPage();
        y = 15;
        drawHeader();
      }
    };

    const drawHeader = () => {
      // Elegant accent header line
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(margin, y, printableWidth, 4, "F");
      y += 10;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("AI-POWERED STRATEGIC MASTER STUDY PLAN", margin, y);
      y += 5;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(margin, y, margin + printableWidth, y);
      y += 10;
    };

    // COVER / DOCUMENT TITLE
    doc.setFillColor(15, 23, 42); // slate-900 (dark banner)
    doc.rect(0, 0, pageWidth, 55, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("Strategic Master Study Plan", margin, 25);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(191, 219, 254); // blue-200
    doc.text(`Generated on ${new Date().toLocaleDateString()} • Optimized Academic Roadmap`, margin, 32);

    doc.setFillColor(79, 70, 229); // Indigo divider
    doc.rect(margin, 38, 40, 2, "F");

    y = 65;

    // 1. Overall Summary
    if (plan.overall_summary) {
      addNewPageIfNeeded(35);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("Executive Summary", margin, y);
      y += 6;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // slate-600
      const summaryLines = doc.splitTextToSize(plan.overall_summary, printableWidth);
      doc.text(summaryLines, margin, y);
      y += (summaryLines.length * 5) + 10;
    }

    // 1.5 Estimated Study Hours
    if (plan.estimated_study_hours) {
      addNewPageIfNeeded(35);
      doc.setFillColor(243, 244, 246); // Light gray background
      doc.rect(margin, y, printableWidth, 18, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(79, 70, 229); // Indigo-600
      doc.text(`TOTAL ESTIMATED STUDY HOURS: ${plan.estimated_study_hours.total_needed || 0} HOURS`, margin + 4, y + 6);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const distLines = doc.splitTextToSize(plan.estimated_study_hours.distribution_explanation || "", printableWidth - 8);
      doc.text(distLines, margin + 4, y + 12);
      y += 24;
    }

    // 2. Subject Allocation
    if (plan.subject_allocation && plan.subject_allocation.length > 0) {
      addNewPageIfNeeded(40);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Subject Time Allocation", margin, y);
      y += 8;

      // Table Header
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y, printableWidth, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text("Subject/Course", margin + 4, y + 5.5);
      doc.text("Allocated Hours", margin + 65, y + 5.5);
      doc.text("Allocation %", margin + 105, y + 5.5);
      doc.text("Strategy/Reason", margin + 135, y + 5.5);
      y += 8;

      plan.subject_allocation.forEach((sa: any) => {
        addNewPageIfNeeded(15);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        // Course title
        doc.text(sa.subject, margin + 4, y + 5);
        // Hours
        doc.text(`${sa.hours_allocated}h`, margin + 65, y + 5);
        // Percentage
        doc.text(`${sa.percentage}%`, margin + 105, y + 5);
        
        // Wrapping reason text
        const reasonLines = doc.splitTextToSize(sa.reason || "", printableWidth - 140);
        doc.text(reasonLines, margin + 135, y + 5);
        
        const rowHeight = Math.max(8, reasonLines.length * 4.5 + 2);
        y += rowHeight;
        
        // Thin line divider
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
      });
      y += 10;
    }

    // 3. Daily Plan
    if (plan.daily_plan && plan.daily_plan.length > 0) {
      addNewPageIfNeeded(30);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Daily Target Schedule", margin, y);
      y += 8;

      plan.daily_plan.forEach((dp: any) => {
        const taskStr = dp.tasks && dp.tasks.length > 0 ? dp.tasks.join(", ") : "General study";
        const focusText = `${dp.focus} (Associated Tasks: ${taskStr})`;
        const focusLines = doc.splitTextToSize(focusText, printableWidth - 45);
        const rowHeight = Math.max(12, (focusLines.length * 5) + 4);
        
        addNewPageIfNeeded(rowHeight);

        // Draw beautiful day label badge
        doc.setFillColor(238, 242, 255); // indigo-50
        doc.rect(margin, y, 35, 8, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(79, 70, 229); // indigo-600
        doc.text(dp.day, margin + 4, y + 5.5);

        // Hours tag
        doc.setFont("Helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(`${dp.hours}h`, margin + 28, y + 5.5);

        // Focus detail text
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(focusLines, margin + 40, y + 5.5);

        y += rowHeight;
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
        y += 2;
      });
      y += 8;
    }

    // 4. Weekly Milestones
    if (plan.weekly_plan && plan.weekly_plan.length > 0) {
      addNewPageIfNeeded(30);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Weekly Objectives & Load", margin, y);
      y += 8;

      plan.weekly_plan.forEach((wp: any) => {
        addNewPageIfNeeded(15);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(wp.week, margin, y + 4);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        
        const objLines = doc.splitTextToSize(wp.objective, printableWidth - 55);
        doc.text(objLines, margin + 25, y + 4);

        doc.setFont("Helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(`Load: ${wp.hours} hours`, margin + printableWidth - 30, y + 4);

        y += Math.max(10, (objLines.length * 4.5) + 3);
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
        y += 2;
      });
      y += 8;
    }

    // 5. Rest & Pomodoro Blocks
    if (plan.break_schedule || (plan.pomodoro_sessions && plan.pomodoro_sessions.length > 0)) {
      addNewPageIfNeeded(40);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Optimized Rest & Study Techniques", margin, y);
      y += 8;

      if (plan.break_schedule) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(13, 148, 136); // teal-600
        doc.text(`Burnout Prevention: ${plan.break_schedule.type || "Spaced Rest"}`, margin, y);
        y += 5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        const breakLines = doc.splitTextToSize(plan.break_schedule.description || "", printableWidth);
        doc.text(breakLines, margin, y);
        y += (breakLines.length * 4.5) + 8;
      }

      if (plan.pomodoro_sessions && plan.pomodoro_sessions.length > 0) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text("Recommended Pomodoro Session Formats", margin, y);
        y += 6;

        plan.pomodoro_sessions.forEach((ps: any) => {
          addNewPageIfNeeded(15);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(79, 70, 229);
          doc.text(ps.label, margin + 4, y + 4);

          doc.setFont("Helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`(${ps.duration})`, margin + 65, y + 4);

          doc.setFont("Helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(`Focus: ${ps.focus_area}`, margin + 110, y + 4);
          y += 8;
        });
        y += 6;
      }
    }

    // 5.3 Revision Plan (Knowledge Consolidation)
    if (plan.revision_plan && plan.revision_plan.length > 0) {
      addNewPageIfNeeded(40);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Active Knowledge Consolidation (Revision Plan)", margin, y);
      y += 8;

      plan.revision_plan.forEach((rp: any) => {
        addNewPageIfNeeded(20);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(rp.subject || "Subject", margin + 4, y + 4);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`Timeline: ${rp.suggested_date || "N/A"}`, margin + 65, y + 4);

        const techList = rp.techniques ? rp.techniques.join(", ") : "Active recall";
        doc.text(`Techniques: ${techList}`, margin + 120, y + 4);

        y += 6;
        const milestoneLines = doc.splitTextToSize(`Milestone: ${rp.milestone || ""}`, printableWidth - 8);
        doc.text(milestoneLines, margin + 4, y + 3);
        
        y += (milestoneLines.length * 4.5) + 6;
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
        y += 2;
      });
      y += 8;
    }

    // 5.7 Exam Preparation Strategy
    if (plan.exam_prep_strategy && plan.exam_prep_strategy.length > 0) {
      addNewPageIfNeeded(40);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("High-Yield Exam Preparation Strategies", margin, y);
      y += 8;

      plan.exam_prep_strategy.forEach((ep: any) => {
        addNewPageIfNeeded(20);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(ep.course || ep.subject || "Course", margin + 4, y + 4);

        // Urgency badge
        const urgency = (ep.urgency || "MEDIUM").toUpperCase();
        if (urgency === "HIGH") {
          doc.setTextColor(239, 68, 68);
        } else if (urgency === "MEDIUM") {
          doc.setTextColor(245, 158, 11);
        } else {
          doc.setTextColor(16, 185, 129);
        }
        doc.text(`[${urgency} PRIORITY]`, margin + 140, y + 4);

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        y += 6;
        const stratLines = doc.splitTextToSize(ep.strategy || "", printableWidth - 8);
        doc.text(stratLines, margin + 4, y + 3);

        y += (stratLines.length * 4.5) + 6;
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
        y += 2;
      });
      y += 8;
    }

    // 6. Estimated Completion Dates
    if (plan.estimated_completion_dates && plan.estimated_completion_dates.length > 0) {
      addNewPageIfNeeded(40);
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("AI-Predicted Completion Dates", margin, y);
      y += 8;

      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(margin, y, printableWidth, 8, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text("Assignment", margin + 4, y + 5.5);
      doc.text("Predicted Finish", margin + 85, y + 5.5);
      doc.text("Risk Level", margin + 125, y + 5.5);
      doc.text("Confidence", margin + 155, y + 5.5);
      y += 8;

      plan.estimated_completion_dates.forEach((ecd: any) => {
        addNewPageIfNeeded(12);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        
        const titleLines = doc.splitTextToSize(ecd.title, 75);
        doc.text(titleLines, margin + 4, y + 5);
        
        doc.text(ecd.estimated_completion_date || "N/A", margin + 85, y + 5);
        
        // Style the risk label colors
        const risk = (ecd.risk_level || "LOW").toUpperCase();
        if (risk === "HIGH" || risk === "OVERDUE") {
          doc.setTextColor(239, 68, 68); // red-500
        } else if (risk === "MEDIUM") {
          doc.setTextColor(245, 158, 11); // amber-500
        } else {
          doc.setTextColor(16, 185, 129); // emerald-500
        }
        doc.setFont("Helvetica", "bold");
        doc.text(risk, margin + 125, y + 5);
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(`${ecd.confidence_score}%`, margin + 155, y + 5);

        const rowHeight = Math.max(8, (titleLines.length * 4.5) + 2);
        y += rowHeight;

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y, margin + printableWidth, y);
      });
    }

    // Save PDF
    doc.save("Academic_Strategic_Study_Plan.pdf");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto" id="study-planner-container">
      {}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="font-display font-bold text-3xl text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-indigo-400" />
            <span>AI Master Study Planner</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Dynamic strategic planning. Recalculates automatically as your assignments and course requirements change.
          </p>
        </div>
        
        {}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
          <button
            onClick={() => setActiveSubTab("master")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === "master"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Master Plan
          </button>
          <button
            onClick={() => setActiveSubTab("legacy")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeSubTab === "legacy"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Task Roadmap Generator
          </button>
        </div>
      </div>

      {}
      {isRecalculatingPlan && (
        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse font-mono">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>Auto-optimizing Master Schedule... Adapting plans to recent task updates.</span>
        </div>
      )}

      {recalculationError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2.5 font-mono">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Recalculation error: {recalculationError}</span>
        </div>
      )}

      {}
      {activeSubTab === "master" && (
        <div className="space-y-6">
          {}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">AI Planner Personalization</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Custom Parameters</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Hourglass className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Weekly Available Hours</span>
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="1"
                    value={availableHours}
                    onChange={(e) => setAvailableHours(Number(e.target.value))}
                    className="flex-1 accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-white px-2 py-1 bg-slate-950 border border-slate-800 rounded-md min-w-[50px] text-center">
                    {availableHours}h
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Total study capacity allocated per week.</p>
              </div>

              {}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Preferred Session Duration</span>
                </label>
                <select
                  value={sessionLength}
                  onChange={(e) => setSessionLength(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="25">25 minutes (Pomodoro Classic)</option>
                  <option value="45">45 minutes (Optimal Focus)</option>
                  <option value="50">50 minutes (Standard block)</option>
                  <option value="60">60 minutes (Deep Work block)</option>
                  <option value="90">90 minutes (Extended focus)</option>
                  <option value="120">120 minutes (Extreme deep work)</option>
                </select>
                <p className="text-[10px] text-slate-400">Target duration of individual focus sprints.</p>
              </div>

              {}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Coffee className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Preferred Break Duration</span>
                </label>
                <select
                  value={breakInterval}
                  onChange={(e) => setBreakInterval(Number(e.target.value))}
                  className="w-full text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="5">5 minutes (Short rest)</option>
                  <option value="10">10 minutes (Optimal rest)</option>
                  <option value="15">15 minutes (Standard buffer)</option>
                  <option value="20">20 minutes (Relaxed rest)</option>
                  <option value="30">30 minutes (Extended rest)</option>
                </select>
                <p className="text-[10px] text-slate-400">Rest gap between consecutive focus sprints.</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => onForceRecalculate({ availableHours, sessionLength, breakInterval })}
                disabled={isRecalculatingPlan || activeAssignments.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition duration-150 cursor-pointer"
              >
                {isRecalculatingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Formulating Plan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Regenerate Study Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isRecalculatingPlan && !masterStudyPlan ? (
            <StudyPlanSkeleton />
          ) : masterStudyPlan ? (
            <>
              {}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950/20 via-slate-900 to-slate-900 border border-indigo-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="space-y-2 max-w-3xl">
                  <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wide">
                    Executive Strategy
                  </span>
                  <p className="text-slate-200 text-sm leading-relaxed font-display">
                    {masterStudyPlan.overall_summary || "Cohesive study plan formulation based on priority vectors and cognitive rest allocation."}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => onForceRecalculate({ availableHours, sessionLength, breakInterval })}
                    disabled={isRecalculatingPlan}
                    className="p-2.5 bg-slate-950 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
                    title="Force manual recalculation"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRecalculatingPlan ? 'animate-spin' : ''}`} />
                  </button>
                  
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export PDF</span>
                  </button>
                </div>
              </div>

              {}
              {masterStudyPlan.estimated_study_hours && (
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col md:flex-row items-center gap-4 shadow-md">
                  <div className="flex items-center gap-3.5 bg-indigo-500/10 border border-indigo-500/15 px-4 py-3 rounded-xl shrink-0 w-full md:w-auto justify-center md:justify-start">
                    <Hourglass className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Total Estimated Hours</p>
                      <p className="text-lg font-bold text-white font-mono">{masterStudyPlan.estimated_study_hours.total_needed || 0} hrs</p>
                    </div>
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed font-sans text-center md:text-left">
                    <span className="font-semibold text-indigo-300">AI Distribution Assessment:</span> {masterStudyPlan.estimated_study_hours.distribution_explanation}
                  </div>
                </div>
              )}

              {}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Subject Allocation</h3>
                  </div>
                  
                  {masterStudyPlan.subject_allocation && masterStudyPlan.subject_allocation.length > 0 ? (
                    <div className="space-y-3.5">
                      {masterStudyPlan.subject_allocation.map((sa: any, idx: number) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">{sa.subject}</span>
                            <span className="font-mono text-indigo-400 font-bold">{sa.hours_allocated} hrs ({sa.percentage}%)</span>
                          </div>
                          
                          {}
                          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full" 
                              style={{ width: `${sa.percentage}%` }}
                            />
                          </div>

                          <p className="text-[10px] text-slate-400 italic font-sans leading-normal">
                            {sa.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No allocation stats computed.
                    </div>
                  )}
                </div>

                {}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">AI Completion Predictions</h3>
                  </div>

                  {masterStudyPlan.estimated_completion_dates && masterStudyPlan.estimated_completion_dates.length > 0 ? (
                    <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                      {masterStudyPlan.estimated_completion_dates.map((ecd: any, idx: number) => {
                        const risk = (ecd.risk_level || "LOW").toUpperCase();
                        let riskClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
                        if (risk === "HIGH" || risk === "OVERDUE") {
                          riskClass = "bg-rose-500/10 text-rose-400 border-rose-500/15";
                        } else if (risk === "MEDIUM") {
                          riskClass = "bg-amber-500/10 text-amber-400 border-amber-500/15";
                        }
                        
                        return (
                          <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-100 truncate">{ecd.title}</h4>
                              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                                <span>Est. Complete:</span>
                                <strong className="text-indigo-400">{ecd.estimated_completion_date}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {}
                              <div className="text-right">
                                <p className="text-[9px] text-slate-500 font-mono">CONFIDENCE</p>
                                <p className="text-xs font-bold font-mono text-slate-200">{ecd.confidence_score}%</p>
                              </div>

                              {}
                              <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold rounded-md ${riskClass}`}>
                                {risk} RISK
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No completion forecasts computed.
                    </div>
                  )}
                </div>
              </div>

              {}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Daily focus blocks</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Upcoming Cycle</span>
                  </div>

                  {masterStudyPlan.daily_plan && masterStudyPlan.daily_plan.length > 0 ? (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {masterStudyPlan.daily_plan.map((dp: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex gap-4">
                          <div className="flex flex-col items-center justify-center bg-indigo-500/10 border border-indigo-500/5 rounded-lg px-2.5 py-1.5 shrink-0 h-fit min-w-[75px]">
                            <span className="text-xs font-extrabold text-indigo-400 tracking-wide font-display">{dp.day}</span>
                            <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">{dp.hours} hrs</span>
                          </div>

                          <div className="space-y-1.5 min-w-0">
                            <p className="text-xs font-semibold text-slate-100 leading-normal">{dp.focus}</p>
                            
                            {dp.tasks && dp.tasks.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                {dp.tasks.map((t: string, tIdx: number) => (
                                  <span key={tIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-300 truncate max-w-[150px]" title={t}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      📅 No daily schedule generated.
                    </div>
                  )}
                </div>

                {}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-6">
                  {}
                  {masterStudyPlan.break_schedule && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-4 h-4 text-teal-400" />
                        <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Burnout Guard</h3>
                      </div>
                      
                      <div className="p-4 rounded-xl bg-teal-950/10 border border-teal-500/10 space-y-2">
                        <span className="text-[10px] font-mono font-bold text-teal-400 uppercase tracking-wider">
                          Methodology: {masterStudyPlan.break_schedule.type || "Default Rest"}
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {masterStudyPlan.break_schedule.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {}
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Pomodoro Recommendations</h3>
                    </div>

                    {masterStudyPlan.pomodoro_sessions && masterStudyPlan.pomodoro_sessions.length > 0 ? (
                      <div className="space-y-2.5">
                        {masterStudyPlan.pomodoro_sessions.map((ps: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-900 flex items-start gap-2.5">
                            <Clock className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-100 font-display">{ps.label}</h4>
                              <p className="text-[10px] font-mono font-semibold text-orange-400">{ps.duration}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">Focus: {ps.focus_area}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No custom pomodoro patterns designed.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {}
              {masterStudyPlan.weekly_plan && masterStudyPlan.weekly_plan.length > 0 && (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Weekly Mileposts</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {masterStudyPlan.weekly_plan.map((wp: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2.5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-extrabold text-white font-display">{wp.week}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-[9px] font-mono text-indigo-400 font-bold">
                              {wp.hours} HOURS
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-normal font-sans">
                            {wp.objective}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {}
                <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">Active Revision Plan</h3>
                  </div>

                  {masterStudyPlan.revision_plan && masterStudyPlan.revision_plan.length > 0 ? (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {masterStudyPlan.revision_plan.map((rp: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-400 font-display">{rp.subject}</span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/15 text-[9px] font-mono font-semibold text-purple-300 uppercase tracking-wider">
                              {rp.suggested_date}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-200 font-medium leading-normal">{rp.milestone}</p>
                          
                          {rp.techniques && rp.techniques.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-slate-900">
                              {rp.techniques.map((t: string, tIdx: number) => (
                                <span key={tIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-400">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      📚 No active revision plan formulated.
                    </div>
                  )}
                </div>

                {}
                <div className="lg:col-span-6 p-6 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">High-Yield Exam Prep</h3>
                  </div>

                  {masterStudyPlan.exam_prep_strategy && masterStudyPlan.exam_prep_strategy.length > 0 ? (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                      {masterStudyPlan.exam_prep_strategy.map((ep: any, idx: number) => {
                        const urgency = (ep.urgency || "MEDIUM").toUpperCase();
                        let urgencyClass = "text-amber-400 bg-amber-500/10 border-amber-500/15";
                        if (urgency === "HIGH") {
                          urgencyClass = "text-rose-400 bg-rose-500/10 border-rose-500/15";
                        } else if (urgency === "LOW") {
                          urgencyClass = "text-emerald-400 bg-emerald-500/10 border-emerald-500/15";
                        }

                        return (
                          <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-900 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-400 font-display">{ep.course || ep.subject}</span>
                              <span className={`px-1.5 py-0.5 border text-[9px] font-mono font-bold rounded-md ${urgencyClass}`}>
                                {urgency} PRIORITY
                              </span>
                            </div>
                            
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">{ep.strategy}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      🎓 No custom exam preparation tactics formulated.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-4 py-20">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto" />
              <div className="space-y-2 max-w-sm mx-auto">
                <h4 className="text-base font-semibold text-slate-200 font-display">No Study Schedule Computed</h4>
                <p className="text-xs text-slate-400">
                  Please add active assignments or trigger recalculation to format your comprehensive academic schedule.
                </p>
              </div>

              <button
                onClick={() => onForceRecalculate({ availableHours, sessionLength, breakInterval })}
                disabled={isRecalculatingPlan || activeAssignments.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition mx-auto cursor-pointer shadow-lg"
              >
                {isRecalculatingPlan ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Workload...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Formulate Study Plan</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {}
      {activeSubTab === "legacy" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
            <h3 className="text-sm font-semibold text-white font-display">Formulate individual task roadmap</h3>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedAssignmentId}
                onChange={(e) => {
                  setSelectedAssignmentId(e.target.value);
                  setLegacyError(null);
                }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Choose Assignment --</option>
                {activeAssignments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.course} - {a.title} ({a.priority} Priority)
                  </option>
                ))}
              </select>

              <button
                onClick={handleGenerateIndividualPlan}
                disabled={legacyLoading || !selectedAssignmentId}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {legacyLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Formulating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Task Plan</span>
                  </>
                )}
              </button>
            </div>

            {legacyError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{legacyError}</span>
              </div>
            )}
          </div>

          {}
          {selectedAssignment ? (
            selectedAssignment.studyPlan ? (
              
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-6 shadow-xl">
                <div className="flex items-start justify-between pb-5 border-b border-slate-800">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-slate-500 uppercase">Strategic Study Roadmap</span>
                    <h3 className="text-xl font-bold text-white font-display">{selectedAssignment.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-2">
                      <span>Course: <strong className="text-indigo-400">{selectedAssignment.course}</strong></span>
                      <span>•</span>
                      <span>Est: <strong className="text-indigo-400">{selectedAssignment.estimatedHours} hours</strong></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-3 py-1 rounded-full text-xs font-semibold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>TASK OPTIMIZED</span>
                  </div>
                </div>

                {}
                <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                  {selectedAssignment.studyPlan.split("\n").map((line, idx) => {
                    const trimmed = line.trim();
                    
                    // Headers
                    if (trimmed.startsWith("###")) {
                      return (
                        <h5 key={idx} className="text-sm font-semibold text-white uppercase font-mono tracking-wider pt-3 flex items-center gap-1.5">
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-400" />
                          {trimmed.replace("###", "")}
                        </h5>
                      );
                    }
                    if (trimmed.startsWith("##") || trimmed.startsWith("#")) {
                      return (
                        <h4 key={idx} className="text-base font-bold text-white font-display pt-4 border-b border-slate-800/40 pb-1.5">
                          {trimmed.replace(/^#+\s*/, "")}
                        </h4>
                      );
                    }

                    // Bullet lists
                    if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <div key={idx} className="flex items-start gap-2 ml-4 pl-1">
                          <span className="text-indigo-400 mt-1 select-none">•</span>
                          <span>{trimmed.replace(/^-\s*\[\s*\]\s*/, "").replace(/^-\s*/, "").replace(/^\*\s*/, "")}</span>
                        </div>
                      );
                    }

                    // Bold key-values / standard lines
                    if (trimmed === "") return <div key={idx} className="h-2" />;

                    return <p key={idx}>{trimmed}</p>;
                  })}
                </div>
              </div>
            ) : (
              
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 border-dashed text-center space-y-4 py-16">
                <Target className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-slate-300 font-display">No Individual Plan Formulated Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                    Formulate a high-efficiency academic plan for "{selectedAssignment.title}" by clicking the button above.
                  </p>
                </div>
              </div>
            )
          ) : (
            
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 py-16">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-300 font-display">No Assignment Selected</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto font-sans">
                  Please choose an assignment from the dropdown above to create or review its AI checklist schedule.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
