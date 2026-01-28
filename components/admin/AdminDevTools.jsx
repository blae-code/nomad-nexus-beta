import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Zap, Database, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Clock, 
  BarChart3, Search, Copy, Eye, Terminal,
  TrendingUp, AlertCircle, Server, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const TOOL_CATEGORIES = [
  { id: 'diagnostics', label: 'DIAGNOSTICS', icon: <BarChart3 className="w-3 h-3" /> },
  { id: 'database', label: 'DATABASE', icon: <Database className="w-3 h-3" /> },
  { id: 'entities', label: 'ENTITIES', icon: <Server className="w-3 h-3" /> },
  { id: 'maintenance', label: 'MAINTENANCE', icon: <Zap className="w-3 h-3" /> },
  { id: 'repair', label: 'REPAIR', icon: <RotateCcw className="w-3 h-3" /> },
];

export default function AdminDevTools() {
  const [selectedCategory, setSelectedCategory] = useState('diagnostics');
  const [search, setSearch] = useState('');
  const [executing, setExecuting] = useState(null);
  const [results, setResults] = useState({});
  const [systemStats, setSystemStats] = useState(null);

  // Load system stats on mount
  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const [users, events, roles, nets] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Event.list(),
          base44.entities.Role.list(),
          base44.entities.VoiceNet.list(),
        ]);
        setSystemStats({ users: users.length, events: events.length, roles: roles.length, nets: nets.length });
      } catch (e) {
        console.error('Failed to load stats:', e);
      }
    };
    loadStats();
  }, []);

  // Define all dev tools by category
  const tools = {
    diagnostics: [
      { 
        id: 'entity-count', 
        name: 'Entity Count', 
        desc: 'Count all records per entity type', 
        icon: <BarChart3 className="w-4 h-4" />,
        action: async () => {
          const counts = {};
          const entities = ['User', 'Event', 'Role', 'VoiceNet', 'SquadMembership', 'Channel'];
          for (const entity of entities) {
            try {
              const list = await base44.entities[entity].list();
              counts[entity] = list.length;
            } catch (e) {
              counts[entity] = 'ERROR';
            }
          }
          return counts;
        }
      },
      { 
        id: 'system-health', 
        name: 'System Health Check', 
        desc: 'Verify connectivity & database', 
        icon: <CheckCircle2 className="w-4 h-4" />,
        action: async () => {
          const start = performance.now();
          try {
            await base44.auth.me();
            const latency = Math.round(performance.now() - start);
            return { status: 'HEALTHY', latency_ms: latency, timestamp: new Date().toISOString() };
          } catch (e) {
            return { status: 'DEGRADED', error: e.message };
          }
        }
      },
      { 
        id: 'event-status-dist', 
        name: 'Event Status Distribution', 
        desc: 'Count events by status', 
        icon: <TrendingUp className="w-4 h-4" />,
        action: async () => {
          const events = await base44.entities.Event.list();
          const dist = {};
          events.forEach(e => {
            dist[e.status] = (dist[e.status] || 0) + 1;
          });
          return dist;
        }
      },
      { 
        id: 'user-rank-dist', 
        name: 'User Rank Distribution', 
        desc: 'Count users by rank', 
        icon: <BarChart3 className="w-4 h-4" />,
        action: async () => {
          const users = await base44.entities.User.list();
          const dist = {};
          users.forEach(u => {
            dist[u.rank || 'UNRANKED'] = (dist[u.rank || 'UNRANKED'] || 0) + 1;
          });
          return dist;
        }
      },
      { 
        id: 'online-presence', 
        name: 'Online User Presence', 
        desc: 'Count users by status', 
        icon: <Eye className="w-4 h-4" />,
        action: async () => {
          const presences = await base44.entities.UserPresence.list();
          const dist = {};
          presences.forEach(p => {
            dist[p.status || 'unknown'] = (dist[p.status || 'unknown'] || 0) + 1;
          });
          return dist;
        }
      },
      { 
        id: 'message-volume', 
        name: 'Recent Message Volume', 
        desc: 'Message count last 24h', 
        icon: <TrendingUp className="w-4 h-4" />,
        action: async () => {
          const messages = await base44.entities.Message.list();
          const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
          const recent = messages.filter(m => m.created_date > oneDayAgo).length;
          return { total_24h: recent, total_all_time: messages.length };
        }
      },
    ],
    database: [
      { 
        id: 'db-backup', 
        name: 'Create Snapshot', 
        desc: 'Export all entities to backup', 
        icon: <Database className="w-4 h-4" />,
        action: async () => {
          const data = {};
          const entities = ['User', 'Event', 'Role', 'VoiceNet', 'SquadMembership', 'Message', 'Channel'];
          for (const entity of entities) {
            try {
              data[entity] = await base44.entities[entity].list();
            } catch (e) {
              data[entity] = [];
            }
          }
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `nomad-backup-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return { status: 'Backup downloaded', timestamp: new Date().toISOString(), size_bytes: json.length };
        }
      },
      { 
        id: 'orphaned-records', 
        name: 'Find Orphaned Records', 
        desc: 'Detect broken references', 
        icon: <AlertCircle className="w-4 h-4" />,
        action: async () => {
          const [users, events] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.Event.list(),
          ]);
          const userIds = new Set(users.map(u => u.id));
          const orphaned = {
            events_missing_host: events.filter(e => !userIds.has(e.host_id)).length,
            total_checked: events.length,
          };
          return orphaned;
        }
      },
      { 
        id: 'duplicate-check', 
        name: 'Check Duplicates', 
        desc: 'Find duplicate email/callsign', 
        icon: <AlertTriangle className="w-4 h-4" />,
        action: async () => {
          const users = await base44.entities.User.list();
          const emails = new Map();
          const callsigns = new Map();
          const duplicates = { emails: [], callsigns: [] };
          users.forEach(u => {
            if (u.email) {
              if (emails.has(u.email)) duplicates.emails.push(u.email);
              emails.set(u.email, (emails.get(u.email) || 0) + 1);
            }
            if (u.callsign) {
              if (callsigns.has(u.callsign)) duplicates.callsigns.push(u.callsign);
              callsigns.set(u.callsign, (callsigns.get(u.callsign) || 0) + 1);
            }
          });
          return { duplicate_emails: [...new Set(duplicates.emails)], duplicate_callsigns: [...new Set(duplicates.callsigns)] };
        }
      },
      { 
        id: 'db-integrity', 
        name: 'Database Integrity Check', 
        desc: 'Validate all data constraints', 
        icon: <CheckCircle2 className="w-4 h-4" />,
        action: async () => {
          const results = {
            users_missing_email: 0,
            events_missing_title: 0,
            roles_missing_name: 0,
            invalid_timestamps: 0,
          };
          const [users, events, roles] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.Event.list(),
            base44.entities.Role.list(),
          ]);
          results.users_missing_email = users.filter(u => !u.email).length;
          results.events_missing_title = events.filter(e => !e.title).length;
          results.roles_missing_name = roles.filter(r => !r.name).length;
          return results;
        }
      },
    ],
    entities: [
      { 
        id: 'entity-stats', 
        name: 'Entity Statistics', 
        desc: 'Detailed stats per entity', 
        icon: <Server className="w-4 h-4" />,
        action: async () => {
          const entities = ['User', 'Event', 'Role', 'VoiceNet', 'SquadMembership', 'Message'];
          const stats = {};
          for (const entity of entities) {
            try {
              const list = await base44.entities[entity].list();
              stats[entity] = {
                count: list.length,
                oldest: list.length > 0 ? new Date(list[0].created_date).toLocaleDateString() : 'N/A',
                newest: list.length > 0 ? new Date(list[list.length - 1].created_date).toLocaleDateString() : 'N/A',
              };
            } catch (e) {
              stats[entity] = { error: e.message };
            }
          }
          return stats;
        }
      },
      { 
        id: 'list-all-users', 
        name: 'Export Users', 
        desc: 'Download user list as JSON', 
        icon: <Database className="w-4 h-4" />,
        action: async () => {
          const users = await base44.entities.User.list();
          const json = JSON.stringify(users, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `users-export-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return { exported: users.length, timestamp: new Date().toISOString() };
        }
      },
      { 
        id: 'list-all-events', 
        name: 'Export Events', 
        desc: 'Download event list as JSON', 
        icon: <Database className="w-4 h-4" />,
        action: async () => {
          const events = await base44.entities.Event.list();
          const json = JSON.stringify(events, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `events-export-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return { exported: events.length, timestamp: new Date().toISOString() };
        }
      },
    ],
    maintenance: [
      { 
        id: 'clear-offline', 
        name: 'Clear Offline Presence', 
        desc: 'Remove offline user records', 
        icon: <Trash2 className="w-4 h-4" />,
        action: async () => {
          const presences = await base44.entities.UserPresence.list();
          const offline = presences.filter(p => p.status === 'offline');
          let deleted = 0;
          for (const p of offline) {
            try {
              await base44.entities.UserPresence.delete(p.id);
              deleted++;
            } catch (e) {
              console.error('Delete failed:', e);
            }
          }
          return { deleted, total_offline: offline.length };
        }
      },
      { 
        id: 'archive-completed', 
        name: 'Archive Completed Events', 
        desc: 'Mark old events as archived', 
        icon: <Clock className="w-4 h-4" />,
        action: async () => {
          const events = await base44.entities.Event.list();
          const completed = events.filter(e => e.status === 'completed');
          const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString();
          const old = completed.filter(e => e.created_date < thirtyDaysAgo);
          let updated = 0;
          for (const e of old) {
            try {
              await base44.entities.Event.update(e.id, { status: 'archived' });
              updated++;
            } catch (e) {
              console.error('Update failed:', e);
            }
          }
          return { archived: updated, eligible: old.length };
        }
      },
      { 
        id: 'reindex-search', 
        name: 'Reindex Search Cache', 
        desc: 'Rebuild all search indices', 
        icon: <RefreshCw className="w-4 h-4" />,
        action: async () => {
          const [users, events, roles] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.Event.list(),
            base44.entities.Role.list(),
          ]);
          return {
            indexed: users.length + events.length + roles.length,
            users: users.length,
            events: events.length,
            roles: roles.length,
            timestamp: new Date().toISOString(),
          };
        }
      },
      { 
        id: 'cleanup-orphans', 
        name: 'Remove Orphaned Roles', 
        desc: 'Delete roles with no members', 
        icon: <Trash2 className="w-4 h-4" />,
        action: async () => {
          const roles = await base44.entities.Role.list();
          const users = await base44.entities.User.list();
          const assignedRoleIds = new Set();
          users.forEach(u => (u.assigned_role_ids || []).forEach(id => assignedRoleIds.add(id)));
          const orphaned = roles.filter(r => !assignedRoleIds.has(r.id) && !r.is_system);
          let deleted = 0;
          for (const r of orphaned) {
            try {
              await base44.entities.Role.delete(r.id);
              deleted++;
            } catch (e) {
              console.error('Delete failed:', e);
            }
          }
          return { deleted, total_orphaned: orphaned.length };
        }
      },
    ],
    repair: [
      { 
        id: 'fix-missing-presence', 
        name: 'Create Missing Presence Records', 
        desc: 'Ensure all users have presence', 
        icon: <RotateCcw className="w-4 h-4" />,
        action: async () => {
          const [users, presences] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.UserPresence.list(),
          ]);
          const userIds = new Set(presences.map(p => p.user_id));
          const missing = users.filter(u => !userIds.has(u.id));
          let created = 0;
          for (const u of missing) {
            try {
              await base44.functions.invoke('updateUserPresence', {
                status: 'offline',
                netId: null,
                eventId: null,
                isTransmitting: false
              });
              created++;
            } catch (e) {
              console.error('Create failed:', e);
            }
          }
          return { created, missing_users: missing.length };
        }
      },
      { 
        id: 'reset-event-status', 
        name: 'Reset Stale Event Status', 
        desc: 'Mark stuck events as completed', 
        icon: <RotateCcw className="w-4 h-4" />,
        action: async () => {
          const events = await base44.entities.Event.list();
          const twentyFourHoursAgo = new Date(Date.now() - 24*60*60*1000).toISOString();
          const stuck = events.filter(e => e.status === 'active' && e.updated_date < twentyFourHoursAgo);
          let updated = 0;
          for (const e of stuck) {
            try {
              await base44.entities.Event.update(e.id, { status: 'completed' });
              updated++;
            } catch (e) {
              console.error('Update failed:', e);
            }
          }
          return { updated, detected: stuck.length };
        }
      },
      { 
        id: 'validate-references', 
        name: 'Validate All References', 
        desc: 'Check foreign key integrity', 
        icon: <CheckCircle2 className="w-4 h-4" />,
        action: async () => {
          const [users, events] = await Promise.all([
            base44.entities.User.list(),
            base44.entities.Event.list(),
          ]);
          const userIds = new Set(users.map(u => u.id));
          const issues = {
            missing_hosts: 0,
            missing_assigned_users: 0,
          };
          events.forEach(e => {
            if (e.host_id && !userIds.has(e.host_id)) issues.missing_hosts++;
            (e.assigned_user_ids || []).forEach(uid => {
              if (!userIds.has(uid)) issues.missing_assigned_users++;
            });
          });
          return { ...issues, total_events: events.length };
        }
      },
    ],
  };

  const filteredTools = useMemo(() => {
    const category = tools[selectedCategory] || [];
    return category.filter(t => 
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.desc.toLowerCase().includes(search.toLowerCase())
    );
  }, [selectedCategory, search]);

  const executeAction = async (tool) => {
    setExecuting(tool.id);
    try {
      const result = await tool.action();
      setResults({ ...results, [tool.id]: { status: 'success', data: result, time: Date.now() } });
      toast.success(`✓ ${tool.name} completed`);
    } catch (e) {
      setResults({ ...results, [tool.id]: { status: 'error', error: e.message, time: Date.now() } });
      toast.error(`✗ ${tool.name} failed: ${e.message}`);
    } finally {
      setExecuting(null);
    }
  };

  const copyResult = (toolId) => {
    const result = results[toolId];
    const text = JSON.stringify(result.data, null, 2);
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-4">
      {/* System Status Bar */}
      {systemStats && (
        <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800/50">
          <div className="text-center">
            <div className="text-[8px] font-mono text-zinc-500 uppercase">Users</div>
            <div className="text-sm font-bold text-zinc-200">{systemStats.users}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-zinc-500 uppercase">Events</div>
            <div className="text-sm font-bold text-zinc-200">{systemStats.events}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-zinc-500 uppercase">Roles</div>
            <div className="text-sm font-bold text-zinc-200">{systemStats.roles}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-zinc-500 uppercase">Nets</div>
            <div className="text-sm font-bold text-zinc-200">{systemStats.nets}</div>
          </div>
        </div>
      )}

      {/* Category Navigation */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-zinc-800/50">
        {TOOL_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSearch(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[8px] font-mono font-bold uppercase transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#ea580c] text-white border border-[#ea580c]'
                : 'bg-zinc-900/50 text-zinc-500 border border-zinc-800/50 hover:border-zinc-700/50'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
          <Input
            placeholder="Search tools..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-zinc-900 border-zinc-800 pl-7 text-xs h-7"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="px-3 space-y-2">
        {filteredTools.map(tool => {
          const result = results[tool.id];
          return (
            <div key={tool.id} className="border border-zinc-800/50 bg-zinc-900/30 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-400">{tool.icon}</span>
                    <span className="text-[10px] font-bold text-white uppercase">{tool.name}</span>
                  </div>
                  <div className="text-[8px] text-zinc-500 font-mono">{tool.desc}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => executeAction(tool)}
                  disabled={executing === tool.id}
                  className={`h-6 px-2 text-[8px] font-mono uppercase flex items-center gap-1 ${
                    executing === tool.id ? 'text-zinc-600' : 'text-[#ea580c] hover:text-[#ea580c] hover:bg-[#ea580c]/10'
                  }`}
                >
                  {executing === tool.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  {executing === tool.id ? 'EXEC' : 'RUN'}
                </Button>
              </div>

              {result && (
                <div className="mt-2 bg-zinc-950 border border-zinc-800 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    {result.status === 'success' ? (
                      <Badge className="text-[7px] bg-emerald-900/40 text-emerald-300 border-emerald-700/50"><CheckCircle2 className="w-2 h-2 mr-1" />SUCCESS</Badge>
                    ) : (
                      <Badge className="text-[7px] bg-red-900/40 text-red-300 border-red-700/50"><AlertTriangle className="w-2 h-2 mr-1" />ERROR</Badge>
                    )}
                    <span className="text-[7px] text-zinc-600 font-mono">{new Date(result.time).toLocaleTimeString()}</span>
                    {result.status === 'success' && (
                      <Button size="sm" variant="ghost" onClick={() => copyResult(tool.id)} className="h-4 px-1 text-[7px] text-zinc-500 hover:text-zinc-300">
                        <Copy className="w-2 h-2 mr-1" /> COPY
                      </Button>
                    )}
                  </div>
                  <pre className="text-[7px] font-mono text-zinc-400 bg-zinc-900/50 p-1.5 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                    {result.status === 'error' ? result.error : JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
        {filteredTools.length === 0 && (
          <div className="text-center py-8 text-zinc-600">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-[9px] font-mono uppercase">No tools found</p>
          </div>
        )}
      </div>
    </div>
  );
}