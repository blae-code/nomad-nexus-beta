import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageView from '@/components/comms/MessageView';
import MessageComposer from '@/components/comms/MessageComposer';
import ChannelList from '@/components/comms/ChannelList';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';

export default function CommsWidget({ widgetId, config, onRemove, isDragging }) {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState(null);
  const [channels, setChannels] = useState([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadChannels();
  }, [user]);

  const loadChannels = async () => {
    try {
      const allChannels = await base44.entities.Channel.list('-last_message_at', 50);
      setChannels(allChannels);
      if (allChannels.length > 0 && !activeChannel) {
        setActiveChannel(allChannels[0]);
      }
    } catch (error) {
      console.error('[CommsWidget] Failed to load channels:', error);
    }
  };

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Comms</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-400 hover:text-red-300"
            onClick={onRemove}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {!expanded && (
          <div className="w-48 border-r border-orange-500/10 overflow-y-auto">
            <ChannelList
              channels={channels}
              activeChannel={activeChannel}
              onSelectChannel={setActiveChannel}
              compact={true}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeChannel ? (
            <>
              <div className="flex-1 overflow-hidden">
                <MessageView channelId={activeChannel.id} compact={true} />
              </div>
              <div className="border-t border-orange-500/10">
                <MessageComposer channelId={activeChannel.id} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
              Select a channel
            </div>
          )}
        </div>
      </div>
    </>
  );
}