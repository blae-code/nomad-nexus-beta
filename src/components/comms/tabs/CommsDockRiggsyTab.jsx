import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Send, Lock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommsDockRiggsyTab({ user }) {
  const [hasConsent, setHasConsent] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isEphemeral, setIsEphemeral] = useState(false);
  const messagesEndRef = useRef(null);

  // Check consent
  const { data: consent, isLoading: consentLoading } = useQuery({
    queryKey: ['riggsy-consent', user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      return base44.entities.AIConsent.filter({
        user_id: user.id,
        feature: 'RIGGSY_CHAT',
        is_enabled: true
      }).then(r => r?.[0]);
    },
    staleTime: 30000,
    enabled: !!user?.id
  });

  useEffect(() => {
    setHasConsent(!!consent);
    if (consent && !isEphemeral) {
      // Load history
      base44.entities.RiggsyChatHistory.filter({
        user_id: user.id
      }).then(r => {
        if (r?.[0]) setMessages(r[0].messages || []);
      });
    }
  }, [consent, user?.id, isEphemeral]);

  const chatMutation = useMutation({
    mutationFn: (userMessage) => {
      return base44.functions.invoke('riggsyChat', {
        userMessage,
        ephemeral: isEphemeral
      });
    },
    onSuccess: (response) => {
      setMessages(prev => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: response.data.content,
          timestamp: response.data.timestamp
        }
      ]);
      setInput('');
    }
  });

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [
      ...prev,
      {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: input,
        timestamp: new Date().toISOString()
      }
    ]);
    
    chatMutation.mutate(input);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (consentLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[8px] text-zinc-600">
        Loading...
      </div>
    );
  }

  if (!hasConsent) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-3 text-center space-y-2">
        <Lock className="w-6 h-6 text-zinc-600" />
        <p className="text-[8px] text-zinc-400">Riggsy AI requires consent</p>
        <button className="px-2 py-1 mt-2 bg-zinc-800 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors">
          ENABLE AI
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode Toggle */}
      <div className="px-2 py-1 border-b border-zinc-800 shrink-0 flex items-center gap-1 text-[8px]">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={isEphemeral}
            onChange={(e) => {
              setIsEphemeral(e.target.checked);
              setMessages([]);
            }}
            className="w-3 h-3"
          />
          <span className="text-zinc-500">Ephemeral</span>
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-1 p-1">
        {messages.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">Start a conversation...</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                'px-2 py-1 rounded-none text-[8px] leading-tight',
                msg.role === 'user'
                  ? 'bg-zinc-800/50 text-zinc-300'
                  : 'bg-zinc-900/50 text-zinc-400 border-l-2 border-cyan-700/50'
              )}
            >
              {msg.content}
            </div>
          ))
        )}
        {chatMutation.isPending && (
          <div className="px-2 py-1 bg-zinc-900/50 text-zinc-500 text-[8px] italic">
            Riggsy thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-1.5 border-t border-zinc-800 shrink-0 flex gap-1">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask Riggsy..."
          className="flex-1 px-2 py-1 bg-zinc-900/50 border border-zinc-700 text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || chatMutation.isPending}
          className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-cyan-600 text-zinc-400 hover:text-cyan-400 disabled:opacity-50 transition-colors"
        >
          <Send className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}