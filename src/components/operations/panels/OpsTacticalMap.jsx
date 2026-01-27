import { AlertTriangle } from 'lucide-react';

export default function OpsTacticalMap({
  session,
  layer = 'personnel',
  selectedMarker,
  onSelectMarker,
  isCommandRole
}) {
  const markers = session?.brief_artifact?.tactical_markers || [];

  // Placeholder map implementation
  // In production, integrate with react-leaflet or Three.js for actual tactical map

  return (
    <div className="h-full w-full relative bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <div className="text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="text-sm text-zinc-500">TACTICAL MAP INTEGRATION</p>
        <p className="text-[8px] text-zinc-600">
          {markers.length} markers loaded | Layer: {layer} | {isCommandRole ? 'Command' : 'Member'} mode
        </p>
        {selectedMarker && (
          <div className="mt-4 p-2 bg-zinc-900 border border-zinc-800 rounded-none">
            <p className="text-[8px] text-zinc-400">Selected: {selectedMarker.label}</p>
          </div>
        )}
      </div>
    </div>
  );
}