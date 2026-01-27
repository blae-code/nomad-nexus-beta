import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function BriefMarkersStep({ briefData, onChange }) {
  const [markers, setMarkers] = useState(briefData.tactical_markers || []);
  const [newMarker, setNewMarker] = useState({ type: 'rally', label: '' });

  const handleAddMarker = () => {
    if (newMarker.label.trim() && newMarker.type) {
      const updated = [...markers, {
        id: Date.now(),
        type: newMarker.type,
        label: newMarker.label,
        coordinates: { lat: 0, lng: 0 }
      }];
      setMarkers(updated);
      onChange({ tactical_markers: updated });
      setNewMarker({ type: 'rally', label: '' });
    }
  };

  const markerTypes = ['rally', 'extraction', 'objective', 'hazard', 'checkpoint'];

  return (
    <div className="space-y-3 p-3">
      <div className="space-y-2">
        <select
          value={newMarker.type}
          onChange={(e) => setNewMarker({ ...newMarker, type: e.target.value })}
          className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-[8px] font-mono focus:outline-none focus:border-[#ea580c] rounded-none"
        >
          {markerTypes.map(t => (
            <option key={t} value={t}>{t.toUpperCase()}</option>
          ))}
        </select>

        <div className="flex gap-1">
          <input
            type="text"
            value={newMarker.label}
            onChange={(e) => setNewMarker({ ...newMarker, label: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleAddMarker()}
            placeholder="Marker label..."
            className="flex-1 px-2 py-1.5 bg-zinc-800 border border-zinc-700 text-[8px] font-mono focus:outline-none focus:border-[#ea580c] rounded-none"
          />
          <Button onClick={handleAddMarker} size="sm" className="bg-[#ea580c] h-8 px-2 text-[8px]">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {markers.map(marker => (
          <div key={marker.id} className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800 text-[8px]">
            <div>
              <span className="font-mono text-[#ea580c]">[{marker.type.toUpperCase()}]</span>
              <span className="text-zinc-400 ml-1">{marker.label}</span>
            </div>
            <button
              onClick={() => setMarkers(markers.filter(m => m.id !== marker.id)) && onChange({ tactical_markers: markers.filter(m => m.id !== marker.id) })}
              className="text-red-500 hover:text-red-400"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <p className="text-[8px] text-zinc-500">{markers.length} tactical markers placed.</p>
    </div>
  );
}