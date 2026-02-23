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

const isInQuietHours = (quietHours) => {
  if (!quietHours?.is_enabled) return false;
  const now = new Date();
  const [startH, startM] = (quietHours.quiet_hours_start || '22:00').split(':').map(Number);
  const [endH, endM] = (quietHours.quiet_hours_end || '08:00').split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  return startMins > endMins
    ? currentMins >= startMins || currentMins < endMins
    : currentMins >= startMins && currentMins < endMins;
};

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

    // Delay subscription to avoid blocking initial render
    const timeoutId = setTimeout(() => {
      startSubscription();
    }, 2000);

    const startSubscription = () => {
    const loadPreferences = async (userId) => {
      const cacheKey = userId;
      const cached = prefCacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.at < PREF_CACHE_TTL_MS) {
        return cached.value;
      }

      let pref = null;
      try {
        const prefs = await base44.entities.NotificationPreference.filter({
          user_id: userId,
        }, '-created_date', 1);
        pref = prefs?.[0] || null;
      } catch (e) {
        console.debug('[Notifications] Failed to load preferences:', e?.message);
      }

      prefCacheRef.current.set(cacheKey, { value: pref, at: Date.now() });
      return pref;
    };

    const handleNotification = async (notif) => {
      if (!notif || notif.user_id !== user.id) return;
      if (isDndEnabled()) return;

      const prefs = await loadPreferences(user.id);
      if (!prefs) return;

      // Check type-specific preferences
      const typeKey = notif.type?.replace('-', '_');
      if (!prefs[typeKey] && prefs[typeKey] !== undefined) return;

      // Map notification types to preference keys
      const typePreferences = {
        'direct_message': 'direct_messages',
        'mention': 'direct_messages',
        'squad_invite': 'squad_invitations',
        'squad_event': 'squad_events',
        'event_assign': 'event_assignments',
        'event_update': 'event_status_changes',
        'incident': 'incident_alerts',
        'rank_change': 'rank_changes',
        'treasury': 'treasury_changes',
        'voice_activity': 'voice_net_activity',
        'high_priority': 'high_priority_alerts',
        'system': 'high_priority_alerts',
      };

      const prefKey = typePreferences[notif.type];
      if (prefKey && prefs[prefKey] === false) return;

      // Check quiet hours
      const inQuietHours = isInQuietHours(prefs);
      if (inQuietHours) {
        const isCritical = notif.type === 'high_priority' || notif.type === 'system';
        const isDM = notif.type === 'direct_message' || notif.type === 'mention';
        if (!isCritical && !isDM) return; // Block non-critical, non-DM during quiet hours
      }

      const title = notif.title || 'Notification';
      const message = notif.message || '';

      addNotification({
        type: notif.type === 'mention' ? 'info' : 'alert',
        title,
        message,
        duration: 8000,
      });

      // Check delivery methods
      if (prefs.delivery_methods?.includes('browser')) {
        sendNotification(title, { body: message });
      }

      if (prefs.delivery_methods?.includes('in_app')) {
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
    };

    return () => {
      clearTimeout(timeoutId);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [enabled, user?.id, addNotification, sendNotification]);

  return null;
}