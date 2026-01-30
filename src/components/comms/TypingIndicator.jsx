import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function TypingIndicator({ userIds }) {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    if (userIds.length === 0) {
      setProfiles([]);
      return;
    }

    const loadProfiles = async () => {
      try {
        const profilesList = await Promise.all(
          userIds.slice(0, 3).map(uid => 
            base44.entities.MemberProfile.filter({ user_id: uid }).then(p => p[0])
          )
        );
        setProfiles(profilesList.filter(Boolean));
      } catch (error) {
        // Silently fail
      }
    };

    loadProfiles();
  }, [userIds.join(',')]);

  if (profiles.length === 0) return null;

  const names = profiles.map(p => p.callsign).slice(0, 2);
  const remaining = userIds.length - names.length;

  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500 py-2 px-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>
        {names.join(', ')}
        {remaining > 0 && ` and ${remaining} other${remaining > 1 ? 's' : ''}`}
        {' '}typing...
      </span>
    </div>
  );
}