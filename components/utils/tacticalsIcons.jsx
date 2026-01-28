/**
 * Tactical Military Icon Palette for Star Citizen Operations
 * SVG-based icons for map markers and tactical displays
 */

export const TACTICAL_ICONS = {
  // Command & Control
  command_post: {
    label: 'Command Post',
    color: '#ff0000',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="24" fill="#ff0000" stroke="#000" stroke-width="1"/>
      <path d="M 12 10 L 20 10 L 20 18 L 12 18 Z" fill="#000"/>
      <path d="M 14 12 L 18 12 M 14 14 L 18 14 M 14 16 L 18 16" stroke="#ff0000" stroke-width="0.5"/>
    </svg>`,
    icon: '🏢'
  },

  // Objectives
  objective_primary: {
    label: 'Primary Objective',
    color: '#ffaa00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#ffaa00" stroke="#000" stroke-width="1"/>
      <path d="M 16 8 L 20 14 L 14 14 Z" fill="#000"/>
      <circle cx="16" cy="18" r="2" fill="#000"/>
    </svg>`,
    icon: '🎯'
  },

  objective_secondary: {
    label: 'Secondary Objective',
    color: '#00d4ff',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="#00d4ff" stroke="#000" stroke-width="1"/>
      <circle cx="16" cy="16" r="6" fill="none" stroke="#000" stroke-width="1"/>
      <circle cx="16" cy="16" r="2" fill="#000"/>
    </svg>`,
    icon: '◎'
  },

  // Threats
  threat_hostile: {
    label: 'Hostile Contact',
    color: '#ff0000',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M 16 4 L 22 12 L 28 16 L 22 20 L 16 28 L 10 20 L 4 16 L 10 12 Z" fill="#ff0000" stroke="#000" stroke-width="1"/>
      <path d="M 16 10 L 18 14 L 14 14 Z" fill="#000"/>
    </svg>`,
    icon: '⚔️'
  },

  threat_radar: {
    label: 'Radar/Sensor Contact',
    color: '#ff6600',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="10" fill="none" stroke="#ff6600" stroke-width="1" stroke-dasharray="2,2"/>
      <circle cx="16" cy="16" r="6" fill="none" stroke="#ff6600" stroke-width="1"/>
      <circle cx="16" cy="16" r="2" fill="#ff6600"/>
      <line x1="16" y1="6" x2="16" y2="2" stroke="#ff6600" stroke-width="1"/>
    </svg>`,
    icon: '📡'
  },

  // Supply & Logistics
  resupply_ammo: {
    label: 'Ammunition Cache',
    color: '#ffff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="20" height="16" fill="#ffff00" stroke="#000" stroke-width="1"/>
      <rect x="10" y="12" width="3" height="4" fill="#000"/>
      <rect x="15" y="12" width="3" height="4" fill="#000"/>
      <rect x="20" y="12" width="3" height="4" fill="#000"/>
    </svg>`,
    icon: '🔫'
  },

  resupply_fuel: {
    label: 'Fuel Depot',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M 12 8 L 12 12 L 8 16 L 8 24 L 24 24 L 24 16 L 20 12 L 20 8 Z" fill="#00ff00" stroke="#000" stroke-width="1"/>
      <rect x="12" y="16" width="8" height="6" fill="#000" opacity="0.3"/>
    </svg>`,
    icon: '⛽'
  },

  resupply_medical: {
    label: 'Medical Facility',
    color: '#ff00ff',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="20" height="20" fill="#ff00ff" stroke="#000" stroke-width="1"/>
      <line x1="16" y1="10" x2="16" y2="22" stroke="#fff" stroke-width="2"/>
      <line x1="10" y1="16" x2="22" y2="16" stroke="#fff" stroke-width="2"/>
    </svg>`,
    icon: '⚕️'
  },

  // Extraction & Movement
  extraction_point: {
    label: 'Extraction Point',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M 16 4 L 24 12 L 20 12 L 20 24 L 12 24 L 12 12 L 8 12 Z" fill="#00ff00" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '🚁'
  },

  insertion_point: {
    label: 'Insertion Point',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M 16 28 L 24 20 L 20 20 L 20 8 L 12 8 L 12 20 L 8 20 Z" fill="#00ff00" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '⬇️'
  },

  rally_point: {
    label: 'Rally Point',
    color: '#0088ff',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,4 22,12 18,12 18,24 14,24 14,12 10,12" fill="#0088ff" stroke="#000" stroke-width="1"/>
      <circle cx="16" cy="20" r="3" fill="#000"/>
    </svg>`,
    icon: '🚩'
  },

  // Hazards & Restricted
  hazard_radiation: {
    label: 'Radiation Zone',
    color: '#ffff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" fill="none" stroke="#ffff00" stroke-width="1.5"/>
      <circle cx="16" cy="10" r="2" fill="#ffff00"/>
      <circle cx="22" cy="20" r="2" fill="#ffff00"/>
      <circle cx="10" cy="20" r="2" fill="#ffff00"/>
      <path d="M 16 16 L 16 8" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '☢️'
  },

  hazard_minefield: {
    label: 'Minefield',
    color: '#ff00ff',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="4" fill="#ff00ff" stroke="#000" stroke-width="1"/>
      <circle cx="22" cy="10" r="4" fill="#ff00ff" stroke="#000" stroke-width="1"/>
      <circle cx="16" cy="22" r="4" fill="#ff00ff" stroke="#000" stroke-width="1"/>
      <path d="M 10 10 L 22 10 L 16 22 Z" stroke="#000" stroke-width="0.5" fill="none"/>
    </svg>`,
    icon: '💣'
  },

  hazard_ewar: {
    label: 'Electronic Warfare',
    color: '#00ffff',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="10" width="16" height="12" fill="none" stroke="#00ffff" stroke-width="1"/>
      <line x1="8" y1="10" x2="24" y2="22" stroke="#00ffff" stroke-width="1"/>
      <line x1="24" y1="10" x2="8" y2="22" stroke="#00ffff" stroke-width="1"/>
    </svg>`,
    icon: '⚡'
  },

  // Waypoints & Navigation
  waypoint_alpha: {
    label: 'Waypoint Alpha',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="10" fill="none" stroke="#00ff00" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="5" fill="none" stroke="#00ff00" stroke-width="1"/>
      <text x="16" y="19" font-size="10" fill="#00ff00" text-anchor="middle" font-weight="bold">A</text>
    </svg>`,
    icon: '①'
  },

  waypoint_bravo: {
    label: 'Waypoint Bravo',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="10" fill="none" stroke="#00ff00" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="5" fill="none" stroke="#00ff00" stroke-width="1"/>
      <text x="16" y="19" font-size="10" fill="#00ff00" text-anchor="middle" font-weight="bold">B</text>
    </svg>`,
    icon: '②'
  },

  waypoint_charlie: {
    label: 'Waypoint Charlie',
    color: '#00ff00',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="10" fill="none" stroke="#00ff00" stroke-width="1.5"/>
      <circle cx="16" cy="16" r="5" fill="none" stroke="#00ff00" stroke-width="1"/>
      <text x="16" y="19" font-size="10" fill="#00ff00" text-anchor="middle" font-weight="bold">C</text>
    </svg>`,
    icon: '③'
  },

  // Assets & Equipment
  asset_carrier: {
    label: 'Capital Ship',
    color: '#3b82f6',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,4 28,24 20,28 12,28 4,24" fill="#3b82f6" stroke="#000" stroke-width="1"/>
      <line x1="16" y1="4" x2="16" y2="24" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '🚢'
  },

  asset_fighter: {
    label: 'Fighter Craft',
    color: '#10b981',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <polygon points="16,4 24,14 20,24 16,26 12,24 8,14" fill="#10b981" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '✈️'
  },

  asset_transport: {
    label: 'Transport Ship',
    color: '#8b5cf6',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="8" width="20" height="16" fill="#8b5cf6" stroke="#000" stroke-width="1"/>
      <rect x="8" y="10" width="4" height="4" fill="none" stroke="#000" stroke-width="0.5"/>
      <rect x="14" y="10" width="4" height="4" fill="none" stroke="#000" stroke-width="0.5"/>
      <rect x="20" y="10" width="4" height="4" fill="none" stroke="#000" stroke-width="0.5"/>
    </svg>`,
    icon: '🚛'
  },

  // Custom/Generic
  checkpoint: {
    label: 'Checkpoint',
    color: '#64748b',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="8" width="12" height="16" fill="none" stroke="#64748b" stroke-width="1.5"/>
      <line x1="10" y1="13" x2="22" y2="13" stroke="#64748b" stroke-width="1"/>
      <line x1="10" y1="18" x2="22" y2="18" stroke="#64748b" stroke-width="1"/>
    </svg>`,
    icon: '🚧'
  },

  note: {
    label: 'Note/Marker',
    color: '#fbbf24',
    svg: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M 8 6 L 24 6 L 24 26 L 12 26 L 8 22 Z" fill="#fbbf24" stroke="#000" stroke-width="1"/>
      <line x1="12" y1="12" x2="20" y2="12" stroke="#000" stroke-width="1"/>
      <line x1="12" y1="16" x2="20" y2="16" stroke="#000" stroke-width="1"/>
      <line x1="12" y1="20" x2="18" y2="20" stroke="#000" stroke-width="1"/>
    </svg>`,
    icon: '📌'
  }
};

/**
 * Get icon configuration by key
 */
export function getTacticalIcon(iconKey) {
  return TACTICAL_ICONS[iconKey] || TACTICAL_ICONS.note;
}

/**
 * Get all available icons grouped by category
 */
export const TACTICAL_ICON_CATEGORIES = {
  'Command & Control': ['command_post'],
  'Objectives': ['objective_primary', 'objective_secondary'],
  'Threats': ['threat_hostile', 'threat_radar'],
  'Supply & Logistics': ['resupply_ammo', 'resupply_fuel', 'resupply_medical'],
  'Movement': ['extraction_point', 'insertion_point', 'rally_point'],
  'Hazards': ['hazard_radiation', 'hazard_minefield', 'hazard_ewar'],
  'Waypoints': ['waypoint_alpha', 'waypoint_bravo', 'waypoint_charlie'],
  'Assets': ['asset_carrier', 'asset_fighter', 'asset_transport'],
  'Other': ['checkpoint', 'note']
};

/**
 * Convert icon SVG to Leaflet marker icon
 */
export function createTacticalMarkerIcon(iconKey, size = 32) {
  const icon = getTacticalIcon(iconKey);
  if (!icon) return null;

  const svg = `<svg width="${size}" height="${size + 8}" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 8.8 16 24 16 24s16-15.2 16-24c0-8.8-7.2-16-16-16z" fill="${icon.color}" stroke="#000" stroke-width="1"/>
    <g transform="translate(8, 6) scale(0.75)">
      ${icon.svg.match(/<svg[^>]*>(.*?)<\/svg>/s)?.[1] || ''}
    </g>
  </svg>`;

  const L = require('leaflet');
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)]
  });
}