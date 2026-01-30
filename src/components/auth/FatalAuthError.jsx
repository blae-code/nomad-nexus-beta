import React from 'react';
import { AlertTriangle, RefreshCw, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FatalAuthError({ error }) {
  const handleCopyDiagnostics = async () => {
    const diagnostics = {
      error: error?.message || 'Unknown error',
      errorStack: error?.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
      currentURL: window.location.href,
      userAgent: navigator.userAgent,
      localStorage: {
        base44_auth_token: localStorage.getItem('base44_auth_token') ? '(set)' : '(not set)',
        base44_user: localStorage.getItem('base44_user') ? '(set)' : '(not set)',
        nexus_dev_mode: localStorage.getItem('nexus_dev_mode'),
      },
    };

    const diagnosticsText = JSON.stringify(diagnostics, null, 2);
    try {
      await navigator.clipboard.writeText(diagnosticsText);
      alert('Diagnostics copied to clipboard. Please share with support.');
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy. Please take a screenshot of this page and contact support.');
    }
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleClearSession = () => {
    if (window.confirm('Clear all stored session data and reload? This will sign you out completely.')) {
      localStorage.removeItem('base44_auth_token');
      localStorage.removeItem('base44_user');
      localStorage.removeItem('nexus.shell.contextPanelOpen');
      localStorage.removeItem('nexus.shell.commsDockOpen');
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="border-2 border-red-600 bg-red-950/20 rounded-lg p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h1 className="text-2xl font-black uppercase tracking-widest text-red-500">
              Authentication Failed
            </h1>
          </div>

          {/* Error Details */}
          <div className="bg-zinc-900/60 border border-red-500/30 rounded p-4 space-y-2">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Error Details:</p>
            <p className="text-sm text-zinc-300 font-mono break-words">
              {error?.message || 'Unknown authentication error'}
            </p>
            <p className="text-xs text-zinc-500 mt-3">
              The authentication system failed to initialize. This may indicate:
            </p>
            <ul className="text-xs text-zinc-400 space-y-1 mt-2 ml-3">
              <li>• Network connectivity issue</li>
              <li>• Backend service is unreachable</li>
              <li>• Misconfigured authentication endpoint</li>
              <li>• Timed out waiting for auth response (10+ seconds)</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleRetry}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>

            <Button
              onClick={handleCopyDiagnostics}
              variant="outline"
              className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10 font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy Diagnostics
            </Button>

            <Button
              onClick={handleClearSession}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-wide flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Session & Reload
            </Button>
          </div>

          {/* Footer */}
          <div className="border-t border-red-500/20 pt-4 text-center">
            <p className="text-xs text-zinc-500">
              If this persists, please contact support with the diagnostics information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}