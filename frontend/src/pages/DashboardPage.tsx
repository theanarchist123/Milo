import { motion } from 'framer-motion';
import { Mail, FileText, PenTool, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StatCard } from '@/components/features/StatCard';
import { ActivityRow } from '@/components/features/ActivityRow';
import { TaskPipeline } from '@/components/features/TaskPipeline';
import { AnimatedPage, AnimatedList, AnimatedListItem } from '@/components/animated';
import { useUiStore } from '@/stores/uiStore';
import { useApi } from '@/hooks/useApi';

// Custom tooltip for Recharts
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number | string }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-elevated border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-text-secondary text-xs mb-1">{label}</p>
        <p className="text-amber font-bold">{payload[0].value} emails processed</p>
      </div>
    );
  }
  return null;
};

export function DashboardPage() {
  const { rightPanelOpen } = useUiStore();
  const { stats, weeklyData, activity, activeTasks } = useApi();

  const rightPanel = rightPanelOpen ? (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-text-primary">Active Tasks</h2>
        <p className="text-xs text-text-tertiary mt-1">Real-time processing pipeline</p>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {activeTasks?.map((task) => (
          <div key={task.id} className="mb-6 last:mb-0">
            <div className="bg-background rounded-lg border border-white/[0.04] p-3 mb-3">
              <p className="text-xs text-text-secondary truncate">Now processing:</p>
              <p className="text-sm font-medium text-text-primary truncate mt-0.5" title={task.sourceSubject}>
                {task.sourceSubject}
              </p>
            </div>
            {/* Show pipeline for the first active task */}
            <TaskPipeline steps={[]} />
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <AnimatedPage>
      <PageWrapper rightPanel={rightPanel}>
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Emails Fetched" value={stats?.emailsFetchedToday || 0} icon={Mail} delay={0.1} />
            <StatCard label="Files Extracted" value={stats?.filesProcessed || 0} icon={FileText} delay={0.2} />
            <StatCard label="Assignments" value={stats?.assignmentsGenerated || 0} icon={PenTool} delay={0.3} />
            <StatCard label="Study Materials" value={stats?.studyMaterialsReady || 0} icon={BookOpen} delay={0.4} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Feed */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="lg:col-span-2 card flex flex-col overflow-hidden h-[400px]"
            >
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-surface">
                <h2 className="text-sm font-semibold text-text-primary">Recent Processing Activity</h2>
                <button className="text-xs text-amber font-medium hover:underline">View All</button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <AnimatedList stagger={0.05}>
                  {activity?.map((item) => (
                    <AnimatedListItem key={item.id}>
                      <ActivityRow item={item} />
                    </AnimatedListItem>
                  ))}
                </AnimatedList>
              </div>
            </motion.div>

            {/* Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="card p-5 h-[400px] flex flex-col"
            >
              <h2 className="text-sm font-semibold text-text-primary mb-1">Weekly Volume</h2>
              <p className="text-xs text-text-tertiary mb-6">Total emails processed per day</p>
              
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8B8A8F', fontSize: 11 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8B8A8F', fontSize: 11 }}
                    />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {weeklyData?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.day === 'Thu' ? '#F5C842' : 'rgba(99,102,241,0.6)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}
