import React from 'react';
import { Button } from '@/components/ui/button';
import { getNexusCssVars } from '../tokens';

const intentClasses = {
  primary:
    'bg-gradient-to-b from-orange-600/95 to-orange-800/95 hover:from-orange-500 hover:to-orange-700 border border-orange-400/60 text-orange-50 shadow-[0_0_18px_rgba(190,89,46,0.28)]',
  neutral:
    'bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-900 border border-zinc-600 text-zinc-100',
  subtle:
    'bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 hover:from-zinc-800/95 hover:to-zinc-900 border border-zinc-700 text-zinc-300',
  danger:
    'bg-gradient-to-b from-red-700/90 to-red-900/90 hover:from-red-600 hover:to-red-800 border border-red-500/60 text-red-50 shadow-[0_0_18px_rgba(160,55,44,0.28)]',
};

const NexusButton = React.forwardRef(function NexusButton(
  {
    intent = 'neutral',
    className = '',
    children,
    style,
    ...props
  },
  ref
) {
  const vars = getNexusCssVars();
  const intentClass = intentClasses[intent] || intentClasses.neutral;

  return (
    <Button
      ref={ref}
      {...props}
      className={`${intentClass} uppercase tracking-[0.12em] font-semibold rounded-md transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 ${className}`.trim()}
      style={{ ...vars, ...style }}
    >
      {children}
    </Button>
  );
});

export default NexusButton;
