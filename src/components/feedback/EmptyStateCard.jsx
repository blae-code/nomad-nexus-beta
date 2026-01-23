import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Informative empty state with in-universe language
 * Shows icon, message, description, and optional CTA
 */
export function EmptyStateCard({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className = ''
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-8 px-4',
      'border border-zinc-800 rounded bg-zinc-900/30',
      className
    )}>
      {Icon && (
        <div className="mb-3 p-2 bg-zinc-800/50 rounded">
          <Icon className="w-5 h-5 text-zinc-500" />
        </div>
      )}
      
      <h3 className="text-sm font-bold text-zinc-300 mb-1">{title}</h3>
      
      {description && (
        <p className="text-[9px] text-zinc-400 text-center max-w-xs mb-3">
          {description}
        </p>
      )}
      
      {action && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          className="text-[9px] h-6 px-2"
        >
          {action}
        </Button>
      )}
    </div>
  );
}

/**
 * Collection of in-universe empty state messages
 */
export const EmptyStateMessages = {
  NO_ACTIVE_OPS: {
    title: 'No Active Operations',
    description: 'No active ops in this theater. Check back when operations commence.'
  },
  NO_EVENTS: {
    title: 'No Scheduled Events',
    description: 'No events on the board. Create a new operation to get started.'
  },
  NO_INCIDENTS: {
    title: 'No Active Incidents',
    description: 'All clear—no active incidents. Stay alert.'
  },
  NO_COMMS: {
    title: 'No Voice Nets',
    description: 'No comms nets active. Create one to establish communications.'
  },
  NO_MESSAGES: {
    title: 'No Messages',
    description: 'Comms net empty. Start the conversation.'
  },
  NO_PERSONNEL: {
    title: 'No Personnel Assigned',
    description: 'No squad members assigned to this operation.'
  },
  NO_ASSETS: {
    title: 'No Assets Deployed',
    description: 'No fleet assets are currently deployed.'
  },
  NO_LOGS: {
    title: 'No Activity Logged',
    description: 'Event log is empty—no operations recorded yet.'
  }
};