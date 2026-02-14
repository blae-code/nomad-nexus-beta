import React, { useState, useCallback, useMemo } from 'react';
import { MessageSquare, Send, Settings, Bell, Hash, AtSign, Trash2, ChevronDown, ChevronLeft } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';

/**
 * CommsHub — Integrated text-based communications hub for NexusOS
 * Discord-like channel system with advanced message filtering, presence, and voice integration
 */
export default function CommsHub({ operations = [], focusOperationId, activeAppId, online, bridgeId, isExpanded = true, onToggleExpand }) {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({ tactical: true, social: true });
  const [messageInput, setMessageInput] = useState('');
  const [notificationSettings, setNotificationSettings] = useState({
    mentions: true,
    keywords: true,
    operations: true,
  });

  // Predefined channels for tactical comms
  const channels = useMemo(() => {
    const tactical = [
      { id: 'command', name: 'Command Net', icon: Hash, category: 'tactical', unread: 3 },
      { id: 'alpha-squad', name: 'Alpha Squad', icon: Hash, category: 'tactical', unread: 0 },
      { id: 'logistics', name: 'Logistics', icon: Hash, category: 'tactical', unread: 1 },
    ];

    const operational = operations.slice(0, 3).map((op) => ({
      id: `op-${op.id}`,
      name: op.name || 'Unnamed Op',
      icon: Hash,
      category: 'operations',
      unread: 0,
    }));

    const social = [
      { id: 'general', name: 'General', icon: Hash, category: 'social', unread: 0 },
      { id: 'random', name: 'Random', icon: Hash, category: 'social', unread: 0 },
    ];

    const direct = [
      { id: 'dm-command', name: 'Command Officer', icon: AtSign, category: 'direct', unread: 1 },
    ];

    return { tactical, operational, social, direct };
  }, [operations]);

  const toggleCategory = useCallback((category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedChannel) return;

    setMessages((prev) => ({
      ...prev,
      [selectedChannel]: [
        ...(prev[selectedChannel] || []),
        {
          id: Date.now(),
          text: messageInput,
          author: 'You',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    }));

    setMessageInput('');
  }, [messageInput, selectedChannel]);

  const currentMessages = messages[selectedChannel] || [];
  const selectedChannelData = Object.values(channels)
    .flat()
    .find((ch) => ch.id === selectedChannel);

  return (
    <div className={`nx-comms-hub flex flex-col h-full bg-zinc-950/80 border-l border-zinc-700/40 transition-all duration-300 ease-out overflow-hidden ${
      isExpanded ? 'w-full' : 'w-12'
    }`}>
      {/* Header */}
      <div className="nx-comms-header border-b border-zinc-700/40 p-3">
        <div className="flex items-center justify-between">
          {isExpanded ? (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Comms Hub</h3>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" className="text-zinc-500 hover:text-orange-500 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onToggleExpand}
                  className="text-zinc-500 hover:text-orange-500 transition-colors"
                  title="Collapse"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-full flex items-center justify-center text-zinc-500 hover:text-orange-500 transition-colors"
              title="Expand"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Channel List */}
      {isExpanded && (
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-2">
        {/* Tactical Channels */}
        <div>
          <button
            onClick={() => toggleCategory('tactical')}
            className="w-full flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expandedCategories.tactical ? '' : '-rotate-90'}`}
            />
            Tactical
          </button>
          {expandedCategories.tactical && (
            <div className="space-y-1 ml-2">
              {channels.tactical.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Operations */}
        {channels.operational.length > 0 && (
          <div>
            <button
              onClick={() => toggleCategory('operations')}
              className="w-full flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-colors"
            >
              <ChevronDown
                className={`w-3 h-3 transition-transform ${expandedCategories.operations ? '' : '-rotate-90'}`}
              />
              Operations
            </button>
            {expandedCategories.operations && (
              <div className="space-y-1 ml-2">
                {channels.operational.map((ch) => (
                  <ChannelButton
                    key={ch.id}
                    channel={ch}
                    isSelected={selectedChannel === ch.id}
                    onClick={() => setSelectedChannel(ch.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Social Channels */}
        <div>
          <button
            onClick={() => toggleCategory('social')}
            className="w-full flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${expandedCategories.social ? '' : '-rotate-90'}`}
            />
            Social
          </button>
          {expandedCategories.social && (
            <div className="space-y-1 ml-2">
              {channels.social.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Direct Messages */}
        {channels.direct.length > 0 && (
          <div>
            <button className="w-full flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-widest transition-colors">
              <ChevronDown className="w-3 h-3" />
              Direct
            </button>
            <div className="space-y-1 ml-2">
              {channels.direct.map((ch) => (
                <ChannelButton
                  key={ch.id}
                  channel={ch}
                  isSelected={selectedChannel === ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Message View */}
      {isExpanded && selectedChannel ? (
        <div className="flex flex-col h-64 border-t border-zinc-700/40">
          {/* Channel Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/40 bg-zinc-900/40">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-200">{selectedChannelData?.name}</span>
            </div>
            <button type="button" className="text-zinc-500 hover:text-orange-500">
              <Bell className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2 text-xs">
            {currentMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500">No messages yet</div>
            ) : (
              currentMessages.map((msg) => (
                <div key={msg.id} className="group flex gap-2 rounded px-2 py-1 hover:bg-zinc-800/40">
                  <div className="text-zinc-600 min-w-12">{msg.timestamp}</div>
                  <div className="flex-1">
                    <div className="text-zinc-400 font-semibold">{msg.author}</div>
                    <div className="text-zinc-300">{msg.text}</div>
                  </div>
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="flex gap-1 p-2 border-t border-zinc-700/40 bg-zinc-900/40">
            <input
              type="text"
              placeholder="Type a message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className="flex-1 text-xs bg-zinc-800/60 border border-zinc-700/40 rounded px-2 py-1 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-orange-500/40"
            />
            <button
              type="button"
              onClick={handleSendMessage}
              className="text-zinc-500 hover:text-orange-500 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-zinc-600 text-xs">Select a channel</div>
      )}
    </div>
  );
}

function ChannelButton({ channel, isSelected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs transition-colors ${
        isSelected
          ? 'bg-orange-600/30 text-orange-400 font-semibold'
          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <channel.icon className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{channel.name}</span>
      </div>
      {channel.unread > 0 && <NexusBadge tone="warning">{channel.unread}</NexusBadge>}
    </button>
  );
}