import type {
  Email,
  Course,
  CourseItem,
  Task,
  Output,
  ActivityItem,
  DashboardStats,
  WeeklyData,
} from '@/types';

// ─── Dashboard Stats ─────────────────────────────────────
export const mockStats: DashboardStats = {
  emailsFetchedToday: 24,
  filesProcessed: 17,
  assignmentsGenerated: 8,
  studyMaterialsReady: 12,
};

export const mockWeeklyData: WeeklyData[] = [
  { day: 'Mon', count: 5 },
  { day: 'Tue', count: 12 },
  { day: 'Wed', count: 8 },
  { day: 'Thu', count: 18 },
  { day: 'Fri', count: 14 },
  { day: 'Sat', count: 6 },
  { day: 'Sun', count: 9 },
];

// ─── Activity Feed ───────────────────────────────────────
export const mockActivity: ActivityItem[] = [
  { id: 'a1', subject: 'Physics Lab Report — Wave Mechanics', classification: 'ASSIGNMENT', status: 'done', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), taskId: 't1' },
  { id: 'a2', subject: 'Lecture Notes: Database Normalization', classification: 'NOTES', status: 'done', timestamp: new Date(Date.now() - 1000 * 60 * 28).toISOString(), taskId: 't2' },
  { id: 'a3', subject: 'Midterm Exam Schedule — Spring 2026', classification: 'ANNOUNCEMENT', status: 'done', timestamp: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
  { id: 'a4', subject: 'Chemistry Experiment: Titration', classification: 'ASSIGNMENT', status: 'processing', timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(), taskId: 't3' },
  { id: 'a5', subject: 'Math Problem Set 4 — Differential Equations', classification: 'ASSIGNMENT', status: 'error', timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(), taskId: 't4' },
  { id: 'a6', subject: 'History Reading: Colonial Period', classification: 'NOTES', status: 'done', timestamp: new Date(Date.now() - 1000 * 60 * 130).toISOString(), taskId: 't5' },
];

// ─── Active Tasks ────────────────────────────────────────
export const mockActiveTasks: Task[] = [
  {
    id: 't3',
    status: 'EXTRACTING',
    sourceType: 'gmail',
    sourceId: 'e3',
    sourceSubject: 'Chemistry Experiment: Titration',
    currentStep: 'Extracting text from PDF...',
    startedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    retryCount: 0,
  },
  {
    id: 't6',
    status: 'GENERATING',
    sourceType: 'classroom',
    sourceId: 'ci1',
    sourceSubject: 'CS Assignment: Data Structures',
    currentStep: 'Generating assignment with Gemini AI...',
    startedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    retryCount: 0,
  },
];

