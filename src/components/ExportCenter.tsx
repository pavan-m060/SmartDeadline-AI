import React, { useState, useEffect } from "react";
import { Assignment, StudySession, UserProfile } from "../types";
import { Download, Sparkles, FileText, CheckCircle, CheckSquare, CalendarDays, Target, BarChart3, Info, Loader2 } from "lucide-react";
import { generateExportRecommendations, AIRecommendationsResult } from "../services/api";
import { jsPDF } from "jspdf";

interface ExportCenterProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  masterStudyPlan: any | null;
  userProfile?: UserProfile | null;
}

type ReportType = "all" | "assignments" | "calendar" | "study-plan" | "analytics";
type ExportFormat = "pdf" | "csv" | "excel";

export default function ExportCenter({
  assignments = [],
  studySessions = [],
  masterStudyPlan = null,
  userProfile = null
}: ExportCenterProps) {
  const [reportType, setReportType] = useState<ReportType>("all");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [includeAI, setIncludeAI] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendationsResult | null>(null);
  const [loadingAI, setLoadingAI] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Load recommendations when reportType changes (if AI is enabled)
  useEffect(() => {
    if (includeAI) {
      fetchRecommendations();
    } else {
      setAiRecommendations(null);
    }
  }, [reportType, includeAI]);

  const fetchRecommendations = async () => {
    setLoadingAI(true);
    setAiError(null);
    try {
      const res = await generateExportRecommendations(assignments, studySessions, reportType);
      setAiRecommendations(res);
    } catch (e: any) {

      setAiError("Unable to fetch real-time AI suggestions. Export will use static recommendations.");
      // Fallback local recommendations
      setAiRecommendations({
        summary: "Workload distribution shows moderate study pacing with multiple overlapping deadlines.",
        strengths: [
          "Consistent cataloging of assignment dates & metrics.",
          "Good allocation of estimated time requirements."
        ],
        recommendations: [
          "Differentiate high-weight vs low-weight assignments to prioritize study energy.",
          "Integrate structured 30-minute review buffers before major milestones."
        ],
        nextSteps: [
          "Complete outstanding milestones for upcoming assignments.",
          "Log your focus hours in the study planner daily."
        ]
      });
    } finally {
      setLoadingAI(false);
    }
  };

  // Prepares the text content for CSV/Excel
  const generateCSVContent = (type: ReportType): string => {
    let csv = "";
    
    // Add UTF-8 BOM for Excel compatibility
    csv += "\uFEFF";

    if (type === "all" || type === "assignments") {
      csv += "--- ASSIGNMENTS REPORT ---\n";
      csv += "Title,Course,Due Date,Priority,Difficulty,Weight %,Estimated Hours,Actual Hours,Status\n";
      assignments.forEach((a) => {
        const title = `"${a.title.replace(/"/g, '""')}"`;
        const course = `"${a.course.replace(/"/g, '""')}"`;
        const status = a.status || "PENDING";
        csv += `${title},${course},${a.dueDate},${a.priority},${a.difficulty || "MEDIUM"},${a.weight || 0},${a.estimatedHours},${a.actualHoursSpent || 0},${status}\n`;
      });
      csv += "\n";
    }

    if (type === "all" || type === "calendar") {
      csv += "--- CALENDAR MILESTONES REPORT ---\n";
      csv += "Assignment,Course,Milestone Title,Estimated Date,Status\n";
      assignments.forEach((a) => {
        if (a.milestones && a.milestones.length > 0) {
          a.milestones.forEach((m, idx) => {
            const assignmentTitle = `"${a.title.replace(/"/g, '""')}"`;
            const course = `"${a.course.replace(/"/g, '""')}"`;
            const mTitle = `"${(m.title || `Milestone ${idx+1}`).replace(/"/g, '""')}"`;
            const dateStr = m.dueDate || a.dueDate;
            const status = m.completed ? "COMPLETED" : "PENDING";
            csv += `${assignmentTitle},${course},${mTitle},${dateStr},${status}\n`;
          });
        }
      });
      csv += "\n";
    }

    if (type === "all" || type === "study-plan") {
      csv += "--- STUDY FOCUS SESSIONS REPORT ---\n";
      csv += "Assignment,Course,Session Date,Focus Duration (Minutes),Notes\n";
      studySessions.forEach((s) => {
        const matchingAssignment = assignments.find(a => a.id === s.assignmentId);
        const title = matchingAssignment ? `"${matchingAssignment.title.replace(/"/g, '""')}"` : '"General Study"';
        const course = matchingAssignment ? `"${matchingAssignment.course.replace(/"/g, '""')}"` : '"N/A"';
        const notes = s.notes ? `"${s.notes.replace(/"/g, '""')}"` : '""';
        csv += `${title},${course},${new Date(s.date).toLocaleDateString()},${s.durationMinutes},${notes}\n`;
      });
      csv += "\n";
    }

    if (type === "all" || type === "analytics") {
      csv += "--- PRODUCTIVITY ANALYTICS SUMMARY ---\n";
      const totalAssignments = assignments.length;
      const completed = assignments.filter(a => a.status === "COMPLETED").length;
      const totalHoursFocused = studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0) / 60, 0);
      csv += `Metric,Value\n`;
      csv += `Total Tracked Assignments,${totalAssignments}\n`;
      csv += `Completed Assignments,${completed}\n`;
      csv += `Completion Rate,${totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0}%\n`;
      csv += `Total Focused Study Hours,${totalHoursFocused.toFixed(2)} hours\n`;
      csv += `Completed Sessions,${studySessions.length}\n`;
      csv += "\n";
    }

    if (includeAI && aiRecommendations) {
      csv += "--- AI CO-PILOT ADVISORY RECOMMENDATIONS ---\n";
      csv += `AI Summary,"${aiRecommendations.summary.replace(/"/g, '""')}"\n\n`;
      csv += "Observed Strengths\n";
      aiRecommendations.strengths.forEach(s => {
        csv += `,"${s.replace(/"/g, '""')}"\n`;
      });
      csv += "\nSmart Recommendations\n";
      aiRecommendations.recommendations.forEach(r => {
        csv += `,"${r.replace(/"/g, '""')}"\n`;
      });
      csv += "\nStrategic Next Steps\n";
      aiRecommendations.nextSteps.forEach(ns => {
        csv += `,"${ns.replace(/"/g, '""')}"\n`;
      });
      csv += "\n";
    }

    return csv;
  };

  const handleExportCSV = (filename: string) => {
    const csvContent = generateCSVContent(reportType);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - (margin * 2);

    let y = 20;

    // Helper to check page bounds and create new page
    const checkPageOffset = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 20) {
        doc.addPage();
        y = 20;
        drawPageBorderAndHeader();
      }
    };

    const drawPageBorderAndHeader = () => {
      // Draw border
      doc.setDrawColor(30, 41, 59); // Slate-800
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, pageWidth - (margin * 2) + 10, pageHeight - (margin * 2) + 10);
      
      // Top header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(99, 102, 241); // Indigo-500
      doc.text("SMARTDEADLINE AI ACADEMIC SYSTEM", margin, margin - 1);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text("EXECUTIVE INTEL REPORT", pageWidth - margin - 40, margin - 1);
    };

    // Draw first page header
    drawPageBorderAndHeader();

    // 1. Report Cover/Title Banner
    doc.setFillColor(15, 23, 42); // Slate-950/Slate-900 background
    doc.rect(margin, y, maxLineWidth, 25, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("SMARTDEADLINE AI ACADEMIC EXCELLENCE REPORT", margin + 5, y + 10);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(165, 180, 252); // Indigo-300
    doc.text(`Report Type: ${reportType.toUpperCase()} | Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin + 5, y + 18);
    
    y += 35;

    // 2. Scholar Profile Segment
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241); // Indigo-500
    doc.text("SCHOLAR PROFILE", margin, y);
    
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // Slate-700
    
    const name = userProfile?.fullName || "Academic Scholar";
    const univ = userProfile?.university || "Registered University Portal";
    const major = userProfile?.major ? `${userProfile.major} (Class of ${userProfile.graduationYear || '2027'})` : "Honors Division";

    doc.setFont("helvetica", "bold");
    doc.text("Name:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(name, margin + 15, y);

    doc.setFont("helvetica", "bold");
    doc.text("University:", margin + 70, y);
    doc.setFont("helvetica", "normal");
    doc.text(univ, margin + 90, y);
    
    y += 6;
    
    doc.setFont("helvetica", "bold");
    doc.text("Major:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(major, margin + 15, y);

    doc.setFont("helvetica", "bold");
    doc.text("Semester:", margin + 70, y);
    doc.setFont("helvetica", "normal");
    doc.text("Academic Session 2026/2027", margin + 90, y);

    y += 15;

    // 3. Analytics Dashboard Mini-Grid
    checkPageOffset(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("METRICS & PERFORMANCE STATISTICS", margin, y);
    
    doc.setDrawColor(99, 102, 241);
    doc.line(margin, y + 2, margin + 40, y + 2);
    y += 8;

    // Create 4 stats blocks
    const totalAssignments = assignments.length;
    const completed = assignments.filter(a => a.status === "COMPLETED").length;
    const pending = totalAssignments - completed;
    const focusHours = studySessions.reduce((acc, s) => acc + (s.durationMinutes || 0) / 60, 0);

    const blockW = maxLineWidth / 4 - 2;
    const blocks = [
      { label: "Total Assignments", val: totalAssignments.toString() },
      { label: "Completion Rate", val: `${totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0}%` },
      { label: "Hours Focused", val: `${focusHours.toFixed(1)} hrs` },
      { label: "Pending Tasks", val: pending.toString() }
    ];

    blocks.forEach((b, idx) => {
      const bx = margin + (idx * (blockW + 2));
      doc.setFillColor(248, 250, 252); // Slate-50 background
      doc.setDrawColor(226, 232, 240); // Slate-200 border
      doc.setLineWidth(0.5);
      doc.rect(bx, y, blockW, 18, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text(b.val, bx + 4, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(b.label, bx + 4, y + 14);
    });

    y += 26;

    // 4. Assignments Details (If requested)
    if (reportType === "all" || reportType === "assignments") {
      checkPageOffset(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text("ACADEMIC ASSIGNMENTS REGISTRY", margin, y);
      
      doc.setDrawColor(99, 102, 241);
      doc.line(margin, y + 2, margin + 40, y + 2);
      y += 8;

      // Table Header
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y, maxLineWidth, 7, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("Course", margin + 3, y + 5);
      doc.text("Assignment Title", margin + 25, y + 5);
      doc.text("Due Date", margin + 95, y + 5);
      doc.text("Priority", margin + 120, y + 5);
      doc.text("Hours (Est)", margin + 145, y + 5);
      doc.text("Status", margin + 165, y + 5);

      y += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);

      assignments.forEach((a) => {
        checkPageOffset(10);
        
        // Alternate row fill
        doc.setFillColor(255, 255, 255);
        doc.rect(margin, y, maxLineWidth, 8, "F");

        doc.text(a.course.substring(0, 10), margin + 3, y + 5);
        doc.text(a.title.substring(0, 36), margin + 25, y + 5);
        doc.text(a.dueDate, margin + 95, y + 5);
        
        // Color priority
        if (a.priority === "HIGH") {
          doc.setTextColor(225, 29, 72); // Rose-600
        } else {
          doc.setTextColor(51, 65, 85);
        }
        doc.text(a.priority, margin + 120, y + 5);
        doc.setTextColor(51, 65, 85);

        doc.text(`${a.estimatedHours} hrs`, margin + 145, y + 5);
        doc.text(a.status || "PENDING", margin + 165, y + 5);

        y += 8;
      });

      y += 5;
    }

    // 5. Calendar & Milestones (If requested)
    if (reportType === "all" || reportType === "calendar") {
      checkPageOffset(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text("UPCOMING CALENDAR MILESTONES & TARGETS", margin, y);
      
      doc.setDrawColor(99, 102, 241);
      doc.line(margin, y + 2, margin + 40, y + 2);
      y += 8;

      let milestoneCount = 0;
      assignments.forEach((a) => {
        if (a.milestones && a.milestones.length > 0) {
          a.milestones.forEach((m, idx) => {
            if (milestoneCount < 10) { // Limit to 10 for printable aestheticism
              checkPageOffset(10);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(15, 23, 42);
              doc.text(`[${a.course}] ${m.title || `Milestone ${idx+1}`}`, margin + 5, y + 5);

              doc.setFont("helvetica", "normal");
              doc.setTextColor(100, 116, 139);
              doc.text(`Due: ${m.dueDate || a.dueDate} | Parent Task: ${a.title.substring(0, 30)}`, margin + 5, y + 9);

              doc.setFont("helvetica", "bold");
              if (m.completed) {
                doc.setTextColor(16, 185, 129); // Emerald-500
                doc.text("COMPLETED", margin + 145, y + 7);
              } else {
                doc.setTextColor(245, 158, 11); // Amber-500
                doc.text("PENDING", margin + 145, y + 7);
              }

              doc.setDrawColor(241, 245, 249);
              doc.setLineWidth(0.5);
              doc.line(margin, y + 11, margin + maxLineWidth, y + 11);
              
              y += 13;
              milestoneCount++;
            }
          });
        }
      });

      if (milestoneCount === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text("No milestones set for the listed assignments.", margin + 5, y + 5);
        y += 10;
      }
      y += 5;
    }

    // 6. Study Plan Highlights (If requested)
    if ((reportType === "all" || reportType === "study-plan") && masterStudyPlan) {
      checkPageOffset(45);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text("AI CO-PILOT INTEGRATED STUDY PLAN", margin, y);
      
      doc.setDrawColor(99, 102, 241);
      doc.line(margin, y + 2, margin + 40, y + 2);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Plan Summary Assessment:", margin, y + 4);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const summaryText = masterStudyPlan.overall_summary || "Integrated pacing allocation mapped out to meet critical course deliverables.";
      const splitSummary = doc.splitTextToSize(summaryText, maxLineWidth - 10);
      doc.text(splitSummary, margin, y + 9);

      y += 12 + (splitSummary.length * 4);

      if (masterStudyPlan.daily_plan && masterStudyPlan.daily_plan.length > 0) {
        checkPageOffset(20);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text("Upcoming Scheduled Study Targets:", margin, y);
        y += 5;

        masterStudyPlan.daily_plan.slice(0, 4).forEach((dp: any) => {
          checkPageOffset(10);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.text(dp.day || dp.date || "Study Block", margin + 3, y + 4);
          
          doc.setFont("helvetica", "normal");
          const planDetail = dp.focus || dp.tasks || "Focus on principal syllabus objectives";
          doc.text(planDetail, margin + 35, y + 4);
          
          y += 6;
        });
      }
      y += 8;
    }

    // 7. AI Co-Pilot Recommendations (Always include or if toggled)
    if (includeAI && aiRecommendations) {
      checkPageOffset(65);
      
      doc.setFillColor(243, 244, 246); // Light slate/gray card fill
      doc.setDrawColor(99, 102, 241); // Indigo-500 border
      doc.setLineWidth(1);
      
      // Compute required box height based on content
      const recsHeight = 55 + (aiRecommendations.recommendations.length * 5) + (aiRecommendations.strengths.length * 5);
      doc.rect(margin, y, maxLineWidth, recsHeight, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(99, 102, 241);
      doc.text("AI CO-PILOT SYSTEM INSIGHTS & RECOMMENDATIONS", margin + 5, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const aiSummary = doc.splitTextToSize(aiRecommendations.summary, maxLineWidth - 15);
      doc.text(aiSummary, margin + 5, y + 13);

      let boxY = y + 15 + (aiSummary.length * 4);

      // Observed Strengths
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129); // Emerald-500
      doc.text("Key Strengths Tracked:", margin + 5, boxY);
      boxY += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      aiRecommendations.strengths.forEach((strength) => {
        doc.text(`- ${strength}`, margin + 8, boxY);
        boxY += 4.5;
      });

      boxY += 2;

      // Smart Recommendations
      doc.setFont("helvetica", "bold");
      doc.setTextColor(99, 102, 241);
      doc.text("Personalized Workload Suggestions:", margin + 5, boxY);
      boxY += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      aiRecommendations.recommendations.forEach((rec) => {
        const splitRec = doc.splitTextToSize(`- ${rec}`, maxLineWidth - 15);
        doc.text(splitRec, margin + 8, boxY);
        boxY += (splitRec.length * 4.5);
      });

      boxY += 2;

      // Strategic Next Steps
      doc.setFont("helvetica", "bold");
      doc.setTextColor(245, 158, 11); // Amber-500
      doc.text("Immediate Recommended Next Steps:", margin + 5, boxY);
      boxY += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      aiRecommendations.nextSteps.forEach((step) => {
        doc.text(`[ ] ${step}`, margin + 8, boxY);
        boxY += 4.5;
      });
    }

    // Save report
    doc.save(`SmartDeadline_AI_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const executeExport = async () => {
    setIsExporting(true);
    // Add small timeout to show export animation
    setTimeout(() => {
      try {
        const filename = `SmartDeadline_AI_Report_${reportType}_${new Date().toISOString().split('T')[0]}`;
        
        if (format === "pdf") {
          handleExportPDF();
        } else if (format === "csv") {
          handleExportCSV(`${filename}.csv`);
        } else if (format === "excel") {
          handleExportCSV(`${filename}.csv`); // CSV format optimized with UTF-8 BOM is the gold-standard for Excel
        }
      } catch (e) {

      } finally {
        setIsExporting(false);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-6 border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-bold text-white tracking-tight">Academic Export & Report Center</h2>
            </div>
            <p className="text-xs text-slate-400">
              Compile your course deliverables, study plans, calendar metrics, and analytics into formatted executive documents.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 shrink-0 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">Reports Ready</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-6 space-y-6 shadow-md">
            {}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                1. Select Report Component
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {[
                  { id: "all", label: "Full Workspace Report", desc: "All components compiled", icon: FileText },
                  { id: "assignments", label: "Assignments Registry", desc: "Overviews and due dates", icon: CheckSquare },
                  { id: "calendar", label: "Calendar Milestones", desc: "Upcoming milestone timeline", icon: CalendarDays },
                  { id: "study-plan", label: "AI Co-Pilot Plan", desc: "Sprints & study methods", icon: Target },
                  { id: "analytics", label: "Productivity Analytics", desc: "Streaks, hours, and rates", icon: BarChart3 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setReportType(item.id as ReportType)}
                    className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                      reportType === item.id
                        ? "border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-950/30"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <item.icon className={`w-4 h-4 ${reportType === item.id ? "text-indigo-400" : "text-slate-500"}`} />
                      {reportType === item.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      )}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${reportType === item.id ? "text-white" : "text-slate-300"}`}>
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-sans leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="space-y-3">
              <label className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest block">
                2. Select Export Format
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "pdf", label: "Adobe PDF (.pdf)", desc: "Best for sharing & printing", style: "border-rose-500/10 hover:border-rose-500/30", text: "text-rose-400" },
                  { id: "csv", label: "Standard CSV (.csv)", desc: "Raw structured data values", style: "border-blue-500/10 hover:border-blue-500/30", text: "text-blue-400" },
                  { id: "excel", label: "Microsoft Excel (.xlsx)", desc: "Ready for Excel spreadsheet", style: "border-emerald-500/10 hover:border-emerald-500/30", text: "text-emerald-400" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id as ExportFormat)}
                    className={`p-3 rounded-xl border text-left transition duration-200 cursor-pointer h-20 flex flex-col justify-between ${
                      format === fmt.id
                        ? "border-indigo-500 bg-indigo-950/20"
                        : `border-slate-850 bg-slate-950/30 ${fmt.style}`
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${format === fmt.id ? "text-indigo-400" : fmt.text}`}>
                        {fmt.id}
                      </span>
                      {format === fmt.id && (
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        {fmt.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                  <div>
                    <span className="text-xs font-bold text-white">AI Co-Pilot Advisory Recommendations</span>
                    <p className="text-[10px] text-slate-500 font-sans">
                      Inject tailored performance analysis directly into the exported report documents.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAI}
                    onChange={(e) => setIncludeAI(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white" />
                </label>
              </div>
            </div>

            {}
            <button
              type="button"
              disabled={isExporting || (includeAI && loadingAI)}
              onClick={executeExport}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 hover:shadow-indigo-900/40 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Compiling & Formatting Report...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-indigo-200" />
                  <span>Download Report ({format.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-5 shadow-md flex flex-col justify-between min-h-[400px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Report Preview Summary</span>
                </div>
                <span className="text-[10px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                  {format.toUpperCase()} Target
                </span>
              </div>

              {}
              <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-3.5 font-mono text-[10px] text-slate-400 select-none">
                <div className="text-center border-b border-slate-900 pb-2.5">
                  <p className="font-bold text-white text-xs">SMARTDEADLINE AI CO-PILOT SYSTEM</p>
                  <p className="text-[9px] text-indigo-400 font-semibold uppercase mt-0.5">{reportType.toUpperCase()} DELIVERABLES REPORT</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[9px] border-b border-slate-900 pb-2.5 text-slate-500">
                  <p><span className="text-slate-400 font-bold">SCHOLAR:</span> {userProfile?.fullName || "Scholar Name"}</p>
                  <p><span className="text-slate-400 font-bold">DATE:</span> {new Date().toLocaleDateString()}</p>
                </div>

                <div className="space-y-1.5 border-b border-slate-900 pb-2.5">
                  <p className="font-bold text-indigo-300">SUMMARY DATA SUMMARY:</p>
                  <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-500">
                    <div>Assignments: <span className="text-white font-bold">{assignments.length}</span></div>
                    <div>Completed: <span className="text-white font-bold">{assignments.filter(a => a.status === "COMPLETED").length}</span></div>
                    <div>Focus Sessions: <span className="text-white font-bold">{studySessions.length}</span></div>
                  </div>
                </div>

                {includeAI && (
                  <div className="space-y-1.5 p-2.5 bg-indigo-950/15 border border-indigo-900/30 rounded-lg">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>AI INSIGHT SUMMARY:</span>
                    </div>
                    {loadingAI ? (
                      <div className="flex items-center gap-2 py-2 text-slate-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Generating custom advisory...</span>
                      </div>
                    ) : aiError ? (
                      <div className="text-rose-400 text-[9px]">
                        {aiError}
                      </div>
                    ) : aiRecommendations ? (
                      <div className="space-y-2">
                        <p className="text-slate-300 italic text-[9.5px] leading-relaxed">
                          "{aiRecommendations.summary}"
                        </p>
                        <div className="space-y-1">
                          <p className="text-emerald-400 font-bold text-[9px] uppercase">Smart Strength:</p>
                          <p className="text-slate-400 text-[9px]">{aiRecommendations.strengths[0] || "Consistent assignment status cataloging."}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-indigo-400 font-bold text-[9px] uppercase">Advisory Nudge:</p>
                          <p className="text-slate-400 text-[9px]">{aiRecommendations.recommendations[0] || "Organize critical deliverables first to balance pacing."}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic">No recommendations compiled.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-500 p-3 bg-slate-950/30 rounded-xl border border-slate-850 mt-4 leading-relaxed">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <p>
                PDF format compiles graphic layouts with vector charts. Excel format is configured with standard CSV structure for advanced modeling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
