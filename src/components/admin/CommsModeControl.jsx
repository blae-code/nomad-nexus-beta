import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Zap, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function CommsModeControl() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch comms mode
  const { data: commsMode, isLoading: isFetching } = useQuery({
    queryKey: ['commsMode'],
    queryFn: async () => {
      const modes = await base44.entities.CommsMode.list();
      return modes[0];
    }
  });

  // Toggle mode mutation
  const toggleModeMutation = useMutation({
    mutationFn: async () => {
      const newMode = commsMode?.mode === 'LIVE' ? 'SIM' : 'LIVE';
      
      if (commsMode?.id) {
        await base44.entities.CommsMode.update(commsMode.id, {
          mode: newMode,
          last_changed_by: (await base44.auth.me()).id,
          last_changed_at: new Date().toISOString()
        });
      } else {
        await base44.entities.CommsMode.create({
          mode: newMode,
          last_changed_by: (await base44.auth.me()).id,
          last_changed_at: new Date().toISOString()
        });
      }
      
      return newMode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commsMode'] });
      toast.success(`Switched to ${commsMode?.mode === 'LIVE' ? 'SIM' : 'LIVE'} mode`);
    },
    onError: (error) => {
      toast.error('Failed to toggle comms mode');
      console.error(error);
    }
  });

  const handleToggle = async () => {
    setIsLoading(true);
    await toggleModeMutation.mutateAsync();
    setIsLoading(false);
  };

  if (isFetching) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-zinc-300">Comms Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-zinc-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const isLiveMode = commsMode?.mode === 'LIVE';
  const canToggle = !!commsMode;

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm font-bold text-zinc-300 flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          Comms Mode
        </CardTitle>
        <CardDescription className="text-xs text-zinc-600">
          Toggle between simulated and live voice operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current Mode Display */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">Current Mode:</span>
            <Badge className={isLiveMode ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}>
              {commsMode?.mode || 'SIM'}
            </Badge>
          </div>
          {commsMode?.last_changed_at && (
            <div className="text-[10px] text-zinc-600 mt-2">
              Last changed: {new Date(commsMode.last_changed_at).toLocaleString()}
            </div>
          )}
        </div>

        {/* Mode Description */}
        {isLiveMode ? (
          <div className="p-3 bg-red-950/20 border border-red-800/50 rounded text-xs text-red-300">
            <div className="font-bold mb-1 flex items-center gap-2">
              <Zap className="w-3 h-3" />
              LIVE Mode Active
            </div>
            <p>Real LiveKit connections. Requires valid API keys and network.</p>
          </div>
        ) : (
          <div className="p-3 bg-blue-950/20 border border-blue-800/50 rounded text-xs text-blue-300">
            <div className="font-bold mb-1 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              SIM Mode Active
            </div>
            <p>Simulated participants and network. No external dependencies.</p>
          </div>
        )}

        {/* Toggle Button */}
        <Button
          onClick={handleToggle}
          disabled={isLoading || !canToggle}
          className={`w-full ${isLiveMode 
            ? 'bg-blue-600 hover:bg-blue-700' 
            : 'bg-red-600 hover:bg-red-700'
          } text-white font-bold`}
        >
          Switch to {isLiveMode ? 'SIM' : 'LIVE'} Mode
        </Button>

        {!canToggle && (
          <p className="text-xs text-zinc-600 text-center">Initialize CommsMode entity first</p>
        )}
      </CardContent>
    </Card>
  );
}