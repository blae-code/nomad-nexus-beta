import React, { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Readable error state with optional admin details accordion
 */
export function ErrorStateCard({
  title = 'Error Loading Data',
  description = 'Something went wrong. Please try again.',
  error,
  onRetry,
  className = ''
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';
  const errorMessage = error?.message || error || '';

  return (
    <div className={cn(
      'flex flex-col py-6 px-4',
      'border border-red-900/40 rounded bg-red-900/10',
      className
    )}>
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-bold text-red-400 mb-0.5">{title}</h3>
          <p className="text-[9px] text-red-300/80">{description}</p>
        </div>
      </div>

      {/* Admin Details Accordion */}
      {isAdmin && errorMessage && (
        <div className="mt-3 pt-2 border-t border-red-900/30">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[8px] text-red-500 hover:text-red-400 transition-colors font-mono"
          >
            <ChevronDown className={cn(
              'w-3 h-3 transition-transform',
              showDetails && 'rotate-180'
            )} />
            ADMIN DETAILS
          </button>
          
          {showDetails && (
            <div className="mt-2 p-2 bg-zinc-950/80 rounded border border-red-900/20 font-mono text-[7px] text-red-400/70 max-h-32 overflow-auto">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      {/* Retry Button */}
      {onRetry && (
        <div className="mt-3 pt-2 border-t border-red-900/30">
          <Button
            onClick={onRetry}
            variant="outline"
            className="text-[9px] h-6 px-2 w-full text-red-400 border-red-900/40 hover:bg-red-900/20"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
}