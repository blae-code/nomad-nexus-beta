import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Signal } from 'lucide-react';
import { NexusMetricCell, NexusSignalPill, NexusStatusPill } from '../primitives';

const STATUS_DOT_CLASSES = {
  ok: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  active: 'bg-orange-500',
  neutral: 'bg-zinc-500',
};

function formatLogTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * TacticalSidePanel — streamlined side-panel shell with Standard and Command diagnostics modes.
 * Keeps the content area stable and diagnostics page-capped to avoid inline scrolling.
 */
export default function TacticalSidePanel({
  side = 'left',
  width,
  collapsed,
  onToggleCollapse,
  onResize,
  isResizing,
  children,
  title,
  icon: Icon,
  statusMetrics = [],
  metricHistory = {},
  logEntries = [],
  headerStatusLabel = 'ACTIVE',
  headerStatusTone = 'ok',
  headerSignalValue = '100%',
  headerSignalTone = 'neutral',
  onMaximize,
  onMinimize,
  className = '',
}) {
  const isLeft = side === 'left';
  const borderSideClass = isLeft ? 'border-r' : 'border-l';
  const headerStatusDotClass = STATUS_DOT_CLASSES[headerStatusTone] || STATUS_DOT_CLASSES.neutral;

  return (
    <aside
      className={`bg-zinc-950/80 ${borderSideClass} border-zinc-700/40 flex-shrink-0 relative overflow-hidden transition-all duration-300 flex flex-col rounded-lg ${className}`}
      style={{ width: collapsed ? 52 : width }}
    >
      {!collapsed ? (
        <>
           <header className="flex-shrink-0 border-b border-zinc-700/40 bg-zinc-900/40 backdrop-blur-sm px-2.5 py-2 nexus-top-rail">
             <div className="flex items-center justify-between gap-2">
               <div className="min-w-0 flex items-center gap-1.5">
                 {Icon ? <Icon className="w-3.5 h-3.5 text-orange-500" /> : null}
                 <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-[0.15em] text-white truncate">{title}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <NexusStatusPill tone={headerStatusTone} label={headerStatusLabel} size="sm" />
                    <NexusSignalPill tone={headerSignalTone} value={headerSignalValue} icon={Signal} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onMinimize}
                  className="p-0.5 text-zinc-500 hover:text-orange-400 transition-colors"
                  title="Minimize panel width"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onMaximize}
                  className="p-0.5 text-zinc-500 hover:text-orange-400 transition-colors"
                  title="Maximize panel width"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-0.5 text-zinc-500 hover:text-orange-400 transition-colors"
                  title="Collapse panel"
                >
                  {isLeft ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

          {statusMetrics.length > 0 ? (
            <footer className="flex-shrink-0 border-t border-zinc-700/40 bg-zinc-900/40 backdrop-blur-sm">
              <div className="grid grid-cols-3 divide-x divide-zinc-800/60">
                {statusMetrics.slice(0, 3).map((metric, index) => (
                  <NexusMetricCell key={`${metric.label}:${index}`} label={metric.label} value={metric.value} tone="active" />
                ))}
              </div>
            </footer>
          ) : null}

          <div
            className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize transition-colors z-10 ${
              isResizing ? 'bg-orange-500/40' : 'hover:bg-orange-500/30'
            }`}
            onMouseDown={onResize}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-zinc-700/40" />
          </div>
        </>
      ) : (
        <div className="h-full w-[52px] flex flex-col items-center justify-between py-3 bg-zinc-900/20">
          <div className="flex flex-col items-center gap-2">
            {Icon ? <Icon className="w-4 h-4 text-orange-500" /> : null}
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 [writing-mode:vertical-lr] rotate-180">
              {title}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${headerStatusDotClass}`} />
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded bg-zinc-900/50 border border-zinc-700/60 hover:border-orange-500/40 hover:bg-zinc-800/60 text-zinc-500 hover:text-orange-500 flex items-center justify-center transition-all"
            title="Expand panel"
          >
            {isLeft ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>
      )}
    </aside>
  );
}
