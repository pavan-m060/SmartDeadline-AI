import React, { useState, useEffect } from "react";
import { Assignment, StudySession, WeeklyReview } from "../types";
import { getWeeklyReviews, saveWeeklyReview, generateWeeklyReview } from "../services/api";
import { Calendar, Sparkles, CheckCircle, Clock, TrendingUp, Download, Award, AlertTriangle, ChevronRight, Loader2, History, CheckSquare } from "lucide-react";
import { jsPDF } from "jspdf";

interface WeeklyReviewPageProps {
  assignments: Assignment[];
  studySessions: StudySession[];
}

export default function WeeklyReviewPage({
  assignments = [],
  studySessions = []
}: WeeklyReviewPageProps) {
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load reviews on mount
  useEffect(() => {
    loadReviews();
  }, [assignments, studySessions]);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const res = await getWeeklyReviews();
      setReviews(res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      if (res.length > 0 && !selectedReview) {
        setSelectedReview(res[0]);
      }
    } catch (e) {

      setError("Failed to fetch past weekly reviews.");
    } finally {
      setIsLoading(false);
    }
  };

  // Compute stats for the past 7 days for the "current week preview"
  const getPastSevenDaysStats = () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter assignments due in the past 7 days
    const weeklyAssignments = assignments.filter(a => {
      const due = new Date(a.dueDate);
      return due >= sevenDaysAgo && due <= now;
    });

    const completedThisWeek = weeklyAssignments.filter(a => a.status === "COMPLETED");
    const missedThisWeek = weeklyAssignments.filter(a => {
      const due = new Date(a.dueDate);
      return a.status !== "COMPLETED" && due < now;
    });

    // Filter study sessions from the past 7 days
    const weeklySessions = studySessions.filter(s => {
      const sessionDate = new Date(s.date);
      return sessionDate >= sevenDaysAgo && sessionDate <= now;
    });

    const totalStudyHours = weeklySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 60;
    const pendingCount = assignments.filter(a => a.status !== "COMPLETED").length;

    return {
      completedCount: completedThisWeek.length,
      pendingCount,
      missedCount: missedThisWeek.length,
      totalStudyHours: parseFloat(totalStudyHours.toFixed(1)),
      weekStartDate: sevenDaysAgo.toISOString().split("T")[0],
      weekEndDate: now.toISOString().split("T")[0],
      weeklyAssignments
    };
  };

  const handleGenerateReview = async () => {
    setIsGenerating(true);
    setError(null);
    const stats = getPastSevenDaysStats();

    try {
      const reviewData = await generateWeeklyReview({
        assignments,
        studySessions,
        weekStartDate: stats.weekStartDate,
        weekEndDate: stats.weekEndDate,
        completedCount: stats.completedCount,
        pendingCount: stats.pendingCount,
        missedCount: stats.missedCount,
        totalStudyHours: stats.totalStudyHours
      });

      const saved = await saveWeeklyReview({
        ...reviewData,
        createdAt: new Date().toISOString()
      });

      setReviews(prev => [saved, ...prev]);
      setSelectedReview(saved);
    } catch (e: any) {

      setError("An error occurred during AI analysis compilation. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper to format ISO date string nicely
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const s = new Date(startStr);
      const e = new Date(endStr);
      const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
      return `${s.toLocaleDateString(undefined, opt)} - ${e.toLocaleDateString(undefined, opt)}`;
    } catch {
      return `${startStr} to ${endStr}`;
    }
  };

  // Color mappings for productivity scores
  const getScoreColor = (score: number) => {
    if (score >= 85) return { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", ring: "stroke-emerald-400" };
    if (score >= 70) return { text: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", ring: "stroke-indigo-400" };
    if (score >= 50) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", ring: "stroke-amber-400" };
    return { text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", ring: "stroke-rose-400" };
  };

  // jsPDF weekly review print handler
  const handleExportPDF = (review: WeeklyReview) => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - (margin * 2);

    let y = 20;

    const checkPageOffset = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
        drawHeader();
      }
    };

    const drawHeader = () => {
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, pageWidth - (margin * 2) + 10, pageHeight - (margin * 2) + 10);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(99, 102, 241);
      doc.text("SMARTDEADLINE AI ACADEMIC SYSTEM", margin, margin - 1);
      
      doc.setFont("helvetica", "normal");
      doc.text("STUDENT WEEKLY INTELLIGENCE RECAP", pageWidth - margin - 60, margin - 1);
    };

    drawHeader();

    // Cover Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y, maxLineWidth, 25, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("ACADEMIC PERFORMANCE WEEKLY REVIEW", margin + 5, y + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(165, 180, 252);
    doc.text(`Timeline: ${formatDateRange(review.weekStartDate, review.weekEndDate)}`, margin + 5, y + 18);

    y += 35;

    // Stats Row
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("PERFORMANCE SUMMARY INDEX", margin, y);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    const blockW = maxLineWidth / 5 - 2;
    const stats = [
      { label: "Completed", val: review.completedWorkCount.toString() },
      { label: "Pending", val: review.pendingWorkCount.toString() },
      { label: "Missed Deadlines", val: review.missedDeadlinesCount.toString() },
      { label: "Focus Hours", val: `${review.studyHours} hrs` },
      { label: "Productivity Score", val: `${review.productivityScore}/100` }
    ];

    stats.forEach((s, idx) => {
      const bx = margin + (idx * (blockW + 2));
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.rect(bx, y, blockW, 20, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(s.val, bx + 3, y + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      const splitLabel = doc.splitTextToSize(s.label, blockW - 4);
      doc.text(splitLabel, bx + 3, y + 14);
    });

    y += 30;

    // AI Motivational Assessment
    checkPageOffset(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("AI CLINICAL PERFORMANCE ASSESSMENT", margin, y);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const splitSummary = doc.splitTextToSize(review.motivationSummary, maxLineWidth - 10);
    doc.text(splitSummary, margin + 5, y + 4);

    y += 10 + (splitSummary.length * 4.5);

    // Improvement Suggestions
    checkPageOffset(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("CORE TACTICAL SUGGESTIONS", margin, y);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    review.improvementSuggestions.forEach((s) => {
      checkPageOffset(10);
      const splitS = doc.splitTextToSize(`- ${s}`, maxLineWidth - 10);
      doc.text(splitS, margin + 5, y + 4);
      y += (splitS.length * 4.5);
    });

    y += 8;

    // Next Week Plan
    checkPageOffset(45);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("NEXT WEEK STRATEGIC ACTION PATH", margin, y);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    review.nextWeekStudyPlan.forEach((plan) => {
      checkPageOffset(10);
      const splitPlan = doc.splitTextToSize(`[ ] ${plan}`, maxLineWidth - 10);
      doc.text(splitPlan, margin + 5, y + 4);
      y += (splitPlan.length * 4.5);
    });

    doc.save(`Weekly_Review_${review.weekStartDate}.pdf`);
  };

  const previewStats = getPastSevenDaysStats();

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">AI Weekly Workspace Review</h2>
            </div>
            <p className="text-xs text-slate-400">
              Compile your weekly performance score, complete study hours, missed goals, and receive customized study schedules modeled by SmartDeadline AI.
            </p>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerateReview}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Formulating AI Review...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Compile Current Week</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 shadow">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
              <History className="w-4.5 h-4.5 text-slate-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Review Logs ({reviews.length})</span>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                <p className="text-[10px] text-slate-500 font-mono">Loading review timeline...</p>
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-2 max-h-[450px] overflow-auto pr-1">
                {reviews.map((r) => {
                  const colors = getScoreColor(r.productivityScore);
                  const isSelected = selectedReview?.id === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReview(r)}
                      className={`w-full p-3 rounded-xl border text-left transition duration-200 cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? "border-indigo-500 bg-indigo-950/20"
                          : "border-slate-850 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-950"
                      }`}
                    >
                      <div className="truncate max-w-[70%]">
                        <p className="text-xs font-bold text-slate-200 truncate">
                          Week Review
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {formatDateRange(r.weekStartDate, r.weekEndDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
                          {r.productivityScore}%
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 space-y-3">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-slate-300">No Weekly Reports Compiled</p>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto mt-1">
                    Compile your performance metrics for the current week to save details to your historical profile timeline.
                  </p>
                </div>
              </div>
            )}
          </div>

          {}
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 shadow">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 mb-4">
              <Calendar className="w-4.5 h-4.5 text-indigo-400" />
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">Unsaved Week Pacing</span>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Week Start:</span>
                <span className="font-mono text-slate-300">{previewStats.weekStartDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Week End:</span>
                <span className="font-mono text-slate-300">{previewStats.weekEndDate}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Completed Work:</span>
                <span className="font-mono font-semibold text-emerald-400">{previewStats.completedCount} assignments</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Study Pacing:</span>
                <span className="font-mono font-semibold text-indigo-400">{previewStats.totalStudyHours} hrs</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Missed Deadlines:</span>
                <span className={`font-mono font-semibold ${previewStats.missedCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  {previewStats.missedCount} tasks
                </span>
              </div>
              
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={handleGenerateReview}
                  className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Report Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {}
        <div className="lg:col-span-8">
          {selectedReview ? (
            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 space-y-6 shadow-md relative">
              
              {}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                    AI Analysis Complete
                  </span>
                  <h3 className="text-base font-bold text-white mt-2">
                    Academic Summary Intel Card
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {formatDateRange(selectedReview.weekStartDate, selectedReview.weekEndDate)}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleExportPDF(selectedReview)}
                  className="px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Export Report PDF</span>
                </button>
              </div>

              {}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Completed</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                    <span className="text-base font-mono font-bold text-white">{selectedReview.completedWorkCount}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Remaining</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-base font-mono font-bold text-white">{selectedReview.pendingWorkCount}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Missed Deadlines</span>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4.5 h-4.5 ${selectedReview.missedDeadlinesCount > 0 ? "text-rose-400" : "text-slate-500"}`} />
                    <span className="text-base font-mono font-bold text-white">{selectedReview.missedDeadlinesCount}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-500 font-mono block uppercase">Study Hours</span>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-base font-mono font-bold text-white">{selectedReview.studyHours} hrs</span>
                  </div>
                </div>
              </div>

              {}
              <div className="p-5 bg-slate-950/50 border border-slate-850 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-slate-850"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className={getScoreColor(selectedReview.productivityScore).ring}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={(2 * Math.PI * 48) * (1 - selectedReview.productivityScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-mono font-black text-white">{selectedReview.productivityScore}%</span>
                    <span className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-0.5">Rating</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Award className={`w-4.5 h-4.5 ${getScoreColor(selectedReview.productivityScore).text}`} />
                    <span className="text-xs font-bold text-slate-200">Advisory Performance Assessment</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed italic">
                    "{selectedReview.motivationSummary}"
                  </p>
                </div>
              </div>

              {}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                  Performance & Time Management Suggestions
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {selectedReview.improvementSuggestions.map((s, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-slate-950/30 border border-slate-850 rounded-xl flex gap-2.5 items-start text-xs leading-relaxed text-slate-300"
                    >
                      <span className="text-indigo-400 font-bold font-mono shrink-0">{idx + 1}.</span>
                      <p>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                  Next Week's Recommended Strategic Action Path
                </h4>
                <div className="space-y-2.5">
                  {selectedReview.nextWeekStudyPlan.map((plan, idx) => (
                    <div 
                      key={idx} 
                      className="p-3.5 bg-indigo-950/10 border border-indigo-900/20 rounded-xl flex items-center gap-3 text-xs text-slate-200 hover:border-indigo-800/40 transition duration-150"
                    >
                      <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                      <p className="font-medium">{plan}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            
            <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-12 text-center space-y-4 flex flex-col items-center justify-center min-h-[450px]">
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-3xl">
                <Sparkles className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white">No Review Document Selected</h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Configure and generate your first Weekly review to load custom performance metrics, strengths assessments, and strategic action calendars.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateReview}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Formulate First Report</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
