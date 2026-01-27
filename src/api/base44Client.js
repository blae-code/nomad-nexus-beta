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
                isReady: false,
                envStatus: 'development',
                warning: 'Demo mode active. LIVE comms are disabled.',
                reason: 'Demo mode comms readiness simulated.',
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
          case 'validateRankChangePermission':
            return {
              data: {
                permitted: true,
                error: null,
              },
            };
          case 'validatePioneerUniqueness':
            return {
              data: {
                valid: true,
                error: null,
              },
            };
          case 'validateVoyagerNumber':
            return {
              data: {
                valid: true,
                error: null,
              },
            };
          case 'issueAccessKey':
            return {
              data: {
                code: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                grants_rank: payload?.grants_rank || 'VAGRANT',
                grants_roles: payload?.grants_roles || [],
                note: payload?.note || '',
                status: 'ACTIVE',
              },
            };
          case 'sendWhisper':
            return {
              data: {
                ok: true,
                recipients_count: payload?.targetIds?.length || 0,
              },
            };
          case 'updateUserPresence':
            return {
              data: {
                ok: true,
                presence: {
                  id: `presence-${demoUser.id}`,
                  user_id: demoUser.id,
                  status: payload?.status || 'online',
                  net_id: payload?.netId || null,
                  event_id: payload?.eventId || null,
                  is_transmitting: Boolean(payload?.isTransmitting),
                  last_activity: nowIso(),
                },
              },
            };
          case 'handleRescueRequest':
            return {
              data: {
                ok: true,
                roomName: 'RESCUE-NET',
                message: 'Demo rescue request accepted.',
              },
            };
          case 'analyzeMessage':
            return {
              data: {
                priority: 'low',
                category: 'general',
                summary: 'Demo analysis placeholder.',
                action_items: [],
                escalate: false,
              },
            };
          case 'analyzeStatusUpdate':
            return {
              data: {
                ok: true,
                analysis: 'Demo status analysis complete.',
              },
            };
          case 'channelAIAssistant': {
            if (payload?.action === 'suggestChannels') {
              return {
                data: {
                  result: {
                    suggestions: [
                      {
                        channelName: 'operations',
                        relevance: 0.82,
                        reason: 'Demo suggestion based on message context.',
                      },
                    ],
                  },
                },
              };
            }
            if (payload?.action === 'summarizeActivity') {
              return {
                data: {
                  result: {
                    summary: 'Demo activity summary.',
                    sentiment: 'neutral',
                    messageCount: 0,
                    keyTopics: [],
                  },
                },
              };
            }
            return { data: { result: {} } };
          }
          case 'commsAssistant': {
            if (payload?.action === 'summarize_logs') {
              return {
                data: {
                  summary: 'Demo comms summary.',
                  key_points: [],
                },
              };
            }
            if (payload?.action === 'suggest_nets') {
              return {
                data: {
                  recommended_net_code: 'COMMAND',
                  reason: 'Demo recommendation for routing priority traffic.',
                },
              };
            }
            if (payload?.action === 'ask_comms') {
              return {
                data: {
                  answer: 'Demo response: review operational logs for updates.',
                },
              };
            }
            return { data: {} };
          }
          case 'commsMonitor': {
            if (payload?.action === 'analyze_threats') {
              return {
                data: {
                  threat_level: 'normal',
                  critical_alerts: [],
                  keywords_detected: [],
                },
              };
            }
            if (payload?.action === 'summarize_traffic') {
              return {
                data: {
                  summary: 'Demo traffic summary.',
                  activity_level: 'LOW',
                  nets_active: [],
                  key_events: [],
                  concerns: [],
                },
              };
            }
            return { data: {} };
          }
          case 'detectCommsAnomalies':
            return {
              data: {
                analysis: {
                  overall_status: 'NOMINAL',
                  summary: 'No anomalies detected in demo mode.',
                  anomalies: [],
                },
                context: {
                  logsAnalyzed: 0,
                },
              },
            };
          case 'generateCommsSummary':
            return {
              data: {
                summary: {
                  executive_summary: 'Demo communications summary.',
                  timeline: [],
                  critical_information: [],
                  action_items: [],
                  recommendations: [],
                  effectiveness_score: 8,
                  effectiveness_notes: 'Comms flow is stable in demo mode.',
                },
                messages_analyzed: 0,
              },
            };
          case 'generateEventAAR':
            return {
              data: {
                success: true,
              },
            };
          case 'generateEventReport':
            return {
              data: {
                content: 'Demo report content.',
                reportType: payload?.reportType || 'summary',
              },
            };
          case 'generateFeedbackAISummary':
            return {
              data: {
                ok: true,
              },
            };
          case 'generateMultiChannelSummary':
            return {
              data: {
                sitrep: {
                  posture: 'NOMINAL',
                  operational_status: 'Demo sitrep generated.',
                  key_developments: [],
                  threats_concerns: [],
                  command_priorities: [],
                },
                context: {
                  eventsAnalyzed: 0,
                  channelsMonitored: 0,
                },
              },
            };
          case 'getCommsRoomStatus':
            return {
              data: {
                roomName: payload?.roomName || null,
                participantCount: 0,
              },
            };
          case 'inferTacticalStatus':
            return {
              data: {
                color: 'Green',
                location: 'Unknown',
                status: 'Nominal',
                summary: 'Demo tactical status inference.',
              },
            };
          case 'initializeEventComms':
            return {
              data: {
                ok: true,
                netsCreated: [],
              },
            };
          case 'netAssistant': {
            if (payload?.action === 'suggest_config') {
              return {
                data: {
                  nets: [
                    {
                      code: 'COMMAND',
                      label: 'Command Net',
                      type: 'command',
                      priority: 1,
                      reasoning: 'Demo net suggestion.',
                    },
                  ],
                },
              };
            }
            if (payload?.action === 'detect_conflicts') {
              return {
                data: {
                  conflicts: [],
                },
              };
            }
            if (payload?.action === 'status_report') {
              return {
                data: {
                  summary: 'Demo network status report.',
                  metrics: {
                    net_health: 'optimal',
                    total_nets: 0,
                    active_participants: 0,
                    critical_alerts: 0,
                  },
                  recommendations: [],
                },
              };
            }
            return { data: {} };
          }
          case 'provisionCommsFromFormation':
            return {
              data: {
                ok: true,
                netsCreated: [],
              },
            };
          case 'riggsyChat':
            return {
              data: {
                content: 'Demo response from Riggsy.',
                timestamp: nowIso(),
              },
            };
          case 'sendTacticalCommand':
            return {
              data: {
                ok: true,
              },
            };
          case 'setupDemoScenario':
            return {
              data: {
                scenario: {
                  id: 'demo-scenario',
                  eventId: demoData.Event[0]?.id,
                  message: 'Demo scenario ready.',
                },
              },
            };
          case 'transcribeVoiceNet':
            return {
              data: {
                ok: true,
                transcript: '',
                segments: [],
              },
            };
          default:
            return {
              data: {
                ok: true,
                data: {},
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
  if (!appId || !serverUrl) {
    console.error('[base44] Missing app_id or server_url; falling back to demo client.');
    return true;
  }
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
