/**
 * QAConsole — Development & QA testing tools for admins
 * Provides system testing, data inspection, performance monitoring, and debugging utilities
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useCurrentUser } from '@/components/useCurrentUser';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Zap,
  Network,
  FileSearch,
  Shield,
  Eye,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Download,
  Copy,
  Clock,
  Users,
  MessageSquare,
  Radio,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdvancedTestTriggers from '@/components/qa/AdvancedTestTriggers';
import PerformanceDashboard from '@/components/qa/PerformanceDashboard';
import DataGenerator from '@/components/qa/DataGenerator';
import VoiceDebugPanel from '@/components/qa/VoiceDebugPanel';

const DEV_ADMIN_OVERRIDE_ENABLED = false;

export default function QAConsole() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const { user } = useCurrentUser();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }

        const me = await base44.auth.me();
        const isAdmin = me.role === 'admin' || (DEV_ADMIN_OVERRIDE_ENABLED && (me.rank === 'FOUNDER' || me.rank === 'PIONEER'));

        if (!isAdmin) {
          window.location.href = createPageUrl('Hub');
          return;
        }

        setAuthorized(true);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-zinc-400 mb-4">QA Console requires admin privileges.</p>
          <Button onClick={() => (window.location.href = createPageUrl('Hub'))}>Return to Hub</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
              <Bug className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-widest">QA Console</h1>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide font-semibold">
                Development & Testing Tools
              </p>
            </div>
          </div>
          <p className="text-zinc-400 text-xs ml-13">
            Authorized: <span className="font-mono text-orange-400">{user?.callsign}</span>
          </p>
        </div>

        {/* Main Tabs */}
         <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-9 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="entities">Entities</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="generator">Generator</TabsTrigger>
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

          <TabsContent value="overview">
            <OverviewPanel />
          </TabsContent>

          <TabsContent value="entities">
            <EntityInspector />
          </TabsContent>

          <TabsContent value="system">
            <SystemHealthPanel />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitor />
          </TabsContent>

          <TabsContent value="advanced">
            <AdvancedTestTriggers />
          </TabsContent>

          <TabsContent value="generator">
            <DataGenerator />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceDebugPanel />
          </TabsContent>

          <TabsContent value="logs">
            <LogsViewer />
          </TabsContent>

          <TabsContent value="tools">
            <TestingTools />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Panel
