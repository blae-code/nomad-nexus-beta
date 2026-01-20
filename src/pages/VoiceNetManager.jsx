import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import VoiceNetForm from '@/components/comms/VoiceNetForm';
import VoiceNetList from '@/components/comms/VoiceNetList';
import NetChannelManager from '@/components/comms/NetChannelManager';

export default function VoiceNetManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingNet, setEditingNet] = useState(null);
  const [netActivity, setNetActivity] = useState({});
  const [selectedNetForChannels, setSelectedNetForChannels] = useState(null);
  const queryClient = useQueryClient();

  // Check admin access
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const userData = await base44.auth.me();
      if (userData?.role !== 'admin') {
        throw new Error('Admin access required');
      }
      return userData;
    }
  });

  // Fetch all nets
  const { data: nets = [], isLoading: netsLoading } = useQuery({
    queryKey: ['all-voice-nets'],
    queryFn: () => base44.entities.VoiceNet.list(),
    enabled: user?.role === 'admin'
  });

  // Fetch squads for assignment
  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  // Monitor net activity (users online, transmitting)
  useEffect(() => {
    const checkNetActivity = async () => {
      try {
        const presenceData = await base44.entities.UserPresence.list();
        const activity = {};
        
        nets.forEach(net => {
          const usersOnNet = presenceData.filter(p => p.net_id === net.id);
          activity[net.id] = {
            users: usersOnNet.length,
            transmitting: usersOnNet.filter(p => p.is_transmitting).length
          };
        });
        
        setNetActivity(activity);
      } catch (error) {
        console.error('Failed to fetch net activity:', error);
      }
    };

    const interval = setInterval(checkNetActivity, 5000);
    checkNetActivity();
    return () => clearInterval(interval);
  }, [nets]);

  // Create/Update net mutation
  const createMutation = useMutation({
    mutationFn: (formData) => {
      if (editingNet) {
        return base44.entities.VoiceNet.update(editingNet.id, formData);
      }
      return base44.entities.VoiceNet.create(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-voice-nets'] });
      setShowForm(false);
      setEditingNet(null);
      toast.success(editingNet ? 'Net updated' : 'Net created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save net');
    }
  });

  // Delete net mutation
  const deleteMutation = useMutation({
    mutationFn: (netId) => base44.entities.VoiceNet.delete(netId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-voice-nets'] });
      toast.success('Net deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete net');
    }
  });

  // Archive net mutation
  const archiveMutation = useMutation({
    mutationFn: (netId) => 
      base44.entities.VoiceNet.update(netId, { status: 'inactive' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-voice-nets'] });
      toast.success('Net archived');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to archive net');
    }
  });

  if (!user || user.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <Settings className="w-12 h-12 mx-auto text-red-600 opacity-50" />
            <div>
              <h2 className="font-bold text-lg text-red-400">Admin Access Required</h2>
              <p className="text-sm text-zinc-400 mt-2">Only administrators can manage voice nets</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeNets = nets.filter(n => n.status !== 'inactive');
  const inactiveNets = nets.filter(n => n.status === 'inactive');

  return (
    <div className="h-full flex flex-col bg-zinc-950">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href={createPageUrl('CommsConsole')} className="hover:text-[#ea580c] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white">Voice Net Manager</h1>
            <p className="text-sm text-zinc-400">Create and manage communication nets</p>
          </div>
        </div>
        {!showForm && (
          <Button 
            onClick={() => {
              setEditingNet(null);
              setShowForm(true);
            }}
            className="bg-emerald-900 hover:bg-emerald-800 gap-2"
          >
            <Plus className="w-4 h-4" />
            New Net
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        {selectedNetForChannels ? (
          <div className="h-full flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedNetForChannels(null)}
                className="text-[#ea580c] hover:text-[#c2410c] transition-colors"
              >
                ← Back to Nets
              </button>
              <h2 className="text-lg font-bold text-white">
                Manage Channels: {selectedNetForChannels.code}
              </h2>
            </div>
            <NetChannelManager netId={selectedNetForChannels.id} />
          </div>
        ) : showForm ? (
          <VoiceNetForm
            net={editingNet}
            squads={squads}
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => {
              setShowForm(false);
              setEditingNet(null);
            }}
            isLoading={createMutation.isPending}
          />
        ) : (
          <Tabs defaultValue="active" className="h-full flex flex-col">
            <TabsList className="bg-zinc-900 border border-zinc-800 grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="active">
                Active Nets ({activeNets.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({inactiveNets.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="active" className="m-0">
                <div className="space-y-4">
                  <VoiceNetList
                    nets={activeNets}
                    netActivity={netActivity}
                    onEdit={(net) => {
                      setEditingNet(net);
                      setShowForm(true);
                    }}
                    onDelete={(netId) => deleteMutation.mutate(netId)}
                    onArchive={(netId) => archiveMutation.mutate(netId)}
                    isLoading={deleteMutation.isPending || archiveMutation.isPending}
                  />
                  {activeNets.length > 0 && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardContent className="p-4">
                        <div className="text-sm font-semibold text-zinc-300 mb-3">Manage Channels</div>
                        <div className="grid grid-cols-2 gap-2">
                          {activeNets.map(net => (
                            <Button
                              key={net.id}
                              onClick={() => setSelectedNetForChannels(net)}
                              variant="outline"
                              className="justify-start gap-2 text-xs h-8"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {net.code} Channels
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="archived" className="m-0">
                <VoiceNetList
                  nets={inactiveNets}
                  netActivity={netActivity}
                  onEdit={(net) => {
                    setEditingNet({...net, status: 'active'});
                    setShowForm(true);
                  }}
                  onDelete={(netId) => deleteMutation.mutate(netId)}
                  onArchive={(netId) => archiveMutation.mutate(netId)}
                  isLoading={deleteMutation.isPending || archiveMutation.isPending}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </div>
  );
}