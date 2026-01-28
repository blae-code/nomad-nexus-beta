import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function IncidentHeatmap({ activeIncidents }) {
  // Mock location grid (9x9 operational sectors)
  const gridSize = 9;
  
  const heatmapData = useMemo(() => {
    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    activeIncidents.forEach(incident => {
      if (incident.coordinates?.x && incident.coordinates?.y) {
        const x = Math.floor((incident.coordinates.x / 100) * gridSize);
        const y = Math.floor((incident.coordinates.y / 100) * gridSize);
        if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
          grid[y][x]++;
        }
      }
    });
    
    return grid;
  }, [activeIncidents]);

  const maxIncidents = Math.max(...heatmapData.flat());

  const getHeatColor = (count) => {
    if (count === 0) return 'bg-zinc-900/20 border-zinc-800/30';
    const intensity = Math.min(count / Math.max(maxIncidents, 1), 1);
    if (intensity > 0.7) return 'bg-red-900/80 border-red-700';
    if (intensity > 0.4) return 'bg-orange-900/60 border-orange-700';
    return 'bg-yellow-900/40 border-yellow-700';
  };

  const handleExportMap = () => {
    const link = document.createElement('a');
    link.href = '#';
    link.download = `incident-heatmap-${new Date().toISOString().split('T')[0]}.png`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="text-[7px] bg-red-900/30 text-red-400 border-red-900/50">HEATMAP</Badge>
          <span className="text-[9px] font-bold text-zinc-300">Incident Density Map</span>
        </div>
        <button
          onClick={handleExportMap}
          className="text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>

      {/* Heatmap Grid */}
      <div className="border border-zinc-800 bg-zinc-900/30 p-4 overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(30px, 1fr))` }}>
          {heatmapData.map((row, y) =>
            row.map((count, x) => (
              <div
                key={`${x}-${y}`}
                className={cn(
                  'w-8 h-8 border transition-all cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-zinc-900',
                  getHeatColor(count)
                )}
                title={`Sector ${x},${y}: ${count} incident${count !== 1 ? 's' : ''}`}
              >
                {count > 0 && (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{count}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">Intensity Scale</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-900/40 border border-yellow-700" />
              <span className="text-[8px] text-zinc-400">Low (1-2)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-900/60 border border-orange-700" />
              <span className="text-[8px] text-zinc-400">Medium (3-5)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-900/80 border border-red-700" />
              <span className="text-[8px] text-zinc-400">High (6+)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">Stats</div>
          <div className="space-y-1 text-[8px]">
            <div className="flex justify-between">
              <span className="text-zinc-400">Total Incidents:</span>
              <span className="text-zinc-200 font-bold">{activeIncidents.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Hot Zones:</span>
              <span className="text-zinc-200 font-bold">{heatmapData.flat().filter(c => c > 0).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Max Density:</span>
              <span className="text-zinc-200 font-bold">{maxIncidents}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}