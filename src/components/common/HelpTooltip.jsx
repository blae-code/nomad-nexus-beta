import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Info } from 'lucide-react';

export default function HelpTooltip({ 
  content, 
  variant = 'info',
  side = 'top',
  children 
}) {
  const Icon = variant === 'info' ? Info : HelpCircle;
  
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className="inline-flex items-center justify-center text-zinc-500 hover:text-orange-400 transition-colors"
            >
              <Icon className="w-4 h-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent 
          side={side}
          className="max-w-xs bg-zinc-900 border-orange-500/30 text-zinc-200"
        >
          <div className="text-xs leading-relaxed">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}