import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radio, Plus, Trash2, Lock, Unlock, Edit } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { EmptyState, LoadingState } from '@/components/common/UIStates';

export default function ChannelManager() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', category: 'casual', type: 'text' });
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    setLoading(true);
    try {
      const channelsList = await base44.entities.Channel.list('name', 50);
      setChannels(channelsList);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async () => {
    if (!newChannel.name.trim()) return;

    try {
      await base44.entities.Channel.create({
        name: newChannel.name.trim(),
        category: newChannel.category,
        type: newChannel.type,
      });
      
      setNewChannel({ name: '', category: 'casual', type: 'text' });
      setShowCreator(false);
      loadChannels();
    } catch (error) {
      alert(`Failed to create channel: ${error.message}`);
    }
  };

  const deleteChannel = async (channelId) => {
    if (!confirm('Delete this channel? All messages will be lost.')) return;

    try {
      await base44.entities.Channel.delete(channelId);
      loadChannels();
    } catch (error) {
      alert(`Failed to delete channel: ${error.message}`);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      casual: 'text-blue-400 border-blue-500/50',
      focused: 'text-orange-400 border-orange-500/50',
      admin: 'text-red-400 border-red-500/50',
      squad: 'text-purple-400 border-purple-500/50',
      public: 'text-green-400 border-green-500/50',
    };
    return colors[category] || 'text-zinc-400 border-zinc-600';
  };

  if (loading) {
    return <LoadingState label="Loading Channels" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white uppercase">Text Channels</h3>
          <p className="text-xs text-zinc-500">Manage communication channels</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => setShowCreator(!showCreator)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Channel
          </Button>
        )}
      </div>

      {showCreator && (
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded space-y-3">
          <Input
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            placeholder="Channel name (e.g., general, operations)"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Category</label>
              <select
                value={newChannel.category}
                onChange={(e) => setNewChannel({ ...newChannel, category: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
              >
                <option value="casual">Casual</option>
                <option value="focused">Focused</option>
                <option value="admin">Admin</option>
                <option value="squad">Squad</option>
                <option value="public">Public</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1.5 block">Type</label>
              <select
                value={newChannel.type}
                onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
              >
                <option value="text">Text</option>
                <option value="voice">Voice</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowCreator(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={createChannel} disabled={!newChannel.name.trim()} size="sm">
              Create
            </Button>
          </div>
        </div>
      )}

      {channels.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No channels"
          message="Create your first communication channel"
        />
      ) : (
        <div className="grid gap-2">
          {channels.map((channel) => (
            <div
              key={channel.id}
              className="p-4 border border-zinc-800 bg-zinc-900/30 rounded hover:border-zinc-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-4 h-4 text-zinc-500" />
                    <h4 className="text-sm font-bold text-white uppercase">{channel.name}</h4>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${getCategoryColor(channel.category)}`}>
                      {channel.category}
                    </span>
                    {channel.category === 'focused' && <Lock className="w-3 h-3 text-orange-400" />}
                  </div>

                  <div className="flex gap-3 text-xs text-zinc-500">
                    <span className="capitalize">{channel.type}</span>
                    {channel.slow_mode_seconds > 0 && (
                      <span>Slow mode: {channel.slow_mode_seconds}s</span>
                    )}
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteChannel(channel.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}