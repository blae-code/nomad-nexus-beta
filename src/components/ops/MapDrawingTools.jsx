import { Button } from '@/components/ui/button';
import { Circle, Pen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MapDrawingTools({
  drawMode,
  setDrawMode,
  onClearDrawings,
  canDraw = true
}) {
  return (
    <div className="flex gap-1 items-center px-2 py-2 border-l border-zinc-800 flex-wrap">
      <span className="text-[10px] text-zinc-600 uppercase font-bold">Draw:</span>
      
      <Button
        size="sm"
        variant={drawMode === 'polygon' ? 'default' : 'outline'}
        onClick={() => setDrawMode(drawMode === 'polygon' ? null : 'polygon')}
        disabled={!canDraw}
        className={cn(
          'h-7 text-[9px] gap-1',
          drawMode === 'polygon' ? 'bg-blue-600 hover:bg-blue-700' : 'border-zinc-700'
        )}
        title="Draw polygon by clicking map points"
      >
        <Pen className="w-3 h-3" />
        POLY
      </Button>

      <Button
        size="sm"
        variant={drawMode === 'circle' ? 'default' : 'outline'}
        onClick={() => setDrawMode(drawMode === 'circle' ? null : 'circle')}
        disabled={!canDraw}
        className={cn(
          'h-7 text-[9px] gap-1',
          drawMode === 'circle' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-zinc-700'
        )}
        title="Draw circle by clicking center and dragging"
      >
        <Circle className="w-3 h-3" />
        CIRCLE
      </Button>

      <Button
        size="sm"
        variant={drawMode === 'path' ? 'default' : 'outline'}
        onClick={() => setDrawMode(drawMode === 'path' ? null : 'path')}
        disabled={!canDraw}
        className={cn(
          'h-7 text-[9px] gap-1',
          drawMode === 'path' ? 'bg-amber-600 hover:bg-amber-700' : 'border-zinc-700'
        )}
        title="Draw movement path by clicking waypoints"
      >
        <Pen className="w-3 h-3" />
        PATH
      </Button>

      <div className="w-[1px] h-5 bg-zinc-800" />

      <Button
        size="sm"
        variant="ghost"
        onClick={onClearDrawings}
        className="h-7 text-[9px] gap-1 text-zinc-500 hover:text-red-400"
        title="Clear all drawings"
      >
        <Trash2 className="w-3 h-3" />
        CLEAR
      </Button>

      {drawMode && (
        <span className="text-[9px] text-blue-400 font-mono ml-auto animate-pulse">
          {drawMode === 'polygon' && 'Click to add points • Double-click to finish'}
          {drawMode === 'circle' && 'Click center • Drag for radius'}
          {drawMode === 'path' && 'Click waypoints • Double-click to finish'}
        </span>
      )}
    </div>
  );
}