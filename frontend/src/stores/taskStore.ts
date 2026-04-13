import { create } from 'zustand';
import type { Task, TaskStatus } from '@/types';

interface TaskStore {
  activeTasks: Task[];
  taskHistory: Task[];
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus, step?: string) => void;
  completeTask: (taskId: string, docxUrl: string, pdfUrl: string) => void;
  failTask: (taskId: string, errorMessage: string) => void;
}

export const useTaskStore = create<TaskStore>((set) => ({
  activeTasks: [],
  taskHistory: [],

  addTask: (task) =>
    set((state) => ({ activeTasks: [task, ...state.activeTasks] })),

  updateTaskStatus: (taskId, status, step) =>
    set((state) => ({
      activeTasks: state.activeTasks.map((t) =>
        t.id === taskId
          ? { ...t, status, currentStep: step ?? t.currentStep }
          : t
      ),
    })),

  completeTask: (taskId, docxUrl, pdfUrl) =>
    set((state) => {
      const task = state.activeTasks.find((t) => t.id === taskId);
      if (!task) return {};
      const completed = {
        ...task,
        status: 'DONE' as TaskStatus,
        outputDocxUrl: docxUrl,
        outputPdfUrl: pdfUrl,
        completedAt: new Date().toISOString(),
      };
      return {
        activeTasks: state.activeTasks.filter((t) => t.id !== taskId),
        taskHistory: [completed, ...state.taskHistory],
      };
    }),

  failTask: (taskId, errorMessage) =>
    set((state) => ({
      activeTasks: state.activeTasks.map((t) =>
        t.id === taskId ? { ...t, status: 'ERROR', errorMessage } : t
      ),
    })),
}));
