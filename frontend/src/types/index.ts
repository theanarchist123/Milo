// ─── User & Auth ────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  connectedAt?: string;
}

// ─── Email ──────────────────────────────────────────────
export type EmailType = 'ASSIGNMENT' | 'NOTES' | 'ANNOUNCEMENT' | 'UNCLASSIFIED';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProcessingStatus =
  | 'fetched'
  | 'classified'
  | 'extracting'
  | 'generating'
  | 'done'
  | 'error';

export interface Attachment {
  filename: string;
  mimeType: string;
  attachmentId: string;
  size: number;
  downloaded: boolean;
}

export interface Classification {
  type: EmailType;
  subjectArea: string;
  priority: Priority;
  hasDeadline: boolean;
  deadlineText: string | null;
  actionRequired: boolean;
  summaryOneLine: string;
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  senderInitials: string;
  date: string;
  bodyText: string;
  attachments: Attachment[];
  status: ProcessingStatus;
  classification?: Classification;
  taskId?: string;
}

// ─── Classroom ──────────────────────────────────────────
export type CourseItemType = 'COURSEWORK' | 'ANNOUNCEMENT' | 'MATERIAL';

export interface Course {
  id: string;
  name: string;
  teacher: string;
  section: string;
  subject: string;
  pendingCount: number;
  imageUrl?: string;
}

export interface CourseItem {
  id: string;
  courseId: string;
  title: string;
  type: CourseItemType;
  description: string;
  dueDate?: string;
  attachments: Attachment[];
  status: ProcessingStatus;
  taskId?: string;
  classification?: Classification;
}

// ─── Tasks ──────────────────────────────────────────────
export type TaskStatus =
  | 'QUEUED'
  | 'FETCHING'
  | 'CLASSIFYING'
  | 'EXTRACTING'
  | 'GENERATING'
  | 'WRITING'
  | 'UPLOADING'
  | 'DONE'
  | 'ERROR';

export interface Task {
  id: string;
  status: TaskStatus;
  sourceType: 'gmail' | 'classroom';
  sourceId: string;
  sourceSubject: string;
  currentStep: string;
  startedAt: string;
  completedAt?: string;
  outputDocxUrl?: string;
  outputPdfUrl?: string;
  errorMessage?: string;
  retryCount: number;
}

// ─── Outputs ─────────────────────────────────────────────
export type OutputType = 'ASSIGNMENT' | 'SUMMARY' | 'QA' | 'EXPERIMENT';

export interface Output {
  id: string;
  taskId: string;
  generatedAt: string;
  type: OutputType;
  title: string;
  sourceSubject: string;
  docxUrl: string;
  pdfUrl: string;
  fileSizeBytes: number;
  expiresAt: string;
  previewText?: string;
}

// ─── Activity ─────────────────────────────────────────────
export type ActivityStatus = 'processing' | 'done' | 'error';

export interface ActivityItem {
  id: string;
  subject: string;
  classification: EmailType;
  status: ActivityStatus;
  timestamp: string;
  taskId?: string;
}

// ─── Stats ───────────────────────────────────────────────
export interface DashboardStats {
  emailsFetchedToday: number;
  filesProcessed: number;
  assignmentsGenerated: number;
  studyMaterialsReady: number;
}

export interface WeeklyData {
  day: string;
  count: number;
}
