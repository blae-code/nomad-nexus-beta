/**
 * ReadReceipts — Display who has read a message
 */

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ReadReceipts({ readBy = [] }) {
  if (!readBy || readBy.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500 cursor-help mt-1">
            <Eye className="w-2.5 h-2.5" />
            <span>{readBy.length} read</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="font-semibold mb-1">Read by:</div>
          {readBy.slice(0, 5).map((userId) => (
            <div key={userId} className="text-zinc-300">
              {userId}
            </div>
          ))}
          {readBy.length > 5 && (
            <div className="text-zinc-500 text-[10px] mt-1">
              +{readBy.length - 5} more
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}