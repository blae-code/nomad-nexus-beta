import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Radio, Plus, Trash2, Power, PowerOff, Users, Shield, Target } from 'lucide-react';
import { EmptyState } from '@/components/common/UIStates';
import VoiceNetCreator from './VoiceNetCreator';

export default function VoiceNetManager({ eventId = null }) {
  const [nets, setNets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    loadNets();
  }, [eventId]);

  const loadNets = async () => {
    setLoading(true);
    try {
      const filter = eventId ? { event_id: eventId } : {};
      const netsList = await base44.entities.VoiceNet.filter(filter, '-created_date');
      setNets(netsList);
    } catch (error) {
      console.error('Failed to load voice nets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreated = (newNet) => {
    setNets([newNet, ...nets]);
    setShowCreator(false);
  };

  const handleDelete = async (netId) => {
    if (!confirm('Delete this voice net? Active sessions will be disconnected.')) return;
    
    try {
      await base44.entities.VoiceNet.delete(netId);
      setNets(nets.filter((n) => n.id !== netId));
    } catch (error) {
      console.error('Failed to delete voice net:', error);
    }
  };

  const toggleStatus = async (net) => {
    const newStatus = net.status === 'active' ? 'inactive' : 'active';
    try {
      await base44.entities.VoiceNet.update(net.id, { status: newStatus });
      setNets(nets.map((n) => (n.id === net.id ? { ...n, status: newStatus } : n)));
    } catch (error) {
      console.error('Failed to toggle net status:', error);
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      command: Shield,
      squad: Users,
      support: Target,
      general: Radio,
    };
    return icons[type] || Radio;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      1: 'text-red-400',
      2: 'text-yellow-400',
      3: 'text-green-400',
    };
    return colors[priority] || 'text-zinc-400';
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Loading voice nets...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-400 uppercase">
            {eventId ? 'Operation Voice Nets' : 'Global Voice Nets'}
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {eventId ? 'Temporary nets for this operation' : 'Persistent voice channels'}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreator(!showCreator)}>
          <Plus className="w-3 h-3 mr-1" />
          Create Net
        </Button>
      </div>

      {showCreator && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded">
          <VoiceNetCreator
            eventId={eventId}
            onCreated={handleCreated}
            onCancel={() => setShowCreator(false)}
          />
        </div>
      )}

      {nets.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No voice nets"
          message={eventId ? 'Create voice nets for this operation' : 'Create your first voice channel'}
        />
      ) : (
        <div className="space-y-2">
          {nets.map((net) => {
            const TypeIcon = getTypeIcon(net.type);
            const isActive = net.status === 'active';

            return (
              <div
                key={net.id}
                className={`p-4 border rounded transition-all ${
                  isActive
                    ? 'bg-zinc-800/50 border-zinc-700'
                    : 'bg-zinc-900/30 border-zinc-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded">
                      <TypeIcon className="w-4 h-4 text-orange-400" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm uppercase">{net.code}</h4>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-zinc-400">{net.label}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <span className={`px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded uppercase font-bold ${
                          net.discipline === 'casual' ? 'text-blue-400' : 'text-orange-400'
                        }`}>
                          {net.discipline}
                        </span>

                        <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 uppercase">
                          {net.type}
                        </span>

                        <span className={`px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded uppercase font-bold ${getPriorityColor(net.priority)}`}>
                          P{net.priority}
                        </span>

                        {net.stage_mode && (
                          <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/50 rounded text-purple-300 uppercase font-bold">
                            Stage
                          </span>
                        )}

                        {!isActive && (
                          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/50 rounded text-red-300 uppercase font-bold">
                            Offline
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleStatus(net)}
                      className={isActive ? 'text-green-400 hover:text-green-300' : 'text-zinc-500 hover:text-zinc-400'}
                    >
                      {isActive ? <Power className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(net.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}