// ─── Emails ──────────────────────────────────────────────
export const mockEmails: Email[] = [
  {
    id: 'e1',
    subject: 'Physics Lab Report — Wave Mechanics Due Friday',
    sender: 'Prof. Sarah Mitchell',
    senderInitials: 'SM',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    bodyText: 'Dear students, please complete the lab report on wave mechanics by this Friday. The report should include your experimental data, analysis, and conclusions. Attached is the template and grading rubric. Make sure to include error analysis in your results section.',
    attachments: [
      { filename: 'wave_mechanics_template.pdf', mimeType: 'application/pdf', attachmentId: 'att1', size: 245000, downloaded: true },
      { filename: 'grading_rubric.pdf', mimeType: 'application/pdf', attachmentId: 'att2', size: 128000, downloaded: true },
    ],
    status: 'done',
    classification: { type: 'ASSIGNMENT', subjectArea: 'Physics', priority: 'HIGH', hasDeadline: true, deadlineText: 'This Friday', actionRequired: true, summaryOneLine: 'Lab report on wave mechanics due this Friday with template attached.' },
    taskId: 't1',
  },
  {
    id: 'e2',
    subject: 'Lecture Notes: Database Normalization (Week 8)',
    sender: 'Dr. James Okafor',
    senderInitials: 'JO',
    date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    bodyText: 'Hi class, attached are this week\'s lecture slides covering database normalization — 1NF, 2NF, 3NF, and BCNF. Please review before Thursday\'s tutorial session.',
    attachments: [
      { filename: 'db_normalization_week8.pptx', mimeType: 'application/vnd.ms-powerpoint', attachmentId: 'att3', size: 3200000, downloaded: true },
    ],
    status: 'done',
    classification: { type: 'NOTES', subjectArea: 'Computer Science', priority: 'MEDIUM', hasDeadline: false, deadlineText: null, actionRequired: false, summaryOneLine: 'Lecture slides on database normalization covering all normal forms.' },
    taskId: 't2',
  },
  {
    id: 'e3',
    subject: 'Chemistry Experiment: Acid-Base Titration Lab',
    sender: 'Dr. Priya Sharma',
    senderInitials: 'PS',
    date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    bodyText: 'Please find attached the instructions for next week\'s titration experiment. You will need to prepare a 0.1M NaOH solution. Safety goggles and gloves are mandatory.',
    attachments: [
      { filename: 'titration_experiment_guide.pdf', mimeType: 'application/pdf', attachmentId: 'att4', size: 890000, downloaded: true },
    ],
    status: 'extracting',
    taskId: 't3',
  },
  {
    id: 'e4',
    subject: 'Midterm Exam Schedule — Spring 2026',
    sender: 'Academic Affairs Office',
    senderInitials: 'AA',
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    bodyText: 'The midterm examination schedule for Spring 2026 has been published. Please check your student portal for room assignments. Exams begin April 20th. No electronic devices are permitted in exam halls.',
    attachments: [],
    status: 'done',
    classification: { type: 'ANNOUNCEMENT', subjectArea: 'Unknown', priority: 'HIGH', hasDeadline: false, deadlineText: null, actionRequired: false, summaryOneLine: 'Midterm exam schedule for Spring 2026 — check portal for room details.' },
  },
  {
    id: 'e5',
    subject: 'Math Problem Set 4 — Differential Equations',
    sender: 'Prof. Alan Torres',
    senderInitials: 'AT',
    date: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    bodyText: 'Problem set 4 is now available. This covers sections 7.1–7.4 of the textbook. Due date is next Wednesday at 11:59 PM. Submit via the course portal.',
    attachments: [
      { filename: 'problem_set_4.pdf', mimeType: 'application/pdf', attachmentId: 'att5', size: 156000, downloaded: false },
    ],
    status: 'error',
    taskId: 't4',
  },
  {
    id: 'e6',
    subject: 'History Reading Assignment: Colonial Period in Southeast Asia',
    sender: 'Dr. Maria Chen',
    senderInitials: 'MC',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    bodyText: 'For next week\'s seminar, please read the attached chapter on colonial history in Southeast Asia. Come prepared with at least 3 discussion points.',
    attachments: [
      { filename: 'colonial_history_chapter4.pdf', mimeType: 'application/pdf', attachmentId: 'att6', size: 2100000, downloaded: true },
    ],
    status: 'done',
    classification: { type: 'NOTES', subjectArea: 'History', priority: 'MEDIUM', hasDeadline: false, deadlineText: null, actionRequired: false, summaryOneLine: 'Reading on colonial history in Southeast Asia for seminar discussion.' },
    taskId: 't5',
  },
];

// ─── Classroom Courses ───────────────────────────────────
export const mockCourses: Course[] = [
  { id: 'c1', name: 'Introduction to Physics', teacher: 'Prof. Sarah Mitchell', section: 'Section A', subject: 'physics', pendingCount: 3 },
  { id: 'c2', name: 'Database Systems', teacher: 'Dr. James Okafor', section: 'CS-301', subject: 'computer science', pendingCount: 1 },
  { id: 'c3', name: 'General Chemistry', teacher: 'Dr. Priya Sharma', section: 'CHM-101', subject: 'chemistry laboratory', pendingCount: 2 },
  { id: 'c4', name: 'Calculus II', teacher: 'Prof. Alan Torres', section: 'MTH-202', subject: 'mathematics', pendingCount: 0 },
  { id: 'c5', name: 'World History', teacher: 'Dr. Maria Chen', section: 'HIS-110', subject: 'history books', pendingCount: 1 },
  { id: 'c6', name: 'English Literature', teacher: 'Prof. Emma Walsh', section: 'ENG-201', subject: 'literature books', pendingCount: 0 },
];

