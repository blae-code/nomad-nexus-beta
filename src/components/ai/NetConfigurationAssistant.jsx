import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Plus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function NetConfigurationAssistant({ eventId }) {
  const [isProvisioning, setIsProvisioning] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['net-suggestions', eventId],
    queryFn: async () => {
      const response = await base44.functions.invoke('netAssistant', {
        action: 'suggest_config',
        eventId
      });
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 60000
  });

  const handleProvisionNets = async () => {
    setIsProvisioning(true);
    try {
      const netsToCreate = data?.nets || [];
      
      for (const netConfig of netsToCreate) {
        await base44.entities.VoiceNet.create({
          event_id: eventId,
          code: netConfig.code,
          label: netConfig.label,
          type: netConfig.type,
          priority: netConfig.priority,
          min_rank_to_tx: netConfig.min_rank_to_tx || 'Vagrant',
          min_rank_to_rx: netConfig.min_rank_to_rx || 'Vagrant',
          linked_squad_id: netConfig.linked_squad_id || null,
          status: 'active'
        });
      }

      toast.success(`Provisioned ${netsToCreate.length} voice nets`);
      refetch();
    } catch (error) {
      toast.error('Failed to provision nets: ' + error.message);
    } finally {
      setIsProvisioning(false);
    }
  };

  if (!eventId) {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI NET CONFIGURATION</span>
        </div>
        <div className="text-center py-6 text-zinc-500 text-xs">
          Select an event to get AI net suggestions
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-yellow-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI NET CONFIGURATION</span>
        </div>
        <div className="text-center py-8 text-zinc-500 text-xs">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          ANALYZING OPTIMAL CONFIGURATION...
        </div>
      </div>
    );
  }

  const nets = data?.nets || [];

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI NET SUGGESTIONS</span>
        </div>
        <Badge className="text-[7px] bg-yellow-900/50 text-yellow-200 border-yellow-700">
          {nets.length} NETS
        </Badge>
      </div>

      {nets.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-xs">
          No suggestions available
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-3">
            {nets.map((net, idx) => (
              <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-yellow-400 font-mono">{net.code}</span>
                    <Badge variant="outline" className="text-[7px]">{net.type}</Badge>
                  </div>
                  <Badge className={cn(
                    "text-[7px]",
                    net.priority === 1 && "bg-red-900/50 text-red-200 border-red-700",
                    net.priority === 2 && "bg-yellow-900/50 text-yellow-200 border-yellow-700",
                    net.priority === 3 && "bg-blue-900/50 text-blue-200 border-blue-700"
                  )}>
                    P{net.priority}
                  </Badge>
                </div>
                <div className="text-[9px] text-zinc-300 mb-2">{net.label}</div>
                {net.reasoning && (
                  <div className="text-[8px] text-zinc-500 border-t border-zinc-800 pt-2 mt-2">
                    💡 {net.reasoning}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleProvisionNets}
            disabled={isProvisioning}
            className="w-full bg-yellow-600 hover:bg-yellow-700 gap-2"
          >
            {isProvisioning ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                PROVISIONING...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                PROVISION ALL NETS
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}