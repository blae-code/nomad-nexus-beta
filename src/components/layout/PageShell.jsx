import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';

/**
 * PageShell: Enforced no-scroll layout wrapper
 * - Root: h-full overflow-hidden flex flex-col
 * - Header: fixed height title/actions bar
 * - Content: flex-1 min-h-0 overflow-hidden (children do not scroll)
 * 
 * Only explicit internal panels (ScrollArea) may scroll.
 * Reuses PageLayout contract for consistency.
 */
export default function PageShell({ 
  title, 
  subtitle, 
  children, 
  actions, 
  className = '',
  maxWidth = false 
}) {
  return (
    <div className={cn('h-full overflow-hidden flex flex-col min-h-0', className)}>
      {/* Header */}
      {(title || subtitle || actions) && (
        <PageHeader title={title} subtitle={subtitle} actions={actions} />
      )}

      {/* Content: min-h-0 prevents flex overflow, children must use explicit scroll regions */}
      <div className={cn(
        'flex-1 min-h-0 overflow-hidden',
        maxWidth && 'page-shell--max-width mx-auto w-full'
      )}>
        {children}
      </div>
    </div>
  );
}
