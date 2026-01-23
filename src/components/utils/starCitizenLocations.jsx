// Star Citizen 4.5 LIVE system data - Stanton, Nyx, Pyro
// Approximate positions for tactical map display

// Jump points and strategic zones
export const JUMP_POINTS = [
  { id: 'jh-stanton-pyro', from: 'stanton', to: 'pyro', type: 'large', name: 'Stanton-Pyro', location: { lat: 15, lng: -22 }, status: 'STABLE' },
  { id: 'jh-stanton-nyx', from: 'stanton', to: 'nyx', type: 'medium', name: 'Stanton-Nyx', location: { lat: -12, lng: 12 }, status: 'STABLE' },
  { id: 'jh-crusader-microtech', from: 'crusader', to: 'microtech', type: 'internal', name: 'Crusader-Microtech', location: { lat: -1.5, lng: -3.5 }, status: 'STABLE' }
];

// Hazard zones and interesting areas
export const HAZARD_ZONES = [
  { id: 'asteroid-field-kareah', name: 'Kareah Asteroid Field', location: { lat: 2.7, lng: -12.1 }, radius: 1.5, type: 'asteroids', threat: 'MEDIUM' },
  { id: 'nebula-crusader', name: 'Crusader Nebula (Dense)', location: { lat: 3, lng: -14 }, radius: 3, type: 'radiation', threat: 'HIGH' },
  { id: 'outlaw-zone-grim-hex', name: 'Grim Hex UEE Patrol Zone', location: { lat: 2.75, lng: -12.05 }, radius: 2, type: 'lawless', threat: 'CRITICAL' },
  { id: 'pirate-corridor', name: 'Yela-Daymar Pirate Corridor', location: { lat: 2, lng: -15 }, radius: 2.5, type: 'pirates', threat: 'HIGH' }
];

