/**
 * operationPlanDefaults: Smart defaults for operation planning
 * 
 * Generates recommended comms nets, squad structure, etc. based on:
 * - Event type (casual vs focused)
 * - Operation type (rescue, industry, racing, etc.)
 * - User role (Scout, Pilot, Medic, etc.)
 */

import { base44 } from '@/api/base44Client';

/**
 * Get smart comms defaults for operation
 */
export function getCommsDefaults(eventType = 'casual', operationType = 'general') {
  const baseNets = [];

  if (eventType === 'focused') {
    // Focused ops: comprehensive comms doctrine
    baseNets.push({
      code: 'COMMAND',
      label: 'Mission Command',
      type: 'command',
      discipline: 'focused',
      priority: 1,
      min_rank_to_tx: 'Voyager',
      min_rank_to_rx: 'Scout'
    });

    baseNets.push({
      code: 'GENERAL',
      label: 'General Chatter',
      type: 'general',
      discipline: 'focused',
      priority: 2,
      min_rank_to_tx: 'Scout',
      min_rank_to_rx: 'Scout'
    });

    // Add operation-specific nets
    switch (operationType) {
      case 'rescue':
        baseNets.push({
          code: 'MEDICAL',
          label: 'Medical Coordination',
          type: 'support',
          discipline: 'focused',
          priority: 2,
          allowed_role_tags: ['MEDIC']
        });
        baseNets.push({
          code: 'DISTRESS',
          label: 'Emergency Routing',
          type: 'command',
          discipline: 'focused',
          priority: 1
        });
        break;

      case 'industry':
        baseNets.push({
          code: 'LOGISTICS',
          label: 'Cargo Coordination',
          type: 'support',
          discipline: 'focused',
          priority: 2
        });
        baseNets.push({
          code: 'ESCORT',
          label: 'Security Overwatch',
          type: 'support',
          discipline: 'focused',
          priority: 2
        });
        break;

      case 'racing':
        baseNets.push({
          code: 'MARSHAL',
          label: 'Race Control',
          type: 'support',
          discipline: 'focused',
          priority: 1
        });
        baseNets.push({
          code: 'MEDICAL',
          label: 'Medical Response',
          type: 'support',
          discipline: 'focused',
          priority: 2
        });
        break;

      case 'combat':
      case 'pvp':
        baseNets.push({
          code: 'TACTICAL',
          label: 'Tactical Update',
          type: 'support',
          discipline: 'focused',
          priority: 1
        });
        break;
    }
  } else {
    // Casual ops: minimal comms (can be very relaxed)
    baseNets.push({
      code: 'GENERAL',
      label: 'Hangout Net',
      type: 'general',
      discipline: 'casual',
      priority: 3
    });

    // Optional specialty for casual ops
    if (operationType === 'rescue') {
      baseNets.push({
        code: 'EMERGENCY',
        label: 'Emergency Pings',
        type: 'general',
        discipline: 'casual',
        priority: 2
      });
    }
  }

  return baseNets;
}

/**
 * Get suggested squad structure for operation
 */
export async function getSquadDefaults(eventType = 'casual', count = 1) {
  // Fetch existing squads to suggest
  try {
    const squads = await base44.entities.Squad.list('-created_date', 20);
    
    // For casual, suggest primary squad only
    if (eventType === 'casual') {
      return squads.slice(0, 1).map(s => ({
        squad_id: s.id,
        squad_name: s.name,
        role: 'primary'
      }));
    }

    // For focused, suggest primary + supporting squads
    return squads.slice(0, Math.min(count, 3)).map((s, i) => ({
      squad_id: s.id,
      squad_name: s.name,
      role: i === 0 ? 'primary' : 'support'
    }));
  } catch (error) {
    console.warn('[OP PLAN] Squad fetch failed:', error);
    return [];
  }
}

/**
 * Get template objectives based on operation type
 */
