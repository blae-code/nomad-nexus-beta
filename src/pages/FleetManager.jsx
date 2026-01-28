import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Box, AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function FleetManager() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    const init = async () => {
      const assetsList = await base44.entities.FleetAsset.list('name', 100);
      setAssets(assetsList);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPERATIONAL': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'MAINTENANCE': return <Wrench className="w-5 h-5 text-yellow-500" />;
      case 'DESTROYED': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Box className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Fleet Manager</h1>
          <p className="text-zinc-400 text-sm">Asset management</p>
        </div>
        <Button>
          <Box className="w-4 h-4 mr-2" />
          Add Asset
        </Button>
      </div>

      <div className="grid gap-4">
        {assets.length === 0 ? (
          <EmptyState 
            icon={Box}
            title="No fleet assets registered"
            description="Add ships and vehicles to track your fleet"
          />
        ) : (
          assets.map((asset) => (
            <div
              key={asset.id}
              className="bg-zinc-900/50 border-2 border-zinc-800 hover:border-orange-500/50 p-6 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(asset.status)}
                    <h3 className="text-xl font-bold text-white uppercase">{asset.name}</h3>
                  </div>

                  <p className="text-zinc-400 mb-3">{asset.model}</p>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Status:</span>
                      <span className="ml-2 text-white">{asset.status}</span>
                    </div>
                    {asset.location && (
                      <div>
                        <span className="text-zinc-500">Location:</span>
                        <span className="ml-2 text-white">{asset.location}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-500">Type:</span>
                      <span className="ml-2 text-white">{asset.type}</span>
                    </div>
                  </div>

                  {asset.maintenance_notes && (
                    <div className="mt-3 text-sm text-zinc-400">
                      <span className="text-zinc-500">Notes:</span> {asset.maintenance_notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
  }