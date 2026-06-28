export type AssignmentStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  estimatedMinutes?: number;
  dueDate?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  dataUrl: string; // Base64 encoding
  uploadDate?: string; // ISO date string or formatted date
}

export interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: AssignmentStatus;
  priority: Priority;
  difficulty: Difficulty;
  weight?: number; // e.g., 15 for 15% of grade
  estimatedHours: number;
  actualHoursSpent: number;
  description: string;
  milestones: Milestone[];
  attachments?: Attachment[];
  studyPlan?: string; // AI generated markdown study plan
  createdAt: string;
}

export interface StudySession {
  id: string;
  assignmentId: string;
  durationMinutes: number;
  date: string; // ISO string
  notes?: string;
}

export interface ProcrastinationNudge {
  milestoneTitle: string;
  explanation: string;
  microSteps: string[];
  encouragement: string;
}

export interface ExtractedTask {
  title: string;
  type: 'ASSIGNMENT' | 'EXAM' | 'QUIZ' | 'PROJECT';
  course: string;
  dueDate: string;
  priority: Priority;
  difficulty: Difficulty;
  weight: number;
  estimatedHours: number;
  description: string;
  milestones: string[];
}

export interface SyllabusScanResult {
  courseName: string;
  instructor: string;
  recommendedStudySchedule: string;
  summary: string;
  tasks: ExtractedTask[];
  api_info?: string;
}

export interface SyllabusParseResult {
  title: string;
  course: string;
  dueDate: string;
  priority: Priority;
  weight: number;
  estimatedHours: number;
  description: string;
  suggestedMilestones: string[];
}

export interface UserProfile {
  fullName: string;
  university: string;
  major: string;
  graduationYear: string;
  email: string;
  avatar: string;
  department?: string;
  semester?: string;
  settings?: {
    theme?: string;
    notifications?: {
      emailAlerts?: boolean;
      pushNotifications?: boolean;
      dailySummary?: boolean;
    };
    studyHours?: {
      preferredStartTime?: string;
      preferredEndTime?: string;
      targetHoursPerWeek?: number;
      preferredDuration?: number;
    };
    aiPersonality?: string;
  };
}

export type NotificationType = 
  | 'UPCOMING_DEADLINE' 
  | 'EXAM_REMINDER' 
  | 'LOW_PRODUCTIVITY' 
  | 'STUDY_STREAK' 
  | 'OVERDUE_ASSIGNMENT' 
  | 'AI_MOTIVATIONAL'
  | 'MISSED_STUDY_SESSION'
  | 'ASSIGNMENT_DUE_TOMORROW'
  | 'PRIORITY_CHANGES';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string; // ISO string
  assignmentId?: string;
}

export interface CopilotPlanResult {
  schedule: Array<{
    time_block: string;
    focus_area: string;
    tasks: string[];
    details: string;
  }>;
  priorities: Array<{
    title: string;
    rank: number;
    reason: string;
  }>;
  breaks: {
    type: string;
    description: string;
  };
  risk_analysis: {
    level: string;
    score: number;
    explanation: string;
  };
  completion_probability: number;
  motivation: string;
}

export interface AIPredictionResult {
  id: string;
  userId: number;
  assignmentId?: string;
  timestamp: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  completionProbability: number;
  expectedCompletion: string;
  studyWorkload: string;
  stressLevel: string;
  productivityScore: number;
  confidenceScore: number;
  analysis: string;
  interventions: string[];
}export interface WeeklyReview {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  completedWorkCount: number;
  pendingWorkCount: number;
  missedDeadlinesCount: number;
  studyHours: number;
  productivityScore: number;
  improvementSuggestions: string[];
  motivationSummary: string;
  nextWeekStudyPlan: string[];
  createdAt: string;
}

