import React from 'react';
import { Archive } from 'lucide-react';

export default function Recon() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Recon Archive</h1>
        <p className="text-zinc-400 text-sm">Historical operations and analysis</p>
      </div>

      <div className="text-center py-16">
        <Archive className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-400 mb-2">Archive Coming Soon</h3>
        <p className="text-zinc-600">Historical operation records and analysis tools will be available here.</p>
      </div>
    </div>
  );
}