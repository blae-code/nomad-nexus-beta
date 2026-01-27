import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { Flag, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RallyPointManager({ eventId, currentNetId }) {
  const [newRallyName, setNewRallyName] = useState('');
  const [newRallyCoords, setNewRallyCoords] = useState({ lat: 0, lng: 0 });
  const queryClient = useQueryClient();

  const { data: rallies = [] } = useQuery({
    queryKey: ['rally-points', eventId],
    queryFn: async () => {
      const markers = await base44.entities.MapMarker.list();
      return markers.filter(m => m.type === 'rally' && m.event_id === eventId);
    }
  });

  const createRallyMutation = useMutation({
    mutationFn: async (rallyData) => {
      return base44.entities.MapMarker.create(rallyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-points'] });
      toast.success('Rally point created');
      setNewRallyName('');
      setNewRallyCoords({ lat: 0, lng: 0 });
    }
  });

  const deleteRallyMutation = useMutation({
    mutationFn: async (rallyId) => {
      return base44.entities.MapMarker.delete(rallyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rally-points'] });
      toast.success('Rally point deleted');
    }
  });

  const broadcastRally = async (rally) => {
    try {
      await base44.entities.EventLog.create({
        event_id: eventId,
        type: 'COMMS',
        severity: 'MEDIUM',
        summary: `RALLY POINT: ${rally.label}`,
        details: {
          coordinates: rally.coordinates,
          marker_id: rally.id,
          timestamp: new Date().toISOString()
        }
      });
      
      toast.success(`Rally point "${rally.label}" broadcasted to net`);
    } catch (error) {
      toast.error('Failed to broadcast rally point');
    }
  };

  const copyCoordinates = (coords) => {
    const text = `${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    toast.success('Coordinates copied');
  };

  const handleCreateRally = async () => {
    if (!newRallyName.trim()) {
      toast.error('Enter rally point name');
      return;
    }

    createRallyMutation.mutate({
      event_id: eventId,
      type: 'rally',
      label: newRallyName,
      coordinates: newRallyCoords,
      color: '#ea580c'
    });
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-orange-500" />
          Rally Points
        </OpsPanelTitle>
      </OpsPanelHeader>
      <OpsPanelContent className="space-y-3">
        {/* Create Rally */}
        <div className="space-y-2 pb-3 border-b border-zinc-800">
          <input
            type="text"
            placeholder="Rally name..."
            value={newRallyName}
            onChange={(e) => setNewRallyName(e.target.value)}
            className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-white placeholder-zinc-600 font-mono"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Latitude"
              value={newRallyCoords.lat}
              onChange={(e) => setNewRallyCoords(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-white placeholder-zinc-600 font-mono"
            />
            <input
              type="number"
              placeholder="Longitude"
              value={newRallyCoords.lng}
              onChange={(e) => setNewRallyCoords(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
              className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-white placeholder-zinc-600 font-mono"
            />
          </div>
          <Button
            onClick={handleCreateRally}
            disabled={createRallyMutation.isPending}
            className="w-full h-7 text-xs bg-[#ea580c] hover:bg-[#c2410c] text-white"
          >
            {createRallyMutation.isPending ? 'Creating...' : 'Create Rally Point'}
          </Button>
        </div>

        {/* Rally List */}
        {rallies.length > 0 ? (
          <div className="space-y-2">
            {rallies.map(rally => (
              <div key={rally.id} className="bg-zinc-900/50 border border-zinc-800 p-2 rounded space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#ea580c]" />
                      {rally.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono mt-1">
                      {rally.coordinates.lat.toFixed(2)}, {rally.coordinates.lng.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6"
                    onClick={() => copyCoordinates(rally.coordinates)}
                  >
                    <Copy className="w-3 h-3 text-zinc-500 hover:text-white" />
                  </Button>
                </div>
                
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-6 text-[10px] border-zinc-700 hover:bg-zinc-800"
                    onClick={() => broadcastRally(rally)}
                  >
                    Broadcast
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 text-zinc-500 hover:text-red-500"
                    onClick={() => deleteRallyMutation.mutate(rally.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-[10px] text-zinc-500">
            NO RALLY POINTS SET
          </div>
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}