/**
 * Tactical AI Service — Real-time tactical intelligence and predictive analysis
 * Analyzes comms, operations, diagnostics, and player positions to provide:
 * - Threat assessments
 * - Unit placement suggestions
 * - Movement predictions
 * - Risk zone identification
 */

const AI_UPDATE_INTERVAL = 5000; // 5 seconds
const THREAT_DECAY_TIME = 60000; // 1 minute
const HIGH_ACTIVITY_THRESHOLD = 5; // messages per minute

/**
 * Analyze communications for tactical intelligence
 */
function analyzeCommsActivity(events, timeWindowMs = 300000) {
  const now = Date.now();
  const recentEvents = events.filter((e) => now - new Date(e.createdAt).getTime() <= timeWindowMs);

  const hotspots = {};
  const threatKeywords = ['hostile', 'enemy', 'contact', 'engaged', 'under fire', 'taking fire', 'distress', 'ambush'];
  const criticalEvents = ['CEASE_FIRE', 'CHECK_FIRE', 'WEAPON_DRY', 'DISTRESS', 'CONTACT'];

  for (const event of recentEvents) {
    const content = event.payload?.content || event.eventType || '';
    const location = event.payload?.location || event.channelId;

    if (!location) continue;

    if (!hotspots[location]) {
      hotspots[location] = {
        location,
        activityLevel: 0,
        threatLevel: 0,
        lastActivity: event.createdAt,
        events: [],
      };
    }

    hotspots[location].activityLevel += 1;
    hotspots[location].events.push(event);

    // Threat detection
    const contentLower = String(content).toLowerCase();
    const isThreatKeyword = threatKeywords.some((kw) => contentLower.includes(kw));
    const isCriticalEvent = criticalEvents.includes(event.eventType);

    if (isThreatKeyword || isCriticalEvent) {
      hotspots[location].threatLevel += isCriticalEvent ? 3 : 1;
    }
  }

  return Object.values(hotspots);
}

/**
 * Predict enemy movement based on historical patterns
 */
function predictEnemyMovements(hotspots, playerStatuses) {
  const predictions = [];

  for (const hotspot of hotspots) {
    if (hotspot.threatLevel < 2) continue;

    const timeSinceActivity = Date.now() - new Date(hotspot.lastActivity).getTime();
    if (timeSinceActivity > THREAT_DECAY_TIME) continue;

    // Find nearby player positions
    const nearbyPlayers = playerStatuses.filter((status) => {
      // Simple distance check (would need proper implementation)
      return status.location?.includes(hotspot.location);
    });

    predictions.push({
      id: `pred-${hotspot.location}-${Date.now()}`,
      location: hotspot.location,
      threatLevel: Math.min(hotspot.threatLevel / 5, 1),
      confidence: Math.max(0.4, Math.min(0.95, hotspot.activityLevel / 10)),
      direction: 'unknown',
      estimatedTime: '2-5min',
      nearbyFriendlies: nearbyPlayers.length,
    });
  }

  return predictions;
}

/**
 * Suggest optimal unit placements
 */
function suggestUnitPlacements(operations, playerStatuses, threats) {
  const suggestions = [];

  for (const operation of operations) {
    if (!operation.objectives || operation.status !== 'active') continue;

    for (const objective of operation.objectives) {
      const objectiveLocation = objective.location || objective.text;
      
      // Count nearby units
      const nearbyUnits = playerStatuses.filter((status) => {
        return status.status === 'READY' || status.status === 'ENGAGED';
      });

      // Check if location is threatened
      const nearbyThreats = threats.filter((threat) =>
        threat.location?.includes(objectiveLocation)
      );

      if (nearbyThreats.length > 0 && nearbyUnits.length < 3) {
        suggestions.push({
          id: `suggest-${objective.id || objectiveLocation}-${Date.now()}`,
          type: 'reinforcement',
          location: objectiveLocation,
          priority: nearbyThreats[0]?.threatLevel || 0.5,
          reason: 'Objective under threat - reinforcements recommended',
          suggestedUnits: Math.max(3 - nearbyUnits.length, 1),
        });
      }
    }
  }

  return suggestions;
}

/**
 * Identify risk zones
 */
