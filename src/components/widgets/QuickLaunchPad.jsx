import React from 'react';
import { Rocket, X, Calendar, Radio, Map, Users as UsersIcon, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function QuickLaunchPad({ widgetId, onRemove, isDragging }) {
  const shortcuts = [
    { icon: Calendar, label: 'Events', page: 'Events', color: 'text-orange-500' },
    { icon: Radio, label: 'Comms', page: 'CommsConsole', color: 'text-red-500' },
    { icon: Map, label: 'Map', page: 'UniverseMap', color: 'text-cyan-500' },
    { icon: UsersIcon, label: 'Roster', page: 'UserDirectory', color: 'text-green-500' },
    { icon: Settings, label: 'Settings', page: 'Settings', color: 'text-zinc-500' }
  ];

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,rgba(220,38,38,0.015)_0deg,transparent_45deg)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Quick Launch</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 p-3 grid grid-cols-2 gap-2 relative z-10">
        {shortcuts.map((shortcut, i) => {
          const Icon = shortcut.icon;
          return (
            <button
              key={i}
              onClick={() => window.location.href = createPageUrl(shortcut.page)}
              className="aspect-square flex flex-col items-center justify-center gap-2 bg-zinc-900/40 border border-zinc-700/40 hover:border-red-700/60 rounded transition-all group"
            >
              <Icon className={`w-6 h-6 ${shortcut.color} group-hover:scale-110 transition-transform`} />
              <span className="text-[10px] font-bold text-zinc-400 group-hover:text-red-400 uppercase tracking-wider">
                {shortcut.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}