export const STAR_CITIZEN_SYSTEMS = {
  stanton: {
    name: 'Stanton',
    color: '#fbbf24',
    location: { lat: 0, lng: 0 },
    description: 'Primary UEE operational zone. Heavily trafficked, civilian/military presence.',
    jumpPoints: ['jh-stanton-pyro', 'jh-stanton-nyx'],
    bodies: [
      {
        id: 'sol',
        name: 'Sol',
        type: 'star',
        color: '#fbbf24',
        location: { lat: 0, lng: 0 },
        temperature: '5778K',
        class: 'G2V',
        orbitalStations: []
      },
      {
        id: 'crusader',
        name: 'Crusader',
        type: 'planet',
        color: '#3b82f6',
        location: { lat: 2, lng: -15 },
        description: 'Gas giant. Corporate shipping hub. Port Olisar primary refueling point.',
        diameter: '143,776 km',
        orbitalStations: [
          { id: 'olisar', name: 'Port Olisar', type: 'orbital_station', location: { lat: 2.1, lng: -15.1 }, owner: 'RSI', services: ['refuel', 'repair', 'cargo'] }
        ],
        landingAreas: []
      },
      {
        id: 'stanton-daymar',
        name: 'Daymar',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 2.3, lng: -15.4 },
        description: 'Low-gravity mining moon. Popular for prospectors. Sparse atmosphere.',
        gravity: '0.25g',
        orbitalStations: [],
        landingAreas: [
          { id: 'daymar-kudre', name: 'Kudre Ore', type: 'mining_outpost', location: { lat: 2.35, lng: -15.35 }, faction: 'Outlaw', services: ['mining_supplies', 'black_market'] }
        ]
      },
      {
        id: 'stanton-yela',
        name: 'Yela',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 1.8, lng: -14.9 },
        orbitalStations: [],
        landingAreas: [
          { id: 'yela-armitage', name: 'Armitage Research Facility', type: 'facility', location: { lat: 1.85, lng: -14.85 } }
        ]
      },
      {
        id: 'stanton-mike',
        name: 'Mike',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 2.1, lng: -15.5 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'microtech',
        name: 'Microtech',
        type: 'planet',
        color: '#10b981',
        location: { lat: -5, lng: 8 },
        description: 'Icy terraformed world. Primary UEE administrative hub. Highest security.',
        diameter: '12,374 km',
        gravity: '0.92g',
        orbitalStations: [
          { id: 'new-babbage-spaceport', name: 'New Babbage Spaceport', type: 'spaceport', location: { lat: -5.1, lng: 8.1 }, owner: 'Microtech', services: ['refuel', 'repair', 'cargo', 'armor'] }
        ],
        landingAreas: [
          { id: 'new-babbage', name: 'New Babbage', type: 'city', location: { lat: -5, lng: 8 }, population: '300k', faction: 'UEE', services: ['commerce', 'law_enforcement'] },
          { id: 'ict-orbital-station', name: 'Area 18', type: 'admin_station', location: { lat: -5.2, lng: 8.2 }, faction: 'UEE', services: ['government', 'trading'] }
        ]
      },
      {
        id: 'stanton-calliope',
        name: 'Calliope',
        type: 'moon',
        color: '#6b7280',
        location: { lat: -5.3, lng: 8.4 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'stanton-clio',
        name: 'Clio',
        type: 'moon',
        color: '#6b7280',
        location: { lat: -5.1, lng: 8.3 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'stanton-euterpe',
        name: 'Euterpe',
        type: 'moon',
        color: '#6b7280',
        location: { lat: -4.9, lng: 7.9 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'arccorp',
        name: 'ArcCorp',
        type: 'planet',
        color: '#dc2626',
        location: { lat: -8, lng: 5 },
        description: 'Desert world. Corporate HQ. Heavy air traffic, criminal activity reported.',
        diameter: '8,892 km',
        gravity: '0.88g',
        orbitalStations: [
          { id: 'justinns-claim', name: 'JUSTINNS CLAIM', type: 'orbital_station', location: { lat: -8.1, lng: 5.1 }, owner: 'ArcCorp', services: ['cargo', 'repair'] }
        ],
        landingAreas: [
          { id: 'arcorporation', name: 'Arcorporation', type: 'city', location: { lat: -8, lng: 5 }, population: '500k', faction: 'Corporate', services: ['trading', 'industry'] }
        ]
      },
      {
        id: 'stanton-wright',
        name: 'Wright',
        type: 'moon',
        color: '#6b7280',
        location: { lat: -8.2, lng: 5.2 },
        orbitalStations: [],
        landingAreas: [
          { id: 'wright-outpost', name: 'Outpost Zero', type: 'outpost', location: { lat: -8.25, lng: 5.15 } }
        ]
      },
      {
        id: 'hurston',
        name: 'Hurston',
        type: 'planet',
        color: '#8b5cf6',
        location: { lat: 3, lng: -12 },
        description: 'Heavy industrial world. Mining/manufacturing hub. Lower security enforcement.',
        diameter: '11,294 km',
        gravity: '0.98g',
        orbitalStations: [
          { id: 'lorville-spaceport', name: 'Lorville Spaceport', type: 'spaceport', location: { lat: 3.1, lng: -12.1 }, owner: 'Hurston Dynamics', services: ['refuel', 'repair', 'armor'] }
        ],
        landingAreas: [
          { id: 'lorville', name: 'Lorville', type: 'city', location: { lat: 3, lng: -12 }, population: '250k', faction: 'Industrial', services: ['trading', 'mining'] },
          { id: 'teasa-spaceport', name: 'Teasa Spaceport', type: 'spaceport', location: { lat: 3.2, lng: -12.3 }, owner: 'Outlaw', services: ['black_market', 'illegal_armor'] }
        ]
      },
      {
        id: 'stanton-ita',
        name: 'Ita',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 3.3, lng: -12.2 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'stanton-magda',
        name: 'Magda',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 2.8, lng: -11.8 },
        orbitalStations: [],
        landingAreas: []
      },
      {
        id: 'stanton-kareah',
        name: 'Kareah',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 2.7, lng: -12.1 },
        description: 'Barren rock. Grim Hex hidden inside. Lawless zone. Notorious pirate haven.',
        gravity: '0.3g',
        orbitalStations: [
          { id: 'grim-hex', name: 'Grim Hex', type: 'criminal_station', location: { lat: 2.75, lng: -12.05 }, owner: 'Outlaw', services: ['black_market', 'bounty_contracts', 'illegal_mods'] }
        ],
        landingAreas: []
      }
    ]
  },
  nyx: {
    name: 'Nyx',
    color: '#a78bfa',
    location: { lat: -25, lng: 20 },
    description: 'Banu space. Neutral territory. Limited UEE presence. Trade hub.',
    jumpPoints: [],
    bodies: [
      {
        id: 'nyx-star',
        name: 'Nyx (Star)',
        type: 'star',
        color: '#a78bfa',
        location: { lat: -25, lng: 20 },
        class: 'K1V',
        orbitalStations: []
      },
      {
        id: 'banu-homeworld',
        name: 'Banu Homeworld',
        type: 'planet',
        color: '#f59e0b',
        location: { lat: -23, lng: 18 },
        description: 'Banu sovereignty. Limited outsider access. Diplomatic protocols required.',
        orbitalStations: [],
        landingAreas: [
          { id: 'banu-city', name: 'Banu Trade Enclave', type: 'settlement', location: { lat: -23, lng: 18 }, faction: 'Banu', services: ['trading', 'exotic_goods'] }
        ]
      }
    ]
  },
  pyro: {
    name: 'Pyro',
    color: '#ef4444',
    location: { lat: 30, lng: -30 },
    description: 'Deep space contested zone. UEE/Outlaw conflict. Extreme danger. Limited infrastructure.',
    jumpPoints: ['jh-stanton-pyro'],
    bodies: [
      {
        id: 'pyro-star',
        name: 'Pyro (Star)',
        type: 'star',
        color: '#ef4444',
        location: { lat: 30, lng: -30 },
        class: 'M3V',
        orbitalStations: []
      }
    ]
  }
};

