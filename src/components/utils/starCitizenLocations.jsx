// Star Citizen 4.5 LIVE system data - Stanton, Nyx, Pyro
// Approximate positions for tactical map display

export const STAR_CITIZEN_SYSTEMS = {
  stanton: {
    name: 'Stanton',
    color: '#fbbf24',
    location: { lat: 0, lng: 0 },
    bodies: [
      {
        id: 'sol',
        name: 'Sol',
        type: 'star',
        color: '#fbbf24',
        location: { lat: 0, lng: 0 },
        orbitalStations: []
      },
      {
        id: 'crusader',
        name: 'Crusader',
        type: 'planet',
        color: '#3b82f6',
        location: { lat: 2, lng: -15 },
        orbitalStations: [
          { id: 'olisar', name: 'Port Olisar', type: 'orbital_station', location: { lat: 2.1, lng: -15.1 } }
        ],
        landingAreas: []
      },
      {
        id: 'stanton-daymar',
        name: 'Daymar',
        type: 'moon',
        color: '#6b7280',
        location: { lat: 2.3, lng: -15.4 },
        orbitalStations: [],
        landingAreas: [
          { id: 'daymar-kudre', name: 'Kudre Ore', type: 'outpost', location: { lat: 2.35, lng: -15.35 } }
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
        orbitalStations: [
          { id: 'new-babbage-spaceport', name: 'New Babbage Spaceport', type: 'spaceport', location: { lat: -5.1, lng: 8.1 } }
        ],
        landingAreas: [
          { id: 'new-babbage', name: 'New Babbage', type: 'city', location: { lat: -5, lng: 8 } },
          { id: 'ict-orbital-station', name: 'Area 18', type: 'station', location: { lat: -5.2, lng: 8.2 } }
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
        orbitalStations: [
          { id: 'justinns-claim', name: 'JUSTINNS CLAIM', type: 'orbital_station', location: { lat: -8.1, lng: 5.1 } }
        ],
        landingAreas: [
          { id: 'arcorporation', name: 'Arcorporation', type: 'city', location: { lat: -8, lng: 5 } }
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
        orbitalStations: [
          { id: 'lorville-spaceport', name: 'Lorville Spaceport', type: 'spaceport', location: { lat: 3.1, lng: -12.1 } }
        ],
        landingAreas: [
          { id: 'lorville', name: 'Lorville', type: 'city', location: { lat: 3, lng: -12 } },
          { id: 'teasa-spaceport', name: 'Teasa Spaceport', type: 'spaceport', location: { lat: 3.2, lng: -12.3 } }
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
        orbitalStations: [
          { id: 'grim-hex', name: 'Grim Hex', type: 'station', location: { lat: 2.75, lng: -12.05 } }
        ],
        landingAreas: []
      }
    ]
  },
  nyx: {
    name: 'Nyx',
    color: '#a78bfa',
    location: { lat: -25, lng: 20 },
    bodies: [
      {
        id: 'nyx-star',
        name: 'Nyx (Star)',
        type: 'star',
        color: '#a78bfa',
        location: { lat: -25, lng: 20 },
        orbitalStations: []
      },
      {
        id: 'banu-homeworld',
        name: 'Banu Homeworld',
        type: 'planet',
        color: '#f59e0b',
        location: { lat: -23, lng: 18 },
        orbitalStations: [],
        landingAreas: [
          { id: 'banu-city', name: 'Banu Trade Enclave', type: 'settlement', location: { lat: -23, lng: 18 } }
        ]
      }
    ]
  },
  pyro: {
    name: 'Pyro',
    color: '#ef4444',
    location: { lat: 30, lng: -30 },
    bodies: [
      {
        id: 'pyro-star',
        name: 'Pyro (Star)',
        type: 'star',
        color: '#ef4444',
        location: { lat: 30, lng: -30 },
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