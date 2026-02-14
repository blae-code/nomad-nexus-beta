import { MessageSquare, Radio, Ship, Calendar, Users, Map, Activity, Bell } from 'lucide-react';
import CommsWidget from '@/components/widgets/CommsWidget';
import VoiceNetWidget from '@/components/widgets/VoiceNetWidget';
import FleetStatusWidget from '@/components/widgets/FleetStatusWidget';
import EventTimelineWidget from '@/components/widgets/EventTimelineWidget';
import TacticalMapWidget from '@/components/widgets/TacticalMapWidget';
import MemberRosterWidget from '@/components/widgets/MemberRosterWidget';
import SystemStatusWidget from '@/components/widgets/SystemStatusWidget';
import NotificationsWidget from '@/components/widgets/NotificationsWidget';

export const WIDGET_REGISTRY = {
  comms: {
    component: CommsWidget,
    label: 'Comms',
    icon: MessageSquare,
    description: 'Text communications and channels',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: false,
  },
  voiceNet: {
    component: VoiceNetWidget,
    label: 'Voice Net',
    icon: Radio,
    description: 'Voice communications control',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: true,
  },
  fleetStatus: {
    component: FleetStatusWidget,
    label: 'Fleet Status',
    icon: Ship,
    description: 'Fleet assets and locations',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
  },
  eventTimeline: {
    component: EventTimelineWidget,
    label: 'Operations',
    icon: Calendar,
    description: 'Active and upcoming operations',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
  },
  tacticalMap: {
    component: TacticalMapWidget,
    label: 'Tactical Map',
    icon: Map,
    description: 'Operational map view',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    singleton: false,
  },
  memberRoster: {
    component: MemberRosterWidget,
    label: 'Roster',
    icon: Users,
    description: 'Online members and presence',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
  },
  systemStatus: {
    component: SystemStatusWidget,
    label: 'System Status',
    icon: Activity,
    description: 'System health and metrics',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    singleton: true,
  },
  notifications: {
    component: NotificationsWidget,
    label: 'Alerts',
    icon: Bell,
    description: 'System notifications and alerts',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
  },
};