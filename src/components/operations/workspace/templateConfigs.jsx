export const WORKSPACE_TEMPLATES = {
  PVE: {
    type: 'PVE',
    label: 'PVE Mission',
    description: 'Cooperative PvE operation (rescue, transport, exploration)',
    defaultLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'objectives_1', widget_type: 'objectives', col: 0, row: 0, width: 6, height: 4 },
        { id: 'roster_1', widget_type: 'roster', col: 6, row: 0, width: 3, height: 4 },
        { id: 'status_1', widget_type: 'status_board', col: 9, row: 0, width: 3, height: 4 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 4, width: 8, height: 6 },
        { id: 'timeline_1', widget_type: 'timeline', col: 8, row: 4, width: 4, height: 6 },
        { id: 'comms_1', widget_type: 'comms', col: 0, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 4, row: 10, width: 4, height: 4 },
        { id: 'economy_1', widget_type: 'economy', col: 8, row: 10, width: 4, height: 4 }
      ]
    },
    commanderLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'objectives_1', widget_type: 'objectives', col: 0, row: 0, width: 5, height: 4 },
        { id: 'command_center_1', widget_type: 'command_center', col: 5, row: 0, width: 7, height: 4 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 4, width: 9, height: 6 },
        { id: 'timeline_1', widget_type: 'timeline', col: 9, row: 4, width: 3, height: 6 },
        { id: 'roster_1', widget_type: 'roster', col: 0, row: 10, width: 4, height: 4 },
        { id: 'comms_1', widget_type: 'comms', col: 4, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 8, row: 10, width: 4, height: 4 }
      ]
    },
    rescueLeadLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'incidents_1', widget_type: 'incidents', col: 0, row: 0, width: 4, height: 5 },
        { id: 'timeline_1', widget_type: 'timeline', col: 4, row: 0, width: 4, height: 5 },
        { id: 'roster_1', widget_type: 'roster', col: 8, row: 0, width: 4, height: 5 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 5, width: 12, height: 7 }
      ]
    }
  },
  PVP: {
    type: 'PVP',
    label: 'PvP Combat',
    description: 'Competitive combat operation',
    defaultLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'objectives_1', widget_type: 'objectives', col: 0, row: 0, width: 4, height: 3 },
        { id: 'command_center_1', widget_type: 'command_center', col: 4, row: 0, width: 4, height: 3 },
        { id: 'status_1', widget_type: 'status_board', col: 8, row: 0, width: 4, height: 3 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 3, width: 8, height: 7 },
        { id: 'timeline_1', widget_type: 'timeline', col: 8, row: 3, width: 4, height: 7 },
        { id: 'roster_1', widget_type: 'roster', col: 0, row: 10, width: 4, height: 4 },
        { id: 'comms_1', widget_type: 'comms', col: 4, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 8, row: 10, width: 4, height: 4 }
      ]
    },
    commanderLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'command_center_1', widget_type: 'command_center', col: 0, row: 0, width: 6, height: 3 },
        { id: 'objectives_1', widget_type: 'objectives', col: 6, row: 0, width: 6, height: 3 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 3, width: 9, height: 7 },
        { id: 'timeline_1', widget_type: 'timeline', col: 9, row: 3, width: 3, height: 7 },
        { id: 'roster_1', widget_type: 'roster', col: 0, row: 10, width: 4, height: 4 },
        { id: 'comms_1', widget_type: 'comms', col: 4, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 8, row: 10, width: 4, height: 4 }
      ]
    }
  },
  MINING: {
    type: 'MINING',
    label: 'Mining Operation',
    description: 'Resource extraction operation',
    defaultLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'objectives_1', widget_type: 'objectives', col: 0, row: 0, width: 5, height: 4 },
        { id: 'economy_1', widget_type: 'economy', col: 5, row: 0, width: 4, height: 4 },
        { id: 'status_1', widget_type: 'status_board', col: 9, row: 0, width: 3, height: 4 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 4, width: 8, height: 6 },
        { id: 'timeline_1', widget_type: 'timeline', col: 8, row: 4, width: 4, height: 6 },
        { id: 'roster_1', widget_type: 'roster', col: 0, row: 10, width: 4, height: 4 },
        { id: 'comms_1', widget_type: 'comms', col: 4, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 8, row: 10, width: 4, height: 4 }
      ]
    }
  },
  SALVAGE: {
    type: 'SALVAGE',
    label: 'Salvage Operation',
    description: 'Ship/cargo recovery operation',
    defaultLayout: {
      grid_cols: 12,
      widgets: [
        { id: 'objectives_1', widget_type: 'objectives', col: 0, row: 0, width: 5, height: 4 },
        { id: 'economy_1', widget_type: 'economy', col: 5, row: 0, width: 4, height: 4 },
        { id: 'status_1', widget_type: 'status_board', col: 9, row: 0, width: 3, height: 4 },
        { id: 'map_1', widget_type: 'tactical_map', col: 0, row: 4, width: 8, height: 6 },
        { id: 'timeline_1', widget_type: 'timeline', col: 8, row: 4, width: 4, height: 6 },
        { id: 'roster_1', widget_type: 'roster', col: 0, row: 10, width: 4, height: 4 },
        { id: 'comms_1', widget_type: 'comms', col: 4, row: 10, width: 4, height: 4 },
        { id: 'incidents_1', widget_type: 'incidents', col: 8, row: 10, width: 4, height: 4 }
      ]
    }
  }
};

export const getTemplateConfig = (templateType) => WORKSPACE_TEMPLATES[templateType];
export const getLayoutForRole = (templateType, userRole) => {
  const template = WORKSPACE_TEMPLATES[templateType];
  if (!template) return null;
  
  const roleLayoutKey = `${userRole.charAt(0).toLowerCase() + userRole.slice(1).replace(/\s+/g, '')}Layout`;
  return template[roleLayoutKey] || template.defaultLayout;
};