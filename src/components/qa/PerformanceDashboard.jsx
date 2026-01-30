/**
 * Performance Dashboard for QA Console
 * Real-time performance monitoring and analytics
 */

import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, CheckCircle2, Clock, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [sampling, setSampling] = useState(false);

  const collectMetrics = () => {
    const now = performance.now();
    const memoryInfo = performance.memory ? {
      usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2),
      totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2),
      jsHeapSizeLimit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2),
    } : null;

    const navigationTiming = performance.getEntriesByType('navigation')[0];
    const pageLoadTime = navigationTiming ? navigationTiming.loadEventEnd - navigationTiming.fetchStart : 0;

    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find((p) => p.name === 'first-paint')?.startTime || 0;
    const firstContentfulPaint = paintEntries.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;

    const newMetrics = {
      timestamp: new Date(),
      pageLoadTime: pageLoadTime.toFixed(0),
      firstPaint: firstPaint.toFixed(0),
      firstContentfulPaint: firstContentfulPaint.toFixed(0),
      memory: memoryInfo,
      documentReady: document.readyState,
    };

    setMetrics(newMetrics);
    setHistory((prev) => [...prev.slice(-9), newMetrics]);
  };

  const startSampling = () => {
    setSampling(true);
    collectMetrics();
    const interval = setInterval(collectMetrics, 5000);
    return () => {
      clearInterval(interval);
      setSampling(false);
    };
  };

  const stopSampling = () => {
    setSampling(false);
  };

  const exportMetrics = () => {
    const csv = [
      ['Timestamp', 'Page Load (ms)', 'First Paint (ms)', 'FCP (ms)', 'Heap Used (MB)', 'Document State'],
      ...history.map((m) => [
        m.timestamp.toLocaleTimeString(),
        m.pageLoadTime,
        m.firstPaint,
        m.firstContentfulPaint,
        m.memory?.usedJSHeapSize || 'N/A',
        m.documentReady,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    const link = document.createElement('a');
    link.setAttribute('href', uri);
    link.setAttribute('download', `performance_metrics_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black uppercase text-white tracking-wide">Real-Time Performance</h3>
        <div className="flex gap-2">
          {!sampling ? (
            <Button onClick={startSampling} size="sm" className="bg-green-600 hover:bg-green-500">
              <Activity className="w-4 h-4 mr-2" />
              Start Sampling
            </Button>
          ) : (
            <Button onClick={stopSampling} size="sm" variant="destructive">
              <Activity className="w-4 h-4 mr-2 animate-pulse" />
              Sampling...
            </Button>
          )}
          {history.length > 0 && (
            <Button onClick={exportMetrics} size="sm" variant="outline">
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-zinc-400">Page Load Time</span>
            </div>
            <div className="text-2xl font-black text-blue-400">{metrics.pageLoadTime}ms</div>
            <div className="text-[10px] text-zinc-500 mt-1">From fetch to complete</div>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-xs text-zinc-400">First Paint</span>
            </div>
            <div className="text-2xl font-black text-green-400">{metrics.firstPaint}ms</div>
            <div className="text-[10px] text-zinc-500 mt-1">Initial render time</div>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-zinc-400">First Contentful Paint</span>
            </div>
            <div className="text-2xl font-black text-purple-400">{metrics.firstContentfulPaint}ms</div>
            <div className="text-[10px] text-zinc-500 mt-1">Content visible time</div>
          </div>

          {metrics.memory && (
            <>
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-zinc-400">Heap Used</span>
                </div>
                <div className="text-2xl font-black text-cyan-400">{metrics.memory.usedJSHeapSize}MB</div>
                <div className="text-[10px] text-zinc-500 mt-1">Of {metrics.memory.totalJSHeapSize}MB total</div>
              </div>

              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400" />
                  <span className="text-xs text-zinc-400">Heap Limit</span>
                </div>
                <div className="text-2xl font-black text-orange-400">{metrics.memory.jsHeapSizeLimit}MB</div>
                <div className="text-[10px] text-zinc-500 mt-1">Max available memory</div>
              </div>
            </>
          )}

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-400">Document State</span>
            </div>
            <div className="text-lg font-black text-yellow-400 capitalize">{metrics.documentReady}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Page status</div>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-4">
          <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3">Sample History</h4>
          <div className="space-y-1 text-xs font-mono">
            {history.map((m, idx) => (
              <div key={idx} className="flex justify-between text-zinc-400 hover:text-zinc-300">
                <span>{m.timestamp.toLocaleTimeString()}</span>
                <span className="text-blue-400">{m.pageLoadTime}ms</span>
                <span className="text-green-400">{m.firstContentfulPaint}ms</span>
                {m.memory && <span className="text-cyan-400">{m.memory.usedJSHeapSize}MB</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}