// Location menu actions based on rank/role
export const LOCATION_MENU_ACTIONS = {
  VAGRANT: ['view_info', 'report_location'],
  SCOUT: ['view_info', 'report_location', 'mark_note', 'report_incident'],
  VOYAGER: ['view_info', 'report_location', 'mark_note', 'report_incident', 'mark_objective', 'mark_muster'],
  FOUNDER: ['view_info', 'report_location', 'mark_note', 'report_incident', 'mark_objective', 'mark_muster', 'mark_evac', 'leave_intel'],
  PIONEER: ['view_info', 'report_location', 'mark_note', 'report_incident', 'mark_objective', 'mark_muster', 'mark_evac', 'leave_intel', 'commerce_intel']
};

export const ACTION_CONFIG = {
  view_info: { label: 'View Info', icon: 'Info', color: '#3b82f6' },
  report_location: { label: 'Report Location', icon: 'Flag', color: '#10b981' },
  mark_note: { label: 'Leave Note', icon: 'MessageSquare', color: '#f59e0b' },
  report_incident: { label: 'Report Incident', icon: 'AlertTriangle', color: '#dc2626' },
  mark_objective: { label: 'Mark Objective', icon: 'Target', color: '#8b5cf6' },
  mark_muster: { label: 'Muster Point', icon: 'Users', color: '#ec4899' },
  mark_evac: { label: 'Evac Route', icon: 'Navigation', color: '#06b6d4' },
  leave_intel: { label: 'Leave Intel', icon: 'Zap', color: '#facc15' },
  commerce_intel: { label: 'Commerce Data', icon: 'Briefcase', color: '#14b8a6' }
};

// Flatten all locations for easy lookup
export function getAllLocations() {
  const locations = [];
  Object.values(STAR_CITIZEN_SYSTEMS).forEach(system => {
    system.bodies.forEach(body => {
      locations.push({ ...body, system: system.name });
      if (body.orbitalStations) {
        body.orbitalStations.forEach(station => {
          locations.push({ ...station, system: system.name, parent: body.name });
        });
      }
      if (body.landingAreas) {
        body.landingAreas.forEach(area => {
          locations.push({ ...area, system: system.name, parent: body.name });
        });
      }
    });
  });
  return locations;
}

export function getLocationById(locationId) {
  return getAllLocations().find(loc => loc.id === locationId);
}