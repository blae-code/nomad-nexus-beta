import React from 'react';
import { cn } from '@/lib/utils';

export default function Panel({ children, className, variant = 'default' }) {
  const variants = {
    default: 'bg-zinc-950 border border-zinc-800',
    subtle: 'bg-zinc-900/50 border border-zinc-800',
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
}