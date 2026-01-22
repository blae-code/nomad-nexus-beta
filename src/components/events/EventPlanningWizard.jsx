import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight, ChevronLeft, Zap, Users, Radio, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

/**
 * Event Planning Wizard
 * Multi-step workflow for creating events with AI-assisted planning
 */
export default function EventPlanningWizard({ 
  open, 
  onOpenChange, 
  onComplete,
  currentUser
}) {
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    location: '',
    event_type: 'casual',
    priority: 'STANDARD',
    start_time: '',
    squadsNeeded: 1
  });

  const handleNext = useCallback(() => {
    if (step < 3) setStep(step + 1);
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const handleComplete = useCallback(async () => {
    if (!eventData.title || !eventData.location || !eventData.start_time) return;

    try {
      setIsCreating(true);
      
      // Create the event
      const newEvent = await base44.entities.Event.create({
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        event_type: eventData.event_type,
        priority: eventData.priority,
        status: currentUser?.role === 'admin' || currentUser?.rank === 'Pioneer' || currentUser?.rank === 'Founder' ? 'scheduled' : 'pending_approval',
        start_time: new Date(eventData.start_time).toISOString(),
        objectives: []
      });

      // Pass event and data to next step
      if (onComplete) {
        onComplete({
          ...eventData,
          eventId: newEvent.id
        });
      }
      
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setIsCreating(false);
    }
  }, [eventData, onComplete, onOpenChange, currentUser]);

  const isStepValid = useCallback(() => {
    switch (step) {
      case 1:
        return eventData.title && eventData.location && eventData.start_time;
      case 2:
        return eventData.description;
      case 3:
        return eventData.squadsNeeded > 0;
      default:
        return false;
    }
  }, [step, eventData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-bold text-white">
            OPERATION PLANNING WIZARD
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-2 px-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all",
                step === i ? "bg-[#ea580c] text-white" : step > i ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-500"
              )}>
                {step > i ? <Check className="w-4 h-4" /> : i}
              </div>
              {i < 3 && <div className={cn("w-8 h-1", step > i ? "bg-emerald-600" : "bg-zinc-800")} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 py-4"
            >
              {/* Step 1: Basic Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#ea580c]" />
                      OPERATION ESSENTIALS
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-400 font-mono mb-1 block">TITLE *</label>
                        <Input
                          value={eventData.title}
                          onChange={(e) => setEventData({...eventData, title: e.target.value})}
                          placeholder="Operation name (e.g., Deep Mining Survey)"
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-zinc-400 font-mono mb-1 block">LOCATION *</label>
                        <Input
                          value={eventData.location}
                          onChange={(e) => setEventData({...eventData, location: e.target.value})}
                          placeholder="System / Planet / POI"
                          className="bg-zinc-800 border-zinc-700"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-zinc-400 font-mono mb-1 block">START TIME *</label>
                          <Input
                            type="datetime-local"
                            value={eventData.start_time}
                            onChange={(e) => setEventData({...eventData, start_time: e.target.value})}
                            className="bg-zinc-800 border-zinc-700"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 font-mono mb-1 block">TYPE</label>
                          <select
                            value={eventData.event_type}
                            onChange={(e) => setEventData({...eventData, event_type: e.target.value})}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-1.5 rounded"
                          >
                            <option value="casual">Casual</option>
                            <option value="focused">Focused</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Mission Briefing */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                    <h3 className="text-sm font-bold text-white mb-3">MISSION BRIEFING</h3>
                    
                    <Textarea
                      value={eventData.description}
                      onChange={(e) => setEventData({...eventData, description: e.target.value})}
                      placeholder="Objectives, tactical notes, expected conditions..."
                      className="bg-zinc-800 border-zinc-700 min-h-32"
                    />
                    
                    <div className="mt-3 p-3 bg-blue-950/30 border border-blue-900/30 rounded text-xs text-blue-300">
                      <strong>AI Tip:</strong> Be specific about mission goals and squad roles. AI will generate voice net suggestions based on your squad composition.
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Squad Planning */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                    <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#ea580c]" />
                      SQUAD COMPOSITION
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-zinc-400 font-mono mb-2 block">SQUADS NEEDED *</label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEventData({...eventData, squadsNeeded: Math.max(1, eventData.squadsNeeded - 1)})}
                            className="h-7 w-7 p-0"
                          >
                            −
                          </Button>
                          <div className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-2 text-center font-mono font-bold">
                            {eventData.squadsNeeded}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setEventData({...eventData, squadsNeeded: Math.min(10, eventData.squadsNeeded + 1)})}
                            className="h-7 w-7 p-0"
                          >
                            +
                          </Button>
                        </div>
                      </div>

                      <div className="bg-zinc-900 border border-zinc-700 rounded p-3 text-xs space-y-2">
                        <div className="flex items-center gap-2">
                          <Radio className="w-3 h-3 text-[#ea580c]" />
                          <span className="text-zinc-300">
                            <strong>AI will suggest</strong> voice net structure:
                          </span>
                        </div>
                        <ul className="text-zinc-400 space-y-1 ml-5 list-disc">
                          <li>1 COMMAND net (squad leaders + command staff)</li>
                          <li>{eventData.squadsNeeded} squad-specific nets</li>
                          <li>1 GENERAL comms net (open to all)</li>
                          {eventData.squadsNeeded > 4 && <li>Wing structure with designated wing leaders</li>}
                        </ul>
                      </div>

                      <div className="p-3 bg-amber-950/30 border border-amber-900/30 rounded text-xs text-amber-300">
                        <strong>Note:</strong> You can add/remove squads before and during the operation.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 flex items-center justify-between gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="text-xs h-7"
          >
            <ChevronLeft className="w-3 h-3 mr-1" /> BACK
          </Button>

          <div className="text-xs text-zinc-500">
            Step {step} of 3
          </div>

          {step < 3 ? (
            <Button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="bg-[#ea580c] hover:bg-[#d97706] text-white text-xs h-7"
            >
              NEXT <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!isStepValid() || isCreating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
            >
              {isCreating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              {!isCreating && <Check className="w-3 h-3 mr-1" />}
              {isCreating ? 'CREATING...' : 'CONFIRM & PLAN'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}