import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Maximize2, Minimize2, Signal, TrendingUp } from 'lucide-react';
import MetricSparkline from './MetricSparkline';

const PAGE_SIZE = 6;

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
  const [panelMode, setPanelMode] = useState('standard');
  const [diagnosticTab, setDiagnosticTab] = useState('metrics');
  const [metricsPage, setMetricsPage] = useState(0);
  const [logsPage, setLogsPage] = useState(0);

  const isLeft = side === 'left';
  const borderSideClass = isLeft ? 'border-r' : 'border-l';

  const metricsPageCount = Math.max(1, Math.ceil(statusMetrics.length / PAGE_SIZE));
  const logsPageCount = Math.max(1, Math.ceil(logEntries.length / PAGE_SIZE));

  useEffect(() => {
    setMetricsPage((prev) => Math.min(prev, metricsPageCount - 1));
  }, [metricsPageCount]);

  useEffect(() => {
    setLogsPage((prev) => Math.min(prev, logsPageCount - 1));
  }, [logsPageCount]);

  const pagedMetrics = useMemo(
    () => statusMetrics.slice(metricsPage * PAGE_SIZE, metricsPage * PAGE_SIZE + PAGE_SIZE),
    [statusMetrics, metricsPage]
  );

  const pagedLogs = useMemo(
    () => logEntries.slice(logsPage * PAGE_SIZE, logsPage * PAGE_SIZE + PAGE_SIZE),
    [logEntries, logsPage]
  );

  const headerStatusClass = STATUS_TONE_CLASSES[headerStatusTone] || STATUS_TONE_CLASSES.neutral;
  const headerSignalClass = SIGNAL_TONE_CLASSES[headerSignalTone] || SIGNAL_TONE_CLASSES.neutral;

  return (
    <aside
      className={`nexus-surface ${borderSideClass} border-zinc-800 flex-shrink-0 relative overflow-hidden transition-all duration-300 flex flex-col ${className}`}
      style={{ width: collapsed ? 52 : width }}
    >
      {!collapsed ? (
        <>
          <header className="flex-shrink-0 border-b border-zinc-800 bg-zinc-950/85">
            <div className="h-10 px-3 flex items-center justify-between gap-2">
              <div className="min-w-0 flex items-center gap-2">
                {Icon ? <Icon className="w-3.5 h-3.5 text-orange-400" /> : null}
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400 truncate">{title}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${headerStatusClass.dot}`} />
                      <span className={`text-[8px] font-mono uppercase ${headerStatusClass.text}`}>{headerStatusLabel}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Signal className={`w-2.5 h-2.5 ${headerSignalClass}`} />
                      <span className={`text-[8px] font-mono ${headerSignalClass}`}>{headerSignalValue}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setPanelMode('standard')}
                  className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${
                    panelMode === 'standard'
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Std
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('command')}
                  className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide border ${
                    panelMode === 'command'
                      ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                      : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Cmd
                </button>
                {panelMode === 'command' ? (
                  <>
                    <button
                      type="button"
                      onClick={onMinimize}
                      className="text-zinc-500 hover:text-orange-400 transition-colors"
                      title="Minimize panel width"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onMaximize}
                      className="text-zinc-500 hover:text-orange-400 transition-colors"
                      title="Maximize panel width"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="text-zinc-500 hover:text-orange-400 transition-colors"
                  title="Collapse panel"
                >
                  {isLeft ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>

            {panelMode === 'command' ? (
              <section className="flex-shrink-0 min-h-[184px] max-h-[42%] border-t border-zinc-800 bg-zinc-950/90 p-2 flex flex-col gap-2 overflow-hidden">
                <div className="flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiagnosticTab('metrics')}
                    className={`flex-1 h-6 rounded text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 ${
                      diagnosticTab === 'metrics' ? 'bg-zinc-800 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    Metrics
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiagnosticTab('logs')}
                    className={`flex-1 h-6 rounded text-[10px] font-bold uppercase tracking-wide flex items-center justify-center gap-1 ${
                      diagnosticTab === 'logs' ? 'bg-zinc-800 text-orange-300' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Activity className="w-3 h-3" />
                    Logs
                  </button>
                </div>

                {diagnosticTab === 'metrics' ? (
                  <>
                    <div className="flex-1 min-h-0 overflow-hidden space-y-1">
                      {pagedMetrics.length > 0 ? (
                        pagedMetrics.map((metric, index) => {
                          const history = metricHistory[metric.label] || [];
                          return (
                            <div key={`${metric.label}:${index}`} className="rounded border border-zinc-800 bg-zinc-900/35 p-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">{metric.label}</span>
                                <span className="text-xs font-mono text-zinc-200">{metric.value}</span>
                              </div>
                              {history.length > 1 ? (
                                <div className="mt-1.5">
                                  <MetricSparkline data={history} color="#f97316" height={24} />
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full rounded border border-zinc-800 bg-zinc-900/30 grid place-items-center text-[10px] text-zinc-600">
                          No metrics available
                        </div>
                      )}
                    </div>
                    {metricsPageCount > 1 ? (
                      <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                        <button
                          type="button"
                          onClick={() => setMetricsPage((prev) => Math.max(0, prev - 1))}
                          disabled={metricsPage === 0}
                          className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                        >
                          Prev
                        </button>
                        <span>{metricsPage + 1}/{metricsPageCount}</span>
                        <button
                          type="button"
                          onClick={() => setMetricsPage((prev) => Math.min(metricsPageCount - 1, prev + 1))}
                          disabled={metricsPage >= metricsPageCount - 1}
                          className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-h-0 overflow-hidden space-y-1">
                      {pagedLogs.length > 0 ? (
                        pagedLogs.map((log, index) => (
                          <div key={`${log.timestamp}:${index}`} className="rounded border border-zinc-800 bg-zinc-900/35 p-2">
                            <div className="flex items-center justify-between gap-2 text-[9px]">
                              <span className="text-zinc-500 font-mono">{formatLogTimestamp(log.timestamp)}</span>
                              <span
                                className={`uppercase font-bold ${
                                  log.level === 'error'
                                    ? 'text-red-400'
                                    : log.level === 'warning'
                                      ? 'text-amber-400'
                                      : log.level === 'success'
                                        ? 'text-green-400'
                                        : 'text-blue-400'
                                }`}
                              >
                                {log.level || 'info'}
                              </span>
                            </div>
                            <div className="text-[10px] text-zinc-300 truncate mt-1">{log.message || 'Log entry'}</div>
                          </div>
                        ))
                      ) : (
                        <div className="h-full rounded border border-zinc-800 bg-zinc-900/30 grid place-items-center text-[10px] text-zinc-600">
                          No log entries
                        </div>
                      )}
                    </div>
                    {logsPageCount > 1 ? (
                      <div className="flex items-center justify-end gap-2 text-[9px] text-zinc-500">
                        <button
                          type="button"
                          onClick={() => setLogsPage((prev) => Math.max(0, prev - 1))}
                          disabled={logsPage === 0}
                          className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                        >
                          Prev
                        </button>
                        <span>{logsPage + 1}/{logsPageCount}</span>
                        <button
                          type="button"
                          onClick={() => setLogsPage((prev) => Math.min(logsPageCount - 1, prev + 1))}
                          disabled={logsPage >= logsPageCount - 1}
                          className="px-1.5 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                        >
                          Next
                        </button>
                      </div>
                    ) : null}
                  </>
                )}
              </section>
            ) : null}
          </div>

          {statusMetrics.length > 0 ? (
            <footer className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950/95">
              <div className="grid grid-cols-3 divide-x divide-zinc-800">
                {statusMetrics.slice(0, 3).map((metric, index) => (
                  <div key={`${metric.label}:${index}`} className="px-2 py-1.5 flex flex-col items-center">
                    <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">{metric.label}</span>
                    <span className="text-[10px] font-mono text-orange-400 font-bold">{metric.value}</span>
                  </div>
                ))}
              </div>
            </footer>
          ) : null}

          <div
            className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize transition-colors z-10 ${
              isResizing ? 'bg-orange-500/45' : 'hover:bg-orange-500/35'
            }`}
            onMouseDown={onResize}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-orange-500/20" />
          </div>
        </>
      ) : (
        <div className="h-full w-[52px] flex flex-col items-center justify-between py-3">
          <div className="flex flex-col items-center gap-2">
            {Icon ? <Icon className="w-4 h-4 text-orange-400" /> : null}
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 [writing-mode:vertical-lr] rotate-180">
              {title}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${headerStatusClass.dot}`} />
          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-7 w-7 rounded-full bg-zinc-900/95 border border-zinc-700/60 hover:border-orange-500/40 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 flex items-center justify-center transition-all"
            title="Expand panel"
          >
            {isLeft ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>
      )}
    </aside>
  );
}
