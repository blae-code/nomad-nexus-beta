import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageShell from '@/components/layout/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EventReportingDashboard from '@/components/events/EventReportingDashboard';
import EventCalendarView from '@/components/dashboard/EventCalendarView';
import { Calendar, BarChart3, FileText } from 'lucide-react';

export default function EventReportingPage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('analytics');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  return (
    <PageShell
      title="Event Management"
      subtitle="ANALYTICS & REPORTING"
    >
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-8 text-xs w-32 bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start">
            <TabsTrigger
              value="analytics"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <BarChart3 className="w-4 h-4 mr-2" /> ANALYTICS
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <Calendar className="w-4 h-4 mr-2" /> CALENDAR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <EventReportingDashboard timeRange={timeRange} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-6">
            <EventCalendarView />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}