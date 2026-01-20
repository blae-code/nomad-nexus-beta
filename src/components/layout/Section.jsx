import React from 'react';
import { cn } from '@/lib/utils';

export default function Section({ title, description, children, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {(title || description) && (
        <div className="px-6 pt-6">
          {title && <h2 className="text-lg font-bold text-zinc-200 uppercase tracking-wide">{title}</h2>}
          {description && <p className="text-xs text-zinc-500 font-mono mt-1">{description}</p>}
        </div>
      )}
      <div className="px-6 pb-6">
        {children}
      </div>
    </div>
  );
}