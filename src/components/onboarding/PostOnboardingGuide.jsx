import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Radio, 
  MessageSquare, 
  Map, 
  Users, 
  Zap, 
  Lock,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    id: 'comms',
    title: 'Communications Array',
    icon: Radio,
    description: 'Join voice nets and communicate with your squad during operations.',
    tips: [
      'Use PTT (Push-to-Talk) for disciplined voice communication',
      'Join the primary net before operations begin',
      'Follow rank hierarchy in voice nets'
    ],
    cta: 'Explore Comms',
    color: 'from-blue-500/20 to-blue-600/10'
  },
  {
    id: 'events',
    title: 'Operations & Events',
    icon: Map,
    description: 'Plan, brief, and execute coordinated operations with your team.',
    tips: [
      'Browse upcoming operations in the Events tab',
      'Join operations that match your skill level',
      'Review operation briefs before launch'
    ],
    cta: 'View Operations',
    color: 'from-purple-500/20 to-purple-600/10'
  },
  {
    id: 'channels',
    title: 'Channels & Comms',
    icon: MessageSquare,
    description: 'Coordinate with your squad through text channels and discussions.',
    tips: [
      'Subscribe to channels relevant to your role',
      'Use #general for organization-wide announcements',
      'Create tactical threads for detailed coordination'
    ],
    cta: 'Browse Channels',
    color: 'from-green-500/20 to-green-600/10'
  },
  {
    id: 'squads',
    title: 'Squad Management',
    icon: Users,
    description: 'Join or create squads with shared mission objectives and resources.',
    tips: [
      'Introduce yourself in squad channels',
      'Participate in squad training and drills',
      'Check squad calendar for scheduled activities'
    ],
    cta: 'Find Squads',
    color: 'from-orange-500/20 to-orange-600/10'
  },
  {
    id: 'command',
    title: 'Command & Control',
    icon: Zap,
    description: 'Execute tactical commands and receive real-time operational updates.',
    tips: [
      'Monitor your current status and position',
      'Respond to tactical directives from command',
      'Report your operational status regularly'
    ],
    cta: 'View Dashboard',
    color: 'from-red-500/20 to-red-600/10'
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Lock,
    description: 'Your data is secure. Learn about our security measures and your role.',
    tips: [
      'Keep your authentication secure',
      'Report security concerns to admins',
      'Respect operational data classifications'
    ],
    cta: 'Security Info',
    color: 'from-yellow-500/20 to-yellow-600/10'
  }
];

export default function PostOnboardingGuide({ onClose }) {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [visitedFeatures, setVisitedFeatures] = useState(new Set());

  const feature = features[currentFeature];
  const Icon = feature.icon;
  const isCompleted = visitedFeatures.has(feature.id);

  const handleNext = () => {
    setVisitedFeatures(prev => new Set([...prev, feature.id]));
    if (currentFeature < features.length - 1) {
      setCurrentFeature(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentFeature > 0) {
      setCurrentFeature(prev => prev - 1);
    }
  };

  const allCompleted = visitedFeatures.size === features.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold uppercase tracking-wider text-white">Core Features Guide</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Feature List */}
          <div className="w-48 border-r border-zinc-800 overflow-y-auto bg-zinc-950/50">
            {features.map((f, idx) => {
              const FIcon = f.icon;
              const isActive = idx === currentFeature;
              const visited = visitedFeatures.has(f.id);
              
              return (
                <button
                  key={f.id}
                  onClick={() => setCurrentFeature(idx)}
                  className={cn(
                    'w-full px-4 py-3 text-left border-l-2 transition-all',
                    isActive
                      ? 'border-l-[#ea580c] bg-zinc-900/60 text-white'
                      : visited
                      ? 'border-l-green-600/50 text-zinc-400 hover:text-zinc-300'
                      : 'border-l-transparent text-zinc-500 hover:text-zinc-400'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <FIcon className="w-4 h-4" />
                    <span className="text-sm font-medium truncate">{f.title}</span>
                    {visited && (
                      <div className="w-2 h-2 rounded-full bg-green-500 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Feature Detail */}
          <div className="flex-1 p-8 overflow-y-auto flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                {/* Icon & Title */}
                <div className={cn(
                  'mb-6 p-6 rounded-lg bg-gradient-to-br',
                  feature.color
                )}>
                  <Icon className="w-12 h-12 text-white mb-3 opacity-80" />
                  <h3 className="text-2xl font-bold uppercase tracking-wider text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-zinc-300">
                    {feature.description}
                  </p>
                </div>

                {/* Tips */}
                <div className="mb-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Quick Tips</h4>
                  <div className="space-y-2">
                    {feature.tips.map((tip, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex gap-3 text-sm text-zinc-300"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ea580c] mt-2 shrink-0" />
                        <p>{tip}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-auto pt-6 border-t border-zinc-800">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentFeature + 1) / features.length) * 100}%` }}
                        className="h-full bg-[#ea580c]"
                      />
                    </div>
                    <span className="text-xs text-zinc-500 font-mono">
                      {currentFeature + 1} / {features.length}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    {currentFeature > 0 && (
                      <Button
                        onClick={handleBack}
                        variant="outline"
                        className="border-zinc-800 hover:border-zinc-700"
                      >
                        Back
                      </Button>
                    )}
                    
                    {allCompleted ? (
                      <Button
                        onClick={onClose}
                        className="flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90 gap-2"
                      >
                        <span>Got it!</span>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90 gap-2"
                      >
                        <span>{currentFeature === features.length - 1 ? 'Complete' : 'Next'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}