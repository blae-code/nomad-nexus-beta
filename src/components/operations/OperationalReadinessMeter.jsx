/**
 * OperationalReadinessMeter: Single authoritative readiness indicator (0-100)
 * 
 * Hard requirements for FOCUSED ops:
 * - Comms initialized (all required nets present)
 * - Squads/roles assigned
 * - Objectives defined
 * - Map has rally + extraction
 * - Safety/ROE acknowledged
 * 
 * CASUAL ops: relaxed requirements
 */

import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OperationalReadinessMeter({
  event,
  eventType = 'casual', // 'casual' | 'focused'
  commsNets = [],
  assignedSquads = [],
  objectives = [],
  mapMarkers = [],
  safetyAcknowledged = false,
  className = ''
}) {
  // Calculate readiness based on requirements
  const readiness = useMemo(() => {
    const checks = {};
    const weights = eventType === 'focused' ? { all: 1 } : { all: 0.5 };

    // 1. Comms initialized (20 points)
    const hasCommand = commsNets.some(n => n.type === 'command' || n.code === 'COMMAND');
    const hasGeneral = commsNets.some(n => n.type === 'general' || n.code === 'GENERAL');
    checks.comms = {
      name: 'COMMS',
      weight: 20,
      passed: eventType === 'focused' ? (hasCommand && hasGeneral) : hasGeneral || commsNets.length > 0,
      details: `${commsNets.length} nets provisioned`
    };

    // 2. Squads/roles assigned (25 points)
    checks.squads = {
      name: 'SQUADS',
      weight: 25,
      passed: assignedSquads.length > 0 || eventType === 'casual',
      details: `${assignedSquads.length} squad${assignedSquads.length !== 1 ? 's' : ''} assigned`
    };

    // 3. Objectives defined (20 points)
    checks.objectives = {
      name: 'OBJECTIVES',
      weight: 20,
      passed: objectives.length > 0 || eventType === 'casual',
      details: `${objectives.length} objective${objectives.length !== 1 ? 's' : ''}`
    };

    // 4. Map markers (rally + extraction) (20 points)
    const hasRally = mapMarkers.some(m => m.type === 'rally' || m.label?.toLowerCase().includes('rally'));
    const hasExtraction = mapMarkers.some(m => m.type === 'extraction' || m.label?.toLowerCase().includes('extract'));
    checks.map = {
      name: 'MAP',
      weight: 20,
      passed: (hasRally && hasExtraction) || eventType === 'casual',
      details: `${mapMarkers.length} marker${mapMarkers.length !== 1 ? 's' : ''} (rally: ${hasRally ? '✓' : '✗'}, extract: ${hasExtraction ? '✓' : '✗'})`
    };

    // 5. Safety/ROE acknowledged (15 points)
    checks.safety = {
      name: 'SAFETY',
      weight: 15,
      passed: safetyAcknowledged || eventType === 'casual',
      details: safetyAcknowledged ? 'ACKNOWLEDGED' : 'PENDING'
    };

    // Calculate total
    const totalWeight = Object.values(checks).reduce((sum, c) => sum + c.weight, 0);
    const earnedPoints = Object.values(checks)
      .filter(c => c.passed)
      .reduce((sum, c) => sum + c.weight, 0);
    
    const score = Math.round((earnedPoints / totalWeight) * 100);

    return {
      score,
      checks,
      allPassed: Object.values(checks).every(c => c.passed),
      focusedReady: eventType === 'focused' && Object.values(checks).every(c => c.passed),
      casualReady: eventType === 'casual' && score >= 30 // Casual needs less rigor
    };
  }, [eventType, commsNets, assignedSquads, objectives, mapMarkers, safetyAcknowledged]);

  // Color based on readiness
  const getColor = () => {
    if (readiness.score >= 80) return 'from-emerald-600 to-green-500';
    if (readiness.score >= 60) return 'from-amber-600 to-yellow-500';
    if (readiness.score >= 40) return 'from-orange-600 to-amber-500';
    return 'from-red-600 to-orange-500';
  };

  const getStatus = () => {
    if (eventType === 'focused' && readiness.focusedReady) return 'READY FOR LAUNCH';
    if (eventType === 'casual' && readiness.casualReady) return 'READY TO GO';
    if (readiness.score >= 60) return 'APPROACHING READINESS';
    return 'INITIALIZATION PHASE';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-mono uppercase text-zinc-500">Readiness</p>
          <p className="text-xs font-bold text-white">{readiness.score}%</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 bg-gradient-to-r',
              getColor()
            )}
            style={{ width: `${readiness.score}%` }}
          />
        </div>

        {/* Status label */}
        <p className={cn(
          'text-[9px] font-mono uppercase tracking-wider',
          readiness.score >= 60 ? 'text-emerald-400' : 'text-amber-400'
        )}>
          {getStatus()}
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5 border-t border-zinc-800 pt-3">
        {Object.entries(readiness.checks).map(([key, check]) => (
          <div key={key} className="flex items-start gap-2">
            <div className="mt-0.5">
              {check.passed ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-zinc-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[9px] font-mono font-bold',
                check.passed ? 'text-zinc-300' : 'text-zinc-600'
              )}>
                {check.name}
              </p>
              <p className="text-[8px] text-zinc-500">{check.details}</p>
            </div>
            {eventType === 'focused' && !check.passed && (
              <Zap className="w-3 h-3 text-red-500 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Required vs optional note */}
      {eventType === 'focused' && !readiness.focusedReady && (
        <div className="text-[8px] text-orange-400 font-mono italic pt-2 border-t border-zinc-800">
          FOCUSED ops require all criteria. Complete marked items.
        </div>
      )}
    </div>
  );
}