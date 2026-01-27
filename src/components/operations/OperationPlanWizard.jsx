/**
 * OperationPlanWizard: Multi-step operation planning flow
 * 
 * Rank-gated steps:
 * - Scout: Create Op, define objectives, plan comms, assign squads
 * - Voyager/Founder: Approve/lock plan, assign command staff, set doctrine
 * 
 * Steps:
 * 1. Operation Details (title, type, description)
 * 2. Objectives & Checklist
 * 3. Comms Plan (smart defaults)
 * 4. Squad Assignment
 * 5. Map & Markers
 * 6. Command Staff (Voyager+ only) 
 * 7. Safety & ROE
 * 8. Review & Launch
 */

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import OperationalReadinessMeter from './OperationalReadinessMeter';
import {
  getCommsDefaults,
  getObjectiveTemplate,
  getCommandStaffTemplate,
  getMapMarkerTemplate
} from './operationPlanDefaults';

const STEPS = [
  { id: 'details', label: 'Details', icon: '1' },
  { id: 'objectives', label: 'Objectives', icon: '2' },
  { id: 'comms', label: 'Comms', icon: '3' },
  { id: 'squads', label: 'Squads', icon: '4' },
  { id: 'map', label: 'Map', icon: '5' },
  { id: 'command', label: 'Command', icon: '6', requiresVoyager: true },
  { id: 'safety', label: 'Safety', icon: '7' },
  { id: 'review', label: 'Review', icon: '8' }
];

