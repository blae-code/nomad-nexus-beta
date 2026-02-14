import React from 'react';
import { Map, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TacticalMap from '@/components/tactical/TacticalMap';

export default function TacticalMapWidget({ widgetId, config, onRemove, isDragging }) {
  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Tactical Map</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <TacticalMap compact={true} />
      </div>
    </>
  );
}