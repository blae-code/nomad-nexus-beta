import React from 'react';
import { Button } from '@/components/ui/button';
import { getNexusCssVars } from '../tokens';

const intentClasses = {
  primary:
    'border text-orange-50 shadow-[0_0_18px_rgba(190,89,46,0.28)]',
  neutral:
    'bg-gradient-to-b from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-900 border border-zinc-600 text-zinc-100',
  subtle:
    'border text-zinc-200',
  danger:
    'bg-gradient-to-b from-red-700/90 to-red-900/90 hover:from-red-600 hover:to-red-800 border border-red-500/60 text-red-50 shadow-[0_0_18px_rgba(160,55,44,0.28)]',
};

const intentStyles = {
  primary: {
    borderColor: 'rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.72)',
    backgroundImage:
      'linear-gradient(180deg, rgba(var(--nx-bridge-c-rgb, var(--nx-bridge-c-rgb-base)), 0.32), rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.84) 42%, rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.62) 100%)',
  },
  subtle: {
    borderColor: 'rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.28)',
    backgroundImage:
      'linear-gradient(180deg, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.15), rgba(25, 22, 20, 0.86) 36%, rgba(13, 11, 10, 0.92) 100%)',
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
      className={`${intentClass} uppercase tracking-[0.12em] font-semibold rounded-md transition-all duration-200 hover:brightness-110 hover:-translate-y-[1px] active:translate-y-0 ${className}`.trim()}
      style={{ ...vars, ...(intentStyle || {}), ...style }}
    >
      {children}
    </Button>
  );
});

export default NexusButton;
