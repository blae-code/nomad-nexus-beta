import React from 'react';
import { createPageUrl } from '@/utils';
import { MessageSquare, Map, Radio, Settings2 } from 'lucide-react';

function ActionButton({ icon: Icon, label, onClick, href }) {
  const className =
    'flex-1 min-w-0 h-11 rounded border border-zinc-700 bg-zinc-900/85 text-zinc-200 text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5';
  if (href) {
    return (
      <a href={href} className={className}>
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </button>
  );
}

export default function MobileQuickActionBar({ onToggleCommsDock, onToggleContextPanel }) {
  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-[910] px-2">
      <div className="rounded-t-xl border border-zinc-800 bg-zinc-950/95 p-2 backdrop-blur-xl shadow-2xl shadow-black/45">
        <div className="flex items-center gap-2">
          <ActionButton icon={Map} label="Workspace" href={createPageUrl('Hub')} />
          <ActionButton icon={MessageSquare} label="Comms" href={createPageUrl('CommsConsole')} />
          <ActionButton icon={Radio} label="PTT" onClick={onToggleCommsDock} />
          <ActionButton icon={Settings2} label="Panel" onClick={onToggleContextPanel} />
        </div>
      </div>
    </div>
  );
}