export default function OperationPlanWizard({ open, onOpenChange, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'casual',
    operation_type: 'general',
    objectives: [],
    comms_nets: [],
    assigned_squads: [],
    map_markers: [],
    command_staff: {},
    safety_acknowledged: false
  });

  useEffect(() => {
    if (open) {
      base44.auth.me().then(setUser).catch(e => console.error(e));
    }
  }, [open]);

  // Load smart defaults when event type changes
  useEffect(() => {
    const loadDefaults = async () => {
      const commsDefaults = getCommsDefaults(formData.event_type, formData.operation_type);
      const objDefaults = getObjectiveTemplate(formData.operation_type, formData.event_type);

      setFormData(prev => ({
        ...prev,
        comms_nets: commsDefaults,
        objectives: objDefaults.map(obj => ({ ...obj, id: `obj-${Date.now()}-${Math.random()}` })),
        command_staff: getCommandStaffTemplate(formData.event_type),
        map_markers: getMapMarkerTemplate(formData.operation_type).map((m, i) => ({
          ...m,
          id: `marker-${i}`,
          coordinates: { lat: 0, lng: 0 }
        }))
      }));
    };

    if (formData.title) loadDefaults();
  }, [formData.event_type, formData.operation_type]);

  // Check if step is accessible
  const isStepAccessible = (step) => {
    if (step.requiresVoyager && user?.rank && !['Voyager', 'Pioneer'].includes(user.rank)) {
      return false;
    }
    return true;
  };

  const visibleSteps = STEPS.filter(isStepAccessible);
  const currentVisibleIndex = visibleSteps.findIndex(s => s.id === STEPS[currentStep].id);

  const canProceed = () => {
    const step = STEPS[currentStep];
    switch (step.id) {
      case 'details':
        return formData.title && formData.event_type;
      case 'objectives':
        return formData.objectives.length > 0;
      case 'comms':
        return formData.comms_nets.length > 0;
      case 'squads':
        return formData.event_type === 'casual' || formData.assigned_squads.length > 0;
      case 'map':
        return formData.event_type === 'casual' || (
          formData.map_markers.some(m => m.type === 'rally') &&
          formData.map_markers.some(m => m.type === 'extraction')
        );
      case 'command':
        return formData.command_staff.commander_id;
      case 'safety':
        return formData.event_type === 'casual' || formData.safety_acknowledged;
      default:
        return true;
    }
  };

  const createOperationMutation = useMutation({
    mutationFn: async () => {
      const event = await base44.entities.Event.create({
        title: formData.title,
        description: formData.description,
        event_type: formData.event_type,
        status: 'scheduled',
        priority: formData.event_type === 'focused' ? 'HIGH' : 'STANDARD',
        start_time: new Date().toISOString(),
        location: formData.operation_type,
        host_id: user.id,
        assigned_user_ids: [user.id],
        tags: [formData.operation_type],
        phase: 'PLANNING',
        command_staff: formData.command_staff,
        readiness_checklist: {
          comms_provisioned: formData.comms_nets.length > 0,
          minimum_attendance_met: true,
          roles_assigned: formData.assigned_squads.length > 0 || formData.event_type === 'casual',
          assets_deployed: false
        }
      });

      // Create map markers
      if (formData.map_markers.length > 0) {
        await Promise.all(formData.map_markers.map(marker =>
          base44.entities.MapMarker.create({
            event_id: event.id,
            type: marker.type,
            label: marker.label,
            coordinates: marker.coordinates
          })
        ));
      }

      // Log operation plan creation
      await base44.entities.EventLog.create({
        event_id: event.id,
        type: 'SYSTEM',
        severity: 'LOW',
        actor_user_id: user.id,
        summary: `Operation plan initialized: ${formData.event_type.toUpperCase()}`,
        details: {
          event_type: formData.event_type,
          comms_nets: formData.comms_nets.length,
          objectives: formData.objectives.length,
          squads: formData.assigned_squads.length
        }
      });

      return event;
    },
    onSuccess: (event) => {
      onOpenChange(false);
      onComplete?.(event);
    }
  });

  const handleNext = () => {
    if (currentVisibleIndex < visibleSteps.length - 1) {
      const nextStep = visibleSteps[currentVisibleIndex + 1];
      setCurrentStep(STEPS.findIndex(s => s.id === nextStep.id));
    }
  };

  const handlePrev = () => {
    if (currentVisibleIndex > 0) {
      const prevStep = visibleSteps[currentVisibleIndex - 1];
      setCurrentStep(STEPS.findIndex(s => s.id === prevStep.id));
    }
  };

  if (!open || !user) return null;

  const step = STEPS[currentStep];
  const isLastStep = currentVisibleIndex === visibleSteps.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 p-4 space-y-2">
          <h2 className="text-sm font-bold text-white">OPERATION PLANNING WIZARD</h2>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {visibleSteps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    const stepIndex = STEPS.findIndex(st => st.id === s.id);
                    setCurrentStep(stepIndex);
                  }}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    currentStep === STEPS.findIndex(st => st.id === s.id)
                      ? 'bg-[#ea580c] text-white'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  )}
                >
                  {s.icon}
                </button>
                {idx < visibleSteps.length - 1 && <div className="w-6 h-px bg-zinc-800" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {step.id === 'details' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase">Operation Name</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-[#ea580c]"
                  placeholder="e.g., Rescue at Olisar"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-[#ea580c] resize-none h-20"
                  placeholder="Operation briefing..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-mono text-zinc-500 uppercase">Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm"
                  >
                    <option value="casual">Casual</option>
                    <option value="focused">Focused</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-500 uppercase">Operation</label>
                  <select
                    value={formData.operation_type}
                    onChange={(e) => setFormData({ ...formData, operation_type: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm"
                  >
                    <option value="general">General</option>
                    <option value="rescue">Rescue</option>
                    <option value="industry">Industry</option>
                    <option value="racing">Racing</option>
                    <option value="combat">Combat</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step.id === 'objectives' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                {formData.objectives.length} objective{formData.objectives.length !== 1 ? 's' : ''} defined
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {formData.objectives.map((obj, idx) => (
                  <div key={obj.id} className="p-2 border border-zinc-800 bg-zinc-900/50">
                    <input
                      type="text"
                      value={obj.text}
                      onChange={(e) => {
                        const updated = [...formData.objectives];
                        updated[idx].text = e.target.value;
                        setFormData({ ...formData, objectives: updated });
                      }}
                      className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-[#ea580c]"
                      placeholder={`Objective ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setFormData({
                  ...formData,
                  objectives: [...formData.objectives, { id: `obj-${Date.now()}`, text: '', is_completed: false, sub_tasks: [] }]
                })}
                variant="outline"
                className="w-full text-xs h-8"
              >
                + Add Objective
              </Button>
            </div>
          )}

          {step.id === 'comms' && (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                {formData.comms_nets.length} net{formData.comms_nets.length !== 1 ? 's' : ''} provisioned
              </div>
              {formData.comms_nets.map((net, idx) => (
                <div key={idx} className="p-2 border border-zinc-800 bg-zinc-900/50 text-xs space-y-1">
                  <p className="font-bold">{net.code}</p>
                  <p className="text-zinc-500">{net.label}</p>
                  <Badge variant="outline" className="text-[9px]">{net.discipline}</Badge>
                </div>
              ))}
            </div>
          )}

          {step.id === 'squads' && (
            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">{formData.assigned_squads.length} squad{formData.assigned_squads.length !== 1 ? 's' : ''} assigned</p>
              <p className="text-zinc-500">(Auto-configured based on event type)</p>
            </div>
          )}

          {step.id === 'map' && (
            <div className="space-y-3 text-xs">
              <p className="text-zinc-400">{formData.map_markers.length} marker{formData.map_markers.length !== 1 ? 's' : ''}</p>
              <p className="text-zinc-500">(Configure on tactical map)</p>
            </div>
          )}

          {step.id === 'command' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase">Commander</label>
                <p className="mt-2 text-xs text-zinc-400">{user.callsign} (You)</p>
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase">Executive Officer</label>
                <select className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm">
                  <option value="">Assign later</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-mono text-zinc-500 uppercase">Comms Officer</label>
                <select className="w-full mt-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm">
                  <option value="">Assign later</option>
                </select>
              </div>
            </div>
          )}

          {step.id === 'safety' && (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-none">
                <p className="text-xs text-amber-300 font-mono">
                  Operations require acknowledge of safety protocols and ROE.
                </p>
              </div>
              <button
                onClick={() => setFormData({ ...formData, safety_acknowledged: !formData.safety_acknowledged })}
                className={cn(
                  'flex items-center gap-2 p-3 border text-xs transition-all',
                  formData.safety_acknowledged
                    ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                )}
              >
                <CheckCircle2 className={cn('w-4 h-4', formData.safety_acknowledged && 'text-emerald-500')} />
                I acknowledge safety protocols and ROE
              </button>
            </div>
          )}

          {step.id === 'review' && (
            <div className="space-y-4">
              <OperationalReadinessMeter
                event={formData}
                eventType={formData.event_type}
                commsNets={formData.comms_nets}
                objectives={formData.objectives}
                mapMarkers={formData.map_markers}
                safetyAcknowledged={formData.safety_acknowledged}
              />
              <div className="border-t border-zinc-800 pt-3 space-y-2 text-xs">
                <p className="text-zinc-400">{formData.title}</p>
                <p className="text-zinc-500">{formData.description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4 flex items-center justify-between gap-2">
          <Button
            onClick={handlePrev}
            disabled={currentVisibleIndex === 0}
            variant="outline"
            className="text-xs h-8"
          >
            <ArrowLeft className="w-3 h-3 mr-1" /> BACK
          </Button>

          <p className="text-xs text-zinc-500 font-mono">
            {currentVisibleIndex + 1} / {visibleSteps.length}
          </p>

          {!isLastStep ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs h-8"
            >
              NEXT <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={() => createOperationMutation.mutate()}
              disabled={createOperationMutation.isPending || !canProceed()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
            >
              {createOperationMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" /> LAUNCHING...
                </>
              ) : (
                <>LAUNCH OPERATION</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}