import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/apiClient';
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Execute all fetches in parallel relying on apiClient which attaches the Firebase Token
      const [resStats, resEmails, resCourses, resOutputs] = await Promise.all([
        apiClient.get('/dashboard/stats').catch(() => ({ data: { stats: null, weekly: [], activity: [], active: [] } })),
        apiClient.get('/emails').catch(() => ({ data: [] })),
        apiClient.get('/classroom/courses').catch(() => ({ data: [] })),
        apiClient.get('/outputs').catch(() => ({ data: [] }))
      ]);
      
      setStats(resStats.data.stats || { emailsFetchedToday: 0, filesProcessed: 0, assignmentsGenerated: 0, studyMaterialsReady: 0 });
      setWeeklyData(resStats.data.weekly || []);
      setActivity(resStats.data.activity || []);
      setActiveTasks(resStats.data.active || []);
      setEmails(resEmails.data || []);
      setCourses(resCourses.data || []);
      setOutputs(resOutputs.data || []);
    } catch (error) {
      console.error("API Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
    refetch: fetchAll
  };
}
