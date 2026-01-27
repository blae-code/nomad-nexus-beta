import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, Volume2, Users, Zap, ChevronDown, Settings, Plus, Mic, MicOff, Radio as RadioIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Operation Voice Net Panel - Left sidebar with immersive voice net management
 */
export default function OperationVoiceNetPanel({
  commandNet,
  squadNets,
  generalNet,
  expandedNet,
  onSelectNet
}) {
  const [showAllNets, setShowAllNets] = useState(true);
  const [globalMuted, setGlobalMuted] = useState(false);
  const [pttMode, setPttMode] = useState(false);
  const [netParticipants, setNetParticipants] = useState({});
  const [activeTransmitters, setActiveTransmitters] = useState({});

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 border border-[#ea580c]/30 bg-gradient-to-r from-[#ea580c]/10 to-transparent p-2"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[8px] font-black uppercase tracking-widest text-white flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[#ea580c]" />
            VOICE NETS
          </h2>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-zinc-400 hover:text-[#ea580c]"
          >
            <Plus className="w-2.5 h-2.5" />
          </Button>
        </div>
        
        {/* Quick Controls - PTT & Global Mute */}
        <div className="flex gap-1 mb-2">
          <Button
            size="sm"
            onClick={() => setPttMode(!pttMode)}
            className={cn(
              'flex-1 h-5 text-[6px] font-bold',
              pttMode ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            )}
          >
            <RadioIcon className="w-2 h-2 mr-0.5" />
            PTT
          </Button>
          <Button
            size="sm"
            onClick={() => setGlobalMuted(!globalMuted)}
            className={cn(
              'h-5 w-5 p-0',
              globalMuted ? 'bg-red-900 text-red-300 border-red-800' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            )}
          >
            {globalMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
          </Button>
        </div>

        <p className="text-[7px] text-zinc-500 font-mono">
          {(commandNet ? 1 : 0) + squadNets.length + (generalNet ? 1 : 0)} NETS • {Object.values(netParticipants).reduce((a, b) => a + b, 0)} OPERATIVES
        </p>
      </motion.div>

      {/* Nets List - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {/* Command Net */}
        {commandNet && (
          <NetButton
            net={commandNet}
            isCommand
            isExpanded={expandedNet?.id === commandNet.id}
            onSelect={() => onSelectNet(commandNet)}
            participantCount={netParticipants[commandNet.id] || 0}
            hasActiveSpeaker={!!activeTransmitters[commandNet.id]}
            pttMode={pttMode}
            isMuted={globalMuted}
          />
        )}

        {/* Squad Nets */}
        <AnimatePresence>
          {squadNets.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {squadNets.map((net, idx) => (
                <NetButton
                  key={net.id}
                  net={net}
                  isExpanded={expandedNet?.id === net.id}
                  onSelect={() => onSelectNet(net)}
                  delay={idx * 0.05}
                  participantCount={netParticipants[net.id] || 0}
                  hasActiveSpeaker={!!activeTransmitters[net.id]}
                  pttMode={pttMode}
                  isMuted={globalMuted}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* General Net */}
        {generalNet && (
          <NetButton
            net={generalNet}
            isGeneral
            isExpanded={expandedNet?.id === generalNet.id}
            onSelect={() => onSelectNet(generalNet)}
            participantCount={netParticipants[generalNet.id] || 0}
            hasActiveSpeaker={!!activeTransmitters[generalNet.id]}
            pttMode={pttMode}
            isMuted={globalMuted}
          />
        )}
      </div>

      {/* Footer: Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 border-t border-zinc-800 pt-2 space-y-1"
      >
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[7px] h-6 bg-zinc-900/50 border-zinc-700 hover:border-[#ea580c]/50"
        >
          <Zap className="w-2.5 h-2.5 mr-1" />
          CONFIGURE NETS
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[7px] h-6 bg-zinc-900/50 border-zinc-700 hover:border-[#ea580c]/50"
        >
          <Volume2 className="w-2.5 h-2.5 mr-1" />
          AUDIO SETTINGS
        </Button>
      </motion.div>
    </div>
  );
}

/**
 * Net Button - Individual voice net in the sidebar
 */
function NetButton({ 
  net, 
  isCommand, 
  isGeneral, 
  isExpanded, 
  onSelect, 
  delay = 0,
  participantCount = 0,
  hasActiveSpeaker = false,
  pttMode = false,
  isMuted = false
}) {
  const [isActive, setIsActive] = React.useState(false);
  const [netMuted, setNetMuted] = React.useState(false);
  const [audioLevel, setAudioLevel] = React.useState(0);

  // Simulate audio level visualization when there's active speaker
  React.useEffect(() => {
    if (hasActiveSpeaker) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [hasActiveSpeaker]);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onSelect}
      className={cn(
        'w-full text-left p-1.5 rounded border transition-all duration-150 group',
        isCommand && 'border-red-900/50 bg-red-950/20 hover:bg-red-950/40 hover:border-red-800',
        isGeneral && 'border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-600',
        !isCommand && !isGeneral && 'border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/40 hover:border-blue-800',
        isExpanded && 'ring-1 ring-[#ea580c]/50',
        hasActiveSpeaker && 'border-[#ea580c]/70 shadow-lg shadow-[#ea580c]/30'
      )}
    >
      {/* Audio Level Bar */}
      {hasActiveSpeaker && (
        <div className="absolute inset-0 rounded overflow-hidden pointer-events-none">
          <motion.div
            animate={{ width: `${audioLevel}%` }}
            className="h-full bg-[#ea580c]/20"
          />
        </div>
      )}

      <div className="relative flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all',
            isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600',
            hasActiveSpeaker && 'bg-[#ea580c] scale-125'
          )} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[8px] text-white truncate">{net.code}</div>
            <div className="text-[7px] text-zinc-500 truncate">{net.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {participantCount > 0 && (
            <Badge className="text-[6px] bg-zinc-700 text-zinc-200 px-1 py-0">
              {participantCount}
            </Badge>
          )}
          <ChevronDown className={cn(
            'w-2.5 h-2.5 text-zinc-500 transition-transform',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </div>

      {/* Discipline Badge */}
      <Badge className={cn(
        'text-[6px] px-1 py-0 w-fit',
        isCommand && 'bg-red-900/50 text-red-300',
        isGeneral && 'bg-zinc-800 text-zinc-300',
        !isCommand && !isGeneral && 'bg-blue-900/50 text-blue-300'
      )}>
        {net.discipline.toUpperCase()}
      </Badge>

      {/* Expanded Detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 pt-1.5 border-t border-zinc-700/50 space-y-1.5 text-[7px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-400">
                <Users className="w-2.5 h-2.5" />
                <span>{participantCount} / 10 ACTIVE</span>
              </div>
              {hasActiveSpeaker && (
                <Badge className="text-[6px] bg-[#ea580c]/30 text-[#ea580c] border-[#ea580c]/50">
                  🎙 HOT
                </Badge>
              )}
            </div>

            {/* Audio Level Visualization */}
            {hasActiveSpeaker && (
              <div className="space-y-1">
                <div className="text-[6px] text-zinc-500">AUDIO LEVEL</div>
                <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                  <motion.div
                    animate={{ width: `${audioLevel}%` }}
                    className={cn(
                      'h-full transition-colors',
                      audioLevel > 70 ? 'bg-red-500' : audioLevel > 40 ? 'bg-[#ea580c]' : 'bg-emerald-500'
                    )}
                  />
                </div>
              </div>
            )}

            {/* PTT / Voice Settings */}
            <div className="space-y-1">
              {pttMode ? (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); }}
                  className="w-full h-5 text-[6px] bg-[#ea580c] text-white hover:bg-[#d97706] font-bold"
                >
                  <RadioIcon className="w-2 h-2 mr-0.5" />
                  PRESS TO TALK
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
                  className={cn(
                    'h-4 px-1.5 text-[6px] w-full',
                    isActive ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-zinc-800 text-zinc-300'
                  )}
                >
                  <Volume2 className="w-2 h-2 mr-0.5" />
                  {isActive ? 'IN NET' : 'STANDBY'}
                </Button>
              )}
            </div>

            {/* Mute Controls */}
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setNetMuted(!netMuted); }}
                className={cn(
                  'flex-1 h-4 text-[6px] font-bold',
                  netMuted ? 'bg-red-900 text-red-300 border-red-800' : 'bg-zinc-800 text-zinc-400'
                )}
              >
                {netMuted ? <MicOff className="w-2 h-2 mr-0.5" /> : <Mic className="w-2 h-2 mr-0.5" />}
                {netMuted ? 'MUTED' : 'UNMUTED'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); }}
                className="h-4 w-4 p-0"
              >
                <Settings className="w-2 h-2" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}