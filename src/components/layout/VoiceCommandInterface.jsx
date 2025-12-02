import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Activity } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function VoiceCommandInterface() {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [lastCommand, setLastCommand] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const instance = new SpeechRecognition();
        instance.continuous = false;
        instance.lang = 'en-US';
        instance.interimResults = false;
        instance.maxAlternatives = 1;
        
        instance.onstart = () => setIsListening(true);
        instance.onend = () => setIsListening(false);
        instance.onerror = (event) => {
           console.error("Voice error:", event.error);
           setIsListening(false);
        };

        instance.onresult = (event) => {
          const command = event.results[0][0].transcript.toLowerCase().trim();
          setLastCommand(command);
          processCommand(command);
        };

        setRecognition(instance);
        setIsSupported(true);
      }
    }
  }, []);

  const processCommand = (cmd) => {
      console.log("Voice Command:", cmd);
      
      // "Go to Comms"
      if (cmd.includes('comms') || cmd.includes('go to comms')) {
          toast.success("Voice Command: Navigating to Comms");
          window.location.href = createPageUrl('CommsConsole');
      } 
      // "Rescue Alert"
      else if (cmd.includes('rescue') || cmd.includes('alert')) {
          toast.success("Voice Command: Opening Rescue Module");
          window.location.href = createPageUrl('Rescue');
      } 
      // "Open Events"
      else if (cmd.includes('event') || cmd.includes('open events')) {
          toast.success("Voice Command: Opening Events");
          window.location.href = createPageUrl('Events');
      }
      else {
          toast("Command not recognized: " + cmd);
      }
  };

  const toggleListening = useCallback(() => {
      if (!recognition) return;
      
      if (isListening) {
          recognition.stop();
      } else {
          try {
            recognition.start();
          } catch (e) {
            // Handle case where it's already started but state didn't update
            recognition.stop();
          }
      }
  }, [isListening, recognition]);

  // Keyboard Shortcut: Ctrl + Space
  useEffect(() => {
      const handleKeyDown = (e) => {
          if (e.ctrlKey && e.code === 'Space') {
              e.preventDefault(); // Prevent scrolling
              toggleListening();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening]);

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
       {/* Visual Feedback Ring */}
       {isListening && (
         <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
       )}
       
       <button
         onClick={toggleListening}
         className={cn(
           "relative w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all duration-200 shadow-lg backdrop-blur-sm",
           isListening 
             ? "bg-red-600 border-white text-white shadow-red-900/50" 
             : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
         )}
       >
          {isListening ? (
             <div className="relative">
                <Mic className="w-6 h-6 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full animate-bounce" />
             </div>
          ) : (
             <MicOff className="w-6 h-6" />
          )}
       </button>

       {/* Command Feedback Toast/Tooltip */}
       {isListening && (
           <div className="absolute bottom-16 right-0 bg-black/80 text-white text-xs font-mono px-3 py-1 rounded border border-white/20 whitespace-nowrap uppercase tracking-widest">
              Listening...
           </div>
       )}
       {lastCommand && !isListening && (
           <div className="absolute bottom-16 right-0 bg-zinc-900/90 text-zinc-400 text-[10px] font-mono px-2 py-1 rounded border border-zinc-800 whitespace-nowrap animate-out fade-out duration-2000">
              Last: "{lastCommand}"
           </div>
       )}
    </div>
  );
}