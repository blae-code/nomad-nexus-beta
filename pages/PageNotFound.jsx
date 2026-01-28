import { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { Home } from 'lucide-react';

export default function PageNotFound() {
  const [attemptedPath, setAttemptedPath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAttemptedPath(window.location.pathname);
    }
  }, []);

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/5 blur-3xl" />

      <div className="relative z-10 max-w-md w-full">
        <div className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl font-black text-orange-500 mb-2">404</div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white mb-2">Not Found</h1>
            <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">
              Route "{attemptedPath}" does not exist
            </p>
          </div>

          <a
            href="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold uppercase tracking-wider text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Return Home
          </a>
        </div>
      </div>
    </div>
  );
}