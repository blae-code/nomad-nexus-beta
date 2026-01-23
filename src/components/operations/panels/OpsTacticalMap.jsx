import React from 'react';

export default function OpsTacticalMap({ session, layer, selectedMarker, onSelectMarker, isCommandRole }) {
  const markers = session?.brief_artifact?.tactical_markers || [];

  return (
    <div className="w-full h-full bg-black flex items-center justify-center border-l border-zinc-800">
      {markers.length > 0 ? (
        <div className="p-4 text-center">
          <p className="text-[9px] text-zinc-500 mb-3">Tactical Map - {layer.toUpperCase()} Layer</p>
          <div className="grid grid-cols-2 gap-2">
            {markers.map(marker => (
              <button
                key={marker.id}
                onClick={() => onSelectMarker(marker.id)}
                className={`p-2 text-[8px] border rounded-none text-left ${
                  selectedMarker === marker.id
                    ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                    : 'bg-zinc-800/30 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                }`}
              >
                <div className="font-mono font-bold">[{marker.type.toUpperCase()}]</div>
                <div>{marker.label}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[9px] text-zinc-600">No markers defined for this operation</p>
      )}
    </div>
  );
}