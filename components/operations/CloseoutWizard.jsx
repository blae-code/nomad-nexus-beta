import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CloseoutWizard({ session, onComplete }) {
  const [checklist, setChecklist] = useState(session?.closeout_checklist || {
    aar_completed: false,
    treasury_settled: false,
    all_personnel_accounted: false,
    incident_reports_closed: false,
    command_debrief: false
  });
  const [aarDraft, setAarDraft] = useState(session?.aar_draft?.summary || '');
  const [user, setUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Close session mutation
  const closeMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.OpsSession.update(session.id, {
        status: 'CLOSED',
        ended_at: new Date().toISOString(),
        closeout_checklist: checklist,
        aar_draft: { ...session.aar_draft, summary: aarDraft },
        closed_by: user.id,
        archived_at: new Date().toISOString()
      });
    }
  });

  const isFocused = session?.brief_artifact?.comms_plan?.doctrine === 'focused';
  const isFounderOrPioneer = user?.rank === 1 || user?.rank === 2; // Founder/Pioneer
  const allChecklistItems = Object.values(checklist).every(v => v === true);
  const canClose = allChecklistItems && (!isFocused || isFounderOrPioneer);

  const requiredItems = [
    { key: 'aar_completed', label: 'AAR Completed', required: true },
    { key: 'all_personnel_accounted', label: 'All Personnel Accounted For', required: true },
    { key: 'incident_reports_closed', label: 'Incident Reports Closed', required: isFocused },
    { key: 'command_debrief', label: 'Command Debrief', required: isFocused },
    { key: 'treasury_settled', label: 'Treasury Settled', required: false }
  ];

  return (
    <div className="space-y-4 p-4 border border-zinc-800 bg-zinc-950/50 rounded-none">
      <div>
        <h3 className="text-sm font-bold uppercase text-zinc-300 mb-3">CLOSEOUT CHECKLIST</h3>

        {/* Checklist Items */}
        <div className="space-y-2 mb-4">
          {requiredItems.map(item => (
            <label
              key={item.key}
              className="flex items-center gap-2 p-2 bg-zinc-900/30 border border-zinc-800 cursor-pointer hover:bg-zinc-900/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={checklist[item.key] || false}
                onChange={(e) =>
                  setChecklist(prev => ({
                    ...prev,
                    [item.key]: e.target.checked
                  }))
                }
                className="w-4 h-4 accent-[#ea580c]"
              />
              <span className="flex-1 text-[9px] font-mono text-zinc-300">
                {item.label}
                {item.required && <span className="text-red-500 ml-1">*</span>}
              </span>
              {checklist[item.key] && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
            </label>
          ))}
        </div>

        {/* AAR Draft Editor */}
        <div className="mb-4">
          <label className="block text-[9px] font-bold uppercase text-zinc-400 mb-2">
            AAR SUMMARY DRAFT
          </label>
          <textarea
            value={aarDraft}
            onChange={(e) => setAarDraft(e.target.value)}
            placeholder="Enter after-action report summary..."
            className="w-full h-24 p-2 bg-zinc-900/50 border border-zinc-800 text-[9px] text-zinc-200 rounded-none focus:outline-none focus:border-[#ea580c] resize-none font-mono"
          />
        </div>

        {/* Approval Gate for Focused Ops */}
        {isFocused && !isFounderOrPioneer && (
          <div className="p-2 border border-red-800 bg-red-950/20 mb-4">
            <div className="flex gap-2 text-[8px] text-red-300">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <p>Founder/Pioneer approval required to finalize Focused operation closeout.</p>
            </div>
          </div>
        )}

        {/* Close Button */}
        <Button
          onClick={() => closeMutation.mutate()}
          disabled={!canClose || closeMutation.isPending}
          className={cn(
            'w-full h-9 text-[9px] font-bold uppercase',
            allChecklistItems && (!isFocused || isFounderOrPioneer)
              ? 'bg-emerald-700 hover:bg-emerald-600'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          {closeMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ARCHIVING...
            </>
          ) : (
            '✓ CLOSE & ARCHIVE OPERATION'
          )}
        </Button>

        {allChecklistItems && (
          <p className="text-[8px] text-emerald-500 text-center mt-2">
            ✓ All closeout items completed
          </p>
        )}
      </div>
    </div>
  );
}