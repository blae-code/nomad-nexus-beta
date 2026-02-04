import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getDisplayCallsign } from '@/utils';

const profileCache = new Map();

const buildFallbackKey = (fallbackMap) => {
  if (!fallbackMap) return '';
  return Object.keys(fallbackMap).sort().join('|');
};

export function useMemberProfileMap(userIds = [], options = {}) {
  const { fallbackMap = {} } = options;
  const idsKey = useMemo(() => (userIds || []).filter(Boolean).join('|'), [userIds]);
  const fallbackKey = useMemo(() => buildFallbackKey(fallbackMap), [fallbackMap]);
  const [memberMap, setMemberMap] = useState(() => ({ ...fallbackMap }));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));

    if (ids.length === 0) {
      setMemberMap({ ...fallbackMap });
      return () => {
        isActive = false;
      };
    }

    const loadProfiles = async () => {
      setLoading(true);
      const resolved = {};

      for (const id of ids) {
        if (profileCache.has(id)) {
          resolved[id] = profileCache.get(id);
          continue;
        }

        try {
          const profile = await base44.entities.MemberProfile.get(id);
          const label = getDisplayCallsign(profile) || profile.callsign || profile.id || 'Unknown';
          const entry = { profile, label };
          profileCache.set(id, entry);
          resolved[id] = entry;
        } catch (error) {
          // Missing profiles are expected for admin users; keep silent.
        }
      }

      if (!isActive) return;
      setMemberMap({ ...fallbackMap, ...resolved });
      setLoading(false);
    };

    loadProfiles();

    return () => {
      isActive = false;
    };
  }, [idsKey, fallbackKey]);

  return { memberMap, loading };
}
