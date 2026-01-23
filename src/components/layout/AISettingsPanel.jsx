import React, { useState } from 'react';
import { Brain, AlertCircle, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function AISettingsPanel() {
  const [aiEnhancedAnalysis, setAiEnhancedAnalysis] = useState(false);
  const [aiTranscription, setAiTranscription] = useState(false);
  const [aiAnomalyDetection, setAiAnomalyDetection] = useState(false);
  const [aiMissionBriefing, setAiMissionBriefing] = useState(false);
  const [aiStatusInference, setAiStatusInference] = useState(false);

  const toggleFeature = (feature, setter, enabled) => {
    setter(!enabled);
  };

  const features = [
    {
      id: 'analysis',
      label: 'Enhanced Analysis',
      enabled: aiEnhancedAnalysis,
      setter: setAiEnhancedAnalysis,
      dataWarning: 'Message content and metadata are analyzed to provide insights, sentiment analysis, and topic extraction.',
      planned: false
    },
    {
      id: 'transcription',
      label: 'Voice Transcription',
      enabled: aiTranscription,
      setter: setAiTranscription,
      dataWarning: 'Voice transmissions are transcribed and stored for accessibility and audit logs.',
      planned: false
    },
    {
      id: 'anomaly',
      label: 'Anomaly Detection',
      enabled: aiAnomalyDetection,
      setter: setAiAnomalyDetection,
      dataWarning: 'Monitors communication patterns for unusual activity, interference, or security threats.',
      planned: false
    },
    {
      id: 'briefing',
      label: 'Mission Briefing Gen',
      enabled: aiMissionBriefing,
      setter: setAiMissionBriefing,
      dataWarning: 'Event details, objectives, and comms logs are summarized to generate mission briefs.',
      planned: true
    },
    {
      id: 'inference',
      label: 'Status Inference',
      enabled: aiStatusInference,
      setter: setAiStatusInference,
      dataWarning: 'Voice patterns and content are analyzed to automatically update your operational status.',
      planned: true
    }
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-2">
        {features.map(feature => (
          <Tooltip key={feature.id}>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-between p-2 bg-zinc-900/30 rounded border border-zinc-800/50 hover:border-zinc-700/50 transition-colors group">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[8px] font-mono text-zinc-400 group-hover:text-zinc-300 transition-colors uppercase truncate">
                    {feature.label}
                  </span>
                  {feature.planned && (
                    <span className="text-[7px] bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700/30 shrink-0 font-bold uppercase">
                      PLANNED
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleFeature(feature.id, feature.setter, feature.enabled)}
                  disabled={feature.planned}
                  className={cn(
                    'w-4 h-4 rounded border transition-all shrink-0 ml-2',
                    feature.enabled
                      ? 'bg-blue-600/50 border-blue-500/50 shadow-sm shadow-blue-500/20'
                      : 'bg-zinc-800/40 border-zinc-700/50 hover:border-zinc-600/50',
                    feature.planned && 'opacity-50 cursor-not-allowed'
                  )}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <div className="space-y-2">
                <p className="text-xs font-bold text-blue-400">{feature.label}</p>
                <div className="flex items-start gap-1.5 text-[10px]">
                  <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-300">{feature.dataWarning}</p>
                </div>
                {feature.planned && (
                  <p className="text-[10px] text-zinc-400 italic">⏰ Feature planned for future release</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}

        {/* Data Privacy Notice */}
        <div className="mt-3 p-2 bg-zinc-900/50 border border-zinc-800/50 rounded">
          <p className="text-[7px] text-zinc-500 uppercase font-mono tracking-wider leading-tight">
            📋 All AI processing respects your privacy settings. Data is encrypted in transit and at rest.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}