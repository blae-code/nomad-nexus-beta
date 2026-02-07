import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Clock3, Radio, Shield, Target } from 'lucide-react';

const PRIORITIES = ['STANDARD', 'HIGH', 'CRITICAL'];

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function assignedMemberIds(event) {
  const rows = Array.isArray(event?.assigned_member_profile_ids)
    ? event.assigned_member_profile_ids
    : Array.isArray(event?.assigned_user_ids)
      ? event.assigned_user_ids
      : [];
  return rows.map((entry) => text(entry)).filter(Boolean);
}

function formatDate(value) {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleString();
}

export default function OperationExecutionPanel({ event, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [members, setMembers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [executionState, setExecutionState] = useState({
    checklistItems: [],
    roleCards: [],
    quantumSync: null,
    voiceTopology: null,
    contractLinks: [],
    tacticalCallouts: [],
    attendanceCount: 0,
    checklistCompletion: 0,
  });

  const [checklistForm, setChecklistForm] = useState({ label: '', category: 'preflight', status: 'PENDING', required: true, role: '' });
  const [roleCardForm, setRoleCardForm] = useState({ memberProfileId: '', role: '', ship: '', loadout: '', notes: '' });
  const [syncForm, setSyncForm] = useState({ rallyAt: '', launchAt: '', fallbackAt: '', rationale: '' });
  const [calloutForm, setCalloutForm] = useState({ message: '', priority: 'STANDARD', calloutType: 'STATUS', objectiveStatus: '', location: '' });
  const [contractForm, setContractForm] = useState({ contractPostId: '' });

  const assignedIds = useMemo(() => assignedMemberIds(event), [event]);

  const memberMap = useMemo(() => {
    const map = {};
    for (const member of members) {
      map[member.id] = member.display_callsign || member.callsign || member.full_name || member.email || member.id;
    }
    return map;
  }, [members]);

  const loadContext = useCallback(async () => {
    if (!event?.id) return;
    setLoading(true);
    try {
      const [stateResponse, memberRows, contractRows] = await Promise.all([
        invokeMemberFunction('updateMissionControl', {
          action: 'get_operation_execution_state',
          eventId: event.id,
        }),
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
        base44.entities.MissionBoardPost.filter({ status: 'open' }, '-created_date', 160).catch(() => []),
      ]);

      const payload = stateResponse?.data || {};
      if (payload?.success && payload?.state) {
        setExecutionState(payload.state);
      }
      setMembers(memberRows || []);
      setContracts(contractRows || []);

      if (!roleCardForm.memberProfileId && assignedIds[0]) {
        setRoleCardForm((prev) => ({ ...prev, memberProfileId: assignedIds[0] }));
      }
    } catch (error) {
      setBanner({ type: 'error', message: error?.message || 'Failed to load operation execution context.' });
    } finally {
      setLoading(false);
    }
  }, [assignedIds, event?.id, roleCardForm.memberProfileId]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const runAction = async (payload, successMessage, reset) => {
    if (!event?.id) return false;
    setBusy(true);
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateMissionControl', {
        ...payload,
        eventId: event.id,
      });
      const body = response?.data || {};
      if (!body?.success) {
        setBanner({ type: 'error', message: body?.error || 'Operation action failed.' });
        return false;
      }
      if (typeof reset === 'function') {
        reset();
      }
      setBanner({ type: 'success', message: successMessage });
      await loadContext();
      await onRefresh?.();
      return true;
    } catch (error) {
      setBanner({ type: 'error', message: error?.message || 'Operation action failed.' });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const linkedContracts = executionState.contractLinks || [];
  const checklistItems = executionState.checklistItems || [];
  const roleCards = executionState.roleCards || [];
  const callouts = executionState.tacticalCallouts || [];

  return (
    <div className="space-y-4">
      {banner && (
        <div className={`rounded border p-3 text-xs ${banner.type === 'success' ? 'border-green-500/40 bg-green-500/10 text-green-300' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="border border-zinc-700 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Attendance</div>
          <div className="text-lg font-bold text-white mt-1">{executionState.attendanceCount || 0}</div>
        </div>
        <div className="border border-zinc-700 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Checklist</div>
          <div className="text-lg font-bold text-white mt-1">{executionState.checklistCompletion || 0}%</div>
        </div>
        <div className="border border-zinc-700 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Voice Lanes</div>
          <div className="text-lg font-bold text-white mt-1">{executionState.voiceTopology?.nets?.length || 0}</div>
        </div>
        <div className="border border-zinc-700 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Linked Contracts</div>
          <div className="text-lg font-bold text-white mt-1">{linkedContracts.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Radio className="w-3.5 h-3.5" />Operation Voice Topology</div>
          <div className="text-xs text-zinc-400">Provision command, squad, logistics, and air lanes per operation.</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => runAction(
                { action: 'provision_operation_voice_topology', mode: 'casual' },
                'Casual operation topology provisioned.'
              )}
              disabled={busy || !event?.id}
            >
              Provision Casual
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAction(
                { action: 'provision_operation_voice_topology', mode: 'focused' },
                'Focused operation topology provisioned.'
              )}
              disabled={busy || !event?.id}
            >
              Provision Focused
            </Button>
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {(executionState.voiceTopology?.nets || []).map((net) => (
              <div key={net.id || net.code} className="text-[11px] text-zinc-300 border border-zinc-800 rounded p-2">
                {net.label || net.code} <span className="text-zinc-500">({net.discipline || 'casual'})</span>
              </div>
            ))}
            {!executionState.voiceTopology?.nets?.length && (
              <div className="text-[11px] text-zinc-500">No operation-specific voice topology provisioned yet.</div>
            )}
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" />Rally + Quantum Sync</div>
          <div className="grid grid-cols-3 gap-2">
            <Input type="datetime-local" value={syncForm.rallyAt} onChange={(e) => setSyncForm((prev) => ({ ...prev, rallyAt: e.target.value }))} aria-label="Rally time" />
            <Input type="datetime-local" value={syncForm.launchAt} onChange={(e) => setSyncForm((prev) => ({ ...prev, launchAt: e.target.value }))} aria-label="Launch time" />
            <Input type="datetime-local" value={syncForm.fallbackAt} onChange={(e) => setSyncForm((prev) => ({ ...prev, fallbackAt: e.target.value }))} aria-label="Fallback time" />
          </div>
          <Input value={syncForm.rationale} onChange={(e) => setSyncForm((prev) => ({ ...prev, rationale: e.target.value }))} placeholder="Sync rationale" />
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'set_quantum_sync_timer',
                rallyAt: syncForm.rallyAt ? new Date(syncForm.rallyAt).toISOString() : '',
                launchAt: syncForm.launchAt ? new Date(syncForm.launchAt).toISOString() : '',
                fallbackAt: syncForm.fallbackAt ? new Date(syncForm.fallbackAt).toISOString() : '',
                rationale: syncForm.rationale,
              },
              'Quantum sync timeline updated.'
            )}
            disabled={busy || (!syncForm.rallyAt && !syncForm.launchAt && !syncForm.fallbackAt)}
          >
            Save Quantum Sync
          </Button>
          {executionState.quantumSync && (
            <div className="text-[11px] text-zinc-400 border border-zinc-800 rounded p-2">
              Rally: {formatDate(executionState.quantumSync.rally_at)} | Launch: {formatDate(executionState.quantumSync.launch_at)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" />Pre-Op Checklist</div>
          <div className="grid grid-cols-2 gap-2">
            <Input value={checklistForm.label} onChange={(e) => setChecklistForm((prev) => ({ ...prev, label: e.target.value }))} placeholder="Checklist item" aria-label="Checklist item" />
            <Input value={checklistForm.category} onChange={(e) => setChecklistForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" aria-label="Checklist category" />
            <select
              value={checklistForm.status}
              onChange={(e) => setChecklistForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Checklist status"
            >
              <option value="PENDING">Pending</option>
              <option value="DONE">Done</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            <Input value={checklistForm.role} onChange={(e) => setChecklistForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="Role owner" aria-label="Role owner" />
          </div>
          <label className="text-xs text-zinc-400 flex items-center gap-2">
            <input type="checkbox" checked={checklistForm.required} onChange={(e) => setChecklistForm((prev) => ({ ...prev, required: e.target.checked }))} />
            Required for launch
          </label>
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'record_preflight_checklist',
                label: checklistForm.label,
                category: checklistForm.category,
                status: checklistForm.status,
                required: checklistForm.required,
                role: checklistForm.role,
              },
              'Checklist updated.',
              () => setChecklistForm((prev) => ({ ...prev, label: '' }))
            )}
            disabled={busy || !checklistForm.label.trim()}
          >
            Save Checklist Item
          </Button>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {checklistItems.length === 0 ? (
              <div className="text-[11px] text-zinc-500">No checklist items recorded yet.</div>
            ) : (
              checklistItems.map((item) => (
                <button
                  key={item.item_id}
                  type="button"
                  className={`w-full text-left text-[11px] border rounded p-2 ${item.status === 'DONE' ? 'border-green-500/30 bg-green-500/10 text-green-200' : item.status === 'BLOCKED' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-zinc-700 bg-zinc-900/40 text-zinc-300'}`}
                  onClick={() => runAction(
                    {
                      action: 'record_preflight_checklist',
                      itemId: item.item_id,
                      label: item.label,
                      category: item.category,
                      role: item.role,
                      required: item.required,
                      status: item.status === 'DONE' ? 'PENDING' : 'DONE',
                    },
                    'Checklist status updated.'
                  )}
                >
                  {item.status === 'DONE' ? '✓' : item.status === 'BLOCKED' ? '!' : '○'} {item.label}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Shield className="w-3.5 h-3.5" />Role Cards + Tactical Callouts</div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={roleCardForm.memberProfileId}
              onChange={(e) => setRoleCardForm((prev) => ({ ...prev, memberProfileId: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
              aria-label="Role card member"
            >
              {assignedIds.map((id) => (
                <option key={id} value={id}>{memberMap[id] || id}</option>
              ))}
            </select>
            <Input value={roleCardForm.role} onChange={(e) => setRoleCardForm((prev) => ({ ...prev, role: e.target.value }))} placeholder="Role" aria-label="Role" />
            <Input value={roleCardForm.ship} onChange={(e) => setRoleCardForm((prev) => ({ ...prev, ship: e.target.value }))} placeholder="Ship" aria-label="Assigned ship" />
            <Input value={roleCardForm.loadout} onChange={(e) => setRoleCardForm((prev) => ({ ...prev, loadout: e.target.value }))} placeholder="Loadout" aria-label="Loadout" />
          </div>
          <Textarea value={roleCardForm.notes} onChange={(e) => setRoleCardForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Role notes" className="min-h-[60px]" />
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'assign_operation_role_card',
                memberProfileId: roleCardForm.memberProfileId,
                role: roleCardForm.role,
                ship: roleCardForm.ship,
                loadout: roleCardForm.loadout,
                notes: roleCardForm.notes,
              },
              'Role card assigned.',
              () => setRoleCardForm((prev) => ({ ...prev, role: '', ship: '', loadout: '', notes: '' }))
            )}
            disabled={busy || !roleCardForm.memberProfileId || !roleCardForm.role.trim()}
          >
            Assign Role Card
          </Button>

          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <Textarea value={calloutForm.message} onChange={(e) => setCalloutForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="Tactical callout..." className="min-h-[60px]" />
            <div className="grid grid-cols-3 gap-2">
              <select value={calloutForm.priority} onChange={(e) => setCalloutForm((prev) => ({ ...prev, priority: e.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm" aria-label="Callout priority">
                {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
              </select>
              <Input value={calloutForm.calloutType} onChange={(e) => setCalloutForm((prev) => ({ ...prev, calloutType: e.target.value }))} placeholder="Type" aria-label="Callout type" />
              <Input value={calloutForm.location} onChange={(e) => setCalloutForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Marker location" aria-label="Marker location" />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runAction(
                {
                  action: 'push_tactical_callout',
                  message: calloutForm.message,
                  priority: calloutForm.priority,
                  calloutType: calloutForm.calloutType,
                  marker: calloutForm.location ? { location: calloutForm.location } : null,
                  objectiveStatus: calloutForm.objectiveStatus,
                },
                'Tactical callout broadcast.',
                () => setCalloutForm((prev) => ({ ...prev, message: '', location: '' }))
              )}
              disabled={busy || !calloutForm.message.trim()}
            >
              Broadcast Callout
            </Button>
          </div>

          <div className="space-y-1 max-h-28 overflow-y-auto">
            {callouts.slice(0, 4).map((callout) => (
              <div key={callout.id} className="text-[11px] text-zinc-300 border border-zinc-800 rounded p-2">
                <span className={`${callout.priority === 'CRITICAL' ? 'text-red-300' : callout.priority === 'HIGH' ? 'text-orange-300' : 'text-zinc-400'} uppercase mr-1`}>{callout.priority}</span>
                {callout.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Target className="w-3.5 h-3.5" />Contract Linkage</div>
          <div className="text-xs text-zinc-400">Attach async Contract Exchange jobs to this operation runbook.</div>
          <select
            value={contractForm.contractPostId}
            onChange={(e) => setContractForm({ contractPostId: e.target.value })}
            className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
            aria-label="Contract post"
          >
            <option value="">Select contract post...</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>{contract.title || contract.id}</option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => runAction(
              {
                action: 'link_contract_post',
                contractPostId: contractForm.contractPostId,
              },
              'Contract linked to operation.',
              () => setContractForm({ contractPostId: '' })
            )}
            disabled={busy || !contractForm.contractPostId}
          >
            Link Contract
          </Button>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {linkedContracts.length === 0 ? (
              <div className="text-[11px] text-zinc-500">No contracts linked.</div>
            ) : (
              linkedContracts.map((contract) => (
                <div key={contract.contract_post_id} className="text-[11px] border border-zinc-800 rounded p-2 text-zinc-300">
                  {contract.title || contract.contract_post_id} <span className="text-zinc-500">({contract.status || 'open'})</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-zinc-800 rounded p-4 bg-zinc-900/40 space-y-3">
          <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" />Auto Debrief Analytics</div>
          <div className="text-xs text-zinc-400">Generate an operation report with attendance, objective completion, and comms metrics.</div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runAction(
              { action: 'generate_operation_debrief' },
              'Automated operation debrief generated.'
            )}
            disabled={busy || !event?.id}
          >
            Generate Auto Debrief
          </Button>
          <div className="text-[11px] text-zinc-500">Execution feed updates in real time from mission control logs.</div>
        </div>
      </div>

      {loading && <div className="text-xs text-zinc-500">Loading operation execution context...</div>}

      {roleCards.length > 0 && (
        <div className="border border-zinc-800 rounded p-3 bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Current Role Cards</div>
          <div className="grid grid-cols-3 gap-2">
            {roleCards.map((card) => (
              <div key={card.member_profile_id} className="border border-zinc-800 rounded p-2 text-[11px] text-zinc-300">
                <div className="font-semibold text-white">{memberMap[card.member_profile_id] || card.member_profile_id}</div>
                <div>{card.role}</div>
                {(card.ship || card.loadout) && <div className="text-zinc-500 mt-1">{[card.ship, card.loadout].filter(Boolean).join(' | ')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
