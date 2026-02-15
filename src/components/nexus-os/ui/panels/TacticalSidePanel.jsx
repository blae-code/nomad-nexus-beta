import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, MoreVertical, Activity, Signal, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { NexusBadge } from '../primitives';
import MetricSparkline from './MetricSparkline';

/**
 * TacticalSidePanel — Enhanced OS-like side panel wrapper
 * Provides professional tactical interface with tabbed views, resizable sections, and sparkline metrics
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
  
  const isLeft = side === 'left';
  
  return (
    <aside
      className={`nexus-surface border-${isLeft ? 'r' : 'l'} border-zinc-800 flex-shrink-0 relative overflow-hidden transition-all duration-300 flex flex-col ${className}`}
      style={{ width: collapsed ? 48 : width }}
    >
      {/* Status Bar - Top */}
      {!collapsed && (
        <div className="flex-shrink-0 h-8 border-b border-orange-500/20 bg-gradient-to-r from-zinc-950 via-zinc-900/80 to-zinc-950 flex items-center justify-between px-3 relative overflow-hidden">
          {/* Scanline effect */}
          <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(251,146,60,0.03) 0px, transparent 1px, transparent 2px)',
          }} />
          
          <div className="flex items-center gap-2 relative z-10">
            {Icon && <Icon className="w-3 h-3 text-orange-400" />}
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

      {/* Tabbed Main Content */}
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
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full overflow-y-auto p-3 space-y-3">
                  {statusMetrics.map((metric, i) => {
                    const history = metricHistory[metric.label] || [];
                    const trend = history.length > 1
                      ? history[history.length - 1].value - history[0].value
                      : 0;
                    const trendColor = trend > 0 ? 'text-green-400' : trend < 0 ? 'text-red-400' : 'text-zinc-400';

                    return (
                      <div key={i} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-zinc-400 uppercase tracking-wider">{metric.label}</span>
                          <span className={`text-xs font-mono font-semibold ${trendColor}`}>
                            {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-2xl text-zinc-200 font-mono font-bold">{metric.value}</span>
                          <div className="flex-1 min-w-0">
                            <MetricSparkline
                              data={history}
                              color={trend >= 0 ? '#22c55e' : '#ef4444'}
                              height={40}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel defaultSize={50} minSize={20}>
                <div className="h-full overflow-y-auto p-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Performance Overview
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase">Avg Response</div>
                      <div className="text-lg text-zinc-200 font-mono font-semibold">142ms</div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase">Uptime</div>
                      <div className="text-lg text-zinc-200 font-mono font-semibold">99.8%</div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase">Throughput</div>
                      <div className="text-lg text-zinc-200 font-mono font-semibold">1.2k/s</div>
                    </div>
                    <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                      <div className="text-[10px] text-zinc-500 uppercase">Errors</div>
                      <div className="text-lg text-zinc-200 font-mono font-semibold">0.02%</div>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-y-auto mt-0 p-3 space-y-1 data-[state=inactive]:hidden">
            {logEntries.length > 0 ? (
              logEntries.map((log, i) => (
                <div
                  key={i}
                  className="rounded border border-zinc-800 bg-zinc-900/40 p-2 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.level === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : log.level === 'info'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <div className="text-zinc-300">{log.message}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-zinc-600 text-xs">No log entries</div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Metrics Bar - Bottom */}
      {!collapsed && showMetrics && statusMetrics.length > 0 && (
        <div className="flex-shrink-0 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
          <div className="grid grid-cols-3 divide-x divide-zinc-800">
            {statusMetrics.slice(0, 3).map((metric, idx) => (
              <div key={idx} className="px-2 py-1.5 flex flex-col items-center">
                <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">{metric.label}</span>
                <span className="text-[10px] font-mono text-orange-400 font-bold">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Strip - Absolutely positioned */}
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
            <DropdownMenuContent align={isLeft ? "start" : "end"} className="w-48 bg-zinc-900 border-zinc-700 text-zinc-200">
              <DropdownMenuItem onClick={() => setPanelMode('standard')} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                Standard View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPanelMode('compact')} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
                Compact View
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-700" />
              <DropdownMenuItem onClick={() => setShowMetrics(!showMetrics)} className="text-xs focus:bg-zinc-800 focus:text-orange-400">
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

      {/* Resize Handle */}
      {!collapsed && (
        <div
          className={`absolute top-0 ${isLeft ? 'right-0' : 'left-0'} w-1 h-full cursor-col-resize hover:bg-orange-500/40 transition-colors z-10 group`}
          onMouseDown={onResize}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-orange-500/20 group-hover:bg-orange-500/60 transition-colors" />
        </div>
      )}

      {/* Collapsed Tab */}
      {collapsed && (
        <div className="h-full flex flex-col items-center justify-center gap-4 w-12 relative">
          {/* Vertical title */}
          <div className="flex flex-col items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-orange-400" />}
            <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 [writing-mode:vertical-lr] rotate-180">
              {title}
            </span>
          </div>
          
          {/* Status indicators */}
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