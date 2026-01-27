import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, X, Lightbulb } from 'lucide-react';

const hubHighlights = [
  {
    title: 'Operations Board',
    description: 'View all upcoming and active operations. Create new events and manage your portfolio.',
    target: '[data-hub-widget="operations"]',
    position: 'right'
  },
  {
    title: 'Live Pulse',
    description: 'Real-time feed of recent activity across the organization. Stay informed.',
    target: '[data-hub-widget="pulse"]',
    position: 'bottom'
  },
  {
    title: 'Analytics Dashboard',
    description: 'Track team performance, mission success rates, and engagement metrics.',
    target: '[data-hub-widget="analytics"]',
    position: 'left'
  },
  {
    title: 'Comms Console',
    description: 'Jump directly into voice comms or text channels from the dock at the bottom.',
    target: '[data-hub-widget="comms-dock"]',
    position: 'top'
  }
];

export default function HubOnboardingOverlay({ onComplete }) {
  const [currentHightlight, setCurrentHighlight] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentHightlight < hubHighlights.length - 1) {
      setCurrentHightlight(currentHightlight + 1);
    } else {
      onComplete?.();
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          {/* Dark Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={handleSkip}
          />

          {/* Spotlight Effect */}
          <motion.div
            key={currentHightlight}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 0 9999px rgba(0, 0, 0, 0.4)'
            }}
          />

          {/* Tooltip Card */}
          <motion.div
            key={`tooltip-${currentHightlight}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bg-zinc-950 border border-zinc-800 rounded-lg p-6 max-w-sm z-50 pointer-events-auto shadow-2xl"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <h3 className="text-lg font-bold text-white">
                  {hubHighlights[currentHightlight].title}
                </h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {hubHighlights[currentHightlight].description}
              </p>

              {/* Progress */}
              <div className="flex items-center gap-2 pt-2">
                {hubHighlights.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      idx <= currentHightlight ? 'bg-accent' : 'bg-zinc-800'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="border-zinc-800 hover:border-zinc-700"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="flex-1 gap-2 bg-accent hover:bg-accent/90"
                >
                  {currentHightlight === hubHighlights.length - 1 ? 'Done' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}