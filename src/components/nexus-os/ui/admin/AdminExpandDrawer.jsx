import React from 'react';
import { ExternalLink, X } from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';

export default function AdminExpandDrawer({
  open,
  title,
  subtitle = '',
  count = 0,
  onClose,
  children,
}) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col" data-admin-expand-drawer="true">
      <header className="flex-shrink-0 px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/70 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-100 truncate">{title}</div>
          <div className="text-[9px] text-zinc-500 uppercase tracking-wide truncate">{subtitle || 'Expanded view'}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NexusBadge tone="neutral">{count}</NexusBadge>
          <NexusButton size="sm" intent="subtle" className="text-[9px]" onClick={onClose}>
            <X className="w-3 h-3" />
            Close
          </NexusButton>
        </div>
      </header>

      <div className="flex-1 min-h-0 nx-allow-scroll overflow-y-auto p-2.5 space-y-1.5">
        {children}
      </div>

      <footer className="flex-shrink-0 px-3 py-1.5 border-t border-zinc-700/40 bg-zinc-900/70 flex items-center justify-between gap-2">
        <span className="text-[9px] text-zinc-500 uppercase tracking-wide">Drawer scrolling enabled by policy</span>
        <span className="inline-flex items-center gap-1 text-[9px] text-zinc-500 uppercase tracking-wide">
          <ExternalLink className="w-3 h-3" />
          Expand Mode
        </span>
      </footer>
    </div>
  );
}