export function getObjectiveTemplate(operationType = 'general', eventType = 'casual') {
  const baseObjective = {
    is_completed: false,
    sub_tasks: []
  };

  switch (operationType) {
    case 'rescue':
      return [
        {
          ...baseObjective,
          text: 'Locate distress signal',
          sub_tasks: [
            { text: 'Triangulate position' },
            { text: 'Assess hazards' },
            { text: 'Plan approach' }
          ]
        },
        {
          ...baseObjective,
          text: 'Extract survivors',
          sub_tasks: [
            { text: 'Stabilize victims' },
            { text: 'Secure transport' }
          ]
        },
        {
          ...baseObjective,
          text: 'Return to base',
          sub_tasks: [
            { text: 'Monitor medical status' }
          ]
        }
      ];

    case 'industry':
      return [
        {
          ...baseObjective,
          text: 'Acquire cargo',
          sub_tasks: [
            { text: 'Verify load manifest' },
            { text: 'Secure cargo' }
          ]
        },
        {
          ...baseObjective,
          text: 'Transport to destination',
          sub_tasks: [
            { text: 'Maintain formation' },
            { text: 'Monitor threats' }
          ]
        },
        {
          ...baseObjective,
          text: 'Deliver safely',
          sub_tasks: [
            { text: 'Dock at destination' },
            { text: 'Verify condition' }
          ]
        }
      ];

    case 'racing':
      return [
        {
          ...baseObjective,
          text: 'Course briefing',
          sub_tasks: [
            { text: 'Review checkpoint markers' },
            { text: 'Review hazards' }
          ]
        },
        {
          ...baseObjective,
          text: 'Run race',
          sub_tasks: [
            { text: 'Hit all checkpoints in order' },
            { text: 'Maintain safe speed' }
          ]
        },
        {
          ...baseObjective,
          text: 'Final results',
          sub_tasks: [
            { text: 'Record finish time' }
          ]
        }
      ];

    case 'combat':
      return [
        {
          ...baseObjective,
          text: 'Suppress enemy position'
        },
        {
          ...baseObjective,
          text: 'Secure objective'
        },
        {
          ...baseObjective,
          text: 'Regroup and extract'
        }
      ];

    default:
      // Generic casual objective
      return eventType === 'casual'
        ? [{ ...baseObjective, text: 'Complete operation objectives' }]
        : [
            { ...baseObjective, text: 'Primary objective' },
            { ...baseObjective, text: 'Secondary objective' }
          ];
  }
}

/**
 * Get command staff recommendations
 */
export function getCommandStaffTemplate(eventType = 'casual') {
  if (eventType === 'casual') {
    // Casual: host as commander, optional XO
    return {
      commander_id: 'HOST', // Will be replaced with actual user
      xo_id: null,
      comms_officer_id: null
    };
  } else {
    // Focused: full command structure required
    return {
      commander_id: 'HOST',
      xo_id: null, // Must be filled
      comms_officer_id: null // Must be filled
    };
  }
}

/**
 * Get map marker suggestions based on operation type
 */
export function getMapMarkerTemplate(operationType = 'general') {
  switch (operationType) {
    case 'rescue':
      return [
        { type: 'distress', label: 'DISTRESS SIGNAL', icon: 'alert' },
        { type: 'rally', label: 'RALLY POINT', icon: 'flag' },
        { type: 'hazard', label: 'HAZARD ZONE', icon: 'warning' },
        { type: 'extraction', label: 'EXTRACTION LZ', icon: 'landing' }
      ];

    case 'industry':
      return [
        { type: 'waypoint', label: 'PICKUP POINT', icon: 'location' },
        { type: 'waypoint', label: 'DELIVERY POINT', icon: 'location' },
        { type: 'hazard', label: 'PIRATE TERRITORY', icon: 'warning' },
        { type: 'rally', label: 'RALLY POINT', icon: 'flag' }
      ];

    case 'racing':
      return [
        { type: 'checkpoint', label: 'START LINE', icon: 'start' },
        { type: 'checkpoint', label: 'CHECKPOINT 1', icon: 'flag' },
        { type: 'checkpoint', label: 'FINISH LINE', icon: 'finish' },
        { type: 'hazard', label: 'OBSTACLE', icon: 'warning' }
      ];

    default:
      return [
        { type: 'rally', label: 'RALLY POINT', icon: 'flag' },
        { type: 'extraction', label: 'EXTRACTION', icon: 'landing' }
      ];
  }
}