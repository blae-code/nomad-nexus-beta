import { useState } from 'react';
import VoiceControlToolkit from '@/components/voice/VoiceControlToolkit';
import EnhancedUserContactBook from '@/components/directory/EnhancedUserContactBook';
import ActiveNetMonitor from '@/components/voice/ActiveNetMonitor';
import AISettingsPanel from '@/components/layout/AISettingsPanel';
import VoiceChannelNavigator from '@/components/comms/VoiceChannelNavigator';
import { Radio, Users, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function ContextPanel({ currentPage, user }) {
  const [activeNetExpanded, setActiveNetExpanded] = useState(true);
  const [voiceControlsExpanded, setVoiceControlsExpanded] = useState(true);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [aiSettingsExpanded, setAiSettingsExpanded] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(true);

  return (
    <TooltipProvider delayDuration={200}>
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden pb-12">
      {/* SECTION: Active Voice Nets - Always Visible */}
      <div className="border-b border-zinc-800 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setActiveNetExpanded(!activeNetExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors border-b border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-[#ea580c]" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">ACTIVE NETS</span>
              </div>
              {activeNetExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">View and join active voice networks</p>
          </TooltipContent>
        </Tooltip>

        {activeNetExpanded && (
          <div className="p-3">
            <ActiveNetMonitor />
          </div>
        )}
      </div>

      {/* SECTION: Voice Controls - Collapsible */}
      <div className="border-b border-zinc-800 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setVoiceControlsExpanded(!voiceControlsExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">VOICE CONTROLS</span>
              </div>
              {voiceControlsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Audio controls for voice communications</p>
          </TooltipContent>
        </Tooltip>

        {voiceControlsExpanded && (
          <div className="p-3">
            <VoiceControlToolkit />
          </div>
        )}
        </div>

        {/* SECTION: Voice Channels - Collapsible */}
        <div className="border-b border-zinc-800 shrink-0">
         <Tooltip>
           <TooltipTrigger asChild>
             <button
               onClick={() => setChannelsExpanded(!channelsExpanded)}
               className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
             >
               <div className="flex items-center gap-2">
                 <Radio className="w-3.5 h-3.5 text-teal-400" />
                 <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">CHANNELS</span>
               </div>
               {channelsExpanded ? (
                 <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
               ) : (
                 <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
               )}
             </button>
           </TooltipTrigger>
           <TooltipContent>
             <p className="text-xs">Voice channels organized by event</p>
           </TooltipContent>
         </Tooltip>

         {channelsExpanded && (
           <div className="p-3 max-h-64 overflow-y-auto">
             <VoiceChannelNavigator />
           </div>
         )}
        </div>

        {/* SECTION: Contacts - Scrollable */}
        <div className="flex-1 min-h-0 flex flex-col border-b border-zinc-800">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setContactsExpanded(!contactsExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors shrink-0"
            >
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">CONTACTS</span>
              </div>
              {contactsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Organization member directory</p>
          </TooltipContent>
        </Tooltip>

        {contactsExpanded && (
          <div className="flex-1 min-h-0 overflow-hidden p-3">
            <EnhancedUserContactBook />
          </div>
        )}
      </div>

      {/* SECTION: AI Settings - Collapsible */}
      <div className="border-b border-zinc-800 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setAiSettingsExpanded(!aiSettingsExpanded)}
              className="w-full px-3 py-2.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">AI FEATURES</span>
              </div>
              {aiSettingsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">AI-powered features & privacy settings</p>
          </TooltipContent>
        </Tooltip>

        {aiSettingsExpanded && (
          <div className="p-3">
            <AISettingsPanel />
          </div>
        )}
      </div>

      {/* Footer Info - Context Specific */}
      <div className="shrink-0 px-3 py-2 bg-zinc-900/80 border-t border-zinc-800">
        <div className="text-[7px] text-zinc-500 uppercase font-mono tracking-wider">
          {currentPage === 'hub' && 'COMMAND HUB'}
          {currentPage === 'mission' && 'OPERATIONS'}
          {currentPage === 'events' && 'EVENT MANAGEMENT'}
          {currentPage === 'comms' && 'COMMUNICATIONS'}
          {currentPage === 'admin' && 'ADMIN CONSOLE'}
          {!['hub', 'mission', 'events', 'comms', 'admin'].includes(currentPage) && 'NEXUS'}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}