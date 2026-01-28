import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Radio } from 'lucide-react';

export default function CommsConsole() {
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const init = async () => {
      const channelsList = await base44.entities.Channel.list('name', 50);
      setChannels(channelsList);
      if (channelsList.length > 0) {
        setSelectedChannel(channelsList[0]);
        loadMessages(channelsList[0].id);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadMessages = async (channelId) => {
    const msgs = await base44.entities.Message.filter({ channel_id: channelId }, '-created_date', 50);
    setMessages(msgs.reverse());
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;
    
    const user = await base44.auth.me();
    await base44.entities.Message.create({
      channel_id: selectedChannel.id,
      user_id: user.id,
      content: newMessage.trim(),
    });
    
    setNewMessage('');
    loadMessages(selectedChannel.id);
  };

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Comms Console</h1>
        <p className="text-zinc-400 text-sm">Communication channels</p>
      </div>

      <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
            <div className="col-span-1 bg-zinc-900/50 border-2 border-zinc-800 p-4 overflow-y-auto">
              <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4">Channels</h3>
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => {
                    setSelectedChannel(channel);
                    loadMessages(channel.id);
                  }}
                  className={`w-full text-left p-3 mb-2 transition-all ${
                    selectedChannel?.id === channel.id
                      ? 'bg-orange-500/20 border-l-4 border-orange-500 text-white'
                      : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span className="font-mono text-sm uppercase">{channel.name}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="col-span-3 bg-zinc-900/50 border-2 border-zinc-800 flex flex-col">
              <div className="p-4 border-b border-zinc-800">
                <h2 className="text-lg font-bold text-white uppercase">
                  {selectedChannel?.name || 'No Channel Selected'}
                </h2>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="mb-4">
                    <div className="text-xs text-zinc-500 mb-1">
                      {new Date(msg.created_date).toLocaleTimeString()}
                    </div>
                    <div className="text-zinc-300">{msg.content}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type message..."
                    className="flex-1"
                  />
                  <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
      </div>
    </div>
  );
}