import React from 'react';
import { useCommsMode } from '@/components/comms/useCommsMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Radio, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CommsModeToggle() {
  const { mode, isLive, isSim, toggleMode, isPending, isLoading } = useCommsMode();

  const handleToggle = () => {
    const newMode = isLive ? 'SIM' : 'LIVE';
    toggleMode(newMode);
    toast.success(`Switched to ${newMode} mode`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
        <span className="text-xs text-zinc-600">Loading...</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3"
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isLive ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
          )}
        />
        <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">Comms</span>
      </div>

      <Badge
        className={cn(
          'text-[10px] px-2 py-0.5 font-mono cursor-pointer transition-all',
          isLive
            ? 'bg-red-950 text-red-400 border-red-800 hover:bg-red-900'
            : 'bg-amber-950 text-amber-400 border-amber-800 hover:bg-amber-900'
        )}
        onClick={handleToggle}
        title="Click to toggle comms mode"
      >
        {isLive ? (
          <>
            <Wifi className="w-3 h-3 mr-1 inline" />
            LIVE
          </>
        ) : (
          <>
            <Radio className="w-3 h-3 mr-1 inline" />
            SIM
          </>
        )}
      </Badge>

      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'h-7 text-xs border-zinc-800 text-zinc-400 hover:text-white',
          isPending && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isPending ? 'Switching...' : 'Toggle'}
      </Button>
    </motion.div>
  );
}