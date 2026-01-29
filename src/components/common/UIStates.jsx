/**
 * UIStates — Standardized Empty/Loading/Error states
 * Consistent UI feedback across all surfaces
 */

import React from 'react';
import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="h-12 w-12 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-zinc-600" />
      </div>
      <h3 className="text-sm font-semibold text-zinc-400 mb-1">{title}</h3>
      {message && <p className="text-xs text-zinc-600 mb-4">{message}</p>}
      {action && (
        <Button size="sm" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-3" />
      <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function ErrorState({ title = 'Error', message, details, retry }) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="text-sm font-semibold text-red-400 mb-1">{title}</h3>
      {message && <p className="text-xs text-zinc-500 mb-3">{message}</p>}
      
      {details && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-zinc-600 hover:text-zinc-400 underline mb-3 transition-colors"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      )}
      
      {showDetails && details && (
        <pre className="text-xs text-left text-zinc-600 bg-zinc-900/50 rounded p-3 mb-3 overflow-auto max-w-full font-mono border border-zinc-800">
          {details}
        </pre>
      )}
      
      {retry && (
        <Button size="sm" variant="outline" onClick={retry.onClick}>
          <RotateCw className="w-3 h-3 mr-2" />
          {retry.label || 'Retry'}
        </Button>
      )}
    </div>
  );
}