import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const STATUS_CONFIG = {
  OPERATIONAL: { bg: 'bg-green-950/30', border: 'border-green-600/50', text: 'text-green-400' },
  MAINTENANCE: { bg: 'bg-yellow-950/30', border: 'border-yellow-600/50', text: 'text-yellow-400' },
  DESTROYED: { bg: 'bg-red-950/30', border: 'border-red-600/50', text: 'text-red-400' },
  MISSION: { bg: 'bg-blue-950/30', border: 'border-blue-600/50', text: 'text-blue-400' },
  UNKNOWN: { bg: 'bg-zinc-800/30', border: 'border-zinc-600/50', text: 'text-zinc-400' },
};

export default function FleetList({ assets, selectedAsset, onSelectAsset, getDeployedEvents }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.model.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  const grouped = {
    OPERATIONAL: filteredAssets.filter((a) => a.status === 'OPERATIONAL'),
    MISSION: filteredAssets.filter((a) => a.status === 'MISSION'),
    MAINTENANCE: filteredAssets.filter((a) => a.status === 'MAINTENANCE'),
    DESTROYED: filteredAssets.filter((a) => a.status === 'DESTROYED'),
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900/30">
      <div className="p-4 border-b border-zinc-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {Object.entries(grouped).map(
          ([status, statusAssets]) =>
            statusAssets.length > 0 && (
              <div key={status}>
                <div className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  {status} ({statusAssets.length})
                </div>
                <div className="space-y-2">
                  {statusAssets.map((asset) => {
                    const config = STATUS_CONFIG[asset.status];
                    const deployed = getDeployedEvents(asset.id);
                    const isSelected = selectedAsset?.id === asset.id;

                    return (
                      <button
                        key={asset.id}
                        onClick={() => onSelectAsset(asset)}
                        className={`w-full text-left p-3 rounded border transition ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500'
                            : `${config.bg} ${config.border} hover:border-purple-500/50`
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-bold text-white text-sm">{asset.name}</div>
                            <div className="text-xs text-zinc-400">{asset.model}</div>
                          </div>
                          <div className={`text-xs font-bold px-2 py-1 rounded ${config.text} bg-black/30`}>
                            {status}
                          </div>
                        </div>

                        {asset.location && (
                          <div className="text-xs text-zinc-400 mb-2">
                            📍 {asset.location}
                          </div>
                        )}

                        {deployed.length > 0 && (
                          <div className="text-xs text-blue-300">
                            🎯 Deployed in {deployed.length} operation{deployed.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
        )}

        {filteredAssets.length === 0 && (
          <div className="text-center py-12 text-zinc-500">No assets found</div>
        )}
      </div>
    </div>
  );
}