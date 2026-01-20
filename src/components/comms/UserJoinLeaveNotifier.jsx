import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UserJoinLeaveNotifier({ 
  notifications = [], 
  onDismiss, 
  soundEnabled = true,
  notificationSound = 'beep'
}) {
  const [visible, setVisible] = useState({});

  useEffect(() => {
    notifications.forEach((notif) => {
      if (!visible[notif.id]) {
        setVisible(prev => ({ ...prev, [notif.id]: true }));
        
        // Auto-dismiss after 4 seconds
        const timer = setTimeout(() => {
          setVisible(prev => ({ ...prev, [notif.id]: false }));
          setTimeout(() => onDismiss(notif.id), 300);
        }, 4000);

        return () => clearTimeout(timer);
      }
    });
  }, [notifications, visible, onDismiss]);

  const playNotificationSound = (soundType) => {
    if (!soundEnabled || soundType === 'none') return;
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;
      const duration = 0.3;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies = {
        chime: [1046],
        beep: [800],
        ping: [1200],
        alert: [400],
        tone: [440],
        bell: [640]
      };

      oscillator.frequency.setValueAtTime(frequencies[soundType]?.[0] || 440, now);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);
    } catch (error) {
      console.error('[NOTIF] Sound playback failed:', error);
    }
  };

  return (
    <div className="fixed top-20 right-6 z-40 space-y-2 pointer-events-none">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 px-4 py-2 rounded border backdrop-blur-sm transition-all duration-300 animate-in slide-in-from-right-4',
            visible[notif.id] ? 'opacity-100' : 'opacity-0',
            notif.type === 'join'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-100'
              : 'bg-amber-950/80 border-amber-700 text-amber-100'
          )}
        >
          {notif.type === 'join' ? (
            <LogIn className="w-4 h-4 shrink-0" />
          ) : (
            <LogOut className="w-4 h-4 shrink-0" />
          )}
          <span className="text-sm font-medium whitespace-nowrap">
            {notif.username} {notif.type === 'join' ? 'joined' : 'left'} {notif.netCode}
          </span>
          {notif.lastSeen && (
            <span className="text-[10px] text-zinc-400 ml-2">
              ({notif.lastSeen})
            </span>
          )}
          <button
            onClick={() => {
              setVisible(prev => ({ ...prev, [notif.id]: false }));
              setTimeout(() => onDismiss(notif.id), 300);
            }}
            className="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
}