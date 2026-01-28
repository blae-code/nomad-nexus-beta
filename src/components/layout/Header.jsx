import React from 'react';
import { createPageUrl } from '@/utils';
import { Radio, Menu } from 'lucide-react';

export default function Header({ onToggleDock }) {
  return (
    <div className="sticky top-0 z-40 border-b-2 border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={createPageUrl('Hub')} className="flex items-center gap-2 group">
            <Radio className="w-6 h-6 text-orange-500 group-hover:text-orange-400 transition-colors" />
            <span className="text-lg font-black uppercase tracking-wider text-white group-hover:text-orange-500 transition-colors">
              Nomad <span className="text-orange-500">Nexus</span>
            </span>
          </a>
        </div>

        <button
          onClick={onToggleDock}
          className="p-2 rounded-lg border-2 border-zinc-800 hover:border-orange-500/50 text-zinc-400 hover:text-orange-500 transition-all"
          title="Toggle comms dock"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}