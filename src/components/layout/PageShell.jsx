import React from 'react';
import { cn } from '@/lib/utils';
import Divider from '@/components/layout/Divider';

export default function PageShell({ 
  title, 
  subtitle, 
  children, 
  actions, 
  className = '',
  maxWidth = false 
}) {
  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <>
          <div className="shrink-0 bg-zinc-950/50 px-[var(--gutter)] py-[var(--gutter)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <h1 className="text-3xl font-black uppercase tracking-tighter text-white">{title}</h1>}
                {subtitle && <p className="text-zinc-500 font-mono text-xs tracking-widest mt-1">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
          <Divider />
        </>
      )}

      {/* Content */}
      <div className={cn(
        'flex-1 overflow-auto px-[var(--gutter)]',
        maxWidth && 'page-shell--max-width mx-auto w-full'
      )}>
        {children}
      </div>
    </div>
  );
}