import React from 'react';
import { Ship, MapPin, AlertTriangle, Calendar } from 'lucide-react';

const STATUS_COLORS = {
  OPERATIONAL: 'text-green-400',
  MAINTENANCE: 'text-yellow-400',
  DESTROYED: 'text-red-400',
  MISSION: 'text-blue-400',
  UNKNOWN: 'text-zinc-400',
};

export default function AssetDetails({ asset, deployedEvents }) {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600/20 border border-blue-600/50 rounded flex items-center justify-center">
            <Ship className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">{asset.name}</h2>
            <p className="text-sm text-zinc-400">{asset.model}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded">
          <div className="text-xs text-zinc-400 mb-1">Status</div>
          <div className={`text-lg font-bold ${STATUS_COLORS[asset.status]}`}>{asset.status}</div>
        </div>
        <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded">
          <div className="text-xs text-zinc-400 mb-1">Type</div>
          <div className="text-lg font-bold text-white">{asset.type}</div>
        </div>
      </div>

      {/* Location */}
      {asset.current_location?.lat && asset.current_location?.lng && (
        <div className="p-4 bg-blue-950/30 border border-blue-600/50 rounded space-y-2">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            <MapPin className="w-4 h-4" />
            Current Position
          </div>
          <div className="text-sm text-blue-300">
            Latitude: {asset.current_location.lat.toFixed(4)}°
          </div>
          <div className="text-sm text-blue-300">
            Longitude: {asset.current_location.lng.toFixed(4)}°
          </div>
          {asset.location && (
            <div className="text-sm text-blue-200 font-semibold pt-2 border-t border-blue-600/30">
              {asset.location}
            </div>
          )}
        </div>
      )}

      {/* Assigned Operator */}
      {asset.assigned_user_id && (
        <div className="p-4 bg-purple-950/30 border border-purple-600/50 rounded">
          <div className="text-xs text-purple-400 mb-2 font-bold">Assigned Operator</div>
          <div className="text-sm text-purple-300">{asset.assigned_user_id}</div>
        </div>
      )}

      {/* Deployed Operations */}
      {deployedEvents.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Active Deployments ({deployedEvents.length})
          </h3>
          <div className="space-y-2">
            {deployedEvents.map((event) => (
              <div key={event.id} className="p-3 bg-green-950/20 border border-green-600/30 rounded">
                <div className="font-bold text-green-300 text-sm">{event.title}</div>
                <div className="text-xs text-green-200 mt-1">{event.description}</div>
                <div className="text-xs text-green-400 mt-2">
                  {new Date(event.start_time).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Notes */}
      {asset.maintenance_notes && (
        <div className="p-4 bg-yellow-950/30 border border-yellow-600/50 rounded space-y-2">
          <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Maintenance Notes
          </div>
          <p className="text-sm text-yellow-200">{asset.maintenance_notes}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-zinc-400">Created</span>
          <span className="text-white">{new Date(asset.created_date).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Last Updated</span>
          <span className="text-white">{new Date(asset.updated_date).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}