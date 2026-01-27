import React from 'react';
import { Circle, Polyline, Tooltip } from 'react-leaflet';
import { JUMP_POINTS, HAZARD_ZONES } from '@/components/utils/starCitizenLocations';

/**
 * Jump Points Layer - Shows safe passage between systems
 */
export function JumpPointsLayer({ visible = true }) {
  if (!visible) return null;

  return (
    <>
      {JUMP_POINTS.map(jp => (
        <React.Fragment key={jp.id}>
          {/* Jump point marker */}
          <Circle
            center={[jp.location.lat, jp.location.lng]}
            radius={jp.type === 'large' ? 0.8 : jp.type === 'medium' ? 0.5 : 0.3}
            pathOptions={{
              color: jp.status === 'STABLE' ? '#10b981' : '#dc2626',
              fill: false,
              weight: 2,
              dashArray: '5,5'
            }}
          >
            <Tooltip>
              <div className="text-xs text-white">
                <div className="font-bold">{jp.name}</div>
                <div className="text-[10px] text-zinc-300">{jp.type.toUpperCase()}</div>
                <div className="text-[9px] text-emerald-400">{jp.status}</div>
              </div>
            </Tooltip>
          </Circle>

          {/* Jump point glow effect */}
          <Circle
            center={[jp.location.lat, jp.location.lng]}
            radius={jp.type === 'large' ? 1.2 : jp.type === 'medium' ? 0.8 : 0.5}
            pathOptions={{
              color: jp.status === 'STABLE' ? '#10b981' : '#dc2626',
              fill: true,
              fillColor: jp.status === 'STABLE' ? '#10b981' : '#dc2626',
              fillOpacity: 0.05,
              weight: 0
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Hazard Zones Layer - Asteroids, radiation, pirates, lawless zones
 */
export function HazardZonesLayer({ visible = true }) {
  if (!visible) return null;

  const threatColors = {
    LOW: '#3b82f6',
    MEDIUM: '#f59e0b',
    HIGH: '#dc2626',
    CRITICAL: '#a21caf'
  };

  const typeLabels = {
    asteroids: '⛏ Asteroids',
    radiation: '☢ Radiation',
    pirates: '🏴‍☠️ Pirates',
    lawless: '⚡ Lawless'
  };

  return (
    <>
      {HAZARD_ZONES.map(hz => (
        <React.Fragment key={hz.id}>
          {/* Hazard zone boundary */}
          <Circle
            center={[hz.location.lat, hz.location.lng]}
            radius={hz.radius}
            pathOptions={{
              color: threatColors[hz.threat],
              fill: true,
              fillColor: threatColors[hz.threat],
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: '3,3'
            }}
          >
            <Tooltip>
              <div className="text-xs text-white">
                <div className="font-bold">{hz.name}</div>
                <div className="text-[10px] text-zinc-300">{typeLabels[hz.type]}</div>
                <div className="text-[9px] font-bold" style={{ color: threatColors[hz.threat] }}>
                  {hz.threat} THREAT
                </div>
              </div>
            </Tooltip>
          </Circle>

          {/* Outer warning ring */}
          <Circle
            center={[hz.location.lat, hz.location.lng]}
            radius={hz.radius + 0.3}
            pathOptions={{
              color: threatColors[hz.threat],
              fill: false,
              weight: 1,
              dashArray: '1,4',
              opacity: 0.4
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Heat Map Layer - Shows incident/player density clusters
 */
export function IncidentHeatMapLayer({ incidents = [], visible = true }) {
  if (!visible || incidents.length === 0) return null;

  // Group incidents by proximity (simple clustering)
  const clusters = [];
  const processed = new Set();

  incidents.forEach((inc, i) => {
    if (processed.has(i)) return;

    const nearby = incidents.filter((other, j) => {
      if (processed.has(j) || j === i) return false;
      const dist = Math.sqrt(
        Math.pow(inc.coordinates?.lat - other.coordinates?.lat || 0, 2) +
        Math.pow(inc.coordinates?.lng - other.coordinates?.lng || 0, 2)
      );
      return dist < 2;
    });

    const cluster = [inc, ...nearby];
    cluster.forEach((_, idx) => processed.add(incidents.indexOf(cluster[idx])));

    clusters.push({
      center: {
        lat: cluster.reduce((sum, c) => sum + (c.coordinates?.lat || 0), 0) / cluster.length,
        lng: cluster.reduce((sum, c) => sum + (c.coordinates?.lng || 0), 0) / cluster.length
      },
      count: cluster.length,
      severity: cluster.some(c => c.severity === 'CRITICAL') ? 'CRITICAL' : 'HIGH'
    });
  });

  const severityColors = {
    CRITICAL: { color: '#a21caf', opacity: 0.2 },
    HIGH: { color: '#dc2626', opacity: 0.15 },
    MEDIUM: { color: '#f59e0b', opacity: 0.1 }
  };

  return (
    <>
      {clusters.map((cluster, idx) => (
        <Circle
          key={`heatmap-${idx}`}
          center={[cluster.center.lat, cluster.center.lng]}
          radius={Math.min(cluster.count * 0.3, 2)}
          pathOptions={{
            color: severityColors[cluster.severity].color,
            fill: true,
            fillColor: severityColors[cluster.severity].color,
            fillOpacity: severityColors[cluster.severity].opacity,
            weight: 1.5
          }}
        >
          <Tooltip>
            <div className="text-xs text-white">
              <div className="font-bold">{cluster.count} Incident(s)</div>
              <div className="text-[9px]" style={{ color: severityColors[cluster.severity].color }}>
                {cluster.severity}
              </div>
            </div>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}

/**
 * Fleet Status Layer - Shows concentration of player positions
 */
export function FleetStatusLayer({ playerStatuses = [], visible = true }) {
  if (!visible || playerStatuses.length === 0) return null;

  // Status color coding
  const statusColors = {
    READY: '#10b981',
    ENGAGED: '#f59e0b',
    DOWN: '#dc2626',
    DISTRESS: '#a21caf',
    OFFLINE: '#6b7280'
  };

  // Group by proximity
  const fleetClusters = [];
  const processed = new Set();

  playerStatuses.forEach((player, i) => {
    if (processed.has(i) || !player.coordinates) return;

    const nearby = playerStatuses.filter((other, j) => {
      if (processed.has(j) || j === i || !other.coordinates) return false;
      const dist = Math.sqrt(
        Math.pow(player.coordinates.lat - other.coordinates.lat, 2) +
        Math.pow(player.coordinates.lng - other.coordinates.lng, 2)
      );
      return dist < 1.5;
    });

    const cluster = [player, ...nearby];
    cluster.forEach((_, idx) => processed.add(playerStatuses.indexOf(cluster[idx])));

    const dominantStatus = cluster.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {});

    const status = Object.keys(dominantStatus).sort((a, b) => dominantStatus[b] - dominantStatus[a])[0];

    fleetClusters.push({
      center: {
        lat: cluster.reduce((sum, p) => sum + p.coordinates.lat, 0) / cluster.length,
        lng: cluster.reduce((sum, p) => sum + p.coordinates.lng, 0) / cluster.length
      },
      count: cluster.length,
      status
    });
  });

  return (
    <>
      {fleetClusters.map((cluster, idx) => (
        <React.Fragment key={`fleet-${idx}`}>
          <Circle
            center={[cluster.center.lat, cluster.center.lng]}
            radius={Math.max(cluster.count * 0.2, 0.4)}
            pathOptions={{
              color: statusColors[cluster.status],
              fill: true,
              fillColor: statusColors[cluster.status],
              fillOpacity: 0.15,
              weight: 2
            }}
          >
            <Tooltip>
              <div className="text-xs text-white">
                <div className="font-bold">{cluster.count} Personnel</div>
                <div className="text-[9px]" style={{ color: statusColors[cluster.status] }}>
                  {cluster.status}
                </div>
              </div>
            </Tooltip>
          </Circle>
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Comms Coverage Layer - Shows approximate signal coverage
 */
export function CommsCoverageLayer({ visible = true }) {
  if (!visible) return null;

  const coverageZones = [
    { center: [2, -15], radius: 5, name: 'Crusader Network', strength: 0.9 },
    { center: [-5, 8], radius: 5, name: 'Microtech Network', strength: 0.95 },
    { center: [-8, 5], radius: 4, name: 'ArcCorp Network', strength: 0.85 },
    { center: [3, -12], radius: 5, name: 'Hurston Network', strength: 0.8 }
  ];

  return (
    <>
      {coverageZones.map((zone, idx) => (
        <Circle
          key={`comms-${idx}`}
          center={zone.center}
          radius={zone.radius}
          pathOptions={{
            color: '#06b6d4',
            fill: true,
            fillColor: '#06b6d4',
            fillOpacity: 0.03,
            weight: 1,
            dashArray: '4,4'
          }}
        >
          <Tooltip>
            <div className="text-xs text-white">
              <div className="font-bold">{zone.name}</div>
              <div className="text-[9px] text-cyan-400">Signal: {Math.round(zone.strength * 100)}%</div>
            </div>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}

/**
 * Space Lanes Layer - Shows main trade routes/jump corridors
 */
export function SpaceLanesLayer({ visible = true }) {
  if (!visible) return null;

  const lanes = [
    { from: [2, -15], to: [-5, 8], name: 'Crusader-Microtech Corridor' },
    { from: [-5, 8], to: [-8, 5], name: 'Microtech-ArcCorp Route' },
    { from: [-8, 5], to: [3, -12], name: 'ArcCorp-Hurston Run' },
    { from: [3, -12], to: [2, -15], name: 'Hurston-Crusader Loop' }
  ];

  return (
    <>
      {lanes.map((lane, idx) => (
        <Polyline
          key={`lane-${idx}`}
          positions={[lane.from, lane.to]}
          pathOptions={{
            color: '#8b5cf6',
            weight: 2,
            opacity: 0.3,
            dashArray: '10,5'
          }}
        >
          <Tooltip>
            <div className="text-xs text-white">
              <div className="font-bold">{lane.name}</div>
              <div className="text-[9px] text-purple-300">Primary Trade Route</div>
            </div>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}