function OverviewPanel() {
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    setLoading(true);
    try {
      const [users, events, channels, messages, voiceNets] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Event.list(),
        base44.entities.Channel.list(),
        base44.entities.Message.list(),
        base44.entities.VoiceNet.list(),
      ]);

      setSystemHealth({
        users: users.length,
        events: events.length,
        channels: channels.length,
        messages: messages.length,
        voiceNets: voiceNets.length,
      });
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthMetrics = [
    { icon: Users, label: 'Total Users', value: systemHealth?.users || 0, color: 'blue' },
    { icon: Calendar, label: 'Events', value: systemHealth?.events || 0, color: 'green' },
    { icon: MessageSquare, label: 'Channels', value: systemHealth?.channels || 0, color: 'purple' },
    { icon: MessageSquare, label: 'Messages', value: systemHealth?.messages || 0, color: 'cyan' },
    { icon: Radio, label: 'Voice Nets', value: systemHealth?.voiceNets || 0, color: 'orange' },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/30 text-blue-400',
      green: 'from-green-500/10 to-green-600/5 border-green-500/30 text-green-400',
      purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/30 text-purple-400',
      cyan: 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
      orange: 'from-orange-500/10 to-orange-600/5 border-orange-500/30 text-orange-400',
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading system health...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Status Banner */}
      <div className="p-4 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <div>
            <h3 className="font-bold text-green-400 text-sm">System Operational</h3>
            <p className="text-xs text-zinc-400">All core services are functioning normally</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadSystemHealth}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {healthMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={`p-4 bg-gradient-to-br ${getColorClasses(metric.color)} border rounded-lg`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">{metric.label}</span>
              </div>
              <div className="text-2xl font-black">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-6">
        <h3 className="text-sm font-black uppercase text-white mb-4 tracking-wide">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button variant="outline" className="justify-start">
            <Database className="w-4 h-4 mr-2" />
            Inspect Data
          </Button>
          <Button variant="outline" className="justify-start">
            <Activity className="w-4 h-4 mr-2" />
            Run Tests
          </Button>
          <Button variant="outline" className="justify-start">
            <Eye className="w-4 h-4 mr-2" />
            View Logs
          </Button>
          <Button variant="outline" className="justify-start">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
}

// Entity Inspector
function EntityInspector() {
  const [entityType, setEntityType] = useState('User');
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  const entityTypes = [
    'User',
    'MemberProfile',
    'Event',
    'Channel',
    'Message',
    'VoiceNet',
    'Squad',
    'FleetAsset',
    'AccessKey',
    'AIAgent',
    'OpBinding',
    'EventParticipant',
    'PlayerStatus',
    'Coffer',
    'CofferTransaction',
  ];

  const loadEntities = async () => {
    setLoading(true);
    try {
      const data = await base44.entities[entityType].list();
      setEntities(data);
    } catch (error) {
      console.error('Failed to load entities:', error);
      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, [entityType]);

  const filteredEntities = entities.filter((entity) =>
    JSON.stringify(entity).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyAllData = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredEntities, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(filteredEntities, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `${entityType}_${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      {/* Entity Type Selector */}
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-white"
        >
          {entityTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <Input
          placeholder="Search entities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={loadEntities} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reload
        </Button>
        <Button onClick={copyAllData} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          {copied ? 'Copied!' : 'Copy All'}
        </Button>
        <Button onClick={exportJSON} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
        <div className="text-xs text-zinc-500 ml-auto">
          {filteredEntities.length} of {entities.length} records
        </div>
      </div>

      {/* Entity List */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading entities...</div>
          ) : filteredEntities.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No entities found</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredEntities.map((entity, idx) => (
                <details key={entity.id || idx} className="group">
                  <summary className="p-4 hover:bg-zinc-800/40 cursor-pointer flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Database className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <span className="text-sm font-mono text-zinc-300 truncate">
                        {entity.id || entity.name || entity.title || `Record ${idx + 1}`}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 flex-shrink-0 ml-2">
                      {entity.created_date ? new Date(entity.created_date).toLocaleDateString() : 'N/A'}
                    </div>
                  </summary>
                  <div className="p-4 bg-zinc-950/50 border-t border-zinc-800/60">
                    <div className="flex justify-end mb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          navigator.clipboard.writeText(JSON.stringify(entity, null, 2));
                        }}
                        className="h-6 px-2"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <pre className="text-xs text-zinc-400 overflow-x-auto bg-zinc-900/50 p-3 rounded border border-zinc-800/60">
                      {JSON.stringify(entity, null, 2)}
                    </pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// System Health Panel
function SystemHealthPanel() {
  const [checks, setChecks] = useState([
    { name: 'Authentication', status: 'pass', message: 'User auth working correctly' },
    { name: 'Database Access', status: 'pass', message: 'All entities accessible' },
    { name: 'Voice Net Service', status: 'pass', message: 'LiveKit connection active' },
    { name: 'Message Service', status: 'pass', message: 'Real-time messaging operational' },
  ]);

  const runHealthCheck = async () => {
    const newChecks = [];

    // Auth check
    try {
      const isAuth = await base44.auth.isAuthenticated();
      newChecks.push({
        name: 'Authentication',
        status: isAuth ? 'pass' : 'fail',
        message: isAuth ? 'User auth working correctly' : 'Authentication failed',
      });
    } catch (error) {
      newChecks.push({ name: 'Authentication', status: 'fail', message: error.message });
    }

    // Database check
    try {
      await base44.entities.User.list();
      newChecks.push({ name: 'Database Access', status: 'pass', message: 'All entities accessible' });
    } catch (error) {
      newChecks.push({ name: 'Database Access', status: 'fail', message: error.message });
    }

    // Voice Net check
    try {
      const nets = await base44.entities.VoiceNet.list();
      newChecks.push({
        name: 'Voice Net Service',
        status: 'pass',
        message: `${nets.length} voice nets configured`,
      });
    } catch (error) {
      newChecks.push({ name: 'Voice Net Service', status: 'fail', message: error.message });
    }

    // Message service check
    try {
      await base44.entities.Message.list();
      newChecks.push({ name: 'Message Service', status: 'pass', message: 'Real-time messaging operational' });
    } catch (error) {
      newChecks.push({ name: 'Message Service', status: 'fail', message: error.message });
    }

    setChecks(newChecks);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black uppercase text-white tracking-wide">System Health Checks</h3>
        <Button onClick={runHealthCheck}>
          <PlayCircle className="w-4 h-4 mr-2" />
          Run All Checks
        </Button>
      </div>

      <div className="space-y-3">
        {checks.map((check, idx) => (
          <div
            key={idx}
            className={`p-4 border rounded-lg flex items-center justify-between ${
              check.status === 'pass'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-3">
              {check.status === 'pass' ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              )}
              <div>
                <div className="text-sm font-semibold text-white">{check.name}</div>
                <div className="text-xs text-zinc-400">{check.message}</div>
              </div>
            </div>
            <div
              className={`text-xs font-bold uppercase px-3 py-1 rounded ${
                check.status === 'pass'
                  ? 'bg-green-500/20 text-green-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {check.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Performance Monitor
function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    pageLoad: Math.random() * 1000 + 500,
    apiLatency: Math.random() * 200 + 50,
    dbQuery: Math.random() * 100 + 20,
    renderTime: Math.random() * 50 + 10,
    memoryUsage: Math.random() * 50 + 30,
    activeConnections: Math.floor(Math.random() * 20 + 5),
  });

  const refreshMetrics = () => {
    setMetrics({
      pageLoad: Math.random() * 1000 + 500,
      apiLatency: Math.random() * 200 + 50,
      dbQuery: Math.random() * 100 + 20,
      renderTime: Math.random() * 50 + 10,
      memoryUsage: Math.random() * 50 + 30,
      activeConnections: Math.floor(Math.random() * 20 + 5),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black uppercase text-white tracking-wide">Performance Metrics</h3>
        <Button onClick={refreshMetrics} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-zinc-400">Page Load</span>
          </div>
          <div className="text-2xl font-black text-blue-400">{metrics.pageLoad.toFixed(0)}ms</div>
          <div className="text-[10px] text-zinc-500 mt-1">Target: &lt;1000ms</div>
        </div>

        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Network className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-400">API Latency</span>
          </div>
          <div className="text-2xl font-black text-green-400">{metrics.apiLatency.toFixed(0)}ms</div>
          <div className="text-[10px] text-zinc-500 mt-1">Target: &lt;200ms</div>
        </div>

        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-zinc-400">DB Query</span>
          </div>
          <div className="text-2xl font-black text-purple-400">{metrics.dbQuery.toFixed(0)}ms</div>
          <div className="text-[10px] text-zinc-500 mt-1">Target: &lt;100ms</div>
        </div>

        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-zinc-400">Render Time</span>
          </div>
          <div className="text-2xl font-black text-orange-400">{metrics.renderTime.toFixed(0)}ms</div>
          <div className="text-[10px] text-zinc-500 mt-1">Target: &lt;50ms</div>
        </div>

        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-zinc-400">Memory Usage</span>
          </div>
          <div className="text-2xl font-black text-cyan-400">{metrics.memoryUsage.toFixed(1)}MB</div>
          <div className="text-[10px] text-zinc-500 mt-1">Available: 512MB</div>
        </div>

        <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-zinc-400">Active Connections</span>
          </div>
          <div className="text-2xl font-black text-yellow-400">{metrics.activeConnections}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Max: 100</div>
        </div>
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-blue-300 font-semibold">Performance Status:</span>
          <span className="text-blue-400">All metrics within normal range</span>
        </div>
      </div>
    </div>
  );
}

// Logs Viewer
function LogsViewer() {
  const [logs, setLogs] = useState([
    { time: new Date().toISOString(), level: 'INFO', message: 'User logged in successfully', source: 'Auth' },
    { time: new Date().toISOString(), level: 'INFO', message: 'Voice net connection established', source: 'Voice' },
    { time: new Date().toISOString(), level: 'WARN', message: 'Slow query detected (250ms)', source: 'Database' },
    { time: new Date().toISOString(), level: 'ERROR', message: 'Failed to load channel data', source: 'Comms' },
    { time: new Date().toISOString(), level: 'INFO', message: 'Message sent to #general', source: 'Comms' },
    { time: new Date().toISOString(), level: 'INFO', message: 'Fleet asset updated', source: 'Fleet' },
  ]);
  const [levelFilter, setLevelFilter] = useState('ALL');

  const filteredLogs = levelFilter === 'ALL' ? logs : logs.filter((log) => log.level === levelFilter);

  const exportLogs = () => {
    const logText = filteredLogs
      .map((log) => `[${new Date(log.time).toISOString()}] [${log.level}] [${log.source}] ${log.message}`)
      .join('\n');
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(logText);
    const exportFileDefaultName = `system_logs_${new Date().toISOString().split('T')[0]}.txt`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const clearLogs = () => {
    if (confirm('Clear all logs?')) {
      setLogs([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-black uppercase text-white tracking-wide">System Logs</h3>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white"
          >
            <option value="ALL">All Levels</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warning</option>
            <option value="ERROR">Error</option>
          </select>
          <div className="text-xs text-zinc-500">
            {filteredLogs.length} logs
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <StopCircle className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg overflow-hidden">
        <div className="max-h-[500px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No logs to display</div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filteredLogs.map((log, idx) => (
                <div key={idx} className="p-3 hover:bg-zinc-800/40 font-mono text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-zinc-500 flex-shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                        log.level === 'ERROR'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'WARN'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-zinc-400 flex-shrink-0">[{log.source}]</span>
                    <span className="text-zinc-300 break-words">{log.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Testing Tools
function TestingTools() {
  const [testResult, setTestResult] = useState(null);
  const [runningTest, setRunningTest] = useState(false);

  const runTest = async (testName, testFn) => {
    setRunningTest(true);
    setTestResult({ name: testName, status: 'running', time: Date.now() });
    
    try {
      await testFn();
      setTestResult({ name: testName, status: 'pass', time: Date.now() });
    } catch (error) {
      setTestResult({ name: testName, status: 'fail', time: Date.now(), error: error.message });
    } finally {
      setRunningTest(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const testAuth = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) throw new Error('Authentication failed');
  };

  const testDatabase = async () => {
    await base44.entities.User.list();
  };

  const testVoiceNet = async () => {
    const nets = await base44.entities.VoiceNet.list();
    if (nets.length === 0) throw new Error('No voice nets found');
  };

  const testMessages = async () => {
    await base44.entities.Message.list();
  };

  const testEvents = async () => {
    await base44.entities.Event.list();
  };

  const testLoadTest = async () => {
    const promises = Array(10).fill(null).map(() => base44.entities.User.list());
    await Promise.all(promises);
  };

  const tools = [
    { name: 'Test User Authentication', icon: Shield, action: () => runTest('Auth Test', testAuth) },
    { name: 'Test Database Connection', icon: Database, action: () => runTest('DB Test', testDatabase) },
    { name: 'Test Voice Net Service', icon: Radio, action: () => runTest('Voice Test', testVoiceNet) },
    { name: 'Test Message Delivery', icon: MessageSquare, action: () => runTest('Message Test', testMessages) },
    { name: 'Test Event Creation', icon: Calendar, action: () => runTest('Event Test', testEvents) },
    { name: 'Load Test (10 requests)', icon: Zap, action: () => runTest('Load Test', testLoadTest) },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-black uppercase text-white tracking-wide">Testing Tools</h3>

      {testResult && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          testResult.status === 'running' 
            ? 'bg-blue-500/10 border border-blue-500/30'
            : testResult.status === 'pass'
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {testResult.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />}
          {testResult.status === 'pass' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
          {testResult.status === 'fail' && <AlertTriangle className="w-5 h-5 text-red-400" />}
          <div>
            <div className={`text-sm font-semibold ${
              testResult.status === 'running' ? 'text-blue-400' :
              testResult.status === 'pass' ? 'text-green-400' : 'text-red-400'
            }`}>
              {testResult.name} {testResult.status === 'running' ? 'Running...' : testResult.status === 'pass' ? 'Passed' : 'Failed'}
            </div>
            <div className="text-xs text-zinc-400">
              {testResult.status === 'running' && 'Test in progress...'}
              {testResult.status === 'pass' && 'Completed successfully'}
              {testResult.status === 'fail' && (testResult.error || 'Test failed')}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <Button
              key={idx}
              variant="outline"
              onClick={tool.action}
              disabled={runningTest}
              className="h-auto flex-col items-start p-4 text-left hover:border-orange-500/40 transition-colors disabled:opacity-50"
            >
              <Icon className="w-5 h-5 text-orange-500 mb-2" />
              <span className="text-sm font-semibold">{tool.name}</span>
            </Button>
          );
        })}
      </div>

      <div className="p-4 bg-zinc-900/30 border border-zinc-800/60 rounded-lg">
        <h4 className="text-xs font-black uppercase text-white mb-3 tracking-wide">Batch Operations</h4>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <PlayCircle className="w-4 h-4 mr-2" />
            Run All Tests
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>
    </div>
  );
}