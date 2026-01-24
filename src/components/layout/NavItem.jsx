import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SIZE_CLASSES = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  rail: 'h-12 w-full',
};

const ICON_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-5 w-5',
  rail: 'h-5 w-5',
};

export default function NavItem({
  as: Component,
  to,
  href,
  icon: Icon,
  isActive = false,
  size = 'md',
  iconClassName = '',
  className = '',
  children,
  ...props
}) {
  const ResolvedComponent = Component || (to ? Link : 'a');
  const linkProps = to ? { to } : href ? { href } : {};

  return (
    <ResolvedComponent
      {...linkProps}
      {...props}
      className={cn(
        'relative flex items-center justify-center gap-2 border border-2 transition-all duration-150 group overflow-hidden',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-[#ea580c]/40',
        SIZE_CLASSES[size],
        isActive
          ? 'bg-[#ea580c]/15 border-[#ea580c]/70 text-[#ea580c] shadow-[0_0_12px_rgba(234,88,12,0.2)]'
          : 'bg-zinc-900/60 border-zinc-800/70 text-zinc-500 hover:border-[#ea580c]/40 hover:text-zinc-200 hover:shadow-[0_0_12px_rgba(234,88,12,0.08)]',
        className
      )}
    >
      {Icon && <Icon className={cn(ICON_CLASSES[size], 'shrink-0', iconClassName)} />}
      {children}
      <span className="pointer-events-none absolute -top-[1px] -left-[1px] h-2 w-2 border-t border-l border-current opacity-0 transition-opacity group-hover:opacity-60" />
      <span className="pointer-events-none absolute -top-[1px] -right-[1px] h-2 w-2 border-t border-r border-current opacity-0 transition-opacity group-hover:opacity-60" />
      <span className="pointer-events-none absolute -bottom-[1px] -left-[1px] h-2 w-2 border-b border-l border-current opacity-0 transition-opacity group-hover:opacity-60" />
      <span className="pointer-events-none absolute -bottom-[1px] -right-[1px] h-2 w-2 border-b border-r border-current opacity-0 transition-opacity group-hover:opacity-60" />
    </ResolvedComponent>
  );
}
