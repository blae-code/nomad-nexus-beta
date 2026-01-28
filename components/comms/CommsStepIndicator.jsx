/**
 * CommsStepIndicator: 3-step workflow microcopy
 * Op → Net → Join/TX
 * 
 * Guides first-time users through the joining process in <15 seconds
 */

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function CommsStepIndicator({ 
  selectedEventId = null, 
  selectedNetId = null, 
  connectionState = 'disconnected' 
}) {
  const steps = [
    { id: 'event', label: 'Select Op', complete: !!selectedEventId },
    { id: 'net', label: 'Select Net', complete: !!selectedNetId },
    { id: 'join', label: 'Join/TX', complete: connectionState === 'connected' }
  ];

  const currentStep = selectedEventId && selectedNetId ? 2 : selectedEventId ? 1 : 0;

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-900/50 border-b border-zinc-800 text-[10px]">
      {steps.map((step, idx) => (
        <React.Fragment key={step.id}>
          {idx > 0 && <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />}
          
          <motion.div
            animate={{
              opacity: currentStep >= idx ? 1 : 0.4,
              scale: currentStep === idx ? 1.05 : 1
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded transition-colors',
              currentStep > idx
                ? 'bg-green-950/30 text-green-400'
                : currentStep === idx
                ? 'bg-[#ea580c]/20 text-[#ea580c]'
                : 'text-zinc-600'
            )}
          >
            {currentStep > idx ? (
              <Check className="w-3 h-3 shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-current shrink-0" />
            )}
            <span className="font-mono font-semibold whitespace-nowrap">{step.label}</span>
          </motion.div>
        </React.Fragment>
      ))}

      {/* Help text based on current step */}
      <div className="ml-auto text-zinc-600 font-mono text-[9px]">
        {currentStep === 0 && 'Pick an operation to get started'}
        {currentStep === 1 && 'Select a voice net to join'}
        {currentStep === 2 && 'Press SPACE to transmit'}
      </div>
    </div>
  );
}