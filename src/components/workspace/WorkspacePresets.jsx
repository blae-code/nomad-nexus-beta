export const WORKSPACE_PRESETS = [
  {
    id: 'commander',
    name: 'Command View',
    role: 'commander',
    description: 'Full tactical picture for operation commanders',
    layouts: {
      lg: [
        { i: 'tactical-1', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'voice-1', x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 8, y: 2, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 0, y: 4, w: 4, h: 3, minW: 2, minH: 2 },
        { i: 'comms-1', x: 4, y: 4, w: 8, h: 3, minW: 3, minH: 3 },
      ],
      md: [
        { i: 'tactical-1', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'voice-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 },
        { i: 'comms-1', x: 4, y: 6, w: 4, h: 3, minW: 3, minH: 3 },
      ],
      sm: [
        { i: 'tactical-1', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
        { i: 'voice-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 0, y: 8, w: 4, h: 3, minW: 2, minH: 2 },
        { i: 'comms-1', x: 0, y: 11, w: 4, h: 3, minW: 3, minH: 3 },
      ],
    },
    widgets: [
      { id: 'tactical-1', type: 'tacticalMap', config: {} },
      { id: 'voice-1', type: 'voiceNet', config: {} },
      { id: 'events-1', type: 'eventTimeline', config: {} },
      { id: 'roster-1', type: 'memberRoster', config: {} },
      { id: 'comms-1', type: 'comms', config: {} },
    ],
  },
  {
    id: 'pilot',
    name: 'Flight Ops',
    role: 'pilot',
    description: 'Essential view for pilots and flight crew',
    layouts: {
      lg: [
        { i: 'tactical-1', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'fleet-1', x: 6, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 9, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 6, y: 2, w: 6, h: 2, minW: 3, minH: 2 },
        { i: 'comms-1', x: 0, y: 4, w: 6, h: 3, minW: 3, minH: 3 },
        { id: 'system-1', x: 6, y: 4, w: 6, h: 2, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'tactical-1', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'fleet-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 0, y: 6, w: 8, h: 2, minW: 3, minH: 2 },
        { i: 'comms-1', x: 0, y: 8, w: 8, h: 3, minW: 3, minH: 3 },
        { id: 'system-1', x: 0, y: 11, w: 8, h: 2, minW: 2, minH: 2 },
      ],
      sm: [
        { i: 'tactical-1', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
        { i: 'fleet-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'events-1', x: 0, y: 8, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'comms-1', x: 0, y: 10, w: 4, h: 3, minW: 3, minH: 3 },
        { id: 'system-1', x: 0, y: 13, w: 4, h: 2, minW: 2, minH: 2 },
      ],
    },
    widgets: [
      { id: 'tactical-1', type: 'tacticalMap', config: {} },
      { id: 'fleet-1', type: 'fleetStatus', config: {} },
      { id: 'voice-1', type: 'voiceNet', config: {} },
      { id: 'events-1', type: 'eventTimeline', config: {} },
      { id: 'comms-1', type: 'comms', config: {} },
      { id: 'system-1', type: 'systemStatus', config: {} },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics View',
    role: 'logistics',
    description: 'Fleet management and resource tracking',
    layouts: {
      lg: [
        { i: 'fleet-1', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'tactical-1', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 3 },
        { i: 'events-1', x: 0, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 4, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 8, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'comms-1', x: 0, y: 5, w: 12, h: 3, minW: 3, minH: 3 },
      ],
      md: [
        { i: 'fleet-1', x: 0, y: 0, w: 8, h: 3, minW: 3, minH: 2 },
        { i: 'tactical-1', x: 0, y: 3, w: 8, h: 3, minW: 4, minH: 3 },
        { i: 'events-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 4, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 0, y: 8, w: 8, h: 2, minW: 2, minH: 2 },
        { i: 'comms-1', x: 0, y: 10, w: 8, h: 3, minW: 3, minH: 3 },
      ],
      sm: [
        { i: 'fleet-1', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'tactical-1', x: 0, y: 3, w: 4, h: 3, minW: 4, minH: 3 },
        { i: 'events-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 0, y: 8, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'roster-1', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'comms-1', x: 0, y: 12, w: 4, h: 3, minW: 3, minH: 3 },
      ],
    },
    widgets: [
      { id: 'fleet-1', type: 'fleetStatus', config: {} },
      { id: 'tactical-1', type: 'tacticalMap', config: {} },
      { id: 'events-1', type: 'eventTimeline', config: {} },
      { id: 'voice-1', type: 'voiceNet', config: {} },
      { id: 'roster-1', type: 'memberRoster', config: {} },
      { id: 'comms-1', type: 'comms', config: {} },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal View',
    role: 'member',
    description: 'Clean focused interface for general operations',
    layouts: {
      lg: [
        { i: 'comms-1', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
        { i: 'events-1', x: 6, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 9, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'notifications-1', x: 6, y: 2, w: 6, h: 2, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'comms-1', x: 0, y: 0, w: 8, h: 4, minW: 3, minH: 3 },
        { i: 'events-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 4, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'notifications-1', x: 0, y: 6, w: 8, h: 2, minW: 2, minH: 2 },
      ],
      sm: [
        { i: 'comms-1', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'events-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'voice-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'notifications-1', x: 0, y: 8, w: 4, h: 2, minW: 2, minH: 2 },
      ],
    },
    widgets: [
      { id: 'comms-1', type: 'comms', config: {} },
      { id: 'events-1', type: 'eventTimeline', config: {} },
      { id: 'voice-1', type: 'voiceNet', config: {} },
      { id: 'notifications-1', type: 'notifications', config: {} },
    ],
  },
];

export function getPresetForRole(role) {
  const roleMap = {
    admin: 'commander',
    commander: 'commander',
    officer: 'commander',
    pilot: 'pilot',
    logistics: 'logistics',
    member: 'minimal',
  };

  const presetId = roleMap[role?.toLowerCase()] || 'minimal';
  return WORKSPACE_PRESETS.find((p) => p.id === presetId) || WORKSPACE_PRESETS[0];
}