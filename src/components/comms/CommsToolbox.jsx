import React from "react";
import { ShieldAlert, Settings2, Mic2, Ear, Users, Radio, Volume2 } from "lucide-react";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import TacticalStatusReporter from "@/components/comms/TacticalStatusReporter";
import DeviceSelector from "@/components/comms/DeviceSelector";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import NetAssistant from "@/components/comms/NetAssistant";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function CommsToolbox({ user, eventId }) {
  const [whisperMode, setWhisperMode] = React.useState(false);
  const [monitoring, setMonitoring] = React.useState(false);
  const [noiseGate, setNoiseGate] = React.useState([50]);
  const [sidetone, setSidetone] = React.useState([20]);

  return (
    <aside className="w-80 border-l border-zinc-800 bg-zinc-950 flex flex-col h-full">
       <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
             <Settings2 className="w-4 h-4" />
             <span>Comms Toolbox</span>
          </div>
       </div>
       
       <div className="flex-1 flex flex-col gap-6 p-4 overflow-hidden overflow-y-auto custom-scrollbar">
          
          {/* Critical Alerts */}
          <RescueAlertPanel />

          {/* Advanced Voice Controls */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                <Radio className="w-3 h-3" />
                <span>Signal Processing</span>
             </div>
             
             <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-sm space-y-5">
                
                {/* Noise Gate */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400 font-mono">NOISE_GATE</Label>
                      <span className="text-[10px] font-mono text-zinc-500">{noiseGate}%</span>
                   </div>
                   <Slider 
                      value={noiseGate} 
                      onValueChange={setNoiseGate} 
                      max={100} 
                      step={1} 
                      className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-800 [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:border-zinc-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" 
                   />
                </div>

                {/* Sidetone */}
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                      <Label className="text-xs text-zinc-400 font-mono">SIDETONE</Label>
                      <span className="text-[10px] font-mono text-zinc-500">{sidetone}%</span>
                   </div>
                   <Slider 
                      value={sidetone} 
                      onValueChange={setSidetone} 
                      max={100} 
                      step={1} 
                      className="[&>span:first-child]:h-1.5 [&>span:first-child]:bg-zinc-800 [&_[role=slider]]:bg-zinc-400 [&_[role=slider]]:border-zinc-500 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3" 
                   />
                </div>
                
                <Separator className="bg-zinc-800/50" />

                {/* Toggles */}
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Ear className="w-4 h-4 text-zinc-500" />
                      <div className="flex flex-col">
                         <Label className="text-xs text-zinc-300">Monitor Sub-Nets</Label>
                         <span className="text-[9px] text-zinc-600">Listen to child channels</span>
                      </div>
                   </div>
                   <Switch 
                      checked={monitoring} 
                      onCheckedChange={setMonitoring}
                      className="scale-75 data-[state=checked]:bg-emerald-600"
                   />
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Mic2 className="w-4 h-4 text-zinc-500" />
                      <div className="flex flex-col">
                         <Label className="text-xs text-zinc-300">Whisper Mode</Label>
                         <span className="text-[9px] text-zinc-600">Direct link to Commander</span>
                      </div>
                   </div>
                   <Switch 
                      checked={whisperMode} 
                      onCheckedChange={setWhisperMode}
                      className="scale-75 data-[state=checked]:bg-amber-600"
                   />
                </div>
             </div>
          </div>

          {/* AI Net Assistant */}
          {eventId && (
             <NetAssistant 
               eventId={eventId}
               onApplySuggestion={(netConfig) => {
                 console.log('Apply suggestion:', netConfig);
                 // Future: auto-create net with suggested config
               }}
             />
          )}

          {/* Device Configuration */}
          <DeviceSelector 
            onDeviceChange={(devices) => {
              localStorage.setItem('audio_devices', JSON.stringify(devices));
            }}
            onTest={() => console.log('Audio test completed')}
          />

          {/* Status Reporting */}
          {eventId && (
             <TacticalStatusReporter user={user} eventId={eventId} />
          )}

          <Separator className="bg-zinc-800" />

          {/* Projections */}
          <EventProjectionPanel user={user} compact={true} />

       </div>
    </aside>
  );
}