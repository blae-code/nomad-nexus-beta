import React, { useState, useEffect } from 'react';
import { Scan, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnomalyDetector({ widgetId, onRemove, isDragging }) {
  const [scanning, setScanning] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    if (!scanning) return;
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) {
          generateAnomalies();
          return 0;
        }
        return p + 5;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [scanning]);

  const generateAnomalies = () => {
    if (Math.random() > 0.3) {
      setAnomalies(prev => [{
        id: Date.now(),
        type: ['Energy Spike', 'Quantum Distortion', 'Unknown Signal'][Math.floor(Math.random() * 3)],
        severity: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
        location: `${Math.floor(Math.random() * 360)}°`,
        time: new Date()
      }, ...prev].slice(0, 10));
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.04),transparent_65%)] animate-pulse pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Anomaly Scan</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-shrink-0 p-2 bg-zinc-900/40 border-b border-zinc-800/60 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Scan Progress</span>
          <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all" style={{ width: `${scanProgress}%` }} />
          </div>
          <span className="text-[9px] text-red-400 font-bold">{scanProgress}%</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {anomalies.map(anomaly => (
          <div key={anomaly.id} className={`p-2 border rounded animate-in slide-in-from-top duration-200 ${
            anomaly.severity === 'HIGH' ? 'border-red-700/60 bg-red-950/30' :
            anomaly.severity === 'MEDIUM' ? 'border-orange-700/60 bg-orange-950/30' :
            'border-zinc-700/60 bg-zinc-900/30'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-3 h-3 mt-0.5 ${
                anomaly.severity === 'HIGH' ? 'text-red-500' :
                anomaly.severity === 'MEDIUM' ? 'text-orange-500' : 'text-zinc-500'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-bold text-zinc-300">{anomaly.type}</div>
                <div className="text-[9px] text-zinc-600">@ {anomaly.location}</div>
              </div>
            </div>
          </div>
        ))}
        {anomalies.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No anomalies detected
          </div>
        )}
      </div>
    </div>
  );
}