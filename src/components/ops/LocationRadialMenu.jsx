import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { X, MessageSquare, AlertTriangle, Target, Users, Navigation, Zap, Briefcase, Flag, Info } from 'lucide-react';
import { ACTION_CONFIG, LOCATION_MENU_ACTIONS } from '@/components/utils/starCitizenLocations';

const ICON_MAP = {
  Info, Flag, MessageSquare, AlertTriangle, Target, Users, Navigation, Zap, Briefcase
};

export default function LocationRadialMenu({ location, onClose, eventId, userRank = 'VAGRANT' }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [formData, setFormData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available actions for this user's rank
  const availableActions = LOCATION_MENU_ACTIONS[userRank] || LOCATION_MENU_ACTIONS.VAGRANT;
  const actions = availableActions.map(actionId => ({
    id: actionId,
    ...ACTION_CONFIG[actionId]
  }));

  const angleSlice = (360 / actions.length) * (Math.PI / 180);

  // Handle action submission
  const handleActionSubmit = async () => {
    if (!formData.trim() && selectedAction.id !== 'view_info') return;

    setIsSubmitting(true);
    try {
      const actionMap = {
        report_location: () => base44.entities.EventLog.create({
          event_id: eventId,
          type: 'LOCATION_REPORT',
          severity: 'LOW',
          actor_user_id: 'current',
          summary: `Location reported: ${location.name}`,
          details: { location_id: location.id, system: location.system }
        }),
        mark_note: () => base44.entities.MapMarker.create({
          event_id: eventId,
          type: 'note',
          label: `Note: ${location.name}`,
          coordinates: location.location,
          description: formData,
          color: '#f59e0b'
        }),
        report_incident: () => base44.entities.Incident.create({
          title: `Incident: ${location.name}`,
          description: formData,
          severity: 'HIGH',
          status: 'active',
          incident_type: 'other',
          coordinates: location.location,
          event_id: eventId
        }),
        mark_objective: () => base44.entities.MapMarker.create({
          event_id: eventId,
          type: 'objective',
          label: `Objective: ${location.name}`,
          coordinates: location.location,
          description: formData,
          color: '#8b5cf6'
        }),
        mark_muster: () => base44.entities.MapMarker.create({
          event_id: eventId,
          type: 'rally',
          label: `Muster: ${location.name}`,
          coordinates: location.location,
          description: formData || 'Muster point',
          color: '#ec4899'
        }),
        mark_evac: () => base44.entities.MapMarker.create({
          event_id: eventId,
          type: 'extraction',
          label: `Evac: ${location.name}`,
          coordinates: location.location,
          description: formData || 'Evacuation route',
          color: '#06b6d4'
        }),
        leave_intel: () => base44.entities.EventLog.create({
          event_id: eventId,
          type: 'INTEL',
          severity: 'MEDIUM',
          actor_user_id: 'current',
          summary: `Intel left at ${location.name}`,
          details: { location_id: location.id, intel: formData }
        })
      };

      const action = actionMap[selectedAction.id];
      if (action) {
        await action();
        toast.success(`${selectedAction.label} recorded`);
        setSelectedAction(null);
        setFormData('');
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Failed to record action');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedAction && selectedAction.id !== 'view_info') {
    // Form mode
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 p-4 rounded w-96 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white uppercase text-sm">{selectedAction.label}</h3>
            <button onClick={() => setSelectedAction(null)} className="text-zinc-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-zinc-400 mb-2">{location.name}</div>

          <textarea
            placeholder="Enter details..."
            value={formData}
            onChange={(e) => setFormData(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs p-2 h-20 resize-none"
          />

          <div className="flex gap-2">
            <button
              onClick={handleActionSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-xs py-2"
            >
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT'}
            </button>
            <button
              onClick={() => setSelectedAction(null)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs py-2"
            >
              CANCEL
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Radial Menu */}
      <div className="relative w-80 h-80">
        {/* Center circle - Location info */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-32 h-32 bg-zinc-900 border-2 border-[#ea580c] rounded-full flex flex-col items-center justify-center p-3 text-center">
            <div className="font-bold text-white text-xs uppercase">{location.name}</div>
            <div className="text-[9px] text-zinc-400 mt-1">{location.system}</div>
            {location.parent && <div className="text-[8px] text-zinc-500 mt-0.5">{location.parent}</div>}
          </div>
        </motion.div>

        {/* Radial menu items */}
        <AnimatePresence>
          {actions.map((action, idx) => {
            const angle = idx * angleSlice - Math.PI / 2;
            const radius = 120;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const Icon = ICON_MAP[action.icon];

            return (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedAction(action)}
                className="absolute w-12 h-12 rounded-full flex items-center justify-center border-2 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                }}
                title={action.label}
              >
                <Icon className="w-5 h-5" style={{ color: action.color }} />
              </motion.button>
            );
          })}
        </AnimatePresence>

        {/* Close button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute top-2 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 rounded"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}