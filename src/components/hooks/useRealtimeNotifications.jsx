import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNotification } from '@/components/providers/NotificationContext';
import { useDesktopNotifications } from '@/components/hooks/useDesktopNotifications';
import { useAuth } from '@/components/providers/AuthProvider';

const SOUND_COOLDOWN_MS = 2500;
const PREF_CACHE_TTL_MS = 60_000;

const playNotificationSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
    oscillator.onended = () => ctx.close();
  } catch {
    // ignore audio failures
  }
};

const getPrefKey = (userId, channelId) => `${userId || 'anon'}:${channelId || 'global'}`;
const isDndEnabled = () => {
  try {
    return localStorage.getItem('nexus.notifications.dnd') === 'true';
  } catch {
    return false;
  }
};

export function useRealtimeNotifications({ enabled = true } = {}) {
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const { addNotification } = useNotification();
  const { sendNotification } = useDesktopNotifications();
  const lastSoundAtRef = useRef(0);
  const prefCacheRef = useRef(new Map());

  useEffect(() => {
    if (!enabled || !user?.id) return undefined;

    const loadPreferences = async (channelId) => {
      const cacheKey = getPrefKey(user.id, channelId);
      const cached = prefCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < PREF_CACHE_TTL_MS) {
        return cached.value;
      }

      let pref = null;
      if (channelId) {
        try {
          const prefs = await base44.entities.NotificationPreference.filter({
            user_id: user.id,
            channel_id: channelId,
          });
          pref = prefs?.[0] || null;
        } catch {
          // ignore
        }

        if (!pref) {
          try {
            const prefs = await base44.entities.NotificationPreference.filter({
              member_profile_id: user.id,
              channel_id: channelId,
            });
            pref = prefs?.[0] || null;
          } catch {
            // ignore
          }
        }
      }

      prefCacheRef.current.set(cacheKey, { value: pref, at: Date.now() });
      return pref;
    };

    const handleNotification = async (notif) => {
      if (!notif || notif.user_id !== user.id) return;
      if (isDndEnabled()) return;

      const pref = await loadPreferences(notif.channel_id);
      if (pref?.muted) return;
      if (pref?.mentions_only && notif.type !== 'mention') return;

      const title = notif.title || 'Notification';
      const message = notif.message || '';

      addNotification({
        type: notif.type === 'mention' ? 'info' : 'alert',
        title,
        message,
        duration: 8000,
      });

      if (pref?.desktop_notifications !== false) {
        sendNotification(title, { body: message });
      }

      if (pref?.sound_enabled !== false) {
        const now = Date.now();
        if (now - lastSoundAtRef.current > SOUND_COOLDOWN_MS) {
          playNotificationSound();
          lastSoundAtRef.current = now;
        }
      }
    };

    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create') {
        handleNotification(event.data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, user?.id, addNotification, sendNotification]);

  return null;
}
