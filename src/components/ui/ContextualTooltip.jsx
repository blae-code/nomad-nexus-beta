import React, { useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

export default function ContextualTooltip({ children, title, description, shortcut, show = true }) {
  const [isNew, setIsNew] = useState(show);

  useEffect(() => {
    const dismissedKey = `nexus.tooltip.dismissed.${title}`;
    const wasDismissed = localStorage.getItem(dismissedKey);
    if (wasDismissed) {
      setIsNew(false);
    }
  }, [title]);

  const handleDismiss = () => {
    localStorage.setItem(`nexus.tooltip.dismissed.${title}`, 'true');
    setIsNew(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs bg-zinc-800 border border-orange-500/40">
          <div className="space-y-2">
            <div className="font-semibold text-orange-400 flex items-center gap-2">
              {isNew && <span className="inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
              {title}
            </div>
            <p className="text-xs text-zinc-300">{description}</p>
            {shortcut && (
              <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-700">
                Shortcut: <code className="bg-zinc-900 px-1 rounded">{shortcut}</code>
              </div>
            )}
            {isNew && (
              <button
                onClick={handleDismiss}
                className="text-xs text-orange-400 hover:text-orange-300 pt-1"
              >
                Got it
              </button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}