import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Sparkles, FileText, Activity } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import Section from '@/components/layout/Section';
import Panel from '@/components/layout/Panel';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';
import AITacticalAdvisor from '@/components/ai/AITacticalAdvisor';
import AIAfterActionReportGenerator from '@/components/ai/AIAfterActionReportGenerator';
import AgentRuleManager from '@/components/ai/AgentRuleManager';
import { cn } from '@/lib/utils';
import { hasMinRank } from '@/components/permissions';

export default function IntelligencePage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('overview');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Shared queries (cached across tabs)
  const { data: agents = [] } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => base44.entities.AIAgent.list({ is_active: true }),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['ai-logs-all'],
    queryFn: () =>
      base44.entities.AIAgentLog.list({
        sort: { created_date: -1 },
        limit: 50,
      }),
    refetchInterval: 10000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events-for-intelligence'],
    queryFn: () =>
      base44.entities.Event.filter(
        { status: { $in: ['active', 'scheduled'] } },
        '-start_time',
        10
      ),
  });

  const canManageRules = hasMinRank(currentUser, 'Scout');

  return (
    <PageShell title="Intelligence Console" subtitle="AI SYSTEM OVERVIEW & MANAGEMENT">
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start mb-6">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <Bot className="w-4 h-4 mr-2" /> OVERVIEW
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <Activity className="w-4 h-4 mr-2" /> AGENTS
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <FileText className="w-4 h-4 mr-2" /> LOGS
            </TabsTrigger>
            {events.length > 0 && (
              <TabsTrigger
                value="event-ai"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
              >
                <Sparkles className="w-4 h-4 mr-2" /> EVENT AI
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-0">
            <Section title="Active Insights" subtitle="Real-time AI findings across all agents">
              <AIInsightsPanel compact={false} />
            </Section>

            <Section title="Tactical Analysis" subtitle="Strategic recommendations for active events">
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map((event) => (
                    <Panel key={event.id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">{event.title}</h3>
                          <p className="text-xs text-zinc-500 mt-1">{event.location || 'Classified'}</p>
                        </div>
                      </div>
                      <AITacticalAdvisor eventId={event.id} compact={true} />
                    </Panel>
                  ))}
                </div>
              ) : (
                <Panel className="p-6 text-center text-zinc-600">
                  <p className="text-sm">No active events for tactical analysis</p>
                </Panel>
              )}
            </Section>
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6 mt-0">
            <Section title="Managed Agents" subtitle="Configure and monitor AI agents">
              {agents.length === 0 ? (
                <Panel className="p-6 text-center text-zinc-600">
                  <p className="text-sm">No agents configured</p>
                </Panel>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agents.map((agent) => (
                    <Panel key={agent.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-white">{agent.name}</h3>
                          <p className="text-xs text-zinc-500 mt-1 font-mono">{agent.slug}</p>
                        </div>
                        {canManageRules && <AgentRuleManager agentSlug={agent.slug} compact={true} />}
                      </div>

                      <div className="text-xs text-zinc-400 space-y-2">
                        <div>
                          <span className="text-zinc-600">Description:</span>
                          <p className="mt-1">{agent.description || 'No description'}</p>
                        </div>

                        <div className="pt-2">
                          <span className="text-zinc-600">Status:</span>
                          <div className="mt-1 flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', agent.is_active ? 'bg-emerald-500' : 'bg-zinc-600')} />
                            <span>{agent.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                          </div>
                        </div>
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </Section>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6 mt-0">
            <Section title="Activity Log" subtitle="AI agent execution history">
              <Panel className="p-4">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-zinc-600 text-xs">
                    <p>No logs available</p>
                  </div>
                ) : (
                  <div className="space-y-3 h-80 min-h-0 overflow-auto">
                    {logs.map((log) => (
                      <div key={log.id} className="p-3 bg-zinc-900/50 border border-zinc-800 rounded text-xs">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-mono font-bold text-zinc-300">{log.agent_slug}</span>
                          <span className="text-zinc-600">
                            {new Date(log.created_date).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-zinc-400">{log.summary || log.content}</div>
                        {log.details && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-zinc-600 hover:text-zinc-400 text-[10px]">
                              Details
                            </summary>
                            <pre className="mt-1 bg-zinc-950 p-2 rounded text-[9px] overflow-x-auto text-zinc-500">
                              {typeof log.details === 'object'
                                ? JSON.stringify(log.details, null, 2)
                                : log.details}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </Section>
          </TabsContent>

          {/* Event AI Tab */}
          {events.length > 0 && (
            <TabsContent value="event-ai" className="space-y-6 mt-0">
              <Section title="Event Intelligence" subtitle="Post-event analysis and reports">
                <div className="space-y-4">
                  {events.map((event) => (
                    <Panel key={event.id} className="p-4">
                      <h3 className="text-sm font-bold text-white mb-4">{event.title}</h3>
                      <AIAfterActionReportGenerator eventId={event.id} eventTitle={event.title} compact={true} />
                    </Panel>
                  ))}
                </div>
              </Section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </PageShell>
  );
}