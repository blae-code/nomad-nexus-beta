import ObjectivesWidget from './widgets/ObjectivesWidget';
import RosterWidget from './widgets/RosterWidget';
import TimelineWidget from './widgets/TimelineWidget';
import CommsWidget from './widgets/CommsWidget';
import TacticalMapWidget from './widgets/TacticalMapWidget';
import IncidentsWidget from './widgets/IncidentsWidget';
import CommandCenterWidget from './widgets/CommandCenterWidget';
import EconomyWidget from './widgets/EconomyWidget';
import StatusBoardWidget from './widgets/StatusBoardWidget';

export const WIDGET_REGISTRY = {
  objectives: {
    type: 'objectives',
    label: 'Objectives',
    component: ObjectivesWidget,
    minPermission: 'member',
    defaultSize: { width: 6, height: 4 },
    dataDeps: ['operation', 'user'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  roster: {
    type: 'roster',
    label: 'Roster & Readiness',
    component: RosterWidget,
    minPermission: 'squad_lead',
    defaultSize: { width: 4, height: 5 },
    dataDeps: ['operation', 'participants', 'player_status'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  timeline: {
    type: 'timeline',
    label: 'Operation Timeline',
    component: TimelineWidget,
    minPermission: 'member',
    defaultSize: { width: 5, height: 6 },
    dataDeps: ['operation_log'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  comms: {
    type: 'comms',
    label: 'Communications',
    component: CommsWidget,
    minPermission: 'member',
    defaultSize: { width: 4, height: 5 },
    dataDeps: ['voice_nets', 'channels'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  tactical_map: {
    type: 'tactical_map',
    label: 'Tactical Map',
    component: TacticalMapWidget,
    minPermission: 'member',
    defaultSize: { width: 8, height: 6 },
    dataDeps: ['operation', 'player_status', 'incidents', 'markers'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  incidents: {
    type: 'incidents',
    label: 'Incidents & Rescue',
    component: IncidentsWidget,
    minPermission: 'member',
    defaultSize: { width: 4, height: 4 },
    dataDeps: ['incidents'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  },
  command_center: {
    type: 'command_center',
    label: 'Command Center',
    component: CommandCenterWidget,
    minPermission: 'commander',
    defaultSize: { width: 6, height: 3 },
    dataDeps: ['operation', 'command_status'],
    updateMode: 'realtime',
    allowedRoles: ['Commander', 'XO', 'Comms Officer']
  },
  economy: {
    type: 'economy',
    label: 'Economy & Treasury',
    component: EconomyWidget,
    minPermission: 'squad_lead',
    defaultSize: { width: 4, height: 3 },
    dataDeps: ['operation', 'treasury'],
    updateMode: 'polling',
    allowedRoles: ['all']
  },
  status_board: {
    type: 'status_board',
    label: 'Status Board',
    component: StatusBoardWidget,
    minPermission: 'member',
    defaultSize: { width: 3, height: 3 },
    dataDeps: ['operation', 'squads'],
    updateMode: 'realtime',
    allowedRoles: ['all']
  }
};

export const getWidgetConfig = (widgetType) => WIDGET_REGISTRY[widgetType];
export const getAccessibleWidgets = (userRole, operation) => {
  return Object.values(WIDGET_REGISTRY).filter(widget => {
    if (widget.allowedRoles[0] === 'all') return true;
    return widget.allowedRoles.includes(userRole);
  });
};