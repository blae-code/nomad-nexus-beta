import { useState, useEffect } from 'react';

/**
 * useDutyLens: Manages duty lens toggle (AUTO/COMMAND/SQUAD)
 * Determines which lens is active based on connected net or user override
 */
export function useDutyLens(connectedNetId = null, userSquadId = null) {
  const [lens, setLens] = useState('AUTO');
  const [effectiveLens, setEffectiveLens] = useState('AUTO');

  // Auto-detect lens based on connected net
  useEffect(() => {
    if (lens === 'AUTO') {
      // If connected to a command net (code starting with 'CMD'), switch to COMMAND
      // Otherwise use SQUAD if user has squad assignment
      if (connectedNetId?.includes('command')) {
        setEffectiveLens('COMMAND');
      } else if (userSquadId) {
        setEffectiveLens('SQUAD');
      } else {
        setEffectiveLens('COMMAND');
      }
    } else {
      setEffectiveLens(lens);
    }
  }, [lens, connectedNetId, userSquadId]);

  return {
    lens,
    setLens,
    effectiveLens,
    // Returns which actions and edges should be emphasized
    emphasizedActions: {
      AUTO: [...getCommandActions(), ...getSquadActions()],
      COMMAND: getCommandActions(),
      SQUAD: getSquadActions()
    }[effectiveLens]
  };
}

function getCommandActions() {
  return [
    'manage_priority',
    'broadcast',
    'tactical_command',
    'wing_coordination'
  ];
}

function getSquadActions() {
  return [
    'squad_whisper',
    'squad_status',
    'rally_point'
  ];
}