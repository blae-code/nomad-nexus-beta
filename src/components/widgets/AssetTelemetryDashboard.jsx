import React, { useState, useEffect } from 'react';
import { Ship, X, Gauge, Fuel, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function AssetTelemetryDashboard({ widgetId, onRemove, isDragging }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    loadAssets();
    const interval = setInterval(loadAssets, 8000);
    return () => clearInterval(interval);
  }, []);

  const loadAssets = async () => {
    try {
      const fleet = await base44.entities.FleetAsset.filter({ status: 'OPERATIONAL' }, '-updated_date', 8);
      setAssets(fleet.map(a => ({
        ...a,
        fuel: Math.floor(60 + Math.random() * 40),
        shields: Math.floor(70 + Math.random() * 30),
        systems: Math.floor(80 + Math.random() * 20)
      })));
    } catch (err) {
      console.error('Assets load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(220,38,38,0.05),transparent_60%)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Asset Telemetry</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {assets.map((asset, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-zinc-300 truncate flex-1">{asset.name}</span>
              <span className="text-[9px] text-zinc-600 font-mono">{asset.model?.substring(0, 12)}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Fuel className="w-3 h-3 text-orange-500" />
                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className={`h-full transition-all ${asset.fuel > 30 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${asset.fuel}%` }} />
                </div>
                <span className="text-[9px] text-zinc-500 font-bold w-10 text-right">{asset.fuel}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-cyan-500" />
                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 transition-all" style={{ width: `${asset.shields}%` }} />
                </div>
                <span className="text-[9px] text-zinc-500 font-bold w-10 text-right">{asset.shields}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-3 h-3 text-green-500" />
                <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all" style={{ width: `${asset.systems}%` }} />
                </div>
                <span className="text-[9px] text-zinc-500 font-bold w-10 text-right">{asset.systems}%</span>
              </div>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No assets available
          </div>
        )}
      </div>
    </div>
  );
}