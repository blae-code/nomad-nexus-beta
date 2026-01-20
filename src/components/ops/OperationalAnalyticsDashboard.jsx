import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#ea580c', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function OperationalAnalyticsDashboard() {
  const { data: events } = useQuery({
    queryKey: ['analytics-events'],
    queryFn: () => base44.entities.Event.list({ sort: { created_date: -1 } }),
    initialData: []
  });

  const { data: logs } = useQuery({
    queryKey: ['analytics-logs'],
    queryFn: () => base44.entities.EventLog.list({ sort: { timestamp: -1 } }),
    initialData: []
  });

  // Calculate metrics
  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.status === 'completed').length;
  const successRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

  const logsByType = Object.entries(
    logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const recentActivity = events.slice(0, 7).map(e => ({
    name: e.title.slice(0, 8),
    active: e.status === 'active' ? 1 : 0,
    completed: e.status === 'completed' ? 1 : 0
  }));

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          OPERATIONAL ANALYTICS
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-4">
        {/* KPI Summary */}
        <div className="grid grid-cols-3 gap-2 text-[9px]">
          <div className="p-2 bg-zinc-900/50 border border-zinc-800 rounded">
            <div className="text-zinc-500 font-bold uppercase">TOTAL OPS</div>
            <div className="text-lg font-mono text-white mt-1">{totalEvents}</div>
          </div>
          <div className="p-2 bg-emerald-900/10 border border-emerald-900/30 rounded">
            <div className="text-emerald-500 font-bold uppercase">COMPLETED</div>
            <div className="text-lg font-mono text-emerald-300 mt-1">{completedEvents}</div>
          </div>
          <div className="p-2 bg-blue-900/10 border border-blue-900/30 rounded">
            <div className="text-blue-500 font-bold uppercase">SUCCESS %</div>
            <div className="text-lg font-mono text-blue-300 mt-1">{successRate}%</div>
          </div>
        </div>

        {/* Activity Chart */}
        {recentActivity.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recentActivity} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" style={{ fontSize: '10px' }} />
                <YAxis stroke="#71717a" style={{ fontSize: '10px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  labelStyle={{ color: '#fafafa' }}
                />
                <Bar dataKey="active" fill="#ea580c" />
                <Bar dataKey="completed" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Log Distribution */}
        {logsByType.length > 0 && (
          <div className="h-24 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={logsByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  dataKey="value"
                  label={{ fontSize: 10, fill: '#e4e4e7' }}
                >
                  {logsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  labelStyle={{ color: '#fafafa' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Activity Legend */}
        <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 gap-1 text-[8px]">
          {logsByType.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
              <span className="text-zinc-400">{item.name}: {item.value}</span>
            </div>
          ))}
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}