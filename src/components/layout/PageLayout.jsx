import React from 'react';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';

/**
 * PageLayout: Enforced Layout Contract
 * Every page MUST use this wrapper to prevent document scrolling
 * 
 * Structure:
 * - Root: h-full overflow-hidden flex flex-col
 * - Header: fixed height (title + actions), optional
 * - Content: flex-1 min-h-0 overflow-hidden
 *   - Only internal panels inside can scroll (min-h-0 overflow-auto)
 */

export default function PageLayout({ 
  children, 
  header = null, 
  className = '',
  title = null,
  subtitle = null,
  actions = null,
  headerHeight = 'auto'
}) {
  return (
    <div className={cn('h-full overflow-hidden flex flex-col min-h-0', className)}>
      {/* Header (optional) */}
      {(header || title || actions) && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          actions={actions}
          style={headerHeight !== 'auto' ? { height: headerHeight } : undefined}
        >
          {header}
        </PageHeader>
      )}

      {/* Content: Must be min-h-0 to enable flex flex-col scroll region */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/**
 * ScrollArea: Approved scroll container inside PageLayout
 * Use this for lists, logs, tables, calendars
 */
export function ScrollArea({ children, className = '' }) {
  return (
    <div className={`h-full min-h-0 overflow-auto ${className}`}>
      {children}
    </div>
  );
}

/**
 * Panel: Compact widget container
 */
export function Panel({ 
  children, 
  title = null, 
  actions = null,
  className = '',
  body = true
}) {
  return (
    <div className={cn('border border-[var(--divider-color)] bg-zinc-950', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 px-[var(--space-lg)] py-[var(--space-md)] border-b border-[var(--divider-color)]">
          {title && <div className="font-bold text-xs uppercase text-zinc-400">{title}</div>}
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
      )}
      {body ? (
        <div className="p-[var(--space-lg)]">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
