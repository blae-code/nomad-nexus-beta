import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Demo Scenario Controller: 5-step guided walkthrough
 * Highlights and guides operator through operational flow
 */
export default function DemoScenarioController({ scenario, onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const steps = [
    {
      title: 'Open Featured Event',
      instruction: 'Navigate to Events page and select the featured "Focused" operation',
      action: () => window.location.href = `/nomadopsdashboard?id=${scenario.eventId}`,
      highlight: 'event-panel'
    },
    {
      title: 'Join Command Net',
      instruction: 'Click the "COMMAND" voice net and join the active channel',
      action: () => window.location.href = `/commsconsole?net=${scenario.netId}`,
      highlight: 'voice-net'
    },
    {
      title: 'Acknowledge Distress',
      instruction: 'Open the Incidents panel and mark the distress as "In Response"',
      action: () => {
        window.dispatchEvent(new CustomEvent('demo:highlight', { detail: { target: 'incident-panel' } }));
      },
      highlight: 'incident-panel'
    },
    {
      title: 'View Tactical Map',
      instruction: 'Open the tactical map centered on the distress coordinates',
      action: () => {
        window.dispatchEvent(new CustomEvent('demo:map-zoom', { detail: { lat: scenario.coordinates.lat, lng: scenario.coordinates.lng } }));
      },
      highlight: 'tactical-map'
    },
    {
      title: 'Issue Rally Command',
      instruction: 'Draw a rally point and broadcast the command to the net',
      action: () => {
        window.dispatchEvent(new CustomEvent('demo:map-draw', { detail: { type: 'rally' } }));
      },
      highlight: 'map-tools'
    }
  ];

  const handleStartDemo = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    executeStep(0);
  };

  const executeStep = async (stepIndex) => {
    if (stepIndex >= steps.length) {
      setIsPlaying(false);
      return;
    }

    const step = steps[stepIndex];
    onStepChange?.(stepIndex, step.highlight);
    setCurrentStep(stepIndex);

    // Auto-advance after action
    setTimeout(() => {
      step.action?.();
    }, 500);
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep < steps.length) {
      executeStep(nextStep);
    } else {
      setIsPlaying(false);
      setCurrentStep(0);
    }
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  if (!isPlaying) {
    return (
      <Button
        onClick={handleStartDemo}
        className="w-full bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-blue-300 text-[9px] h-8 font-bold uppercase flex items-center justify-center gap-2"
      >
        <Play className="w-3 h-3" />
        Start Demo Sequence
      </Button>
    );
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bottom-4 right-4 z-40 bg-zinc-950 border border-blue-800/60 rounded shadow-lg max-w-sm"
      >
        {/* Header */}
        <div className="p-3 border-b border-blue-800/40 bg-blue-950/20 flex items-center justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold text-blue-400 uppercase">
              DEMO SEQUENCE
            </div>
            <div className="text-[8px] text-blue-300 mt-0.5">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-zinc-600 hover:text-zinc-400"
          >
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-900/40">
          <motion.div
            className="h-full bg-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <h3 className="text-[9px] font-bold text-white">{step.title}</h3>
          <p className="text-[8px] text-zinc-400">{step.instruction}</p>

          {/* Completed steps */}
          {currentStep > 0 && (
            <div className="space-y-1 pt-1 border-t border-zinc-800/40">
              {steps.slice(0, currentStep).map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[8px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{s.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleNext}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white text-[8px] h-7 font-bold uppercase flex items-center justify-center gap-1"
            >
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              <ChevronRight className="w-3 h-3" />
            </Button>
            <Button
              onClick={handleSkip}
              variant="outline"
              className="text-[8px] h-7 font-bold"
            >
              Skip
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}