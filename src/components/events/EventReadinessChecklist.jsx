import React from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CHECKLIST_ITEMS = [
  { key: 'comms_provisioned', label: 'COMMS PROVISIONED', description: 'Voice nets and channels established' },
  { key: 'minimum_attendance_met', label: 'MINIMUM ATTENDANCE', description: 'Required participants present' },
  { key: 'roles_assigned', label: 'ROLES ASSIGNED', description: 'All critical positions filled' },
  { key: 'assets_deployed', label: 'ASSETS DEPLOYED', description: 'Required equipment ready' }
];

export default function EventReadinessChecklist({ event, canEdit }) {
  const [checklist, setChecklist] = React.useState(event.readiness_checklist || {});
  const [isUpdating, setIsUpdating] = React.useState(false);

  const toggleItem = async (key) => {
    if (!canEdit) return;

    setIsUpdating(true);
    try {
      const updated = { ...checklist, [key]: !checklist[key] };
      await base44.entities.Event.update(event.id, { readiness_checklist: updated });
      setChecklist(updated);
    } catch (err) {
      toast.error('UPDATE FAILED');
    } finally {
      setIsUpdating(false);
    }
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const isReady = completedCount === CHECKLIST_ITEMS.length;

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center justify-between">
          <span>READINESS CHECKLIST</span>
          <span className="text-[9px] font-mono text-zinc-500">
            {completedCount}/{CHECKLIST_ITEMS.length}
          </span>
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-2">
        {/* Readiness Status */}
        <div className={cn(
          'p-3 rounded border',
          isReady ? 'bg-emerald-900/10 border-emerald-900/50' : 'bg-amber-900/10 border-amber-900/30'
        )}>
          <div className="flex items-center gap-2">
            {isReady ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400">OPERATION READY FOR ACTIVATION</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">INCOMPLETE - ACTIVATE RESTRICTED</span>
              </>
            )}
          </div>
        </div>

        {/* Checklist Items */}
        <div className="space-y-1.5">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = checklist[item.key] || false;

            return (
              <button
                key={item.key}
                onClick={() => toggleItem(item.key)}
                disabled={!canEdit}
                className={cn(
                  'w-full p-2 rounded border text-left transition-all',
                  isChecked && 'bg-emerald-900/10 border-emerald-900/30',
                  !isChecked && 'bg-zinc-950/30 border-zinc-800 hover:border-zinc-700',
                  !canEdit && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="flex items-start gap-2">
                  {isChecked ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                  ) : (
                    <Circle className="w-3 h-3 text-zinc-600 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className={cn("text-xs font-bold", isChecked ? 'text-emerald-400' : 'text-zinc-300')}>
                      {item.label}
                    </div>
                    <div className="text-[9px] text-zinc-600">{item.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </OpsPanelContent>
    </OpsPanel>
  );
}