function identifyRiskZones(hotspots, threats, controlZones) {
  const riskZones = [];

  // High activity areas
  for (const hotspot of hotspots) {
    if (hotspot.activityLevel >= HIGH_ACTIVITY_THRESHOLD) {
      riskZones.push({
        id: `risk-activity-${hotspot.location}-${Date.now()}`,
        location: hotspot.location,
        type: 'high_activity',
        level: 'warning',
        radius: 50,
        label: 'High Comms Activity',
      });
    }
  }

  // Threat zones
  for (const threat of threats) {
    if (threat.threatLevel >= 0.6) {
      riskZones.push({
        id: `risk-threat-${threat.location}-${Date.now()}`,
        location: threat.location,
        type: 'threat',
        level: threat.threatLevel >= 0.8 ? 'critical' : 'danger',
        radius: 75,
        label: `Threat Level ${Math.round(threat.threatLevel * 100)}%`,
      });
    }
  }

  // Control zone conflicts
  const now = Date.now();
  for (const zone of controlZones) {
    if (zone.isContested || (zone.expiresAt && new Date(zone.expiresAt).getTime() - now < 120000)) {
      riskZones.push({
        id: `risk-contested-${zone.id}`,
        location: zone.center,
        type: 'contested',
        level: 'warning',
        radius: zone.radius || 60,
        label: zone.isContested ? 'Contested Zone' : 'Zone Expiring',
      });
    }
  }

  return riskZones;
}

/**
 * Generate threat assessment summary
 */
function generateThreatAssessment(hotspots, threats, riskZones, playerStatuses) {
  const activeThreats = threats.filter((t) => t.threatLevel >= 0.5).length;
  const criticalRisks = riskZones.filter((r) => r.level === 'critical').length;
  const readyUnits = playerStatuses.filter((s) => s.status === 'READY').length;
  const engagedUnits = playerStatuses.filter((s) => s.status === 'ENGAGED').length;

  let overallThreat = 'LOW';
  if (activeThreats >= 3 || criticalRisks >= 2) {
    overallThreat = 'CRITICAL';
  } else if (activeThreats >= 2 || criticalRisks >= 1) {
    overallThreat = 'HIGH';
  } else if (activeThreats >= 1 || riskZones.length >= 3) {
    overallThreat = 'MODERATE';
  }

  return {
    overallThreat,
    activeThreats,
    criticalRisks,
    totalRiskZones: riskZones.length,
    readyUnits,
    engagedUnits,
    recommendations: generateRecommendations(overallThreat, readyUnits, engagedUnits, activeThreats),
  };
}

/**
 * Generate tactical recommendations
 */
function generateRecommendations(threatLevel, readyUnits, engagedUnits, activeThreats) {
  const recommendations = [];

  if (threatLevel === 'CRITICAL' || threatLevel === 'HIGH') {
    recommendations.push('Alert all units to elevated threat condition');
    if (readyUnits < 3) {
      recommendations.push('Insufficient ready units - request reinforcements');
    }
  }

  if (engagedUnits > readyUnits && readyUnits > 0) {
    recommendations.push('More units engaged than in reserve - consider fallback positions');
  }

  if (activeThreats >= 2 && readyUnits >= 4) {
    recommendations.push('Multiple threats detected - recommend unit redistribution');
  }

  if (recommendations.length === 0) {
    recommendations.push('Tactical situation stable - maintain current posture');
  }

  return recommendations;
}

/**
 * Main analysis function - combines all tactical intelligence
 */
export function analyzeTacticalSituation({
  events = [],
  operations = [],
  playerStatuses = [],
  controlZones = [],
}) {
  const hotspots = analyzeCommsActivity(events);
  const threats = predictEnemyMovements(hotspots, playerStatuses);
  const placements = suggestUnitPlacements(operations, playerStatuses, threats);
  const riskZones = identifyRiskZones(hotspots, threats, controlZones);
  const assessment = generateThreatAssessment(hotspots, threats, riskZones, playerStatuses);

  return {
    timestamp: Date.now(),
    hotspots,
    threats,
    placements,
    riskZones,
    assessment,
  };
}

/**
 * Subscribable tactical AI state
 */
let currentAnalysis = null;
let subscribers = [];

export function subscribeToTacticalAI(callback) {
  subscribers.push(callback);
  if (currentAnalysis) {
    callback(currentAnalysis);
  }
  return () => {
    subscribers = subscribers.filter((cb) => cb !== callback);
  };
}

export function updateTacticalAI(analysisInput) {
  currentAnalysis = analyzeTacticalSituation(analysisInput);
  subscribers.forEach((callback) => callback(currentAnalysis));
  return currentAnalysis;
}

export function getCurrentTacticalAnalysis() {
  return currentAnalysis;
}