// ─── Course Items ─────────────────────────────────────────
export const mockCourseItems: Record<string, CourseItem[]> = {
  c1: [
    { id: 'ci1', courseId: 'c1', title: 'Wave Mechanics Lab Report', type: 'COURSEWORK', description: 'Complete the lab report on wave interference patterns.', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), attachments: [{ filename: 'lab_template.pdf', mimeType: 'application/pdf', attachmentId: 'a1', size: 245000, downloaded: true }], status: 'classified', classification: { type: 'ASSIGNMENT', subjectArea: 'Physics', priority: 'HIGH', hasDeadline: true, deadlineText: 'In 2 days', actionRequired: true, summaryOneLine: 'Lab report on wave mechanics.' } },
    { id: 'ci2', courseId: 'c1', title: 'Announcement: No class Thursday', type: 'ANNOUNCEMENT', description: 'Class is cancelled this Thursday due to the faculty conference. Slides will be uploaded.', dueDate: undefined, attachments: [], status: 'done' },
    { id: 'ci3', courseId: 'c1', title: 'Chapter 7 — Thermodynamics Slides', type: 'MATERIAL', description: 'Lecture slides for Chapter 7 covering laws of thermodynamics.', dueDate: undefined, attachments: [{ filename: 'ch7_thermodynamics.pptx', mimeType: 'application/vnd.ms-powerpoint', attachmentId: 'a2', size: 5100000, downloaded: true }], status: 'fetched' },
  ],
  c2: [
    { id: 'ci4', courseId: 'c2', title: 'Assignment 3: SQL Query Optimization', type: 'COURSEWORK', description: 'Write optimized SQL queries for the given schema. Submit .sql file.', dueDate: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(), attachments: [{ filename: 'assignment3_schema.pdf', mimeType: 'application/pdf', attachmentId: 'a3', size: 320000, downloaded: true }], status: 'fetched' },
    { id: 'ci5', courseId: 'c2', title: 'Week 8 Normalization Notes', type: 'MATERIAL', description: 'Full lecture slides on 1NF, 2NF, 3NF, BCNF.', dueDate: undefined, attachments: [{ filename: 'normalization_slides.pptx', mimeType: 'application/vnd.ms-powerpoint', attachmentId: 'a4', size: 3200000, downloaded: true }], status: 'done' },
  ],
};

// ─── Outputs ─────────────────────────────────────────────
export const mockOutputs: Output[] = [
  {
    id: 'o1', taskId: 't1', generatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    type: 'ASSIGNMENT', title: 'Wave Mechanics Lab Report — Complete Draft',
    sourceSubject: 'Physics Lab Report — Wave Mechanics Due Friday',
    docxUrl: '#', pdfUrl: '#', fileSizeBytes: 182000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    previewText: '# Wave Mechanics Lab Report\n\n## Introduction\nThis report investigates the properties of wave interference and diffraction using a ripple tank apparatus. The experiment aimed to verify the principle of superposition...',
  },
  {
    id: 'o2', taskId: 't2', generatedAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    type: 'SUMMARY', title: 'Database Normalization — Summary + Q&A',
    sourceSubject: 'Lecture Notes: Database Normalization (Week 8)',
    docxUrl: '#', pdfUrl: '#', fileSizeBytes: 95000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    previewText: '# Database Normalization — Study Summary\n\n## Key Concepts\n**First Normal Form (1NF):** A relation is in 1NF if all attributes contain only atomic values and there are no repeating groups...',
  },
  {
    id: 'o3', taskId: 't5', generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    type: 'SUMMARY', title: 'Colonial Period in Southeast Asia — Structured Notes',
    sourceSubject: 'History Reading Assignment: Colonial Period in Southeast Asia',
    docxUrl: '#', pdfUrl: '#', fileSizeBytes: 147000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    previewText: '# Colonial History: Southeast Asia\n\n## Overview\nThe colonial period in Southeast Asia spans roughly from the 16th to the mid-20th century, during which European powers established...',
  },
  {
    id: 'o4', taskId: 't7', generatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    type: 'EXPERIMENT', title: 'Chemistry Titration — Experiment Report Template',
    sourceSubject: 'Chemistry Experiment: Acid-Base Titration Lab',
    docxUrl: '#', pdfUrl: '#', fileSizeBytes: 213000,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    previewText: '# Acid-Base Titration Experiment Report\n\n## Aim\nTo determine the concentration of an unknown acid solution using standard NaOH solution through titration...',
  },
];

// ─── Processor steps mock ─────────────────────────────────
export const mockPipelineSteps = [
  { step: 1, label: 'Fetch', description: 'Downloading attachment from Gmail / Drive', status: 'done' as const },
  { step: 2, label: 'Detect Type', description: 'Checking if PDF is text-based or scanned', status: 'done' as const },
  { step: 3, label: 'Extract', description: 'Extracting text with PyMuPDF / OCR.space', status: 'done' as const },
  { step: 4, label: 'Classify', description: 'Gemini AI reading content and classifying', status: 'active' as const },
  { step: 5, label: 'Generate', description: 'Generating assignment / summary / Q&A', status: 'pending' as const },
  { step: 6, label: 'Write File', description: 'Building DOCX and PDF output files', status: 'pending' as const },
  { step: 7, label: 'Notify', description: 'Sending email with download link', status: 'pending' as const },
];
