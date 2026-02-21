import React, { useEffect, useState } from 'react';
import { base44 } from '@/components/base44/nexusBase44Client';
import { Users, Eye } from 'lucide-react';

/**
 * CollaborationPresence — Shows active users in the workspace
 */
export default function CollaborationPresence({ scopeKey, currentUserId, currentUserName }) {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    if (!scopeKey || !currentUserId) return;

    let mounted = true;
    const heartbeatInterval = 10000; // 10s

    // Update our presence
    const updatePresence = async () => {
      try {
        const existing = await base44.entities.UserPresence.filter({
          member_profile_id: currentUserId,
          event_id: scopeKey,
        });

        if (existing.length > 0) {
          await base44.entities.UserPresence.update(existing[0].id, {
            status: 'online',
            last_activity: new Date().toISOString(),
          });
        } else {
          await base44.entities.UserPresence.create({
            member_profile_id: currentUserId,
            event_id: scopeKey,
            status: 'online',
            last_activity: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.warn('[Collaboration] Failed to update presence:', err);
      }
    };

    // Load active users
    const loadActiveUsers = async () => {
      try {
        const now = Date.now();
        const cutoff = new Date(now - 30000).toISOString(); // 30s threshold
        
        const presences = await base44.entities.UserPresence.filter({
          event_id: scopeKey,
        });

        const active = presences
          .filter((p) => {
            const lastActivity = new Date(p.last_activity).getTime();
            return now - lastActivity < 30000 && p.status === 'online';
          })
          .map((p) => ({
            id: p.member_profile_id,
            name: p.member_profile_id === currentUserId ? currentUserName : p.member_profile_id,
            status: p.status,
            lastActivity: p.last_activity,
          }));

        if (mounted) {
          setActiveUsers(active);
        }
      } catch (err) {
        console.warn('[Collaboration] Failed to load active users:', err);
      }
    };

    // Initial update and load
    updatePresence();
    loadActiveUsers();

    // Heartbeat
    const heartbeatTimer = setInterval(updatePresence, heartbeatInterval);
    
    // Poll for other users (could be replaced with real-time subscription)
    const pollTimer = setInterval(loadActiveUsers, 5000);

    // Subscribe to presence changes
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.event_id === scopeKey) {
        loadActiveUsers();
      }
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      clearInterval(heartbeatTimer);
      clearInterval(pollTimer);
      unsubscribe();

      // Mark as offline
      base44.entities.UserPresence.filter({
        member_profile_id: currentUserId,
        event_id: scopeKey,
      }).then((existing) => {
        if (existing.length > 0) {
          base44.entities.UserPresence.update(existing[0].id, {
            status: 'offline',
          }).catch(() => {});
        }
      }).catch(() => {});
    };
  }, [scopeKey, currentUserId, currentUserName]);

  if (activeUsers.length <= 1) return null;

  const otherUsers = activeUsers.filter((u) => u.id !== currentUserId);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-700/50 bg-zinc-900/40">
      <Users className="w-3 h-3 text-green-400" />
      <div className="flex items-center gap-1">
        {otherUsers.slice(0, 5).map((user, idx) => (
          <div
            key={user.id}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/30 border border-orange-500/40 text-[9px] font-bold text-orange-300"
            title={user.name}
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
        ))}
        {otherUsers.length > 5 && (
          <div className="text-[10px] text-zinc-500 ml-1">+{otherUsers.length - 5}</div>
        )}
      </div>
      <span className="text-[10px] text-zinc-400">
        {otherUsers.length} viewing
      </span>
    </div>
  );
}
