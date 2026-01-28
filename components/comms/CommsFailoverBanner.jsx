import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Banner shown when LIVE mode has degraded to SIM for continuity.
 * Provides reason and retry action.
 */
export default function CommsFailoverBanner({ fallbackReason, onRetry, className }) {
  const [isRetrying, setIsRetrying] = React.useState(false);

  if (!fallbackReason) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry?.();
    } finally {
      setTimeout(() => setIsRetrying(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={cn(
          'bg-amber-950/20 border border-amber-800/50 px-3 py-2 flex items-center justify-between gap-3',
          className
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-400 uppercase">
              LIVE degraded — running SIM mode for continuity
            </div>
            <div className="text-[10px] text-amber-300 mt-0.5 truncate">
              {fallbackReason}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleRetry}
          disabled={isRetrying}
          className="shrink-0 h-7 px-3 text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 border border-amber-800/50"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry LIVE
            </>
          )}
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}