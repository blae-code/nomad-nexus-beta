import React from 'react';
import { Circle, Pencil, MapPin, Save, Share2, Trash2, Download, Upload } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';

export default function MapDrawingTools({
  drawMode,
  onChangeDrawMode,
  onSaveLayout,
  onShareLayout,
  onImportLayout,
  onClearElements,
  elementCount = 0,
  sessionActive = false,
  participants = [],
}) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[13] flex items-center gap-2">
      <div className="nexus-map-hud-panel flex items-center gap-1.5 px-2 py-1.5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-400 mr-1">Draw</div>
        
        <NexusButton
          size="sm"
          intent={drawMode === 'zone' ? 'primary' : 'subtle'}
          onClick={() => onChangeDrawMode(drawMode === 'zone' ? null : 'zone')}
          title="Draw zone (click and drag)"
        >
          <Circle className="w-3.5 h-3.5" />
        </NexusButton>
        
        <NexusButton
          size="sm"
          intent={drawMode === 'marker' ? 'primary' : 'subtle'}
          onClick={() => onChangeDrawMode(drawMode === 'marker' ? null : 'marker')}
          title="Place marker (click)"
        >
          <MapPin className="w-3.5 h-3.5" />
        </NexusButton>
        
        <NexusButton
          size="sm"
          intent={drawMode === 'path' ? 'primary' : 'subtle'}
          onClick={() => onChangeDrawMode(drawMode === 'path' ? null : 'path')}
          title="Draw path (click to add points)"
        >
          <Pencil className="w-3.5 h-3.5" />
        </NexusButton>

        <div className="w-px h-4 bg-zinc-700 mx-1" />

        <NexusButton
          size="sm"
          intent="subtle"
          onClick={onSaveLayout}
          title="Save map layout"
          disabled={elementCount === 0}
        >
          <Save className="w-3.5 h-3.5" />
        </NexusButton>

        <NexusButton
          size="sm"
          intent="subtle"
          onClick={onShareLayout}
          title="Share map layout"
          disabled={elementCount === 0}
        >
          <Share2 className="w-3.5 h-3.5" />
        </NexusButton>

        <NexusButton
          size="sm"
          intent="subtle"
          onClick={onImportLayout}
          title="Import map layout"
        >
          <Upload className="w-3.5 h-3.5" />
        </NexusButton>

        <NexusButton
          size="sm"
          intent="subtle"
          onClick={onClearElements}
          title="Clear all drawn elements"
          disabled={elementCount === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </NexusButton>

        {elementCount > 0 && (
          <NexusBadge tone="active">{elementCount} drawn</NexusBadge>
        )}
        
        {sessionActive && participants.length > 0 && (
          <NexusBadge tone="ok">{participants.length} active</NexusBadge>
        )}
      </div>
    </div>
  );
}