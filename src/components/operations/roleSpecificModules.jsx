/**
 * roleSpecificModules: Role-aware planning modules
 * 
 * Provides role-specific planning tools:
 * - Rescue: medevac plan, distress routing, triage
 * - Industry: cargo manifest, escort requirements, risk routing
 * - Rangers: recon plan, perimeter assignments
 * - Shamans: morale/ritual, comms etiquette, debrief framing
 * - Racing: course markers, marshals, penalties
 */

/**
 * Rescue-specific planning module
 */
export const RescueModule = {
  name: 'Rescue Operations',
  roles: ['MEDIC', 'PILOT', 'RESCUER'],
  
  getContextualChecklist: () => [
    { task: 'Distress signal confirmed', required: true },
    { task: 'Survivors assessed', required: true },
    { task: 'Medevac route planned', required: true },
    { task: 'Medical supplies ready', required: true },
    { task: 'Comms with medical facility established', required: true },
    { task: 'Weather/hazards evaluated', required: true }
  ],

  getCommsOverrides: (baseNets) => {
    // Add medical comms
    return [
      ...baseNets,
      {
        code: 'MEDICAL',
        label: 'Medical Coordination',
        type: 'support',
        discipline: 'focused',
        priority: 1,
        allowed_role_tags: ['MEDIC']
      },
      {
        code: 'DISTRESS',
        label: 'Emergency Routing',
        type: 'command',
        discipline: 'focused',
        priority: 0 // Highest
      }
    ];
  },

  getObjectiveOverrides: () => [
    {
      text: 'Locate and assess survivors',
      sub_tasks: [
        { text: 'Triangulate distress signal' },
        { text: 'Visual confirmation' },
        { text: 'Evaluate injuries/status' }
      ]
    },
    {
      text: 'Execute medevac',
      sub_tasks: [
        { text: 'Clear landing zone' },
        { text: 'Stabilize survivors' },
        { text: 'Secure transport' }
      ]
    },
    {
      text: 'Deliver to medical facility',
      sub_tasks: [
        { text: 'Monitor vital signs' },
        { text: 'Coordinate handoff' }
      ]
    }
  ]
};

/**
 * Industry-specific planning module
 */
export const IndustryModule = {
  name: 'Industrial Operations',
  roles: ['PILOT', 'LOGISTICS', 'ENGINEER'],

  getContextualChecklist: () => [
    { task: 'Cargo manifest verified', required: true },
    { task: 'Load secured and balanced', required: true },
    { task: 'Route safety assessed', required: true },
    { task: 'Escort assigned (if needed)', required: false },
    { task: 'Destination notified', required: true },
    { task: 'Insurance/liability confirmed', required: false }
  ],

  getCommsOverrides: (baseNets) => [
    ...baseNets,
    {
      code: 'LOGISTICS',
      label: 'Cargo Coordination',
      type: 'support',
      discipline: 'focused',
      priority: 1
    },
    {
      code: 'ESCORT',
      label: 'Security Overwatch',
      type: 'support',
      discipline: 'focused',
      priority: 1,
      allowed_role_tags: ['SECURITY', 'PILOT']
    }
  ],

  getObjectiveOverrides: () => [
    {
      text: 'Load and prepare cargo',
      sub_tasks: [
        { text: 'Verify manifest' },
        { text: 'Secure load' },
        { text: 'Run pre-flight' }
      ]
    },
    {
      text: 'Transit to destination',
      sub_tasks: [
        { text: 'Maintain planned route' },
        { text: 'Monitor cargo integrity' },
        { text: 'Report any issues' }
      ]
    },
    {
      text: 'Deliver and offload',
      sub_tasks: [
        { text: 'Dock at destination' },
        { text: 'Verify cargo condition' },
        { text: 'Confirm delivery' }
      ]
    }
  ]
};

/**
 * Rangers-specific planning module
 */
