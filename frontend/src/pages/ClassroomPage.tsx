import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, FileText, UploadCloud, MessageSquare, Loader2 } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { CourseCard } from '@/components/features/CourseCard';
import { AnimatedPage } from '@/components/animated';
import { useApi } from '@/hooks/useApi';
import { cn, formatDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { CourseItem } from '@/types';

export function ClassroomPage() {
  const { courses, courseItems, loading, fetchCourseItems } = useApi();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'COURSEWORK' | 'MATERIAL' | 'ANNOUNCEMENT'>('COURSEWORK');
  const navigate = useNavigate();

  const handleCourseClick = (id: string) => {
    if (id === selectedCourseId) {
      setSelectedCourseId(null); // Collapse if already open
    } else {
      setSelectedCourseId(id);
      setActiveTab('COURSEWORK');
      fetchCourseItems(id); // Lazy fetch from backend
    }
  };

  const selectedItems = selectedCourseId ? (courseItems[selectedCourseId] ?? []) : [];
  const filteredItems = selectedItems.filter(i => i.type === activeTab);

  return (
    <AnimatedPage>
      <PageWrapper headerTitle="Classroom Hub" headerSubtitle="Connected to Google Classroom">
        <div className="max-w-6xl mx-auto pb-12">
          
          {/* Course Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                isSelected={selectedCourseId === course.id}
                onClick={() => handleCourseClick(course.id)}
              />
            ))}
          </div>

          {/* Expanded Detail Panel */}
          <AnimatePresence>
            {selectedCourseId && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="card bg-surface p-6">
                  
                  {/* Tabs */}
                  <div className="flex items-center gap-6 border-b border-white/[0.06] mb-6">
                    {[
                      { id: 'COURSEWORK', label: 'Assignments' },
                      { id: 'MATERIAL', label: 'Study Materials' },
                      { id: 'ANNOUNCEMENT', label: 'Announcements' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'COURSEWORK' | 'MATERIAL' | 'ANNOUNCEMENT')}
                        className={cn(
                          'pb-3 text-sm font-medium transition-colors relative',
                          activeTab === tab.id ? 'text-amber' : 'text-text-secondary hover:text-text-primary'
                        )}
                      >
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.div layoutId="courseTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* List */}
                  {filteredItems.length === 0 ? (
                    <div className="p-12 text-center text-text-tertiary">
                      No items found in this category.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredItems.map((item) => (
                        <CourseItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    </AnimatedPage>
  );
}

function CourseItemRow({ item }: { item: CourseItem }) {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      const { apiClient } = await import('@/lib/apiClient');
      const res = await apiClient.post(`/process/classroom/${item.id}`, {}, { timeout: 120_000 });
      const taskId = res.data?.id;
      if (taskId) {
        navigate(`/process/${taskId}`);
      }
    } catch (err) {
      console.error('Processing failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex gap-4 p-4 rounded-xl border border-white/[0.06] bg-elevated hover:border-white/10 transition-colors group">
      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-white/[0.06]">
        {item.type === 'COURSEWORK' ? <FileText size={18} className="text-amber" /> :
         item.type === 'MATERIAL' ? <UploadCloud size={18} className="text-indigo" /> :
         <MessageSquare size={18} className="text-teal" />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
            <p className="text-sm text-text-secondary mt-1">{item.description}</p>
          </div>
          {item.dueDate && (
            <div className="flex-shrink-0 text-right">
              <span className="text-[11px] uppercase tracking-wider text-text-tertiary font-semibold">Due Date</span>
              <p className="text-sm text-danger font-medium mt-0.5">{formatDate(item.dueDate)}</p>
            </div>
          )}
        </div>

        {item.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {item.attachments.map(att => (
              <span key={att.attachmentId} className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-white/10 bg-surface text-xs text-text-secondary">
                <FileText size={10} />
                {att.filename}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded', 
              item.status === 'done' ? 'text-success bg-success/10' :
              item.status === 'classified' ? 'text-amber bg-amber/10' : 'text-text-tertiary bg-white/[0.06]'
            )}>
              {item.status.toUpperCase()}
            </span>
            
            <button 
              onClick={handleProcess}
              disabled={processing}
              className="btn btn-secondary py-1.5 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {processing ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Play size={12} className="fill-current" />
              )}
              {processing ? 'Processing…' : 'Process with Miro'}
            </button>
        </div>
      </div>
    </div>
  );
}
