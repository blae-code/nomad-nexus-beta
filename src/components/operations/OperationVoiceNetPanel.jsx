import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Radio, Volume2, Users, Zap, ChevronDown, Settings, Plus } from 'lucide-react';
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

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 border border-[#ea580c]/30 bg-gradient-to-r from-[#ea580c]/10 to-transparent p-2"
      >
        <div className="flex items-center justify-between mb-1">
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
        <p className="text-[7px] text-zinc-500 font-mono">
          {(commandNet ? 1 : 0) + squadNets.length + (generalNet ? 1 : 0)} ACTIVE NETS
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
function NetButton({ net, isCommand, isGeneral, isExpanded, onSelect, delay = 0 }) {
  const [isActive, setIsActive] = React.useState(false);

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
        isExpanded && 'ring-1 ring-[#ea580c]/50'
      )}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'
          )} />
          <div className="min-w-0 flex-1">
            <div className="font-bold text-[8px] text-white truncate">{net.code}</div>
            <div className="text-[7px] text-zinc-500 truncate">{net.label}</div>
          </div>
        </div>
        <ChevronDown className={cn(
          'w-2.5 h-2.5 text-zinc-500 flex-shrink-0 transition-transform',
          isExpanded && 'rotate-180'
        )} />
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
            className="mt-1.5 pt-1.5 border-t border-zinc-700/50 space-y-1 text-[7px]"
          >
            <div className="flex items-center gap-1 text-zinc-400">
              <Users className="w-2.5 h-2.5" />
              <span>0 / 10 ACTIVE</span>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); setIsActive(!isActive); }}
                className={cn(
                  'h-4 px-1.5 text-[6px] flex-1',
                  isActive ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'bg-zinc-800 text-zinc-300'
                )}
              >
                <Volume2 className="w-2 h-2 mr-0.5" />
                {isActive ? 'IN NET' : 'STANDBY'}
              </Button>
              <Button
                size="sm"
                variant="outline"
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