import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnsplash } from '@/hooks/useUnsplash';
import { Skeleton } from '@/components/animated';
import type { Course } from '@/types';

interface CourseCardProps {
  course: Course;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}

export function CourseCard({ course, isSelected, onClick, index }: CourseCardProps) {
  const { url, loading } = useUnsplash(course.subject);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={cn(
        'relative rounded-xl overflow-hidden cursor-pointer h-44 border transition-all',
        isSelected ? 'border-amber shadow-[0_0_20px_rgba(245,200,66,0.2)]' : 'border-white/[0.06] hover:border-white/10'
      )}
    >
      {/* Background image */}
      {loading ? (
        <Skeleton className="absolute inset-0 rounded-none" />
      ) : (
        <img
          src={url ?? ''}
          alt={course.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      {/* Gradient overlay */}
      <div className="img-overlay absolute inset-0" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <h3 className="text-white font-semibold text-sm leading-tight">{course.name}</h3>
        <p className="text-white/60 text-xs mt-1">{course.teacher} · {course.section}</p>

        {course.pendingCount > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <AlertCircle size={12} className="text-amber" />
            <span className="text-xs text-amber font-medium">{course.pendingCount} pending</span>
          </div>
        )}
      </div>

      {isSelected && (
        <div className="absolute inset-0 border-2 border-amber rounded-xl pointer-events-none" />
      )}
    </motion.div>
  );
}
