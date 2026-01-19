import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link2, Unlink, ArrowRight, AlertTriangle, Zap, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasMinRank } from '@/components/permissions';

export default function NetPatchControl({ eventId, user, activeNets = [] }) {
  const [sourceNetId, setSourceNetId] = useState('');
  const [destNetId, setDestNetId] = useState('');
  const [isBidirectional, setIsBidirectional] = useState(false);
  
  const queryClient = useQueryClient();

  // Check if user can create patches (Voyager+ or admin)
  const canPatch = user && (hasMinRank(user, 'Voyager') || user.role === 'admin');

  // Fetch active patches
  const { data: patches = [] } = useQuery({
    queryKey: ['net-patches', eventId],
    queryFn: () => base44.entities.NetPatch.filter({ 
      event_id: eventId,
      status: 'active'
    }),
    enabled: !!eventId,
    refetchInterval: 5000
  });

  // Fetch all nets for selection
  const { data: nets = [] } = useQuery({
    queryKey: ['voice-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId
  });

  // Create patch mutation
  const createPatchMutation = useMutation({
    mutationFn: (patchData) => base44.entities.NetPatch.create(patchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-patches', eventId] });
      setSourceNetId('');
      setDestNetId('');
      setIsBidirectional(false);
    }
  });

  // Terminate patch mutation
  const terminatePatchMutation = useMutation({
    mutationFn: (patchId) => base44.entities.NetPatch.update(patchId, { status: 'terminated' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-patches', eventId] });
    }
  });

  // Check for feedback loops
  const wouldCreateLoop = (source, dest, bidirectional) => {
    if (!source || !dest) return false;
    
    // Direct loop
    if (source === dest) return true;
    
    // Check existing patches for indirect loops
    const existingReverse = patches.find(p => 
      p.source_net_id === dest && p.destination_net_id === source
    );
    
    if (existingReverse || bidirectional) {
      return true;
    }
    
    return false;
  };

  const handleCreatePatch = () => {
    if (!sourceNetId || !destNetId || !canPatch) return;
    
    if (wouldCreateLoop(sourceNetId, destNetId, isBidirectional)) {
      alert('Cannot create patch: would create audio feedback loop');
      return;
    }

    createPatchMutation.mutate({
      event_id: eventId,
      source_net_id: sourceNetId,
      destination_net_id: destNetId,
      is_bidirectional: isBidirectional
    });
  };

  const getNetLabel = (netId) => {
    const net = nets.find(n => n.id === netId);
    return net ? `${net.code} - ${net.label}` : 'Unknown Net';
  };

  const hasLoop = wouldCreateLoop(sourceNetId, destNetId, isBidirectional);

  if (!canPatch) {
    return (
      <Card className="border-zinc-800 bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Net Patch Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-zinc-600 text-xs">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <div className="font-mono">UNAUTHORIZED</div>
            <div className="text-[10px] mt-1">Voyager+ clearance required</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-cyan-500" />
          Net Patch Control
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Create Patch Form */}
        <div className="space-y-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            Create Patch
          </div>
          
          <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
            <Select value={sourceNetId} onValueChange={setSourceNetId}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Source Net" />
              </SelectTrigger>
              <SelectContent>
                {nets.map(net => (
                  <SelectItem key={net.id} value={net.id} className="text-xs">
                    {net.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <ArrowRight className={cn(
              "w-4 h-4 transition-colors",
              isBidirectional ? "text-cyan-500" : "text-zinc-600"
            )} />
            
            <Select value={destNetId} onValueChange={setDestNetId}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Dest Net" />
              </SelectTrigger>
              <SelectContent>
                {nets.map(net => (
                  <SelectItem key={net.id} value={net.id} className="text-xs">
                    {net.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasLoop && (
            <div className="flex items-center gap-2 p-2 bg-red-950/30 border border-red-900/50 rounded text-xs">
              <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
              <span className="text-red-400">Feedback loop detected</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
              <input 
                type="checkbox"
                checked={isBidirectional}
                onChange={(e) => setIsBidirectional(e.target.checked)}
                className="w-3 h-3"
              />
              Bidirectional
            </label>
            
            <Button
              size="sm"
              onClick={handleCreatePatch}
              disabled={!sourceNetId || !destNetId || hasLoop || createPatchMutation.isPending}
              className="h-7 bg-cyan-900 hover:bg-cyan-800 text-white disabled:opacity-30"
            >
              <Zap className="w-3 h-3 mr-1" />
              Activate Patch
            </Button>
          </div>
        </div>

        {/* Active Patches */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            Active Patches ({patches.length})
          </div>
          
          {patches.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs italic">
              No active patches
            </div>
          ) : (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {patches.map(patch => {
                  const sourceNet = nets.find(n => n.id === patch.source_net_id);
                  const destNet = nets.find(n => n.id === patch.destination_net_id);
                  
                  return (
                    <div 
                      key={patch.id}
                      className="flex items-center justify-between bg-cyan-950/10 p-2 rounded border border-cyan-900/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Link2 className="w-3 h-3 text-cyan-500 shrink-0" />
                        <div className="text-xs font-mono text-zinc-300 truncate">
                          <span className="text-cyan-400 font-bold">{sourceNet?.code || '???'}</span>
                          {patch.is_bidirectional ? (
                            <span className="text-cyan-600 mx-1">⟷</span>
                          ) : (
                            <span className="text-zinc-600 mx-1">→</span>
                          )}
                          <span className="text-cyan-400 font-bold">{destNet?.code || '???'}</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => terminatePatchMutation.mutate(patch.id)}
                        className="h-6 text-[10px] border-zinc-700 text-zinc-400 hover:bg-red-950 hover:border-red-800 hover:text-red-400"
                      >
                        <Unlink className="w-3 h-3 mr-1" />
                        End
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}