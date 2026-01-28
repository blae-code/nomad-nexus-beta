/**
 * CommsTab — The "Text Comms" tab in CommsDock
 * Integrates channel list, message view, and composer
 */

import React, { useState, useCallback, useEffect } from 'react';
import ChannelList from './ChannelList';
import MessageView from './MessageView';
import MessageComposer from './MessageComposer';
import { getMessages, sendMessage } from '@/components/services/commsService';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export default function CommsTab({ user, unreadCounts, onMarkChannelRead, channels }) {
  const [selectedChannelId, setSelectedChannelId] = useState('general');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const voiceNet = useVoiceNet();

  // Load messages for selected channel
  useEffect(() => {
    const loadMessages = async () => {
      setLoadingMessages(true);
      const msgs = await getMessages(selectedChannelId);
      setMessages(msgs);
      setLoadingMessages(false);
    };

    loadMessages();
  }, [selectedChannelId]);

  const handleSendMessage = useCallback(
    async (body) => {
      if (!user?.id) return;

      const msg = await sendMessage(
        selectedChannelId,
        user.id,
        user.callsign || 'Unknown',
        body
      );

      setMessages((prev) => [...prev, msg]);
    },
    [selectedChannelId, user]
  );

  return (
    <div className="flex h-full gap-0">
      {/* Channel list sidebar */}
      <ChannelList
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
        unreadCounts={unreadCounts}
        user={user}
      />

      {/* Main message area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Channel header + Voice status */}
        <div className="border-b border-zinc-800 bg-zinc-900/60 px-3 py-2 flex items-center justify-between">
          <div className="text-xs font-semibold text-zinc-400">
            {channels.find((ch) => ch.id === selectedChannelId)?.name || 'Unknown'}
          </div>
          {voiceNet.activeNetId && (
            <div className="text-xs text-orange-400">
              Voice: {voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'Connected' : 'Joining...'}
            </div>
          )}
        </div>

        {/* Messages */}
        <MessageView
          messages={messages}
          loading={loadingMessages}
          onMarkRead={() => onMarkChannelRead(selectedChannelId)}
        />

        {/* Composer */}
        <MessageComposer onSendMessage={handleSendMessage} disabled={!user} />
      </div>
    </div>
  );
}