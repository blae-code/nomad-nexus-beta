import React from 'react';
import { Zap } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen w-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
      
      {/* Scanlines */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <Zap className="w-full h-full text-orange-500 animate-pulse" />
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
              <div className="absolute inset-0 border-2 border-transparent border-t-orange-500 border-r-orange-500/50 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-widest text-white">
            Nexus <span className="text-orange-500">Loading</span>
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
            Initializing systems...
          </p>
        </div>
      </div>
    </div>
  );
}