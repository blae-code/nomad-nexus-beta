import React from 'react';
import { Button } from '@/components/ui/button';
import { getNexusCssVars } from '../tokens';

const intentClasses = {
  primary: 'bg-orange-700 hover:bg-orange-600 border border-orange-500/60 text-orange-50',
  neutral: 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200',
  subtle: 'bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-300',
  danger: 'bg-red-700/90 hover:bg-red-600 border border-red-500/60 text-red-50',
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
      className={`${intentClass} uppercase tracking-wide font-semibold ${className}`.trim()}
      style={{ ...vars, ...style }}
    >
      {children}
    </Button>
  );
});

export default NexusButton;
