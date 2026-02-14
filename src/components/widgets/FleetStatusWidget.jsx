import React, { useState, useEffect } from 'react';
import { Ship, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function FleetStatusWidget({ widgetId, config, onRemove, isDragging }) {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const allAssets = await base44.entities.FleetAsset.list('-updated_date', 20);
      setAssets(allAssets);
    } catch (error) {
      console.error('[FleetStatusWidget] Failed to load assets:', error);
    }
  };

  const statusColors = {
    OPERATIONAL: 'text-green-500',
    MAINTENANCE: 'text-yellow-500',
    DESTROYED: 'text-red-500',
    MISSION: 'text-blue-500',
    UNKNOWN: 'text-zinc-500',
  };

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Ship className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Fleet Status</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {assets.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-4">No fleet assets</div>
        ) : (
          assets.map((asset) => (
            <div key={asset.id} className="bg-zinc-800/50 rounded p-2 border border-orange-500/10">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm font-bold text-zinc-200">{asset.name}</div>
                  <div className="text-xs text-zinc-500">{asset.model}</div>
                  {asset.location && (
                    <div className="text-xs text-zinc-600 mt-1">{asset.location}</div>
                  )}
                </div>
                <span className={`text-xs font-bold ${statusColors[asset.status] || 'text-zinc-500'}`}>
                  {asset.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}