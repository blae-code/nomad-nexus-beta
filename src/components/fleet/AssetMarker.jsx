import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Ship, AlertCircle, CheckCircle } from 'lucide-react';

const STATUS_COLORS = {
  OPERATIONAL: { hex: '#10b981', name: 'Operational' },
  MAINTENANCE: { hex: '#f59e0b', name: 'Maintenance' },
  DESTROYED: { hex: '#ef4444', name: 'Destroyed' },
  MISSION: { hex: '#3b82f6', name: 'On Mission' },
  UNKNOWN: { hex: '#6b7280', name: 'Unknown' },
};

export default function AssetMarker({ asset, events, isSelected, onSelect }) {
  if (!asset.current_location?.lat || !asset.current_location?.lng) return null;

  const statusColor = STATUS_COLORS[asset.status] || STATUS_COLORS.UNKNOWN;
  const deployedEvents = events.filter((e) => e.assigned_asset_ids?.includes(asset.id));

  // Create custom icon based on status
  const icon = L.divIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${statusColor.hex};
        border: 3px solid ${isSelected ? '#fff' : '#ccc'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        transform: ${isSelected ? 'scale(1.3)' : 'scale(1)'};
        transition: transform 0.2s;
      ">
        ⚓
      </div>
    `,
    iconSize: [40, 40],
    className: 'asset-marker',
  });

  return (
    <Marker
      position={[asset.current_location.lat, asset.current_location.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onSelect(),
      }}
    >
      <Popup>
        <div className="space-y-2 min-w-[200px]">
          <div className="font-bold text-white">{asset.name}</div>
          <div className="text-xs text-zinc-400">{asset.model}</div>

          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColor.hex }}
            />
            <span className="text-xs text-zinc-300">{statusColor.name}</span>
          </div>

          {asset.location && <div className="text-xs text-zinc-400">{asset.location}</div>}

          {deployedEvents.length > 0 && (
            <div className="pt-2 border-t border-zinc-700">
              <div className="text-xs font-bold text-blue-400 mb-1">Deployed in:</div>
              {deployedEvents.map((e) => (
                <div key={e.id} className="text-xs text-zinc-300">
                  • {e.title}
                </div>
              ))}
            </div>
          )}

          {asset.maintenance_notes && (
            <div className="pt-2 border-t border-zinc-700">
              <div className="text-xs font-bold text-yellow-400">Notes:</div>
              <div className="text-xs text-yellow-200">{asset.maintenance_notes}</div>
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}