import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    console.log('[ErrorBoundary] Render called, hasError:', this.state.hasError);
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
          <div className="max-w-md w-full border border-red-900/50 bg-red-950/20 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-900/20 border border-red-900/50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-red-200 uppercase">SYSTEM ERROR</h1>
                <p className="text-xs text-red-400 font-mono">CRITICAL FAILURE DETECTED</p>
              </div>
            </div>

            <div className="border-t border-red-900/30 pt-4">
              <p className="text-sm text-zinc-300 mb-2">
                A critical error has occurred in the application. The system has been halted to prevent data corruption.
              </p>
              
              {this.state.error && (
                <div className="bg-zinc-900/50 border border-zinc-800 p-3 mb-3">
                  <p className="text-xs font-mono text-red-400 mb-1">ERROR:</p>
                  <p className="text-xs font-mono text-zinc-400 break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              <Button
                onClick={this.handleReset}
                className="w-full bg-red-900/50 hover:bg-red-900/70 text-red-100 border border-red-900"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                RESTART SYSTEM
              </Button>
            </div>

            <div className="text-[8px] text-zinc-500 font-mono text-center pt-2 border-t border-zinc-800">
              ERROR_CODE: {Date.now()} | CONTACT SUPPORT IF ISSUE PERSISTS
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
export default ErrorBoundary;