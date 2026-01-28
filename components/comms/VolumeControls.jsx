import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function VolumeControls({ room, participant }) {
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);

  // Apply volume to participant's audio
  useEffect(() => {
    if (!participant || !room) return;

    const audioTracks = Array.from(participant.audioTrackPublications.values());
    
    audioTracks.forEach(publication => {
      if (publication.track) {
        const audioElements = publication.track.attachedElements;
        audioElements.forEach(element => {
          element.volume = isMuted ? 0 : volume / 100;
        });
      }
    });
  }, [volume, isMuted, participant, room]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-zinc-900/50 border border-zinc-800 rounded">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={toggleMute}
      >
        {isMuted ? (
          <VolumeX className="w-3 h-3 text-red-500" />
        ) : (
          <Volume2 className="w-3 h-3 text-zinc-400" />
        )}
      </Button>

      <div className="flex-1 min-w-[80px]">
        <Slider
          value={[volume]}
          onValueChange={([v]) => setVolume(v)}
          max={100}
          step={5}
          disabled={isMuted}
          className={cn("cursor-pointer", isMuted && "opacity-50")}
        />
      </div>

      <span className="text-[10px] font-mono text-zinc-600 w-8 text-right shrink-0">
        {isMuted ? "0%" : `${volume}%`}
      </span>
    </div>
  );
}