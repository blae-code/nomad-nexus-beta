import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import AssetMarker from './AssetMarker';

// Default center (Stanton system approximation)
const DEFAULT_CENTER = [28, 15];
const DEFAULT_ZOOM = 4;

export default function FleetMap({ assets, events, selectedAsset, onSelectAsset }) {
  const bounds = useMemo(() => {
    if (assets.length === 0) return null;
    const validAssets = assets.filter((a) => a.current_location?.lat && a.current_location?.lng);
    if (validAssets.length === 0) return null;

    const lats = validAssets.map((a) => a.current_location.lat);
    const lngs = validAssets.map((a) => a.current_location.lng);

    return [
      [Math.min(...lats) - 2, Math.min(...lngs) - 2],
      [Math.max(...lats) + 2, Math.max(...lngs) + 2],
    ];
  }, [assets]);

  return (
    <div className="w-full h-full">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        bounds={bounds}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {assets.map((asset) => (
          <AssetMarker
            key={asset.id}
            asset={asset}
            events={events}
            isSelected={selectedAsset?.id === asset.id}
            onSelect={() => onSelectAsset(asset)}
          />
        ))}
      </MapContainer>
    </div>
  );
}