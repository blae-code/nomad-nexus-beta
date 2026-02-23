import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Signal } from 'lucide-react';

const STATUS_TONE_CLASSES = {
  ok: { dot: 'bg-green-500', text: 'text-green-400' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-400' },
  danger: { dot: 'bg-red-500', text: 'text-red-400' },
  neutral: { dot: 'bg-zinc-500', text: 'text-zinc-400' },
};

const SIGNAL_TONE_CLASSES = {
  ok: 'text-green-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  neutral: 'text-zinc-500',
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

  const headerStatusClass = STATUS_TONE_CLASSES[headerStatusTone] || STATUS_TONE_CLASSES.neutral;
  const headerSignalClass = SIGNAL_TONE_CLASSES[headerSignalTone] || SIGNAL_TONE_CLASSES.neutral;

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
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${headerStatusClass.dot}`} />
                      <span className={`text-[8px] font-mono uppercase tracking-wider font-semibold ${headerStatusClass.text}`}>{headerStatusLabel}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Signal className={`w-2.5 h-2.5 ${headerSignalClass}`} />
                      <span className={`text-[8px] font-mono tracking-wider font-semibold ${headerSignalClass}`}>{headerSignalValue}</span>
                    </div>
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
                  <div key={`${metric.label}:${index}`} className="px-2 py-2 flex flex-col items-center">
                    <span className="text-[8px] text-zinc-300 uppercase tracking-wider font-semibold">{metric.label}</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold mt-0.5">{metric.value}</span>
                  </div>
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
          <div className={`w-2 h-2 rounded-full ${headerStatusClass.dot}`} />
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