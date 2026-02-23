import React from 'react';
import { Button } from '@/components/ui/button';
import { getNexusCssVars } from '../tokens';

const intentClasses = {
  primary:
    'border text-white font-semibold',
  neutral:
    'bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-600 text-zinc-50 font-semibold',
  subtle:
    'border text-zinc-100 font-semibold',
  danger:
    'bg-red-900/70 hover:bg-red-800/80 border border-red-500/60 text-white font-semibold',
};

const intentStyles = {
  primary: {
    borderColor: 'rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.64)',
    backgroundColor: 'rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.34)',
  },
  subtle: {
    borderColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.24)',
    backgroundColor: 'rgba(16, 24, 32, 0.9)',
  },
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
  const intentStyle = intentStyles[intent] || null;

  return (
    <Button
      ref={ref}
      {...props}
      className={`${intentClass} uppercase tracking-[0.12em] font-semibold rounded-md transition-all duration-200 hover:brightness-105 active:brightness-100 ${className}`.trim()}
      style={{ ...vars, ...(intentStyle || {}), ...style }}
    >
      {children}
    </Button>
  );
});

export default NexusButton;