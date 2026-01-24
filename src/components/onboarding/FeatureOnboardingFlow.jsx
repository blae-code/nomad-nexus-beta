import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar, Users, Radio, Target, CheckCircle2, ArrowRight, X,
  Lightbulb, Trophy, Zap, TrendingUp, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import ProgressIndicator from '@/components/onboarding/ProgressIndicator';
import TooltipGuide from '@/components/onboarding/TooltipGuide';

const features = [
  { id: 'squad', title: 'Create Your Squad', icon: Users, color: 'text-blue-500' },
  { id: 'event', title: 'Launch First Event', icon: Calendar, color: 'text-green-500' },
  { id: 'comms', title: 'Set Up Voice Comms', icon: Radio, color: 'text-purple-500' },
  { id: 'widgets', title: 'Explore the Hub', icon: Target, color: 'text-yellow-500' }
];

export default function FeatureOnboardingFlow({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadDesc, setSquadDesc] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const feature = features[currentStep];
  const progress = ((currentStep + 1) / features.length) * 100;

  const handleCreateSquad = async () => {
    if (!squadName.trim()) {
      toast.error('Squad name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.Squad.create({
        name: squadName.trim(),
        description: squadDesc.trim() || 'First squad created during onboarding',
        created_by: user.id
      });
      toast.success('Squad created! Welcome to leadership.');
      setTimeout(() => handleNext(), 1000);
    } catch (error) {
      toast.error('Failed to create squad');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!eventName.trim()) {
      toast.error('Event name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.Event.create({
        title: eventName.trim(),
        description: 'First operation initialized during onboarding',
        location: eventLocation.trim() || 'TBD',
        event_type: 'focused',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        created_by: user.id
      });
      toast.success('Event created! Your first operation awaits.');
      setTimeout(() => handleNext(), 1000);
    } catch (error) {
      toast.error('Failed to create event');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < features.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    toast.success('Onboarding complete! You\'re ready to explore.');
    onComplete?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-zinc-950 border border-zinc-800 rounded-xl max-w-2xl w-full shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-zinc-800 p-6 flex items-center justify-between">
            <ProgressIndicator current={currentStep + 1} total={features.length} />
            <button
              onClick={() => setShowSkipConfirm(true)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Skip Confirmation */}
          <AnimatePresence>
            {showSkipConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-10"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg text-center space-y-4"
                >
                  <p className="text-sm text-zinc-300">Skip onboarding? You can revisit tutorials anytime.</p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowSkipConfirm(false)}
                      className="flex-1"
                    >
                      Continue
                    </Button>
                    <Button
                      onClick={handleComplete}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700"
                    >
                      Skip
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Feature Icon & Title */}
            <div className="text-center space-y-3">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <feature.icon className={`w-16 h-16 ${feature.color} opacity-80 mx-auto`} />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-wider text-white">
                  {feature.title}
                </h2>
                <p className="text-sm text-zinc-400 mt-2">Step {currentStep + 1} of {features.length}</p>
              </div>
            </div>

            {/* Step Content with Tooltips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {currentStep === 0 && (
                <div className="space-y-4">
                  <TooltipGuide
                    title="What is a Squad?"
                    description="Squads are player-led groups that collaborate on missions. As the creator, you'll have leadership privileges."
                    icon={<Users className="w-4 h-4" />}
                  />
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                        Squad Name *
                      </label>
                      <Input
                        placeholder="e.g., Alpha Squadron, Nomad Guard..."
                        value={squadName}
                        onChange={(e) => setSquadName(e.target.value)}
                        maxLength={30}
                        className="bg-zinc-950 border-zinc-800 text-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                        Description (Optional)
                      </label>
                      <Textarea
                        placeholder="What is your squad's focus? Rescue ops? Mining? Combat?"
                        value={squadDesc}
                        onChange={(e) => setSquadDesc(e.target.value)}
                        maxLength={200}
                        rows={3}
                        className="bg-zinc-950 border-zinc-800 text-white resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <TooltipGuide
                    title="Create Your First Operation"
                    description="Events are coordinated operations. You can set objectives, assign participants, and manage the mission lifecycle."
                    icon={<Calendar className="w-4 h-4" />}
                  />
                  <div className="bg-zinc-900/50 border border-zinc-800 p-4 space-y-4">
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                        Operation Name *
                      </label>
                      <Input
                        placeholder="e.g., Salvage Run Alpha, Rescue Mission..."
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        maxLength={40}
                        className="bg-zinc-950 border-zinc-800 text-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                        Location (Optional)
                      </label>
                      <Input
                        placeholder="e.g., Stanton, Microtech..."
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <TooltipGuide
                    title="Voice Communication Setup"
                    description="Join voice nets to coordinate with your team in real-time. Each net handles a specific channel of communication."
                    icon={<Radio className="w-4 h-4" />}
                  />
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 pb-3 border-b border-zinc-700">
                        <Zap className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">Push-to-Talk (PTT)</p>
                          <p className="text-xs text-zinc-400 mt-1">Hold a key to transmit, release to listen</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 pb-3 border-b border-zinc-700">
                        <Radio className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">Net Discipline</p>
                          <p className="text-xs text-zinc-400 mt-1">Follow proper protocols to keep channels clear</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-white">Squad Assignment</p>
                          <p className="text-xs text-zinc-400 mt-1">Get assigned to squad and tactical nets</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <TooltipGuide
                    title="Hub Overview"
                    description="The Hub is your command center. Explore widgets to track operations, team status, and organizational metrics."
                    icon={<Target className="w-4 h-4" />}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Calendar, label: 'Operations', desc: 'Active events' },
                      { icon: Users, label: 'Teams', desc: 'Squad status' },
                      { icon: TrendingUp, label: 'Analytics', desc: 'Performance metrics' },
                      { icon: Radio, label: 'Communications', desc: 'Comms overview' }
                    ].map((widget, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg text-center hover:border-zinc-700 transition-colors cursor-pointer group"
                      >
                        <widget.icon className="w-6 h-6 text-zinc-500 group-hover:text-accent transition-colors mx-auto mb-2" />
                        <p className="text-xs font-bold text-white">{widget.label}</p>
                        <p className="text-[10px] text-zinc-500 mt-1">{widget.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-zinc-800 p-6 flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="border-zinc-800 hover:border-zinc-700"
              >
                Back
              </Button>
            )}
            <Button
              onClick={
                currentStep === 0 ? handleCreateSquad :
                currentStep === 1 ? handleCreateEvent :
                handleNext
              }
              disabled={
                isSubmitting ||
                (currentStep === 0 && !squadName.trim()) ||
                (currentStep === 1 && !eventName.trim())
              }
              className="flex-1 gap-2 bg-accent hover:bg-accent/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {currentStep === features.length - 1 ? 'Explore Hub' : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}