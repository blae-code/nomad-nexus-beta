/**
 * SIM Mode Simulator: Creates realistic but fake participant data
 * Ensures SIM mode feels "alive" without requiring LiveKit
 */

export function generateSimulatedParticipants(netCode, config = {}) {
  const { participant_count_range = [2, 8], activity_variance = 0.3 } = config;
  
  const [minCount, maxCount] = participant_count_range;
  const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
  
  const callsigns = [
    'Viper', 'Shadow', 'Reaper', 'Ghost', 'Wraith',
    'Phantom', 'Spectre', 'Rogue', 'Titan', 'Phoenix',
    'Maverick', 'Blaze', 'Storm', 'Apex', 'Nexus'
  ];
  
  const participants = [];
  const now = Date.now();
  
  for (let i = 0; i < count; i++) {
    const joinOffset = Math.floor(Math.random() * 30000); // Joined within last 30s
    participants.push({
      identity: `sim-${netCode}-${i}`,
      name: callsigns[i % callsigns.length] + (i > 14 ? ` ${Math.floor(i / 15)}` : ''),
      joinedAt: new Date(now - joinOffset),
      isLocal: i === 0, // First one is "you"
      lastActivityAt: new Date(now - Math.floor(Math.random() * 5000)), // Activity in last 5s
      isMuted: Math.random() < 0.2, // 20% chance muted
      isSpeaking: Math.random() < activity_variance
    });
  }
  
  return participants;
}

export function getSimulatedRoomStatus(netCode, isActive = true) {
  return {
    roomName: `sim-${netCode}`,
    isConnected: isActive,
    participantCount: Math.floor(Math.random() * 7) + 2,
    isRecording: Math.random() < 0.1, // 10% chance
    maxParticipants: 16,
    connectionQuality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)],
    lastUpdate: new Date()
  };
}

export function simulateParticipantChange() {
  // Random: join, leave, or nothing
  return Math.random() < 0.3 ? 
    (Math.random() < 0.5 ? 'join' : 'leave') : 
    null;
}