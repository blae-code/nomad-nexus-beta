import React, { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Radio, Activity, Zap, Headphones, Volume2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AudioControls({ onStateChange, room, defaultMode = "PTT", isFocused = false }) {
  const [mode, setMode] = useState(defaultMode); // 'OPEN', 'PTT'
  const [isMuted, setIsMuted] = useState(false);
  const [isPTTPressed, setIsPTTPressed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Device states
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);
  const [selectedMic, setSelectedMic] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  
  // Audio processing
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [voiceActivityDetection, setVoiceActivityDetection] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);

  // Enumerate devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        
        setAudioInputDevices(audioInputs);
        setAudioOutputDevices(audioOutputs);
        
        // Set defaults if not already set
        if (!selectedMic && audioInputs.length > 0) {
          setSelectedMic(audioInputs[0].deviceId);
        }
        if (!selectedOutput && audioOutputs.length > 0) {
          setSelectedOutput(audioOutputs[0].deviceId);
        }
      } catch (err) {
        console.error('[AUDIO] Device enumeration failed:', err);
      }
    };

    getDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, []);

  // Apply device selection to LiveKit room
  useEffect(() => {
    if (!room || !selectedMic) return;
    
    const applyDevices = async () => {
      try {
        // Switch microphone
        await room.switchActiveDevice('audioinput', selectedMic);
        console.log('[AUDIO] Switched to mic:', selectedMic);
      } catch (err) {
        console.error('[AUDIO] Failed to switch mic:', err);
      }
    };

    applyDevices();
  }, [room, selectedMic]);

  // Apply output device (where supported)
  useEffect(() => {
    if (!selectedOutput) return;
    
    const applyOutputDevice = async () => {
      try {
        // Set sink ID on all audio elements (where supported)
        const audioElements = document.querySelectorAll('audio');
        for (const element of audioElements) {
          if (typeof element.setSinkId === 'function') {
            await element.setSinkId(selectedOutput);
            console.log('[AUDIO] Set output device:', selectedOutput);
          }
        }
      } catch (err) {
        console.error('[AUDIO] Failed to set output device:', err);
      }
    };

    applyOutputDevice();
  }, [selectedOutput]);

  // Calculate transmission state
  const isTransmitting = !isMuted && (mode === 'OPEN' || (mode === 'PTT' && isPTTPressed));

  // Status color logic
  const statusColor = isTransmitting 
    ? "bg-green-500 text-green-500" 
    : (mode === 'PTT' && !isMuted) 
      ? "bg-orange-600 text-orange-600" 
      : "bg-zinc-600 text-zinc-600";

  const statusLabel = isTransmitting
    ? "TRANSMITTING"
    : (mode === 'PTT' && !isMuted)
      ? "PTT READY"
      : "MUTED";

  // Keyboard listener for PTT (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && mode === 'PTT' && !e.repeat && !isMuted) {
        // Prevent scrolling if not focusing an input
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            setIsPTTPressed(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space" && mode === 'PTT') {
         setIsPTTPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, isMuted]);

  // Notify parent of state changes for roster updates
  useEffect(() => {
    onStateChange?.({ 
      mode, 
      isMuted, 
      isTransmitting,
      echoCancellation,
      noiseSuppression,
      voiceActivityDetection,
      autoGainControl,
      selectedMic,
      selectedOutput
    });
  }, [mode, isMuted, isTransmitting, echoCancellation, noiseSuppression, voiceActivityDetection, autoGainControl, selectedMic, selectedOutput, onStateChange]);

  // Fast mute with M key
  useEffect(() => {
    const handleMuteKey = (e) => {
      if (e.key === 'm' || e.key === 'M') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setIsMuted(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleMuteKey);
    return () => window.removeEventListener('keydown', handleMuteKey);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-4 gap-4">
       {/* Mic Hot Indicator */}
       {isTransmitting && (
         <div className="w-full px-4 py-2 bg-red-500 text-white text-center font-black uppercase tracking-[0.3em] text-xs animate-pulse rounded">
           🔴 MICROPHONE LIVE
         </div>
       )}

       <div className="relative w-40 h-40 flex items-center justify-center select-none">
          
          {/* Status Ring */}
          <div className={cn(
             "absolute inset-0 rounded-full border-[6px] transition-all duration-500",
             isMuted ? "border-zinc-800 opacity-30" : 
             isTransmitting ? "border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
             mode === 'PTT' ? "border-orange-500/30" : "border-emerald-500/30"
          )} />

          {/* Mode Toggle Button */}
          <button
             onClick={() => setMode(m => m === 'PTT' ? 'OPEN' : 'PTT')}
             className={cn(
                "absolute -top-3 px-3 py-0.5 rounded-full border bg-zinc-950 text-[10px] font-black tracking-widest transition-all z-10 hover:scale-105 flex items-center gap-2",
                mode === 'PTT' ? "border-orange-900 text-orange-500 hover:border-orange-500" : "border-emerald-900 text-emerald-500 hover:border-emerald-500"
             )}
          >
             {mode === 'PTT' ? <Radio className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
             {mode}
          </button>

          {/* Center Button */}
          <button
             onClick={() => setIsMuted(!isMuted)}
             className={cn(
                "w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-200 z-0 group active:scale-95 border-4",
                isMuted 
                   ? "bg-zinc-900/80 border-zinc-800 text-zinc-600" 
                   : "bg-zinc-900 border-zinc-700 text-white hover:border-zinc-500"
             )}
          >
             {isMuted ? (
                <MicOff className="w-8 h-8 mb-1 opacity-50" />
             ) : (
                <Mic className={cn("w-8 h-8 mb-1", isTransmitting ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "")} />
             )}
             <span className={cn("text-[9px] font-black uppercase tracking-widest", isMuted ? "opacity-50" : "")}>
                {isMuted ? "MUTED" : isTransmitting ? "ON AIR" : "READY"}
             </span>
          </button>
          
          {/* PTT Instruction */}
          <div className="absolute -bottom-8 text-center w-full">
             {mode === 'PTT' && !isMuted && (
                <span className={cn("text-[9px] font-mono uppercase tracking-wider", isPTTPressed ? "text-emerald-500 font-bold" : "text-zinc-600")}>
                   {isPTTPressed ? "TRANSMITTING" : "HOLD [SPACE]"}
                </span>
             )}
          </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 items-center">
          <Button 
           variant="outline" 
           size="sm" 
           onClick={() => setIsMuted(!isMuted)}
           className={cn(
             "font-mono font-bold",
             isMuted ? "bg-red-950 border-red-900 text-red-400 hover:bg-red-900" : "border-zinc-700"
           )}
          >
           {isMuted ? <MicOff className="w-3 h-3 mr-1" /> : <Mic className="w-3 h-3 mr-1" />}
           {isMuted ? "UNMUTE [M]" : "MUTE [M]"}
          </Button>

          <Button 
           variant="ghost" 
           size="sm" 
           onClick={() => setShowAdvanced(!showAdvanced)}
           className="font-mono text-xs text-zinc-500 hover:text-zinc-300"
          >
           {showAdvanced ? "HIDE" : "DEVICES"}
          </Button>
          </div>

          {/* Advanced Controls */}
          {showAdvanced && (
          <div className="w-full space-y-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-sm">
           <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
             <Shield className="w-3 h-3" />
             Audio Device & Processing
           </div>

           {/* Microphone Selection */}
           <div className="space-y-1.5">
             <Label className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
               <Mic className="w-3 h-3" />
               Input Device
             </Label>
             <Select value={selectedMic} onValueChange={setSelectedMic}>
               <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                 <SelectValue placeholder="Select microphone" />
               </SelectTrigger>
               <SelectContent>
                 {audioInputDevices.map(device => (
                   <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs font-mono">
                     {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
           </div>

           {/* Output Selection */}
           {audioOutputDevices.length > 0 && typeof HTMLMediaElement.prototype.setSinkId !== 'undefined' && (
             <div className="space-y-1.5">
               <Label className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                 <Headphones className="w-3 h-3" />
                 Output Device
               </Label>
               <Select value={selectedOutput} onValueChange={setSelectedOutput}>
                 <SelectTrigger className="h-8 text-xs font-mono bg-zinc-900 border-zinc-800">
                   <SelectValue placeholder="Select output" />
                 </SelectTrigger>
                 <SelectContent>
                   {audioOutputDevices.map(device => (
                     <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs font-mono">
                       {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           )}

           {/* Audio Processing */}
           <div className="space-y-2 pt-2 border-t border-zinc-800">
             <div className="flex items-center justify-between">
               <Label className="text-[9px] text-zinc-400 uppercase tracking-wider">Echo Cancellation</Label>
               <Switch checked={echoCancellation} onCheckedChange={setEchoCancellation} />
             </div>
             <div className="flex items-center justify-between">
               <Label className="text-[9px] text-zinc-400 uppercase tracking-wider">Noise Suppression</Label>
               <Switch checked={noiseSuppression} onCheckedChange={setNoiseSuppression} />
             </div>
             <div className="flex items-center justify-between">
               <Label className="text-[9px] text-zinc-400 uppercase tracking-wider">Voice Activity Detection</Label>
               <Switch checked={voiceActivityDetection} onCheckedChange={setVoiceActivityDetection} />
             </div>
             <div className="flex items-center justify-between">
               <Label className="text-[9px] text-zinc-400 uppercase tracking-wider">Auto Gain Control</Label>
               <Switch checked={autoGainControl} onCheckedChange={setAutoGainControl} />
             </div>
           </div>
          </div>
          )}
          </div>
          );
          }