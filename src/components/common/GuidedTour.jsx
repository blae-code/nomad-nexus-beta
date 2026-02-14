import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TOURS = {
  first_login: [
    {
      target: '#main-content',
      title: 'Welcome to Nexus',
      description: 'Your command center for real-time collaboration and operations management.',
    },
    {
      target: '[data-tour="comms-dock"]',
      title: 'Communications',
      description: 'Send messages, voice notes, and coordinate with your team in real-time.',
    },
    {
      target: '[data-tour="command-palette"]',
      title: 'Command Palette',
      description: 'Press Ctrl+K to quickly navigate, create operations, and access features.',
    },
  ],
  voice_commands: [
    {
      target: '[data-tour="voice-indicator"]',
      title: 'Voice Commands',
      description: 'Use voice to control the app. Say "open map" or "start PTT".',
    },
  ],
};

export default function GuidedTour({ tourId = 'first_login' }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const tour = TOURS[tourId] || [];

  useEffect(() => {
    const dismissed = localStorage.getItem(`nexus.tour.${tourId}`);
    setIsActive(!dismissed && tour.length > 0);
  }, [tourId, tour.length]);

  const completeTour = () => {
    localStorage.setItem(`nexus.tour.${tourId}`, 'true');
    setIsActive(false);
  };

  const nextStep = () => {
    if (currentStep < tour.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  if (!isActive || tour.length === 0) return null;

  const step = tour[currentStep];

  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[998]"
            onClick={completeTour}
          />

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[999] bg-zinc-900 border border-orange-500/60 rounded-lg p-6 max-w-sm shadow-lg"
          >
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-orange-400">{step.title}</h3>
                <p className="text-sm text-zinc-300 mt-2">{step.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
                <span className="text-xs text-zinc-500">
                  {currentStep + 1} of {tour.length}
                </span>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={completeTour}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={nextStep}
                    className="gap-1"
                  >
                    {currentStep === tour.length - 1 ? 'Done' : 'Next'}
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}