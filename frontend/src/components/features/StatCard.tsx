import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedCounter } from '@/components/animated';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  delay?: number;
}

export function StatCard({ label, value, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className="card p-5 flex flex-col gap-3 hover:border-border transition-all"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-emerald-muted flex items-center justify-center">
          <Icon size={16} className="text-emerald" />
        </div>
      </div>
      <div className="text-3xl font-bold text-text-primary tracking-tight">
        <AnimatedCounter target={value} />
      </div>
      <div className="h-1 rounded-full bg-surface overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / 30) * 100, 100)}%` }}
          transition={{ duration: 0.8, delay: delay + 0.3, ease: 'easeOut' }}
          className="h-full bg-emerald rounded-full"
        />
      </div>
    </motion.div>
  );
}