export const RangersModule = {
  name: 'Ranger Operations',
  roles: ['SCOUT', 'RANGER', 'TRACKER'],

  getContextualChecklist: () => [
    { task: 'Recon area defined', required: true },
    { task: 'Threat assessment complete', required: true },
    { task: 'Perimeter assignments made', required: true },
    { task: 'Extraction routes identified', required: true },
    { task: 'Communication checkpoints set', required: true }
  ],

  getCommsOverrides: (baseNets) => [
    ...baseNets,
    {
      code: 'SCOUT',
      label: 'Recon Coordination',
      type: 'support',
      discipline: 'focused',
      priority: 1,
      allowed_role_tags: ['SCOUT', 'RANGER']
    },
    {
      code: 'PERIMETER',
      label: 'Perimeter Status',
      type: 'support',
      discipline: 'focused',
      priority: 2
    }
  ],

  getObjectiveOverrides: () => [
    {
      text: 'Scout AO and identify threats',
      sub_tasks: [
        { text: 'Locate enemy positions' },
        { text: 'Map approach routes' },
        { text: 'ID high-value targets' }
      ]
    },
    {
      text: 'Establish perimeter',
      sub_tasks: [
        { text: 'Position observation posts' },
        { text: 'Set up alarm systems' },
        { text: 'Assign watch rotations' }
      ]
    },
    {
      text: 'Maintain watch and report',
      sub_tasks: [
        { text: 'Monitor comms' },
        { text: 'React to threats' }
      ]
    }
  ]
};

/**
 * Shamans-specific planning module
 */
export const ShamansModule = {
  name: 'Shaman Coordination',
  roles: ['SHAMAN', 'COMMS', 'CULTURE'],

  getContextualChecklist: () => [
    { task: 'Pre-operation ritual scheduled', required: false },
    { task: 'Comms etiquette briefed', required: true },
    { task: 'Debrief format planned', required: true },
    { task: 'Post-op celebration arranged', required: false },
    { task: 'Group morale focus identified', required: true }
  ],

  getCommsOverrides: (baseNets) => [
    ...baseNets,
    {
      code: 'SHAMANISM',
      label: 'Cultural Coordination',
      type: 'general',
      discipline: 'casual',
      priority: 3
    }
  ],

  getObjectiveOverrides: () => [
    {
      text: 'Pre-operation coordination',
      sub_tasks: [
        { text: 'Ritual preparation (optional)' },
        { text: 'Morale check-in' },
        { text: 'Comms discipline briefing' }
      ]
    },
    {
      text: 'Operation execution',
      sub_tasks: [
        { text: 'Monitor group cohesion' },
        { text: 'Support struggling members' }
      ]
    },
    {
      text: 'Post-operation debrief',
      sub_tasks: [
        { text: 'Gather stories' },
        { text: 'Celebrate wins' },
        { text: 'Frame lessons learned' }
      ]
    }
  ]
};

/**
 * Racing-specific planning module
 */
export const RacingModule = {
  name: 'Racing Operations',
  roles: ['PILOT', 'RACER', 'MARSHAL'],

  getContextualChecklist: () => [
    { task: 'Course markers placed', required: true },
    { task: 'Marshal positions assigned', required: true },
    { task: 'Medical standby positioned', required: true },
    { task: 'Penalty rules briefed', required: true },
    { task: 'Timing/scoring system ready', required: true }
  ],

  getCommsOverrides: (baseNets) => [
    ...baseNets,
    {
      code: 'MARSHAL',
      label: 'Race Control',
      type: 'support',
      discipline: 'focused',
      priority: 1,
      allowed_role_tags: ['MARSHAL']
    },
    {
      code: 'MEDICAL',
      label: 'Medical Response',
      type: 'support',
      discipline: 'focused',
      priority: 1,
      allowed_role_tags: ['MEDIC']
    }
  ],

  getObjectiveOverrides: () => [
    {
      text: 'Course setup',
      sub_tasks: [
        { text: 'Place all checkpoints' },
        { text: 'Mark hazards' },
        { text: 'Verify course integrity' }
      ]
    },
    {
      text: 'Run race',
      sub_tasks: [
        { text: 'Brief pilots' },
        { text: 'Start race' },
        { text: 'Monitor progress' },
        { text: 'Handle incidents' }
      ]
    },
    {
      text: 'Results and awards',
      sub_tasks: [
        { text: 'Record finish times' },
        { text: 'Verify no violations' },
        { text: 'Announce winners' }
      ]
    }
  ]
};

/**
 * Get module for user role
 */
export function getModuleForRole(userRole) {
  const normalizedRole = userRole?.toUpperCase() || '';
  
  const modules = {
    'MEDIC': RescueModule,
    'RESCUER': RescueModule,
    'LOGISTICS': IndustryModule,
    'ENGINEER': IndustryModule,
    'SCOUT': RangersModule,
    'RANGER': RangersModule,
    'TRACKER': RangersModule,
    'SHAMAN': ShamansModule,
    'COMMS': ShamansModule,
    'RACER': RacingModule,
    'MARSHAL': RacingModule
  };

  return modules[normalizedRole] || null;
}

/**
 * Get all modules (admin view)
 */
export function getAllModules() {
  return [
    RescueModule,
    IndustryModule,
    RangersModule,
    ShamansModule,
    RacingModule
  ];
}