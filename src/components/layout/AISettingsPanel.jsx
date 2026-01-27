import { useState } from 'react';
import { AlertCircle, ChevronRight, Lock, Database } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function AISettingsPanel() {
  const [aiEnhancedAnalysis, setAiEnhancedAnalysis] = useState(false);
  const [aiTranscription, setAiTranscription] = useState(false);
  const [aiAnomalyDetection, setAiAnomalyDetection] = useState(false);
  const [aiMissionBriefing, setAiMissionBriefing] = useState(false);
  const [aiStatusInference, setAiStatusInference] = useState(false);
  const [showDataUsageDialog, setShowDataUsageDialog] = useState(false);

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

        {/* Data Privacy Notice - Enhanced */}
         <button
           onClick={() => setShowDataUsageDialog(true)}
           className="mt-3 w-full p-3 bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border-2 border-blue-700/50 hover:border-blue-600 rounded transition-all hover:from-blue-950/60 hover:to-cyan-950/60 group"
         >
           <div className="flex items-start gap-2.5">
             <div className="flex items-center gap-1.5 flex-1">
               <Database className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
               <div className="text-left">
                 <p className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Data Usage & Privacy</p>
                 <p className="text-[8px] text-blue-200/70">Click to view detailed information</p>
               </div>
             </div>
             <ChevronRight className="w-3.5 h-3.5 text-blue-400/60 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
           </div>
           <div className="mt-2 flex items-center gap-1.5 text-[8px] text-blue-300">
             <Lock className="w-3 h-3" />
             <span>Encrypted in transit and at rest</span>
           </div>
         </button>

         {/* Data Usage Dialog */}
         <Dialog open={showDataUsageDialog} onOpenChange={setShowDataUsageDialog}>
           <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[80vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle className="text-lg font-bold text-blue-400 flex items-center gap-2">
                 <Database className="w-5 h-5" />
                 AI Data Usage & Privacy
               </DialogTitle>
               <DialogDescription className="text-zinc-400">
                 How your information is used by enabled AI features
               </DialogDescription>
             </DialogHeader>

             <div className="space-y-4">
               {/* Active Features */}
               {[aiEnhancedAnalysis, aiTranscription, aiAnomalyDetection, aiMissionBriefing, aiStatusInference].some(f => f) && (
                 <div className="border-l-2 border-blue-600 pl-4 py-2">
                   <p className="text-xs font-bold text-blue-400 mb-3">🟢 ACTIVE FEATURES</p>
                   <div className="space-y-2">
                     {aiEnhancedAnalysis && (
                       <div className="text-xs bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                         <p className="font-bold text-blue-300 mb-1">Enhanced Analysis</p>
                         <p className="text-zinc-400 mb-2">Your message content and metadata are sent to AI systems for:</p>
                         <ul className="text-zinc-500 space-y-1 ml-4 list-disc">
                           <li>Sentiment analysis & tone detection</li>
                           <li>Topic extraction & categorization</li>
                           <li>Priority level inference</li>
                           <li>Keyword extraction</li>
                         </ul>
                         <p className="text-zinc-600 text-[10px] mt-2">Data: Message text, sender, timestamp, channel</p>
                       </div>
                     )}
                     {aiTranscription && (
                       <div className="text-xs bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                         <p className="font-bold text-blue-300 mb-1">Voice Transcription</p>
                         <p className="text-zinc-400 mb-2">Voice transmissions are transcribed for:</p>
                         <ul className="text-zinc-500 space-y-1 ml-4 list-disc">
                           <li>Accessibility & searchable records</li>
                           <li>Operational audit logs</li>
                           <li>Command extraction & execution</li>
                           <li>Speaker identification</li>
                         </ul>
                         <p className="text-zinc-600 text-[10px] mt-2">Data: Voice recording, duration, participants, net name</p>
                       </div>
                     )}
                     {aiAnomalyDetection && (
                       <div className="text-xs bg-zinc-900/50 p-2.5 rounded border border-zinc-800">
                         <p className="font-bold text-blue-300 mb-1">Anomaly Detection</p>
                         <p className="text-zinc-400 mb-2">Communication patterns monitored for:</p>
                         <ul className="text-zinc-500 space-y-1 ml-4 list-disc">
                           <li>Unusual activity & interference detection</li>
                           <li>Security threat identification</li>
                           <li>Network health degradation</li>
                           <li>Spam/abuse pattern recognition</li>
                         </ul>
                         <p className="text-zinc-600 text-[10px] mt-2">Data: Message frequency, sender patterns, content types</p>
                       </div>
                     )}
                     {aiMissionBriefing && (
                       <div className="text-xs bg-amber-950/30 p-2.5 rounded border border-amber-800/50">
                         <p className="font-bold text-amber-300 mb-1">⏰ Mission Briefing Gen (Planned)</p>
                         <p className="text-zinc-400 mb-2">Will generate briefs from:</p>
                         <ul className="text-zinc-500 space-y-1 ml-4 list-disc">
                           <li>Event objectives & details</li>
                           <li>Communication logs & transcripts</li>
                           <li>Participant assignments</li>
                         </ul>
                       </div>
                     )}
                     {aiStatusInference && (
                       <div className="text-xs bg-amber-950/30 p-2.5 rounded border border-amber-800/50">
                         <p className="font-bold text-amber-300 mb-1">⏰ Status Inference (Planned)</p>
                         <p className="text-zinc-400 mb-2">Will analyze voice & behavior to:</p>
                         <ul className="text-zinc-500 space-y-1 ml-4 list-disc">
                           <li>Auto-update operational status</li>
                           <li>Detect crew wellness indicators</li>
                           <li>Estimate task completion</li>
                         </ul>
                       </div>
                     )}
                   </div>
                 </div>
               )}

               {/* Privacy Guarantees */}
               <div className="border-l-2 border-emerald-600 pl-4 py-2">
                 <p className="text-xs font-bold text-emerald-400 mb-3">🔒 PRIVACY GUARANTEES</p>
                 <div className="space-y-2 text-xs text-zinc-400">
                   <div className="flex gap-2">
                     <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                     <p><span className="font-bold text-emerald-300">End-to-End Encryption:</span> All data encrypted in transit and at rest</p>
                   </div>
                   <div className="flex gap-2">
                     <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                     <p><span className="font-bold text-emerald-300">Opt-In Only:</span> Features disabled by default. You control what's enabled</p>
                   </div>
                   <div className="flex gap-2">
                     <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                     <p><span className="font-bold text-emerald-300">Data Retention:</span> AI analysis logs retained per policy settings</p>
                   </div>
                   <div className="flex gap-2">
                     <Lock className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                     <p><span className="font-bold text-emerald-300">No Third-Party:</span> Processing stays on secure infrastructure</p>
                   </div>
                 </div>
               </div>

               {/* Disabled Features Info */}
               {![aiEnhancedAnalysis, aiTranscription, aiAnomalyDetection, aiMissionBriefing, aiStatusInference].some(f => f) && (
                 <div className="border-l-2 border-zinc-700 pl-4 py-2">
                   <p className="text-xs font-bold text-zinc-400 mb-2">⚪ NO ACTIVE AI FEATURES</p>
                   <p className="text-xs text-zinc-500">All AI analysis features are currently disabled. Enable features above to start using AI-powered insights.</p>
                 </div>
               )}
             </div>
           </DialogContent>
         </Dialog>
      </div>
    </TooltipProvider>
  );
}