import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import SquadNetQuickAccess from './SquadNetQuickAccess';
import VoiceNetForm from './VoiceNetForm';

/**
 * Squad Net Manager
 * UI for squad leaders to view, create, and manage squad voice nets
 */
export default function SquadNetManager({ 
  squadId, 
  userRank = 'Vagrant',
  isSquadLeader = false
}) {
  const [selectedNetId, setSelectedNetId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNet, setEditingNet] = useState(null);
  const queryClient = useQueryClient();

  // Fetch squad nets
  const { data: squadsNets = [], isLoading: netsLoading } = useQuery({
    queryKey: ['squad-nets', squadId],
    queryFn: async () => {
      if (!squadId) return [];
      const nets = await base44.entities.VoiceNet.filter({ linked_squad_id: squadId });
      return nets;
    },
    enabled: !!squadId
  });

  // Fetch all nets (for context)
  const { data: allNets = [] } = useQuery({
    queryKey: ['all-voice-nets'],
    queryFn: () => base44.entities.VoiceNet.list(),
    refetchInterval: 10000
  });

  // Fetch participant counts
  const { data: participantCounts = {} } = useQuery({
    queryKey: ['net-participants', squadNets.map(n => n.id).join(',')],
    queryFn: async () => {
      const roomNames = squadsNets.map(n => n.livekit_room_name).filter(Boolean);
      if (roomNames.length === 0) return {};
      
      try {
        const res = await base44.functions.invoke('getLiveKitRoomStatus', { rooms: roomNames });
        const counts = {};
        squadsNets.forEach(net => {
          if (net.livekit_room_name && res.data?.[net.livekit_room_name]) {
            counts[net.id] = res.data[net.livekit_room_name].participantCount;
          }
        });
        return counts;
      } catch (err) {
        console.error('Failed to fetch participant counts:', err);
        return {};
      }
    },
    enabled: squadsNets.length > 0,
    refetchInterval: 5000
  });

  // Delete mutation
  const deleteNetMutation = useMutation({
    mutationFn: (netId) => base44.entities.VoiceNet.delete(netId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-nets', squadId] });
      setSelectedNetId(null);
    }
  });

  const handleSetDefault = async (netId) => {
    try {
      // Clear default from other nets
      await Promise.all(
        squadsNets
          .filter(n => n.is_default_for_squad && n.id !== netId)
          .map(n => base44.entities.VoiceNet.update(n.id, { is_default_for_squad: false }))
      );
      
      // Set this one as default
      await base44.entities.VoiceNet.update(netId, { is_default_for_squad: true });
      queryClient.invalidateQueries({ queryKey: ['squad-nets', squadId] });
    } catch (err) {
      console.error('Failed to set default net:', err);
    }
  };

  if (netsLoading) {
    return <div className="p-4 text-zinc-500 text-sm">Loading squad comms...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Quick Access Panel - Always Visible */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-3">
        <SquadNetQuickAccess
          squadId={squadId}
          allNets={allNets}
          selectedNetId={selectedNetId}
          onSelectNet={setSelectedNetId}
          participantCounts={participantCounts}
          isLoading={netsLoading}
        />
      </Card>

      {/* Squad Leader Controls */}
      {isSquadLeader && (
        <>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Management</span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => {
                setEditingNet(null);
                setShowForm(!showForm);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              New Net
            </Button>
          </div>

          {/* Create/Edit Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="bg-zinc-900/70 border-zinc-700 p-3 space-y-3">
                  <VoiceNetForm
                    squadId={squadId}
                    initialNet={editingNet}
                    onSuccess={() => {
                      setShowForm(false);
                      setEditingNet(null);
                      queryClient.invalidateQueries({ queryKey: ['squad-nets', squadId] });
                    }}
                    onCancel={() => {
                      setShowForm(false);
                      setEditingNet(null);
                    }}
                  />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nets List */}
          {squadsNets.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">Squad Nets ({squadsNets.length})</span>
              
              {squadsNets.map(net => (
                <motion.div
                  key={net.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-zinc-900/40 border border-zinc-800 rounded p-2.5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{net.code}</span>
                        {net.is_default_for_squad && (
                          <Badge className="text-[8px] bg-amber-900/50 text-amber-300 border-amber-700 h-4">DEFAULT</Badge>
                        )}
                        <Badge className={cn(
                          "text-[8px] h-4",
                          net.discipline === 'focused'
                            ? "bg-red-900/50 text-red-300 border-red-700"
                            : "bg-emerald-900/50 text-emerald-300 border-emerald-700"
                        )}>
                          {net.discipline.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{net.label}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {participantCounts[net.id] > 0 && (
                        <Badge className="text-[8px] bg-zinc-800 text-zinc-400">
                          {participantCounts[net.id]} users
                        </Badge>
                      )}
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-blue-400 hover:text-blue-300"
                        onClick={() => {
                          setEditingNet(net);
                          setShowForm(true);
                        }}
                        title="Edit"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      
                      {!net.is_default_for_squad && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-amber-400 hover:text-amber-300"
                          onClick={() => handleSetDefault(net.id)}
                          title="Set as default"
                        >
                          ⭐
                        </Button>
                      )}
                      
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                        onClick={() => {
                          if (confirm(`Delete ${net.code}? This cannot be undone.`)) {
                            deleteNetMutation.mutate(net.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}