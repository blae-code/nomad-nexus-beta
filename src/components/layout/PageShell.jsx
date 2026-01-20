import React from 'react';
import { cn } from '@/lib/utils';

export default function PageShell({ title, subtitle, children, actions, className }) {
  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 bg-zinc-950 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">{title}</h1>
            {subtitle && <p className="text-zinc-500 font-mono text-xs tracking-widest mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}