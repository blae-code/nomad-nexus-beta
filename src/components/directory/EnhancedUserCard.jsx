import React, { useState } from 'react';
import { Clock, MapPin, Radio, Send, X, Zap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { PresenceDot } from '@/components/collaboration/LivePresenceIndicator';
import DirectMessaging from '@/components/collaboration/DirectMessaging';

const statusColors = {
  'online': 'bg-emerald-500',
  'in-call': 'bg-blue-500',
  'transmitting': 'bg-red-500',
  'idle': 'bg-yellow-500',
  'away': 'bg-orange-500',
  'offline': 'bg-zinc-600'
};

export default function EnhancedUserCard({ 
  user, 
  presence, 
  userDirectory, 
  onClose,
  mutualSquads = [],
  currentUser
}) {
  const [hailingMessage, setHailingMessage] = useState('');
  const [isSendingHail, setIsSendingHail] = useState(false);
  const [hailStatus, setHailStatus] = useState(null);

  const callsign = userDirectory[user?.id]?.callsign || user?.full_name?.split(' ')[0] || 'UNKNOWN';
  const rank = userDirectory[user?.id]?.rank || user?.rank || 'VAGRANT';
  const status = presence?.status || 'offline';
  const lastActivity = presence?.last_activity || user?.updated_date;
  const netId = presence?.net_id;
  const currentNet = presence?.current_net;

  const getLastSeenText = () => {
    if (status !== 'offline') return null;
    if (!lastActivity) return 'Never active';
    
    const lastTime = new Date(lastActivity);
    const now = new Date();
    const diffMs = now - lastTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleSendHail = async () => {
    if (!hailingMessage.trim() || !user?.id) return;

    setIsSendingHail(true);
    setHailStatus('sending');

    try {
      // Invoke the hailing system
      await base44.functions.invoke('sendWhisper', {
        recipientIds: [user.id],
        message: `[HAIL] ${hailingMessage}`,
        classification_level: 'confidential'
      });

      setHailStatus('sent');
      setHailingMessage('');
      
      setTimeout(() => {
        setHailStatus(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to send hail:', error);
      setHailStatus('failed');
      setTimeout(() => setHailStatus(null), 3000);
    } finally {
      setIsSendingHail(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-80 bg-zinc-950 border border-zinc-800 shadow-2xl space-y-0"
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 relative">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative">
            <PresenceDot userId={user?.id} className="w-3 h-3" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{callsign}</div>
            <div className="text-xs text-zinc-500 font-mono">{rank}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-400 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Info Section */}
      <div className="p-4 space-y-4 bg-gradient-to-b from-zinc-900/50 to-transparent">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-600 uppercase">STATUS</span>
          <div className={cn(
            'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
            'text-[9px] font-mono uppercase',
            status === 'online' && 'bg-emerald-950 text-emerald-300 border-emerald-700',
            status === 'idle' && 'bg-yellow-950 text-yellow-300 border-yellow-700',
            status === 'away' && 'bg-orange-950 text-orange-300 border-orange-700',
            status === 'in-call' && 'bg-blue-950 text-blue-300 border-blue-700',
            status === 'offline' && 'bg-zinc-900 text-zinc-400 border-zinc-700',
            status === 'transmitting' && 'bg-red-950 text-red-300 border-red-700'
          )}>
            {status}
          </div>
        </div>

        {/* Last Seen (when offline) */}
        {status === 'offline' && getLastSeenText() && (
          <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-zinc-600" />
              <span className="text-xs text-zinc-400">Last seen</span>
            </div>
            <span className="text-xs font-mono text-zinc-300">{getLastSeenText()}</span>
          </div>
        )}

        {/* Current Operation */}
        {presence?.event_id && (
          <div className="p-2 bg-zinc-900/50 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-[#ea580c]" />
              <span className="text-xs text-zinc-600 uppercase">Operation</span>
            </div>
            <div className="text-xs font-mono text-white truncate">Active</div>
          </div>
        )}

        {/* Current Net */}
        {currentNet && (
          <div className="p-2 bg-zinc-900/50 border border-zinc-800 space-y-1">
            <div className="flex items-center gap-2">
              <Radio className="w-3 h-3 text-blue-400" />
              <span className="text-xs text-zinc-600 uppercase">Net</span>
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-mono text-white">{currentNet.code}</div>
              <div className="text-[9px] text-zinc-500">{currentNet.label}</div>
            </div>
          </div>
        )}

        {/* Mutual Squads */}
        {mutualSquads.length > 0 && (
          <div className="p-2 bg-zinc-900/50 border border-zinc-800 space-y-1">
            <span className="text-xs text-zinc-600 uppercase block">Mutual Squads ({mutualSquads.length})</span>
            <div className="text-[9px] text-zinc-300 space-y-0.5">
              {mutualSquads.map(squad => (
                <div key={squad} className="text-xs font-mono">→ {squad}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-zinc-800 p-3">
        {currentUser && (
          <DirectMessaging
            user={currentUser}
            recipientId={user?.id}
            recipientName={callsign}
            trigger={
              <button className="w-full flex items-center justify-center gap-2 p-2 bg-blue-950/50 border border-blue-900/50 hover:bg-blue-900/50 transition-colors text-blue-300 text-xs font-bold">
                <MessageCircle className="w-3.5 h-3.5" />
                DIRECT MESSAGE
              </button>
            }
          />
        )}
      </div>

      {/* Hailing System */}
      <div className="border-t border-zinc-800 p-4 space-y-2">
        <label className="text-xs font-bold text-zinc-600 uppercase block">Send Hail</label>
        
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Message..."
            value={hailingMessage}
            onChange={(e) => setHailingMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendHail()}
            disabled={isSendingHail}
            className="flex-1 bg-zinc-900/50 border border-zinc-800 text-xs px-2 py-1.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#ea580c]"
          />
          <motion.button
            whileHover={!isSendingHail ? { scale: 1.05 } : {}}
            onClick={handleSendHail}
            disabled={!hailingMessage.trim() || isSendingHail}
            className="bg-[#ea580c] hover:bg-[#ea580c]/80 disabled:opacity-50 text-white p-1.5 transition-all"
          >
            <Send className="w-3 h-3" />
          </motion.button>
        </div>

        {/* Hail Status */}
        {hailStatus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className={cn(
              'text-[9px] font-mono p-1.5 text-center',
              hailStatus === 'sent' && 'bg-emerald-950/50 text-emerald-300 border border-emerald-700',
              hailStatus === 'sending' && 'bg-blue-950/50 text-blue-300 border border-blue-700',
              hailStatus === 'failed' && 'bg-red-950/50 text-red-300 border border-red-700'
            )}
          >
            {hailStatus === 'sending' && 'Sending hail...'}
            {hailStatus === 'sent' && '✓ Hail sent'}
            {hailStatus === 'failed' && '✗ Failed to send hail'}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}