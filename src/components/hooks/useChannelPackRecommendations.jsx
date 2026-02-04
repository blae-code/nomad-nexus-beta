import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';

const LOCAL_PACKS_KEY = 'nexus.comms.channelPacks';

const normalize = (value) => (value || '').toString().toLowerCase();

const loadLocalPacks = () => {
  try {
    const raw = localStorage.getItem(LOCAL_PACKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function useChannelPackRecommendations(user, channels = []) {
  const [packs, setPacks] = useState([]);
  const [squadMemberships, setSquadMemberships] = useState([]);

  useEffect(() => {
    let isActive = true;
    const loadPacks = async () => {
      let results = [];
      const hasEntity = !!base44?.entities?.ChannelPack?.list;
      if (hasEntity) {
        try {
          results = await base44.entities.ChannelPack.list();
        } catch {
          results = [];
        }
      }
      if (!results.length) {
        results = loadLocalPacks();
      }
      if (isActive) setPacks(results || []);
    };
    loadPacks();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isActive = true;
    const loadMemberships = async () => {
      if (!user?.id) {
        setSquadMemberships([]);
        return;
      }
      let memberships = [];
      try {
        memberships = await base44.entities.SquadMembership.filter({
          member_profile_id: user.id,
          status: 'active',
        });
      } catch {
        memberships = [];
      }

      if (!memberships.length) {
        try {
          memberships = await base44.entities.SquadMembership.filter({
            user_id: user.id,
            status: 'active',
          });
        } catch {
          memberships = [];
        }
      }
      if (isActive) setSquadMemberships(memberships || []);
    };
    loadMemberships();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  const recommendedChannels = useMemo(() => {
    if (!user || !channels?.length) return [];
    const roleSet = new Set((user.roles || []).map((r) => normalize(r)));
    const rank = normalize(user.rank);
    const membership = normalize(user.membership);
    const squadIds = new Set(
      squadMemberships.map((m) => m.squad_id || m.squadId).filter(Boolean)
    );

    const channelById = new Map(channels.map((ch) => [ch.id, ch]));
    const channelByName = new Map(channels.map((ch) => [normalize(ch.name), ch]));

    const matchesPack = (pack) => {
      const scopeType = normalize(pack.scope_type || pack.scopeType || pack.scope || pack.type || '');
      const scopeValue =
        pack.scope_value ||
        pack.scopeValue ||
        pack.role_name ||
        pack.rank ||
        pack.membership ||
        pack.squad_name ||
        pack.squad_id ||
        pack.scope_id;
      const normalizedValue = normalize(scopeValue);

      if (scopeType === 'role') return roleSet.has(normalizedValue);
      if (scopeType === 'rank') return normalizedValue === rank;
      if (scopeType === 'membership') return normalizedValue === membership;
      if (scopeType === 'squad') return squadIds.has(scopeValue) || squadIds.has(normalizedValue);
      return false;
    };

    const recommended = new Map();

    packs.forEach((pack) => {
      if (!matchesPack(pack)) return;
      const ids = pack.channel_ids || pack.channelIds || [];
      const names = pack.channel_names || pack.channelNames || [];
      ids.forEach((id) => {
        const channel = channelById.get(id);
        if (channel && !channel.is_dm) recommended.set(channel.id, channel);
      });
      names.forEach((name) => {
        const channel = channelByName.get(normalize(name));
        if (channel && !channel.is_dm) recommended.set(channel.id, channel);
      });
    });

    if (recommended.size === 0 && squadIds.size > 0) {
      channels.forEach((channel) => {
        if (channel.is_dm || channel.category !== 'squad') return;
        const name = normalize(channel.name);
        for (const squadId of squadIds) {
          if (normalize(channel.scope_id) === normalize(squadId)) {
            recommended.set(channel.id, channel);
            return;
          }
        }
        // fallback: match squad name fragments
        squadMemberships.forEach((membership) => {
          if (membership.squad_name && name.includes(normalize(membership.squad_name))) {
            recommended.set(channel.id, channel);
          }
        });
      });
    }

    return Array.from(recommended.values());
  }, [channels, packs, squadMemberships, user]);

  return { recommendedChannels };
}
