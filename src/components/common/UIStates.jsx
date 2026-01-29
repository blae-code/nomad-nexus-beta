/**
 * UIStates — Reusable Empty, Loading, and Error states
 * Ensures consistent user feedback across all surfaces
 */

import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * EmptyState — No data available
 */
export function EmptyState({ 
  icon: Icon = Inbox,
  title = 'No data', 
  message = 'Nothing to display yet',
  action 
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="w-12 h-12 text-zinc-700 mb-3" />
      <div className="text-sm font-semibold text-zinc-400 mb-1">{title}</div>
      <div className="text-xs text-zinc-600 mb-4">{message}</div>
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * LoadingState — Data is being fetched
 */
export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
      <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

/**
 * ErrorState — Something went wrong
 */
export function ErrorState({ 
  title = 'Error',
  message = 'Something went wrong',
  details,
  retry
}) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
      <div className="text-sm font-semibold text-zinc-300 mb-1">{title}</div>
      <div className="text-xs text-zinc-500 mb-3">{message}</div>
      
      {details && (
        <div className="mb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-zinc-600 hover:text-zinc-400 underline"
          >
            {showDetails ? 'Hide' : 'Show'} details
          </button>
          {showDetails && (
            <pre className="mt-2 text-xs text-zinc-500 bg-zinc-900/50 p-2 rounded max-w-sm overflow-x-auto text-left">
              {details}
            </pre>
          )}
        </div>
      )}

      {retry && (
        <Button size="sm" variant="outline" onClick={retry.onClick}>
          {retry.label || 'Retry'}
        </Button>
      )}
    </div>
  );
}