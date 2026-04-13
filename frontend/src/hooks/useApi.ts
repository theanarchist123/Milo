import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/apiClient';
import { auth } from '@/lib/firebase';
import { useUiStore } from '@/stores/uiStore';
import type { DashboardStats, WeeklyData, ActivityItem, Task, Email, Course, CourseItem, Output } from '@/types';

export function useApi() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseItems, setCourseItems] = useState<Record<string, CourseItem[]>>({});
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to the sync timestamp from uiStore
  const lastSyncTimestamp = useUiStore((s) => s.lastSyncTimestamp);
  const prevTimestamp = useRef(0);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [resStats, resEmails, resCourses, resOutputs] = await Promise.all([
        apiClient.get('/dashboard/stats').catch((e) => {
          console.warn('[useApi] /dashboard/stats failed:', e.response?.data ?? e.message);
          return { data: { stats: null, weekly: [], activity: [], active: [] } };
        }),
        apiClient.get('/emails').catch((e) => {
          console.warn('[useApi] /emails failed:', e.response?.data ?? e.message);
          return { data: [] };
        }),
        apiClient.get('/classroom/courses').catch((e) => {
          console.warn('[useApi] /classroom/courses failed:', e.response?.data ?? e.message);
          return { data: [] };
        }),
        apiClient.get('/outputs').catch((e) => {
          console.warn('[useApi] /outputs failed:', e.response?.data ?? e.message);
          return { data: [] };
        }),
      ]);

      setStats(
        resStats.data.stats || {
          emailsFetchedToday: 0,
          filesProcessed: 0,
          assignmentsGenerated: 0,
          studyMaterialsReady: 0,
        }
      );
      setWeeklyData(resStats.data.weekly || []);
      setActivity(resStats.data.activity || []);
      setActiveTasks(resStats.data.active || []);
      setEmails(resEmails.data || []);
      setCourses(resCourses.data || []);
      setOutputs(resOutputs.data || []);
    } catch (error) {
      console.error('[useApi] Fatal fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load — wait for Firebase auth to be ready first
  useEffect(() => {
    auth.authStateReady().then(() => {
      // Only fetch if there's an authenticated user
      if (auth.currentUser) {
        fetchAll();
      }
    });
  }, [fetchAll]);

  // Refetch when Sync Now completes (lastSyncTimestamp is bumped by uiStore.requestRefetch)
  useEffect(() => {
    if (lastSyncTimestamp > 0 && lastSyncTimestamp !== prevTimestamp.current) {
      prevTimestamp.current = lastSyncTimestamp;
      fetchAll();
    }
  }, [lastSyncTimestamp, fetchAll]);

  // Lazily fetch course items when a course is expanded
  const fetchCourseItems = useCallback(
    async (courseId: string) => {
      if (courseItems[courseId]) return; // Already loaded
      try {
        const res = await apiClient.get(`/classroom/${courseId}/items`);
        setCourseItems((prev) => ({ ...prev, [courseId]: res.data || [] }));
      } catch (err) {
        console.warn(`[useApi] Failed to fetch items for course ${courseId}:`, err);
        setCourseItems((prev) => ({ ...prev, [courseId]: [] }));
      }
    },
    [courseItems]
  );

  return {
    stats,
    weeklyData,
    activity,
    activeTasks,
    emails,
    courses,
    courseItems,
    outputs,
    loading,
    refetch: fetchAll,
    fetchCourseItems,
  };
}
