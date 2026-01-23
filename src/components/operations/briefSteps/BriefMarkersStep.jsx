import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

export default function BriefMarkersStep({ briefData, onChange }) {
  const [newMarker, setNewMarker] = useState({
    type: 'rally',
    label: '',
    coordinates: { lat: 0, lng: 0 }
  });

  const markers = briefData.tactical_markers || [];
  const hasRally = markers.some(m => m.type === 'rally');
  const hasExtraction = markers.some(m => m.type === 'extraction');

  const markerTypes = [
    { id: 'rally', label: 'Rally Point', icon: '📍' },
    { id: 'extraction', label: 'Extraction Zone', icon: '🚁' },
    { id: 'objective', label: 'Objective', icon: '🎯' },
    { id: 'hazard', label: 'Hazard Zone', icon: '⚠️' },
    { id: 'checkpoint', label: 'Checkpoint', icon: '🚩' }
  ];

  const handleAdd = () => {
    if (!newMarker.label.trim()) return;
    onChange({
      tactical_markers: [...markers, { id: Date.now(), ...newMarker }]
    });
    setNewMarker({ type: 'rally', label: '', coordinates: { lat: 0, lng: 0 } });
  };

  const handleRemove = (id) => {
    onChange({
      tactical_markers: markers.filter(m => m.id !== id)
    });
  };

  const isFocused = briefData.comms_plan?.doctrine === 'focused';

  return (
    <div className="space-y-4 p-4">
      {/* Warnings for Focused Ops */}
      {isFocused && (!hasRally || !hasExtraction) && (
        <div className="p-2 border border-amber-800 bg-amber-950/20 space-y-1">
          <div className="flex gap-2 text-[8px] text-amber-300">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Focused ops require:</p>
              <p>• Rally Point {hasRally && '✓'}</p>
              <p>• Extraction Zone {hasExtraction && '✓'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
            Marker Type
          </label>
          <div className="grid grid-cols-3 gap-1">
            {markerTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setNewMarker(prev => ({ ...prev, type: type.id }))}
                className={`py-2 text-[8px] font-bold border rounded-none transition-all ${
                  newMarker.type === type.id
                    ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                    : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                }`}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={newMarker.label}
          onChange={(e) => setNewMarker(prev => ({ ...prev, label: e.target.value }))}
          placeholder="e.g., LZ Alpha"
          className="w-full px-2 py-2 bg-zinc-900/50 border border-zinc-800 text-[9px] rounded-none focus:outline-none focus:border-[#ea580c] text-zinc-200"
        />

        <Button
          onClick={handleAdd}
          disabled={!newMarker.label.trim()}
          className="w-full bg-[#ea580c] hover:bg-[#ea580c]/80 h-8 text-[9px]"
        >
          <Plus className="w-3 h-3 mr-1" />
          ADD MARKER
        </Button>
      </div>

      {/* Current Markers */}
      <div className="space-y-1">
        {markers.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic py-4 text-center">
            No markers added yet
          </p>
        ) : (
          markers.map(marker => {
            const type = markerTypes.find(t => t.id === marker.type);
            return (
              <div
                key={marker.id}
                className="flex items-center justify-between gap-2 p-2 bg-zinc-900/30 border border-zinc-800"
              >
                <span className="text-[9px] text-zinc-300">
                  <span>{type?.icon}</span>
                  <span className="ml-1 font-bold">{marker.label}</span>
                </span>
                <button
                  onClick={() => handleRemove(marker.id)}
                  className="p-1 hover:bg-red-900/30"
                >
                  <Trash2 className="w-3 h-3 text-red-500" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[8px] text-zinc-500">
        Step 5 of 6: Define tactical markers (Rally, Extraction, Objectives, etc.).
      </p>
    </div>
  );
}