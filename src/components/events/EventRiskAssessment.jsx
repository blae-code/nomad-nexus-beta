import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Loader2, Shield } from 'lucide-react';

export default function EventRiskAssessment({ event }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    generateRiskAssessment();
  }, [event?.id]);

  const generateRiskAssessment = async () => {
    setLoading(true);
    try {
      const events = await base44.entities.Event.list('-start_time', 50);
      const historicalEvents = events.filter((e) => e.event_type === event.event_type).slice(0, 10);

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Perform a comprehensive risk assessment for this Star Citizen operation:

        Operation Name: ${event.title}
        Type: ${event.event_type}
        Priority: ${event.priority}
        Location: ${event.location || 'Unknown'}
        Start Time: ${new Date(event.start_time).toLocaleString()}
        Participants: ${event.assigned_user_ids?.length || 0}
        Description: ${event.description || 'N/A'}

        Historical Context: ${historicalEvents.length} similar operations executed

        Analyze and identify:
        1. Mission-specific risks (location hazards, faction hostility, environmental factors)
        2. Operational risks (participant coordination, comms reliability, asset availability)
        3. Personnel risks (skill gaps, fatigue factors, training requirements)
        4. Timeline risks (complexity vs. available time)
        5. Resource risks (asset availability, logistics, support)

        Provide risk level (LOW/MEDIUM/HIGH/CRITICAL) and specific mitigation strategies.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_risk_level: { type: 'string' },
            risk_score: { type: 'number' },
            mission_risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string' }, mitigation: { type: 'string' } } } },
            operational_risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string' }, mitigation: { type: 'string' } } } },
            personnel_risks: { type: 'array', items: { type: 'object', properties: { risk: { type: 'string' }, severity: { type: 'string' }, mitigation: { type: 'string' } } } },
            critical_actions: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setAssessment(response);
    } catch (error) {
      console.error('Failed to generate risk assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const runThreatScan = async () => {
    if (!event?.id) return;
    setScanLoading(true);
    try {
      const response = await base44.functions.invoke('detectCommsAnomalies', { eventId: event.id });
      setScanResult(response?.data?.analysis || null);
    } catch (error) {
      console.error('Threat scan failed:', error);
      setScanResult(null);
    } finally {
      setScanLoading(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      LOW: 'bg-green-950/30 border-green-600/50 text-green-400',
      MEDIUM: 'bg-yellow-950/30 border-yellow-600/50 text-yellow-400',
      HIGH: 'bg-orange-950/30 border-orange-600/50 text-orange-400',
      CRITICAL: 'bg-red-950/30 border-red-600/50 text-red-400',
    };
    return colors[level] || colors.MEDIUM;
  };

  const getRiskIcon = (level) => {
    const icons = {
      LOW: '✓',
      MEDIUM: '⚠',
      HIGH: '⚠',
      CRITICAL: '✕',
    };
    return icons[level];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
        <span className="text-zinc-400">Analyzing operation risks...</span>
      </div>
    );
  }

  if (!assessment) {
    return <div className="text-center py-8 text-zinc-500 text-sm">Unable to generate risk assessment</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-zinc-500">AI Risk Suite</h3>
        <button
          onClick={runThreatScan}
          className="text-xs px-3 py-1 border border-zinc-700 rounded text-zinc-300 hover:border-orange-500/50"
          disabled={scanLoading}
        >
          {scanLoading ? 'Scanning...' : 'Run Threat Scan'}
        </button>
      </div>
      {/* Overall Risk */}
      <div className={`p-6 border rounded flex items-center justify-between ${getRiskColor(assessment.overall_risk_level)}`}>
        <div>
          <div className="text-xs text-gray-300 mb-1">OVERALL RISK LEVEL</div>
          <div className="text-3xl font-black">{assessment.overall_risk_level}</div>
        </div>
        <div className="text-6xl opacity-30">{getRiskIcon(assessment.overall_risk_level)}</div>
      </div>

      {/* Risk Score Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">Risk Score</span>
          <span className="font-bold text-white">{Math.round(assessment.risk_score)}/10</span>
        </div>
        <div className="w-full bg-zinc-800 rounded h-3 overflow-hidden">
          <div
            className={`h-full transition ${
              assessment.risk_score >= 8
                ? 'bg-red-600'
                : assessment.risk_score >= 6
                  ? 'bg-orange-600'
                  : assessment.risk_score >= 4
                    ? 'bg-yellow-600'
                    : 'bg-green-600'
            }`}
            style={{ width: `${(assessment.risk_score / 10) * 100}%` }}
          />
        </div>
      </div>

      {/* Mission Risks */}
      {assessment.mission_risks?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-orange-400 uppercase flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Mission Risks
          </h4>
          <div className="space-y-2">
            {assessment.mission_risks.map((item, idx) => (
              <div key={idx} className="p-3 bg-orange-950/30 border border-orange-600/30 rounded text-sm space-y-1">
                <div className="font-semibold text-orange-300">{item.risk}</div>
                <div className="text-xs text-orange-200">Severity: {item.severity}</div>
                <div className="text-xs text-orange-100">→ {item.mitigation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Risks */}
      {assessment.operational_risks?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-yellow-400 uppercase">Operational Risks</h4>
          <div className="space-y-2">
            {assessment.operational_risks.map((item, idx) => (
              <div key={idx} className="p-3 bg-yellow-950/30 border border-yellow-600/30 rounded text-sm space-y-1">
                <div className="font-semibold text-yellow-300">{item.risk}</div>
                <div className="text-xs text-yellow-200">Severity: {item.severity}</div>
                <div className="text-xs text-yellow-100">→ {item.mitigation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personnel Risks */}
      {assessment.personnel_risks?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-blue-400 uppercase">Personnel Risks</h4>
          <div className="space-y-2">
            {assessment.personnel_risks.map((item, idx) => (
              <div key={idx} className="p-3 bg-blue-950/30 border border-blue-600/30 rounded text-sm space-y-1">
                <div className="font-semibold text-blue-300">{item.risk}</div>
                <div className="text-xs text-blue-200">Severity: {item.severity}</div>
                <div className="text-xs text-blue-100">→ {item.mitigation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Actions */}
      {assessment.critical_actions?.length > 0 && (
        <div className="p-4 bg-red-950/30 border border-red-600/50 rounded space-y-2">
          <h4 className="text-sm font-bold text-red-400 uppercase">Critical Pre-Operation Actions</h4>
          <ul className="space-y-1">
            {assessment.critical_actions.map((action, idx) => (
              <li key={idx} className="text-xs text-red-300 flex items-start gap-2">
                <span className="mt-1 flex-shrink-0">→</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {scanResult && (
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Predictive Threat Scan</div>
          <div className="text-sm text-zinc-300">{scanResult.summary}</div>
          {scanResult.anomalies?.length > 0 && (
            <div className="space-y-2">
              {scanResult.anomalies.map((item, idx) => (
                <div key={idx} className="text-xs text-zinc-300 border border-zinc-700/50 rounded p-2">
                  <div className="text-[10px] text-orange-300 uppercase">{item.severity} • {item.type}</div>
                  <div>{item.description}</div>
                  {item.recommended_action && (
                    <div className="text-[10px] text-zinc-500 mt-1">Action: {item.recommended_action}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
