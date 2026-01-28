import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function OpsSection({ 
  title, 
  collapsible = false, 
  isCollapsed = false,
  onCollapse,
  children,
  icon: Icon,
  badge,
  className = ''
}) {
  return (
    <div className={cn('border border-zinc-800 bg-zinc-900/50', className)}>
      {collapsible ? (
        <>
          <button
            onClick={onCollapse}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-900/80 transition-colors group"
          >
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#ea580c]" />}
              <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-wider">{title}</span>
              {badge && <span className="text-[7px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{badge}</span>}
            </div>
            <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-[#ea580c]" />
            </motion.div>
          </button>
          <motion.div
            initial={false}
            animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-zinc-800/50"
          >
            <div className="p-3 space-y-2">
              {children}
            </div>
          </motion.div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
              <span className="text-[9px] font-bold uppercase text-zinc-300 tracking-wider">{title}</span>
              {badge && <span className="text-[7px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">{badge}</span>}
            </div>
          </div>
          <div className="p-3 space-y-2">
            {children}
          </div>
        </>
      )}
    </div>
  );
}