import React from 'react';
import { AlertTriangle, RefreshCw, Terminal, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Log full stack in dev only
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught error:', error, errorInfo);
    }
  }

  getErrorHint(error) {
    const message = error?.message || '';
    
    if (message.includes('403') || message.includes('Forbidden')) {
      return '403 fetching User - check permissions';
    }
    if (message.includes('value') && (message.includes('Select') || message.includes('option'))) {
      return 'Select option value invalid - check data';
    }
    if (message.includes('undefined') || message.includes('null')) {
      return 'Missing data - check API response';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network error - check connection';
    }
    
    return 'Runtime error - see console for details';
  }

  copyDiagnostics = async () => {
    const timestamp = new Date().toISOString();
    const route = window.location.pathname;
    const text = `DIAGNOSTIC REPORT
Route: ${route}
Timestamp: ${timestamp}
Error: ${this.state.error?.toString() || 'Unknown'}

View full diagnostics: /diagnostics`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      const timestamp = new Date().toISOString();
      const route = window.location.pathname;
      const hint = this.getErrorHint(this.state.error);

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full bg-zinc-900 border-red-900/50 shadow-lg shadow-red-950/20">
            <CardHeader className="border-b border-zinc-800 bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-950/50 border border-red-900 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-red-400 uppercase tracking-wide">
                    RIGGSY DIAGNOSTICS
                  </CardTitle>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">
                    CRITICAL SYSTEM FAULT DETECTED
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* Error Message */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-[10px] uppercase font-bold text-zinc-500">ERROR</span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-3 font-mono text-xs text-red-400">
                  {this.state.error?.toString() || 'Unknown error'}
                </div>
              </div>

              {/* Hint */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500">DIAGNOSTIC HINT</span>
                <div className="bg-zinc-950 border border-zinc-800 p-3 text-xs text-amber-400">
                  {hint}
                </div>
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">ROUTE</span>
                  <div className="bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs text-zinc-300">
                    {route}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">TIMESTAMP</span>
                  <div className="bg-zinc-950 border border-zinc-800 p-2 font-mono text-xs text-zinc-300">
                    {timestamp.split('T')[1].split('.')[0]}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-zinc-800 flex gap-3">
                <Button
                  onClick={this.copyDiagnostics}
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-2"
                >
                  {this.state.copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Diagnostics
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-red-950 hover:bg-red-900 text-red-100 border border-red-900"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Application
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Return to Hub
                </Button>
              </div>

              {/* Dev Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="pt-4 border-t border-zinc-800">
                  <details className="space-y-2">
                    <summary className="text-[10px] uppercase font-bold text-zinc-500 cursor-pointer hover:text-zinc-400">
                      Stack Trace (Dev Only)
                    </summary>
                    <pre className="bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-500 overflow-auto max-h-48 font-mono">
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;