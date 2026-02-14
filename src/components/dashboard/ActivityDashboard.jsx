import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Users, MessageSquare, AlertCircle, Calendar, Activity } from 'lucide-react';

export default function ActivityDashboard() {
  const [stats, setStats] = useState({
    onlineMembers: 0,
    activeChannels: 0,
    pendingAlerts: 0,
    upcomingEvents: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [presence, channels, notifications, events] = await Promise.all([
          base44.entities.UserPresence.list().catch(() => []),
          base44.entities.Channel.list().catch(() => []),
          base44.entities.Notification.list('-created_date', 10).catch(() => []),
          base44.entities.Event.list('-start_time', 5).catch(() => []),
        ]);

        setStats({
          onlineMembers: (presence || []).filter((p) => p.status !== 'offline').length,
          activeChannels: (channels || []).filter((c) => c.last_message_at).length,
          pendingAlerts: (notifications || []).length,
          upcomingEvents: (events || []).filter((e) => new Date(e.start_time) > new Date()).length,
        });
      } catch (err) {
        console.warn('Dashboard stats fetch failed:', err.message);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const cards = [
    { icon: Users, label: 'Online', value: stats.onlineMembers, color: 'text-blue-500' },
    { icon: MessageSquare, label: 'Active Channels', value: stats.activeChannels, color: 'text-green-500' },
    { icon: AlertCircle, label: 'Alerts', value: stats.pendingAlerts, color: 'text-orange-500' },
    { icon: Calendar, label: 'Upcoming', value: stats.upcomingEvents, color: 'text-purple-500' },
  ];

  return (
    <div className="space-y-3 p-4 bg-zinc-900/50 rounded-lg border border-orange-500/20">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-orange-500" />
        <span className="text-sm font-semibold text-zinc-200">Activity Overview</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-zinc-800/50 rounded p-3 border border-zinc-700/50 hover:border-orange-500/30 transition"
            >
              <Icon className={`w-4 h-4 ${card.color} mb-2`} />
              <div className="text-2xl font-bold text-zinc-100">{card.value}</div>
              <div className="text-xs text-zinc-500">{card.label}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}