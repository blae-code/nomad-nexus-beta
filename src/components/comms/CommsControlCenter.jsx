import React, { useState } from 'react';
import ChannelBrowser from './ChannelBrowser';
import CreateChannelModal from './CreateChannelModal';
import ChannelSettingsPanel from './ChannelSettingsPanel';
import ActiveCommsOverlay from './ActiveCommsOverlay';

// Mock data - replace with actual data fetching
const MOCK_CATEGORIES = [
  { id: 'operations', name: 'Operations', order: 1 },
  { id: 'squads', name: 'Squads', order: 2 },
  { id: 'social', name: 'Social', order: 3 },
];

const MOCK_CHANNELS = [
  { id: '1', name: 'Command Net', type: 'voice', category_id: 'operations', active_count: 5, is_private: true },
  { id: '2', name: 'Tactical Briefing', type: 'voice', category_id: 'operations', active_count: 0, is_public: true },
  { id: '3', name: 'Alpha Squad', type: 'voice', category_id: 'squads', active_count: 3, is_private: true },
  { id: '4', name: 'General Chat', type: 'text', category_id: 'social', unread_count: 12, is_public: true },
  { id: '5', name: 'Intel Reports', type: 'text', category_id: 'operations', unread_count: 3, is_private: true },
];

export default function CommsControlCenter() {
  const [channels, setChannels] = useState(MOCK_CHANNELS);
  const [categories] = useState(MOCK_CATEGORIES);
  const [activeChannelId, setActiveChannelId] = useState('1');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [volume, setVolume] = useState(100);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  const handleCreateChannel = (channelData) => {
    const newChannel = {
      id: String(Date.now()),
      ...channelData,
      active_count: 0,
      unread_count: 0,
      member_count: 1,
    };
    setChannels([...channels, newChannel]);
  };

  const handleUpdateChannel = (settings) => {
    setChannels(channels.map(c =>
      c.id === editingChannel?.id ? { ...c, ...settings } : c
    ));
  };

  const handleDeleteChannel = (channelId) => {
    setChannels(channels.filter(c => c.id !== channelId));
    if (activeChannelId === channelId) {
      setActiveChannelId(channels[0]?.id || null);
    }
  };

  const handleMoveChannel = (channelId, newCategoryId) => {
    setChannels(channels.map(c =>
      c.id === channelId ? { ...c, category_id: newCategoryId } : c
    ));
  };

  const mockParticipants = [
    { id: '1', name: 'Pioneer-Alpha', is_speaking: true, is_muted: false },
    { id: '2', name: 'Nomad-Bravo', is_speaking: false, is_muted: false },
    { id: '3', name: 'Vagrant-Charlie', is_speaking: false, is_muted: true },
  ];

  const recentChannels = channels.filter(c => c.id !== activeChannelId).slice(0, 3);

  return (
    <div className="h-full flex">
      {/* Channel Browser */}
      <div className="w-80 flex-shrink-0">
        <ChannelBrowser
          channels={channels}
          categories={categories}
          activeChannelId={activeChannelId}
          onSelectChannel={(channel) => setActiveChannelId(channel.id)}
          onCreateChannel={() => setShowCreateModal(true)}
          onEditChannel={(channel) => setEditingChannel(channel)}
          onMoveChannel={handleMoveChannel}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-zinc-950/80 border-l border-zinc-800/60">
        {editingChannel ? (
          <ChannelSettingsPanel
            channel={editingChannel}
            onUpdate={handleUpdateChannel}
            onDelete={handleDeleteChannel}
            onClose={() => setEditingChannel(null)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-zinc-600 mb-4">
                <Volume2 className="w-16 h-16 mx-auto mb-3" />
              </div>
              <h3 className="text-lg font-medium text-zinc-300 mb-2">
                {activeChannel?.name || 'No Channel Selected'}
              </h3>
              <p className="text-sm text-zinc-500">
                {activeChannel ? 'Voice channel ready' : 'Select a channel to begin'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Overlays */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        categories={categories}
        onSubmit={handleCreateChannel}
      />

      {activeChannel?.type === 'voice' && (
        <ActiveCommsOverlay
          currentChannel={activeChannel}
          participants={mockParticipants}
          isMuted={isMuted}
          isDeafened={isDeafened}
          volume={volume}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleDeafen={() => setIsDeafened(!isDeafened)}
          onVolumeChange={setVolume}
          onSwitchChannel={(channel) => setActiveChannelId(channel.id)}
          recentChannels={recentChannels}
        />
      )}
    </div>
  );
}