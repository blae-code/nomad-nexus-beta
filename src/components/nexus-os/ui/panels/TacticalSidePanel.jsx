import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, MoreVertical, Activity, Signal, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MetricSparkline from './MetricSparkline';

const PAGE_SIZE = 6;

/**
 * TacticalSidePanel — Enhanced OS-like side panel wrapper.
 * Keeps panel sections page-capped to avoid internal scrolling.
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
  onMaximize,
  onMinimize,
  className = '',
}) {
  const [panelMode, setPanelMode] = useState('standard');
  const [showMetrics, setShowMetrics] = useState(true);
  const [activeTab, setActiveTab] = useState('status');
  const [metricsPage, setMetricsPage] = useState(0);
  const [logsPage, setLogsPage] = useState(0);
  const isLeft = side === 'left';
  const compact = panelMode === 'compact';

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

  return (
    <aside
      className={`nexus-surface border-${isLeft ? 'r' : 'l'} border-zinc-800 flex-shrink-0 relative overflow-hidden transition-all duration-300 flex flex-col ${className}`}
      style={{ width: collapsed ? 48 : width }}
    >
      {!collapsed && (
        <div className="flex-shrink-0 h-8 border-b border-orange-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-zinc-950 flex items-center justify-between px-3 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(251,146,60,0.03) 0px, transparent 1px, transparent 2px)',
            }}
          />
          <div className="flex items-center gap-2 relative z-10">
            {Icon ? <Icon className="w-3 h-3 text-orange-400" /> : null}
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400">{title}</span>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] text-green-400 font-mono">ACTIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-1 relative z-10">
            <Signal className="w-2.5 h-2.5 text-zinc-500" />
            <span className="text-[8px] font-mono text-zinc-500">100%</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <TabsList className="w-full justify-start rounded-none border-b border-zinc-800/60 bg-zinc-900/40 p-0 h-8 flex-shrink-0">
            <TabsTrigger
              value="status"
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent text-[10px] px-3"
            >
              <Activity className="w-3 h-3 mr-1" />
              Status
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent text-[10px] px-3"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-orange-500 data-[state=active]:bg-transparent text-[10px] px-3"
            >
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            {children}
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <div className="h-full min-h-0 p-2 space-y-2 flex flex-col">
              <div className="grid gap-2">
                {pagedMetrics.length > 0 ? (
                  pagedMetrics.map((metric, index) => {
                    const history = metricHistory[metric.label] || [];
                    const trend = history.length > 1 ? history[history.length - 1].value - history[0].value : 0;
                    const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400';
                    return (
                      <div key={`${metric.label}:${index}`} className={`rounded border border-zinc-800 bg-zinc-900/40 ${compact ? 'p-2' : 'p-3'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">{metric.label}</span>
                          <span className={`text-[10px] font-mono font-semibold ${trendColor}`}>
                            {trend > 0 ? '+' : ''}
                            {trend.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <span className={`${compact ? 'text-lg' : 'text-2xl'} text-zinc-200 font-mono font-bold`}>{metric.value}</span>
                          <div className="flex-1 min-w-0">
                            <MetricSparkline data={history} color={trend >= 0 ? '#22c55e' : '#ef4444'} height={compact ? 28 : 36} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-zinc-600 text-xs">No metrics available</div>
                )}
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-900/30 p-2">
                <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Performance Overview</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="text-[9px] text-zinc-500 uppercase">Avg Response</div>
                    <div className="text-sm text-zinc-200 font-mono font-semibold">142ms</div>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="text-[9px] text-zinc-500 uppercase">Uptime</div>
                    <div className="text-sm text-zinc-200 font-mono font-semibold">99.8%</div>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="text-[9px] text-zinc-500 uppercase">Throughput</div>
                    <div className="text-sm text-zinc-200 font-mono font-semibold">1.2k/s</div>
                  </div>
                  <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                    <div className="text-[9px] text-zinc-500 uppercase">Errors</div>
                    <div className="text-sm text-zinc-200 font-mono font-semibold">0.02%</div>
                  </div>
                </div>
              </div>

              {metricsPageCount > 1 ? (
                <div className="mt-auto flex items-center justify-end gap-2 text-[10px] text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setMetricsPage((prev) => Math.max(0, prev - 1))}
                    disabled={metricsPage === 0}
                    className="px-2 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Prev
                  </button>
                  <span>{metricsPage + 1}/{metricsPageCount}</span>
                  <button
                    type="button"
                    onClick={() => setMetricsPage((prev) => Math.min(metricsPageCount - 1, prev + 1))}
                    disabled={metricsPage >= metricsPageCount - 1}
                    className="px-2 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden mt-0 p-2 data-[state=inactive]:hidden">
            <div className="h-full min-h-0 flex flex-col gap-2">
              <div className="space-y-1">
                {pagedLogs.length > 0 ? (
                  pagedLogs.map((log, index) => (
                    <div key={`${log.timestamp}:${index}`} className="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs font-mono">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.level === 'error'
                              ? 'bg-red-500/20 text-red-400'
                              : log.level === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : log.level === 'success'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}
                        >
                          {log.level}
                        </span>
                      </div>
                      <div className="text-zinc-300 text-[10px]">{log.message}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-zinc-600 text-xs">No log entries</div>
                )}
              </div>

              {logsPageCount > 1 ? (
                <div className="mt-auto flex items-center justify-end gap-2 text-[10px] text-zinc-500">
                  <button
                    type="button"
                    onClick={() => setLogsPage((prev) => Math.max(0, prev - 1))}
                    disabled={logsPage === 0}
                    className="px-2 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Prev
                  </button>
                  <span>{logsPage + 1}/{logsPageCount}</span>
                  <button
                    type="button"
                    onClick={() => setLogsPage((prev) => Math.min(logsPageCount - 1, prev + 1))}
                    disabled={logsPage >= logsPageCount - 1}
                    className="px-2 py-0.5 rounded border border-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed hover:border-orange-500/60"
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {!collapsed && showMetrics && statusMetrics.length > 0 ? (
        <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="grid grid-cols-3 divide-x divide-zinc-800">
            {statusMetrics.slice(0, 3).map((metric, index) => (
              <div key={`${metric.label}:${index}`} className="px-2 py-1.5 flex flex-col items-center">
                <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">{metric.label}</span>
                <span className="text-[10px] font-mono text-orange-400 font-bold">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!collapsed && (
        <div className={`absolute top-10 ${isLeft ? 'right-0' : 'left-0'} flex flex-col gap-0.5 z-20`}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 w-5 bg-zinc-900/95 border border-zinc-700/60 hover:border-orange-500/40 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 flex items-center justify-center transition-all"
                style={{
                  borderRadius: isLeft ? '0 4px 4px 0' : '4px 0 0 4px',
                  borderLeft: isLeft ? 'none' : undefined,
                  borderRight: isLeft ? undefined : 'none',
                }}
                title="Panel controls"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isLeft ? 'start' : 'end'} className="w-48 bg-zinc-900 border-zinc-700 text-zinc-200">
              <DropdownMenuItem onClick={() => setPanelMode('standard')} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                Standard View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPanelMode('compact')} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                Compact View
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem onClick={() => setShowMetrics((prev) => !prev)} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                {showMetrics ? 'Hide' : 'Show'} Metrics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMaximize} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                <Maximize2 className="w-3 h-3 mr-2" />
                Maximize Panel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMinimize} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                <Minimize2 className="w-3 h-3 mr-2" />
                Minimize Panel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="h-7 w-5 bg-zinc-900/95 border border-zinc-700/60 hover:border-orange-500/40 hover:bg-zinc-800 text-zinc-400 hover:text-orange-400 flex items-center justify-center transition-all"
            style={{
              borderRadius: isLeft ? '0 4px 4px 0' : '4px 0 0 4px',
              borderLeft: isLeft ? 'none' : undefined,
              borderRight: isLeft ? undefined : 'none',
            }}
            title={collapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isLeft ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        </div>
      )}

      {!collapsed && (
        <div
          className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize hover:bg-orange-500/40 transition-colors z-10 group`}
          onMouseDown={onResize}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-orange-500/20 group-hover:bg-orange-500/60 transition-colors" />
        </div>
      )}

      {collapsed && (
        <div className="h-full flex flex-col items-center justify-center gap-4 w-12 relative">
          <div className="flex flex-col items-center gap-2">
            {Icon ? <Icon className="w-4 h-4 text-orange-400" /> : null}
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 [writing-mode:vertical-lr] rotate-180">
              {title}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
          </div>

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
