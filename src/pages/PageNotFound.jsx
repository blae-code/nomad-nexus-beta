import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const [attemptedPath, setAttemptedPath] = useState('');

  useEffect(() => {
    setAttemptedPath(window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 text-center max-w-md">
        <div className="mb-8">
          <div className="text-8xl font-black text-orange-500 mb-4">404</div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white mb-2">
            Page Not Found
          </h1>
          <p className="text-zinc-400 mb-6">
            The requested path <span className="text-orange-500 font-mono">{attemptedPath}</span> does not exist.
          </p>
        </div>
        
        <Button 
          onClick={() => window.location.href = createPageUrl('Hub')}
          className="w-full"
        >
          <Home className="w-4 h-4 mr-2" />
          Return Home
        </Button>
      </div>
    </div>
  );
}