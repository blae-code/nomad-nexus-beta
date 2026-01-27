import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Zap, Radio, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Squad & Comms Setup Dialog
 * AI-generated suggestions for squads and voice nets
 * User confirms before creation
 */
export default function SquadCommsSetup({
  open,
  onOpenChange,
  eventData,
  eventId,
  onSuccess
}) {
  const [step, setStep] = useState('generating'); // generating, review, creating, complete
  const [suggestion, setSuggestion] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  // Generate AI suggestions when dialog opens
  useEffect(() => {
    if (!open || !eventData) return;
    
    const generateSuggestions = async () => {
      try {
        setStep('generating');
        setError(null);

        const squadCount = eventData.squadsNeeded || 1;
        
        // Determine squad types based on mission parameters
        let suggestedSquads = [];
        let suggestedNets = [];

        // Always include command
        suggestedNets.push({
          code: 'COMMAND',
          label: 'Command Net',
          type: 'command',
          discipline: 'focused',
          priority: 1,
          description: 'Command staff and squad leaders'
        });

        // Generate squad types based on event description
        const description = (eventData.description || '').toLowerCase();
        const title = (eventData.title || '').toLowerCase();
        const fullContext = `${title} ${description}`;

        // Use AI to suggest appropriate squad types
        const aiSuggestion = await base44.integrations.Core.InvokeLLM({
          prompt: `For a ${eventData.event_type} operation titled "${eventData.title}" with the briefing: "${eventData.description}", suggest ${squadCount} squad types and roles. Return a JSON array of squad objects with: {name, role, netCode}. Keep squad names tactical (e.g., ALPHA, BRAVO, MINING TEAM, SECURITY). Format as JSON array only.`,
          response_json_schema: {
            type: 'object',
            properties: {
              squads: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    role: { type: 'string' },
                    netCode: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        // Parse AI suggestions
        const aiSquads = aiSuggestion.squads || [];
        suggestedSquads = aiSquads.slice(0, squadCount).map((sq, idx) => ({
          name: sq.name,
          role: sq.role,
          type: 'squad',
          userCount: 3 // Estimate
        }));

        // Create nets for each squad
        suggestedSquads.forEach((sq, idx) => {
          const netCode = sq.name.replace(/\s+/g, '_').toUpperCase();
          suggestedNets.push({
            code: netCode,
            label: `${sq.name} Net`,
            type: 'squad',
            discipline: 'casual',
            priority: 2 + idx,
            linkedSquad: sq.name,
            description: sq.role
          });
        });

        // Add general net
        suggestedNets.push({
          code: 'GENERAL',
          label: 'General Comms',
          type: 'general',
          discipline: 'casual',
          priority: 5,
          description: 'Open to all participants'
        });

        // If many squads, suggest wing structure
        let wingStructure = null;
        if (squadCount > 4) {
          wingStructure = {
            wingCount: Math.ceil(squadCount / 3),
            squadsPerWing: 3,
            description: `Operation large enough for wing structure. Each wing has a wing leader reporting to COMMAND.`
          };
        }

        setSuggestion({
          squads: suggestedSquads,
          nets: suggestedNets,
          wingStructure,
          estimatedParticipants: squadCount * 3
        });

        setStep('review');
      } catch (err) {
        console.error('Failed to generate suggestions:', err);
        setError(err.message || 'Failed to generate squad/net suggestions');
        setStep('review'); // Allow manual override
      }
    };

    generateSuggestions();
  }, [open, eventData]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!suggestion || !eventId) throw new Error('Missing data');

      // Create squads and voice nets
      const createdSquads = [];
      const createdNets = [];

      // Helper to generate standardized room names
      const eventShort = eventId.slice(0, 8);
      const genRoomName = (netCode) => `redscar_evt_${eventShort}_${netCode.toLowerCase()}`;

      // Create squads
      for (const sq of suggestion.squads) {
        const squad = await base44.entities.Squad.create({
          name: sq.name,
          event_id: eventId,
          description: sq.role,
          type: sq.type
        });
        createdSquads.push(squad);
      }

      // Create voice nets
      for (const net of suggestion.nets) {
        const linkedSquadId = createdSquads.find(sq => sq.name === net.linkedSquad)?.id || null;
        
        const voiceNet = await base44.entities.VoiceNet.create({
          code: net.code,
          label: net.label,
          type: net.type,
          discipline: net.discipline,
          priority: net.priority,
          event_id: eventId,
          linked_squad_id: linkedSquadId,
          is_default_for_squad: net.type === 'squad',
          livekit_room_name: genRoomName(net.code),
          status: 'active'
        });
        createdNets.push(voiceNet);
      }

      return { squads: createdSquads, nets: createdNets };
    },
    onSuccess: () => {
      setStep('complete');
      queryClient.invalidateQueries({ queryKey: ['event-squads', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-nets', eventId] });
    }
  });

  const handleCreate = () => {
    setStep('creating');
    createMutation.mutate();
  };

  const handleComplete = () => {
    onOpenChange(false);
    if (onSuccess) onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-bold text-white">
            SQUAD & COMMS PLANNING
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            {/* Generating */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <Loader2 className="w-8 h-8 text-[#ea580c] animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-white">ANALYZING MISSION PARAMETERS</p>
                  <p className="text-xs text-zinc-400 mt-1">Generating optimal squad structure and voice net layout...</p>
                </div>
              </motion.div>
            )}

            {/* Review */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {error && (
                  <div className="p-3 bg-red-950/30 border border-red-900/30 rounded text-xs text-red-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>{error}</div>
                  </div>
                )}

                {suggestion && (
                  <>
                    {/* Squads */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-300 mb-2 flex items-center gap-2">
                        <Users className="w-3 h-3 text-[#ea580c]" />
                        SUGGESTED SQUADS ({suggestion.squads.length})
                      </h4>
                      <div className="grid gap-2">
                        {suggestion.squads.map((sq, idx) => (
                          <Card key={idx} className="bg-zinc-900/50 border-zinc-800 p-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-sm text-white">{sq.name}</div>
                                <div className="text-xs text-zinc-400">{sq.role}</div>
                              </div>
                              <Badge className="text-[8px] bg-emerald-900/50 text-emerald-300">EST. 3 USERS</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Voice Nets */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-zinc-300 mb-2 flex items-center gap-2">
                        <Radio className="w-3 h-3 text-[#ea580c]" />
                        GENERATED VOICE NETS ({suggestion.nets.length})
                      </h4>
                      <div className="grid gap-2">
                        {suggestion.nets.map((net, idx) => (
                          <Card key={idx} className={cn(
                            "bg-zinc-900/50 border-zinc-800 p-2",
                            net.type === 'command' && "border-red-900/30"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-white">{net.code}</span>
                                <span className="text-xs text-zinc-400">{net.label}</span>
                              </div>
                              <Badge className={cn(
                                "text-[8px]",
                                net.type === 'command' ? "bg-red-900/50 text-red-300" : "bg-zinc-800 text-zinc-300"
                              )}>
                                {net.type.toUpperCase()}
                              </Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Wing Structure */}
                    {suggestion.wingStructure && (
                      <div className="p-3 bg-amber-950/30 border border-amber-900/30 rounded text-xs text-amber-300">
                        <strong>Wing Structure Recommended:</strong> {suggestion.wingStructure.description}
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* Creating */}
            {step === 'creating' && (
              <motion.div
                key="creating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-white">PROVISIONING COMMS</p>
                  <p className="text-xs text-zinc-400 mt-1">Creating squads and voice nets...</p>
                </div>
              </motion.div>
            )}

            {/* Complete */}
            {step === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 gap-4"
              >
                <CheckCircle className="w-12 h-12 text-emerald-600" />
                <div className="text-center">
                  <p className="text-sm font-bold text-white">COMMS PROVISIONED</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {suggestion?.squads.length} squads and {suggestion?.nets.length} voice nets ready for operations.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 flex items-center justify-end gap-2">
          {step === 'review' && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-xs h-7"
              >
                CANCEL
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-[#ea580c] hover:bg-[#d97706] text-white text-xs h-7"
              >
                <Zap className="w-3 h-3 mr-1" /> CREATE & LAUNCH
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button
              onClick={handleComplete}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7"
            >
              PROCEED TO EVENT
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}