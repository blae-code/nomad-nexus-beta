import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isDemoMode, persistDemoFromUrl } from '@/lib/demo-mode';

persistDemoFromUrl();

const { appId, serverUrl, token, functionsVersion } = appParams;

const demoUser = {
  id: 'demo-user-001',
  full_name: 'Demo Commander',
  callsign: 'NOMAD-PRIME',
  rank: 'Pioneer',
  role: 'admin',
  commsPreferences: {
    ptt_enabled: true,
    ptt_key: 'Space',
  },
};

const nowIso = () => new Date().toISOString();

const demoData = {
  MemberProfile: [
    {
      id: 'demo-profile-001',
      user_id: demoUser.id,
      onboarding_completed: true,
      created_date: nowIso(),
    },
  ],
  User: [demoUser],
  Event: [
    {
      id: 'evt-demo-001',
      title: 'OP: VIGILANT DAWN',
      status: 'active',
      event_type: 'focused',
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_date: nowIso(),
    },
    {
      id: 'evt-demo-002',
      title: 'Rescue Sweep - Daymar',
      status: 'scheduled',
      event_type: 'training',
      start_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      updated_date: nowIso(),
    },
  ],
  EventLog: [
    {
      id: 'log-demo-001',
      summary: 'Alpha wing reports contact at OM-3.',
      type: 'RESCUE',
      severity: 'HIGH',
      created_date: nowIso(),
    },
    {
      id: 'log-demo-002',
      summary: 'Comms net verified on COMMAND.',
      type: 'COMMS',
      severity: 'LOW',
      created_date: nowIso(),
    },
  ],
  VoiceNet: [
    {
      id: 'net-demo-001',
      code: 'COMMAND',
      label: 'Command Net',
      type: 'command',
      status: 'active',
      priority: 1,
    },
    {
      id: 'net-demo-002',
      code: 'ALPHA',
      label: 'Alpha Wing',
      type: 'squad',
      status: 'active',
      priority: 2,
    },
  ],
  Squad: [
    { id: 'squad-demo-001', name: 'Alpha Wing', hierarchy_level: 'wing' },
    { id: 'squad-demo-002', name: 'Rescue Team', hierarchy_level: 'squad' },
  ],
  SquadMembership: [
    {
      id: 'membership-demo-001',
      user_id: demoUser.id,
      squad_id: 'squad-demo-001',
      status: 'active',
    },
  ],
  UserPresence: [
    {
      id: 'presence-demo-001',
      user_id: demoUser.id,
      status: 'online',
      last_activity: nowIso(),
    },
  ],
  Incident: [
    {
      id: 'incident-demo-001',
      title: 'Distress Beacon - ArcCorp',
      status: 'active',
      created_date: nowIso(),
    },
  ],
  FleetAsset: [
    {
      id: 'fleet-demo-001',
      name: 'Carrack - Pathfinder',
      status: 'ready',
      updated_date: nowIso(),
    },
  ],
  Coffer: [
    {
      id: 'coffer-demo-001',
      balance: 150000,
    },
  ],
  Message: [
    {
      id: 'msg-demo-001',
      content: '[COMMS LOG] TX on COMMAND: Systems green.',
      created_date: nowIso(),
    },
  ],
  CommsChannel: [
    {
      id: 'channel-demo-001',
      name: 'command-brief',
      is_canonical: true,
    },
  ],
  Role: [
    { id: 'role-demo-001', name: 'Commander' },
    { id: 'role-demo-002', name: 'Rescue Lead' },
  ],
  AccessKey: [
    { id: 'key-demo-001', code: 'DEMO-ACCESS', status: 'ACTIVE' },
  ],
  PlayerStatus: [
    {
      id: 'status-demo-001',
      user_id: demoUser.id,
      status: 'active',
      event_id: 'evt-demo-001',
      assigned_squad_id: 'squad-demo-001',
    },
  ],
  AdminAuditLog: [],
  AppConfig: [],
  CommsMode: [],
  AuditLog: [],
  EventDutyAssignment: [],
  EventReport: [],
  Feedback: [],
  PinnedMessage: [],
  ChannelMute: [],
  VoiceNetStatus: [],
  SystemCheckResult: [],
  RescueRequest: [],
};

const normalizeSortKey = (sortKey) => {
  if (!sortKey) return null;
  if (typeof sortKey === 'string' && sortKey.startsWith('-')) {
    return { key: sortKey.slice(1), direction: 'desc' };
  }
  return { key: sortKey, direction: 'asc' };
};

const matchValue = (value, filter) => {
  if (filter && typeof filter === 'object' && !Array.isArray(filter)) {
    if ('$ne' in filter) return value !== filter.$ne;
    if ('$in' in filter) return filter.$in.includes(value);
  }
  if (Array.isArray(filter)) return filter.includes(value);
  return value === filter;
};

const filterRecords = (records, query = {}) => {
  if (!query || Object.keys(query).length === 0) return records;
  return records.filter((record) =>
    Object.entries(query).every(([key, filter]) => matchValue(record?.[key], filter))
  );
};

