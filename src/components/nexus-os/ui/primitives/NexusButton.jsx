/**
 * NexusButton - Standardized button component
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[10px] font-semibold uppercase tracking-[0.12em]
 * - Icons: w-3 h-3 enforced
 * - Transitions: duration-200 hover:brightness-105
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { getNexusCssVars } from '../tokens';

const intentClasses = {
  primary: 'border-orange-500/64 bg-orange-500/34 text-white',
  neutral: 'border-zinc-600 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-50',
  subtle: 'border-zinc-700/24 bg-zinc-900/90 text-zinc-100',
  danger: 'border-red-500/60 bg-red-900/70 text-white',
};

const intentStyles = {
  primary: null,
  subtle: null,
};

const ICON_SIZE_PATTERN = /\bw-3\b.*\bh-3\b|\bh-3\b.*\bw-3\b/;

function collectIconChildren(children, out = []) {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const className = String(child.props?.className || '');
    if (/lucide|icon|svg/i.test(String(child.type?.name || '')) || className.includes('w-')) {
      out.push(className);
    }
    if (child.props?.children) collectIconChildren(child.props.children, out);
  });
  return out;
}

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
  const hasIntent = Object.prototype.hasOwnProperty.call(intentClasses, intent);
  if (!hasIntent && (import.meta || {}).env?.DEV) {
    console.warn(`[NexusButton] Unsupported intent "${intent}". Falling back to neutral.`);
  }
  const intentClass = hasIntent ? intentClasses[intent] : intentClasses.neutral;
  const intentStyle = intentStyles[intent] || null;
  if ((import.meta || {}).env?.DEV) {
    const iconClassNames = collectIconChildren(children);
    const invalid = iconClassNames.find((entry) => entry && !ICON_SIZE_PATTERN.test(entry) && entry.includes('w-'));
    if (invalid) {
      console.warn(`[NexusButton] icon size should use "w-3 h-3". Received "${invalid}".`);
    }
  }

  return (
    <Button
      ref={ref}
      {...props}
      className={`border uppercase tracking-[0.12em] text-[10px] font-semibold rounded-md transition-all duration-200 hover:brightness-105 active:brightness-100 ${intentClass} ${className}`.trim()}
      style={{ ...vars, ...(intentStyle || {}), ...style }}
    >
      {children}
    </Button>
  );
});

export default NexusButton;