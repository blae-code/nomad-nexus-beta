export const WORKSPACE_PRESETS = [
  {
    id: 'commander',
    name: 'Command View',
    role: 'commander',
    description: 'Full tactical picture for operation commanders',
    layouts: {
      lg: [
        { i: 'battlespace-1', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'quantumComms-1', x: 6, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'neuralConsole-1', x: 10, y: 0, w: 2, h: 4, minW: 3, minH: 3 },
        { i: 'intelFeed-1', x: 0, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'opComposer-1', x: 4, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'biometrics-1', x: 8, y: 4, w: 4, h: 3, minW: 3, minH: 2 },
      ],
      md: [
        { i: 'battlespace-1', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'quantumComms-1', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'neuralConsole-1', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'intelFeed-1', x: 0, y: 8, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'opComposer-1', x: 4, y: 8, w: 4, h: 3, minW: 3, minH: 2 },
      ],
      sm: [
        { i: 'battlespace-1', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
        { i: 'quantumComms-1', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'neuralConsole-1', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'intelFeed-1', x: 0, y: 12, w: 4, h: 3, minW: 3, minH: 2 },
      ],
    },
    widgets: [
      { id: 'battlespace-1', type: 'fourDBattlespace', config: {} },
      { id: 'quantumComms-1', type: 'quantumComms', config: {} },
      { id: 'neuralConsole-1', type: 'neuralConsole', config: {} },
      { id: 'intelFeed-1', type: 'intelFeed', config: {} },
      { id: 'opComposer-1', type: 'opComposer', config: {} },
      { id: 'biometrics-1', type: 'biometrics', config: {} },
    ],
  },
  {
    id: 'pilot',
    name: 'Flight Ops',
    role: 'pilot',
    description: 'Essential view for pilots and flight crew',
    layouts: {
      lg: [
        { i: 'battlespace-1', x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 6, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
        { id: 'jumpPlanner-1', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'threatRadar-1', x: 0, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'loadoutDesigner-1', x: 4, y: 4, w: 4, h: 4, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'battlespace-1', x: 0, y: 0, w: 8, h: 4, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { id: 'jumpPlanner-1', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
        { i: 'threatRadar-1', x: 0, y: 8, w: 4, h: 3, minW: 3, minH: 3 },
      ],
      sm: [
        { i: 'battlespace-1', x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
        { id: 'jumpPlanner-1', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
      ],
    },
    widgets: [
      { id: 'battlespace-1', type: 'fourDBattlespace', config: {} },
      { id: 'assetTelemetry-1', type: 'assetTelemetry', config: {} },
      { id: 'quantumComms-1', type: 'quantumComms', config: {} },
      { id: 'jumpPlanner-1', type: 'jumpPlanner', config: {} },
      { id: 'threatRadar-1', type: 'threatRadar', config: {} },
      { id: 'loadoutDesigner-1', type: 'loadoutDesigner', config: {} },
    ],
  },
  {
    id: 'logistics',
    name: 'Logistics View',
    role: 'logistics',
    description: 'Fleet management and resource tracking',
    layouts: {
      lg: [
        { i: 'resourceFlow-1', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'battlespace-1', x: 6, y: 0, w: 6, h: 3, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 0, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 4, y: 3, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'supplyChain-1', x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'credits-1', x: 0, y: 5, w: 4, h: 2, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'resourceFlow-1', x: 0, y: 0, w: 8, h: 3, minW: 3, minH: 2 },
        { i: 'battlespace-1', x: 0, y: 3, w: 8, h: 3, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 4, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'supplyChain-1', x: 0, y: 8, w: 4, h: 2, minW: 3, minH: 2 },
      ],
      sm: [
        { i: 'resourceFlow-1', x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'battlespace-1', x: 0, y: 3, w: 4, h: 3, minW: 4, minH: 3 },
        { i: 'assetTelemetry-1', x: 0, y: 6, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'quantumComms-1', x: 0, y: 8, w: 4, h: 4, minW: 3, minH: 3 },
      ],
    },
    widgets: [
      { id: 'resourceFlow-1', type: 'resourceFlow', config: {} },
      { id: 'battlespace-1', type: 'fourDBattlespace', config: {} },
      { id: 'assetTelemetry-1', type: 'assetTelemetry', config: {} },
      { id: 'quantumComms-1', type: 'quantumComms', config: {} },
      { id: 'supplyChain-1', type: 'supplyChain', config: {} },
      { id: 'credits-1', type: 'credits', config: {} },
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal View',
    role: 'member',
    description: 'Clean focused interface for general operations',
    layouts: {
      lg: [
        { i: 'quantumComms-1', x: 0, y: 0, w: 6, h: 4, minW: 3, minH: 3 },
        { i: 'opComposer-1', x: 6, y: 0, w: 3, h: 2, minW: 3, minH: 2 },
        { i: 'neuralConsole-1', x: 9, y: 0, w: 3, h: 4, minW: 3, minH: 3 },
        { i: 'priorityQueue-1', x: 6, y: 2, w: 3, h: 2, minW: 2, minH: 2 },
      ],
      md: [
        { i: 'quantumComms-1', x: 0, y: 0, w: 8, h: 4, minW: 3, minH: 3 },
        { i: 'opComposer-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'neuralConsole-1', x: 4, y: 4, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'priorityQueue-1', x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
      ],
      sm: [
        { i: 'quantumComms-1', x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'opComposer-1', x: 0, y: 4, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'neuralConsole-1', x: 0, y: 6, w: 4, h: 4, minW: 3, minH: 3 },
        { i: 'priorityQueue-1', x: 0, y: 10, w: 4, h: 2, minW: 2, minH: 2 },
      ],
    },
    widgets: [
      { id: 'quantumComms-1', type: 'quantumComms', config: {} },
      { id: 'opComposer-1', type: 'opComposer', config: {} },
      { id: 'neuralConsole-1', type: 'neuralConsole', config: {} },
      { id: 'priorityQueue-1', type: 'priorityQueue', config: {} },
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