const createEntityApi = (entityName) => {
  const dataStore = demoData[entityName] || [];

  return {
    list: async (sortKey, limit) => {
      const records = [...dataStore];
      const sort = normalizeSortKey(sortKey);
      if (sort?.key) {
        records.sort((a, b) => {
          const aVal = a?.[sort.key];
          const bVal = b?.[sort.key];
          if (aVal === bVal) return 0;
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;
          return sort.direction === 'desc'
            ? String(bVal).localeCompare(String(aVal))
            : String(aVal).localeCompare(String(bVal));
        });
      }
      if (typeof limit === 'number') return records.slice(0, limit);
      return records;
    },
    filter: async (query = {}, sortKey, limit) => {
      const filtered = filterRecords(dataStore, query);
      const sort = normalizeSortKey(sortKey);
      if (sort?.key) {
        filtered.sort((a, b) => {
          const aVal = a?.[sort.key];
          const bVal = b?.[sort.key];
          if (aVal === bVal) return 0;
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;
          return sort.direction === 'desc'
            ? String(bVal).localeCompare(String(aVal))
            : String(aVal).localeCompare(String(bVal));
        });
      }
      if (typeof limit === 'number') return filtered.slice(0, limit);
      return filtered;
    },
    get: async (id) => dataStore.find((item) => item.id === id) || null,
    create: async (payload) => {
      const newItem = {
        id: `${entityName.toLowerCase()}-${Date.now()}`,
        created_date: nowIso(),
        ...payload,
      };
      dataStore.unshift(newItem);
      return newItem;
    },
    update: async (id, payload) => {
      const index = dataStore.findIndex((item) => item.id === id);
      if (index === -1) return null;
      dataStore[index] = { ...dataStore[index], ...payload, updated_date: nowIso() };
      return dataStore[index];
    },
    delete: async (id) => {
      const index = dataStore.findIndex((item) => item.id === id);
      if (index === -1) return false;
      dataStore.splice(index, 1);
      return true;
    },
    subscribe: () => () => {},
  };
};

const buildDemoClient = () => {
  const entities = new Proxy(
    {
      Query: {},
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return createEntityApi(prop);
      },
    },
  );

  return {
    auth: {
      isAuthenticated: async () => true,
      me: async () => demoUser,
      updateMe: async (payload) => ({ ...demoUser, ...payload }),
      logout: () => {},
      redirectToLogin: (returnUrl) => {
        if (typeof window !== 'undefined') {
          window.location.href = `/access-gate?return=${encodeURIComponent(returnUrl || '/')}`;
        }
      },
    },
    entities,
    users: {
      inviteUser: async () => ({ ok: true }),
    },
    functions: {
      invoke: async (name, payload = {}) => {
        switch (name) {
          case 'redeemAccessKey':
            return {
              data: {
                success: true,
                grants_rank: 'PIONEER',
                grants_roles: ['admin', 'commander'],
              },
            };
          case 'generateLiveKitToken':
            return {
              data: {
                ok: true,
                data: {
                  token: 'demo-token',
                  url: 'wss://demo.livekit.local',
                },
              },
            };
          case 'verifyCommsReadiness':
            return {
              data: {
                ok: true,
                mode: 'simulated',
                message: 'Demo mode comms readiness simulated.',
              },
            };
          case 'getLiveKitRoomStatus':
            return {
              data: {
                ok: true,
                rooms: payload?.rooms || [],
              },
            };
          case 'populateSampleData':
            return {
              data: {
                created: {
                  events: demoData.Event.length,
                  voice_nets: demoData.VoiceNet.length,
                  logs: demoData.EventLog.length,
                },
                timestamp: nowIso(),
              },
            };
          case 'wipeAppData':
            return {
              data: {
                message: 'Demo data reset (simulation).',
                timestamp: nowIso(),
              },
            };
          case 'getUserDirectory':
            return {
              data: {
                users: demoData.User,
              },
            };
          default:
            return {
              data: {
                ok: true,
                message: `Demo mode stub for ${name}`,
              },
            };
        }
      },
    },
    integrations: {
      Core: {
        InvokeLLM: async () => ({
          data: {
            ok: true,
            response: 'Demo response: tactical summary pending live integration.',
          },
        }),
        SendEmail: async () => ({ data: { ok: true } }),
        SendSMS: async () => ({ data: { ok: true } }),
        UploadFile: async () => ({ data: { file_url: 'https://demo.storage.local/file' } }),
        GenerateImage: async () => ({ data: { url: 'https://demo.storage.local/image' } }),
        ExtractDataFromUploadedFile: async () => ({ data: { ok: true } }),
      },
    },
    asServiceRole: {
      entities,
    },
  };
};

const shouldUseDemo = () => {
  if (isDemoMode()) return true;
  if (!appId || !serverUrl) return true;
  return false;
};

export const base44 = shouldUseDemo()
  ? buildDemoClient()
  : createClient({
      appId,
      serverUrl,
      token,
      functionsVersion,
      requiresAuth: false,
    });
