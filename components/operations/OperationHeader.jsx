import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Clock, MapPin, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Operation Header - Immersive title/status bar for operation control
 */
export default function OperationHeader({ event, participants, onBack }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-red-900/30 text-red-300 border-red-900';
      case 'scheduled':
        return 'bg-blue-900/30 text-blue-300 border-blue-900';
      case 'completed':
        return 'bg-emerald-900/30 text-emerald-300 border-emerald-900';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'ACTIVE':
        return 'text-red-400';
      case 'BRIEFING':
        return 'text-yellow-400';
      case 'DEBRIEF':
        return 'text-blue-400';
      case 'PLANNING':
        return 'text-zinc-400';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-zinc-800 bg-gradient-to-br from-zinc-950 via-[#ea580c]/5 to-zinc-950 p-3 shrink-0"
    >
      {/* Top Row: Back button + title + status */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            onClick={onBack}
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-zinc-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black uppercase tracking-tighter text-white truncate">
              {event.title}
            </h1>
            <p className="text-[8px] text-zinc-400 font-mono tracking-widest mt-0.5">
              OP ID: {event.id?.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={cn('text-[8px] border', getStatusColor(event.status))}>
            {event.status === 'active' && <AlertCircle className="w-2.5 h-2.5 mr-1" />}
            {event.status === 'completed' && <CheckCircle className="w-2.5 h-2.5 mr-1" />}
            {event.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Bottom Row: Phase + Location + Participants */}
      <div className="flex flex-wrap items-center gap-2 text-[8px]">
        <div className={cn('font-bold uppercase tracking-widest', getPhaseColor(event.phase))}>
          {event.phase || 'PLANNING'}
        </div>
        
        {event.location && (
          <div className="flex items-center gap-1 text-zinc-400">
            <MapPin className="w-2.5 h-2.5" />
            <span>{event.location}</span>
          </div>
        )}

        {event.start_time && (
          <div className="flex items-center gap-1 text-zinc-400">
            <Clock className="w-2.5 h-2.5" />
            <span>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}

        {participants && participants.length > 0 && (
          <div className="flex items-center gap-1 text-zinc-400">
            <Users className="w-2.5 h-2.5" />
            <span>{participants.length} OPERATIVES</span>
          </div>
        )}

        <Badge className="bg-zinc-800 text-zinc-300 text-[7px]">
          {event.event_type.toUpperCase()}
        </Badge>
      </div>
    </motion.div>
  );
}