import React from 'react';
import { cn } from '@/lib/utils';

export default function Panel({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'lg'
}) {
  const variants = {
    default: 'panel',
    outline: 'panel panel--outline',
    inset: 'panel panel--inset',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
    xl: 'p-6',
  };

  return (
    <div className={cn(variants[variant], paddingClasses[padding], className)}>
      {children}
    </div>
  );
}