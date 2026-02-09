import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  RefreshCw,
  Save,
  Share2,
  SlidersHorizontal,
  SplitSquareVertical,
  Users,
} from 'lucide-react';
import {
  FITTING_LIBRARY,
  applyScenarioModifiers,
  computeFitOutcome,
  createFitDraft,
  normalizeFitCommentEntry,
  normalizeFitPlanEntry,
  summarizeTeamFits,
} from '@/components/fleet/fittingEngine';

const PERSONAL_DRAFTS_KEY = 'fleet.fitting.personalDrafts.v1';
const STAT_ORDER = ['dps', 'shield', 'mobility', 'utility', 'sustain'];
const STAT_LABELS = {
  dps: 'DPS',
  shield: 'Shield',
  mobility: 'Mobility',
  utility: 'Utility',
  sustain: 'Sustain',
};
const STAT_COLORS = {
  dps: '#f97316',
  shield: '#38bdf8',
  mobility: '#22c55e',
  utility: '#a855f7',
  sustain: '#eab308',
};
const SCENARIO_PRESETS = [
  { id: 'balanced', label: 'Balanced', values: { threat: 50, travel: 50, attrition: 50 } },
  { id: 'boarding', label: 'Boarding', values: { threat: 82, travel: 38, attrition: 74 } },
  { id: 'convoy', label: 'Convoy', values: { threat: 58, travel: 85, attrition: 62 } },
  { id: 'hot_lz', label: 'Hot LZ', values: { threat: 92, travel: 56, attrition: 82 } },
];

function toText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toLower(value) {
  return toText(value).toLowerCase();
}

function clamp(value, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, parsed));
}

function parseStorageDrafts(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function buildDraftFromPlan(plan) {
  const next = createFitDraft(plan?.type || 'ship');
  return {
    ...next,
    fitType: plan?.type || next.fitType,
    templateId: plan?.templateId || next.templateId,
    scopeType: plan?.scopeType || next.scopeType,
    scopeId: plan?.scopeId || '',
    roleTag: plan?.roleTag || '',
    title: plan?.title || '',
    notes: plan?.notes || '',
    slotAssignments: plan?.slotAssignments || {},
    parentPlanId: plan?.fitPlanId || null,
  };
}

function MetricCard({ label, value, tone = 'neutral' }) {
  const toneClass = tone === 'good'
    ? 'text-emerald-300'
    : tone === 'warn'
      ? 'text-orange-300'
      : tone === 'bad'
        ? 'text-red-300'
        : 'text-zinc-200';
  return (
    <div className="rounded border border-zinc-800 px-2 py-1 bg-zinc-950/50">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function StatBars({ stats, reference = null }) {
  return (
    <div className="space-y-2">
      {STAT_ORDER.map((key) => {
        const value = clamp(stats?.[key] ?? 0, 0, 100);
        const ref = reference ? clamp(reference?.[key] ?? 0, 0, 100) : null;
        const delta = ref == null ? null : Math.round(value - ref);
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
              <span className="text-zinc-400">{STAT_LABELS[key]}</span>
              <span className="text-zinc-200">
                {Math.round(value)}
                {delta != null && (
                  <span className={delta >= 0 ? 'text-emerald-300 ml-1' : 'text-red-300 ml-1'}>
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 rounded bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(90deg, ${STAT_COLORS[key]}88, ${STAT_COLORS[key]})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatRadar({ stats, title }) {
  const center = 72;
  const radius = 54;
  const points = STAT_ORDER.map((key, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / STAT_ORDER.length);
    const value = clamp(stats?.[key] ?? 0, 0, 100) / 100;
    const x = center + (Math.cos(angle) * radius * value);
    const y = center + (Math.sin(angle) * radius * value);
    return { key, x, y, angle };
  });
  const polygon = points.map((point) => `${point.x},${point.y}`).join(' ');
  return (
    <div className="border border-zinc-800 rounded p-2 bg-zinc-950/50">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{title}</div>
      <svg viewBox="0 0 144 144" className="w-full h-44" role="img" aria-label={title}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#27272a" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="#27272a" strokeWidth="1" />
        <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="#27272a" strokeWidth="1" />
        {points.map((point) => (
          <line
            key={`axis-${point.key}`}
            x1={center}
            y1={center}
            x2={center + Math.cos(point.angle) * radius}
            y2={center + Math.sin(point.angle) * radius}
            stroke="#3f3f46"
            strokeWidth="1"
          />
        ))}
        <polygon points={polygon} fill="rgba(249,115,22,0.22)" stroke="#f97316" strokeWidth="2" />
        {points.map((point) => (
          <g key={`point-${point.key}`}>
            <circle cx={point.x} cy={point.y} r="2.5" fill={STAT_COLORS[point.key]} />
            <text
              x={center + Math.cos(point.angle) * (radius + 11)}
              y={center + Math.sin(point.angle) * (radius + 11)}
              fill="#a1a1aa"
              fontSize="7"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {STAT_LABELS[point.key]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function RoleCoverage({ roleTags }) {
  const rows = Object.entries(roleTags || {}).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 6);
  const max = rows.length ? Number(rows[0][1]) : 0;
  if (!rows.length) return <div className="text-[11px] text-zinc-500">No shared role coverage yet.</div>;
  return (
    <div className="space-y-2">
      {rows.map(([role, count]) => {
        const width = max > 0 ? Math.round((Number(count) / max) * 100) : 0;
        return (
          <div key={role} className="space-y-1">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest">
              <span className="text-zinc-400">{role}</span>
              <span className="text-zinc-200">{count}</span>
            </div>
            <div className="h-2 rounded bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500/70 to-emerald-400/70" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ComparePanel({ plans }) {
  if (!plans?.length) return null;
  const [left, right] = plans;
  if (!left) return null;
  const leftStats = left.stats || {};
  const rightStats = right?.stats || null;
  return (
    <div className="rounded border border-zinc-700 bg-zinc-950/60 p-3 space-y-3">
      <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
        <SplitSquareVertical className="w-3 h-3" />
        Fit Comparison
      </div>
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2">
          <div className="text-zinc-300 font-semibold">{left.title}</div>
          <div className="text-[10px] text-zinc-500 uppercase">{left.type} · Score {left.score}</div>
          <StatBars stats={leftStats} />
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-950/40 p-2">
          {right ? (
            <>
              <div className="text-zinc-300 font-semibold">{right.title}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{right.type} · Score {right.score}</div>
              <StatBars stats={rightStats} reference={leftStats} />
            </>
          ) : (
            <div className="text-zinc-500 text-xs">Select another plan to compare side-by-side.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FittingWorkbench({
  activeEventId = null,
  activeEventTitle = '',
  onApplyToActiveAsset = null,
}) {
  const { user: authUser } = useAuth();
  const member = authUser?.member_profile_data || authUser;
  const memberId = toText(member?.id);
  const rank = toText(member?.rank).toUpperCase();
  const canModerate = Boolean(member?.is_admin) || rank === 'FOUNDER' || rank === 'PIONEER' || rank === 'COMMANDER';

  const [tab, setTab] = useState('builder');
  const [draft, setDraft] = useState(() => createFitDraft('ship'));
  const [scenario, setScenario] = useState({ threat: 50, travel: 50, attrition: 50 });
  const [compareIds, setCompareIds] = useState([]);
  const [personalDrafts, setPersonalDrafts] = useState([]);
  const [sharedPlans, setSharedPlans] = useState([]);
  const [fitComments, setFitComments] = useState([]);
  const [squads, setSquads] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [members, setMembers] = useState([]);
  const [feedScopeFilter, setFeedScopeFilter] = useState('all');
  const [feedTypeFilter, setFeedTypeFilter] = useState('all');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const squadById = useMemo(() => {
    const map = new Map();
    for (const squad of squads) {
      map.set(toText(squad?.id), squad);
    }
    return map;
  }, [squads]);

  const memberLabelMap = useMemo(() => {
    const map = new Map();
    for (const profile of members) {
      const id = toText(profile?.id);
      if (!id) continue;
      map.set(
        id,
        toText(profile?.display_callsign)
          || toText(profile?.callsign)
          || toText(profile?.full_name)
          || id
      );
    }
    return map;
  }, [members]);

  const ownMemberships = useMemo(() => (
    memberships.filter((entry) => {
      const entryMemberId = toText(entry?.member_profile_id || entry?.user_id);
      const status = toLower(entry?.status || 'active');
      return entryMemberId === memberId && status !== 'inactive';
    })
  ), [memberId, memberships]);

  const ownSquadIds = useMemo(() => (
    new Set(ownMemberships.map((entry) => toText(entry?.squad_id || entry?.squadId)).filter(Boolean))
  ), [ownMemberships]);

  const ownSquadsByLevel = useMemo(() => {
    const grouped = { fleet: [], wing: [], squad: [] };
    for (const squadId of ownSquadIds) {
      const squad = squadById.get(squadId);
      if (!squad) continue;
      const level = toLower(squad?.hierarchy_level || 'squad');
      if (level === 'fleet') grouped.fleet.push(squad);
      else if (level === 'wing') grouped.wing.push(squad);
      else grouped.squad.push(squad);
    }
    return grouped;
  }, [ownSquadIds, squadById]);

  const fitTypeLibrary = FITTING_LIBRARY[draft.fitType] || FITTING_LIBRARY.ship;
  const templateOptions = Array.isArray(fitTypeLibrary.templates) ? fitTypeLibrary.templates : [];
  const selectedTemplate = useMemo(() => (
    templateOptions.find((entry) => entry.id === draft.templateId) || templateOptions[0] || null
  ), [draft.templateId, templateOptions]);

  const fitOutcome = useMemo(() => computeFitOutcome(draft), [draft]);
  const scenarioProfile = useMemo(() => applyScenarioModifiers(fitOutcome.stats, scenario), [fitOutcome.stats, scenario]);
  const scenarioWeightedScore = useMemo(() => (
    clamp(Math.round((fitOutcome.score * 0.72) + (scenarioProfile.adjustedScore * 0.28)), 0, 100)
  ), [fitOutcome.score, scenarioProfile.adjustedScore]);

  const commentsByPlan = useMemo(() => {
    const map = new Map();
    for (const comment of fitComments) {
      const key = toText(comment?.fitPlanId);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(comment);
    }
    for (const [key, list] of map.entries()) {
      list.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
      map.set(key, list);
    }
    return map;
  }, [fitComments]);

  const visibleSharedPlans = useMemo(() => {
    const ownWingIds = new Set(ownSquadsByLevel.wing.map((entry) => toText(entry?.id)));
    const ownFleetIds = new Set(ownSquadsByLevel.fleet.map((entry) => toText(entry?.id)));
    return sharedPlans.filter((plan) => {
      const scopeType = toLower(plan?.scopeType || 'personal');
      const scopeId = toText(plan?.scopeId);
      const owner = toText(plan?.actorMemberProfileId);
      if (scopeType === 'personal') return owner === memberId;
      if (scopeType === 'squad') return ownSquadIds.has(scopeId) || owner === memberId || canModerate;
      if (scopeType === 'wing') return ownWingIds.has(scopeId) || owner === memberId || canModerate;
      if (scopeType === 'fleet') {
        if (!scopeId) return true;
        return ownFleetIds.has(scopeId) || owner === memberId || canModerate;
      }
      return owner === memberId || canModerate;
    });
  }, [canModerate, memberId, ownSquadIds, ownSquadsByLevel.fleet, ownSquadsByLevel.wing, sharedPlans]);

  const filteredSharedPlans = useMemo(() => (
    visibleSharedPlans.filter((plan) => {
      if (feedScopeFilter !== 'all' && toLower(plan.scopeType) !== feedScopeFilter) return false;
      if (feedTypeFilter !== 'all' && toLower(plan.type) !== feedTypeFilter) return false;
      return true;
    })
  ), [feedScopeFilter, feedTypeFilter, visibleSharedPlans]);

  const teamSummary = useMemo(() => summarizeTeamFits(filteredSharedPlans), [filteredSharedPlans]);
  const comparePlans = useMemo(() => {
    const byId = new Map(filteredSharedPlans.map((plan) => [toText(plan.id), plan]));
    return compareIds.map((id) => byId.get(id)).filter(Boolean);
  }, [compareIds, filteredSharedPlans]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPersonalDrafts(parseStorageDrafts(window.localStorage.getItem(PERSONAL_DRAFTS_KEY)));
  }, []);

  const persistPersonalDrafts = useCallback((nextDrafts) => {
    setPersonalDrafts(nextDrafts);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PERSONAL_DRAFTS_KEY, JSON.stringify(nextDrafts));
    }
  }, []);

  const resetDraft = useCallback((fitType = draft.fitType) => {
    setDraft(createFitDraft(fitType));
    setScenario({ threat: 50, travel: 50, attrition: 50 });
  }, [draft.fitType]);

  const loadCollaboration = useCallback(async () => {
    setLoading(true);
    try {
      const [squadList, membershipList, memberList, logs] = await Promise.all([
        base44.entities.Squad.list('-created_date', 200).catch(() => []),
        base44.entities.SquadMembership.list('-created_date', 500).catch(() => []),
        base44.entities.MemberProfile.list('-created_date', 400).catch(() => []),
        base44.entities.EventLog.list('-created_date', 900).catch(() => []),
      ]);
      setSquads(squadList || []);
      setMemberships(membershipList || []);
      setMembers(memberList || []);

      const entries = Array.isArray(logs) ? logs : [];
      const planRows = entries
        .filter((entry) => {
          const type = toText(entry?.type).toUpperCase();
          if (type === 'FIT_PLAN') return true;
          return toLower(entry?.details?.log_type) === 'fit_plan';
        })
        .map(normalizeFitPlanEntry)
        .filter(Boolean)
        .filter((entry) => {
          if (!activeEventId) return true;
          return !entry.eventId || entry.eventId === activeEventId;
        })
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

      const commentRows = entries
        .filter((entry) => {
          const type = toText(entry?.type).toUpperCase();
          if (type === 'FIT_PLAN_COMMENT') return true;
          return toLower(entry?.details?.log_type) === 'fit_plan_comment';
        })
        .map(normalizeFitCommentEntry)
        .filter(Boolean)
        .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

      setSharedPlans(planRows);
      setFitComments(commentRows);
    } catch (error) {
      console.error('FittingWorkbench load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load fitting collaboration data.' });
    } finally {
      setLoading(false);
    }
  }, [activeEventId]);

  useEffect(() => {
    loadCollaboration();
  }, [loadCollaboration]);

  useEffect(() => {
    const scopeType = draft.scopeType;
    setDraft((prev) => {
      if (scopeType === 'personal') {
        if (!prev.scopeId) return prev;
        return { ...prev, scopeId: '' };
      }
      if (scopeType === 'squad') {
        const preferred = ownSquadsByLevel.squad[0]?.id || '';
        if (prev.scopeId === preferred) return prev;
        return { ...prev, scopeId: preferred };
      }
      if (scopeType === 'wing') {
        const preferred = ownSquadsByLevel.wing[0]?.id || '';
        if (prev.scopeId === preferred) return prev;
        return { ...prev, scopeId: preferred };
      }
      if (scopeType === 'fleet') {
        const preferred = ownSquadsByLevel.fleet[0]?.id || '';
        if (prev.scopeId === preferred) return prev;
        return { ...prev, scopeId: preferred };
      }
      return prev;
    });
  }, [draft.scopeType, ownSquadsByLevel.fleet, ownSquadsByLevel.squad, ownSquadsByLevel.wing]);

  const updateDraftField = (field, value) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const updateSlot = (slotId, moduleId) => {
    setDraft((prev) => ({
      ...prev,
      slotAssignments: {
        ...(prev.slotAssignments || {}),
        [slotId]: moduleId,
      },
    }));
  };

  const setScenarioField = (field, value) => {
    setScenario((prev) => ({ ...prev, [field]: clamp(value, 0, 100) }));
  };

  const applyScenarioPreset = (presetId) => {
    const preset = SCENARIO_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setScenario(preset.values);
  };
  const savePersonalDraft = () => {
    const snapshot = {
      ...draft,
      id: draft.id || `fit_personal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      title: toText(draft.title, selectedTemplate?.label || 'Fit Draft'),
      score: fitOutcome.score,
      scenarioScore: scenarioWeightedScore,
      stats: fitOutcome.stats,
      adjustedStats: scenarioProfile.adjusted,
      scenarioProfile: scenarioProfile.scenarioVector,
      savedAt: new Date().toISOString(),
      activeEventId: activeEventId || null,
    };
    const nextDrafts = [snapshot, ...personalDrafts.filter((entry) => toText(entry?.id) !== toText(snapshot.id))].slice(0, 80);
    persistPersonalDrafts(nextDrafts);
    setBanner({ type: 'success', message: 'Personal fitting draft saved.' });
  };

  const applyDraftToAsset = async () => {
    if (!onApplyToActiveAsset) return;
    const payload = {
      title: toText(draft.title, selectedTemplate?.label || 'Fit Plan'),
      fitType: draft.fitType,
      templateId: selectedTemplate?.id || '',
      roleTag: toText(draft.roleTag, selectedTemplate?.role || 'multi-role'),
      scopeType: draft.scopeType,
      scopeId: draft.scopeId,
      slotAssignments: draft.slotAssignments || {},
      notes: draft.notes,
      score: fitOutcome.score,
      scenarioScore: scenarioWeightedScore,
      stats: fitOutcome.stats,
      adjustedStats: scenarioProfile.adjusted,
      scenarioProfile: scenarioProfile.scenarioVector,
      missingRequiredSlots: fitOutcome.missingRequiredSlots,
    };
    setBusy(true);
    try {
      const result = await onApplyToActiveAsset(payload);
      if (result?.ok === false) {
        setBanner({ type: 'error', message: result?.message || 'Failed to apply fit to active asset.' });
      } else {
        setBanner({ type: 'success', message: result?.message || 'Fit applied to active asset loadout library.' });
      }
    } catch (error) {
      console.error('Apply fit to asset failed:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to apply fit to active asset.' });
    } finally {
      setBusy(false);
    }
  };

  const publishSharedPlan = async () => {
    if (!memberId) {
      setBanner({ type: 'error', message: 'Member profile not available for collaboration publishing.' });
      return;
    }
    if (draft.scopeType !== 'personal' && !draft.scopeId) {
      setBanner({ type: 'error', message: 'Choose a scope target before publishing.' });
      return;
    }

    const fitPlanId = toText(draft.parentPlanId) || `fit_plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const priorVersions = sharedPlans.filter((entry) => toText(entry?.fitPlanId) === fitPlanId).map((entry) => Number(entry?.version || 1));
    const nextVersion = (priorVersions.length ? Math.max(...priorVersions) : 0) + 1;
    const title = toText(draft.title, `${selectedTemplate?.label || 'Fit'} Plan`);
    const roleTag = toText(draft.roleTag, selectedTemplate?.role || 'multi-role');

    const details = {
      log_type: 'fit_plan',
      fit_plan_id: fitPlanId,
      parent_plan_id: toText(draft.parentPlanId) || null,
      version: nextVersion,
      title,
      fit_type: draft.fitType,
      template_id: selectedTemplate?.id || '',
      role_tag: roleTag,
      scope_type: draft.scopeType,
      scope_id: draft.scopeType === 'personal' ? null : draft.scopeId,
      slot_assignments: draft.slotAssignments || {},
      notes: toText(draft.notes),
      score: fitOutcome.score,
      scenario_score: scenarioWeightedScore,
      stats: fitOutcome.stats,
      adjusted_stats: scenarioProfile.adjusted,
      scenario_profile: scenarioProfile.scenarioVector,
      missing_required_slots: fitOutcome.missingRequiredSlots,
      fitted_count: fitOutcome.fittedCount,
      required_count: fitOutcome.requiredCount,
      event_id: activeEventId || null,
      created_at: new Date().toISOString(),
    };

    setBusy(true);
    try {
      await base44.entities.EventLog.create({
        event_id: activeEventId || null,
        type: 'FIT_PLAN',
        severity: 'LOW',
        actor_member_profile_id: memberId,
        summary: `Fit Plan v${nextVersion}: ${title}`,
        details,
      });
      setBanner({ type: 'success', message: `Shared fit plan published (v${nextVersion}).` });
      setDraft((prev) => ({ ...prev, parentPlanId: fitPlanId }));
      await loadCollaboration();
    } catch (error) {
      console.error('Publish fit plan failed:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to publish fit plan.' });
    } finally {
      setBusy(false);
    }
  };

  const submitComment = async (fitPlanId) => {
    const message = toText(commentDrafts[fitPlanId]);
    if (!message || !memberId) return;
    setBusy(true);
    try {
      await base44.entities.EventLog.create({
        event_id: activeEventId || null,
        type: 'FIT_PLAN_COMMENT',
        severity: 'LOW',
        actor_member_profile_id: memberId,
        summary: 'Fit plan collaboration comment',
        details: {
          log_type: 'fit_plan_comment',
          fit_plan_id: fitPlanId,
          message,
          created_at: new Date().toISOString(),
        },
      });
      setCommentDrafts((prev) => ({ ...prev, [fitPlanId]: '' }));
      await loadCollaboration();
    } catch (error) {
      console.error('Fit comment failed:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to post collaboration comment.' });
    } finally {
      setBusy(false);
    }
  };

  const toggleCompare = (planId) => {
    const key = toText(planId);
    if (!key) return;
    setCompareIds((prev) => {
      if (prev.includes(key)) return prev.filter((entry) => entry !== key);
      if (prev.length < 2) return [...prev, key];
      return [prev[1], key];
    });
  };

  const activeScopeOptions = draft.scopeType === 'squad'
    ? ownSquadsByLevel.squad
    : draft.scopeType === 'wing'
      ? ownSquadsByLevel.wing
      : ownSquadsByLevel.fleet;

  return (
    <div className="space-y-4">
      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`inline-flex rounded border px-3 py-1 text-xs ${
            banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
          }`}
        >
          {banner.message}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration Board</TabsTrigger>
          <TabsTrigger value="personal">Personal Drafts</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="space-y-4 mt-4">
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 xl:col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <SlidersHorizontal className="w-3 h-3" />
                Fit Setup
              </div>
              <select
                value={draft.fitType}
                onChange={(event) => setDraft(createFitDraft(event.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                aria-label="Select fit type"
              >
                {Object.entries(FITTING_LIBRARY).map(([key, value]) => (
                  <option key={key} value={key}>{value.label}</option>
                ))}
              </select>
              <select
                value={selectedTemplate?.id || ''}
                onChange={(event) => updateDraftField('templateId', event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                aria-label="Select fit template"
              >
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>{template.label}</option>
                ))}
              </select>
              <Input value={draft.title} onChange={(event) => updateDraftField('title', event.target.value)} placeholder="Fit plan title" />
              <Input value={draft.roleTag} onChange={(event) => updateDraftField('roleTag', event.target.value)} placeholder="Role tag (interceptor, medic, support)" />
              <select
                value={draft.scopeType}
                onChange={(event) => updateDraftField('scopeType', event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                aria-label="Select share scope"
              >
                <option value="personal">Personal</option>
                <option value="squad">Squad</option>
                <option value="wing">Wing</option>
                <option value="fleet">Fleet</option>
              </select>
              {draft.scopeType !== 'personal' && (
                <select
                  value={draft.scopeId}
                  onChange={(event) => updateDraftField('scopeId', event.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                  aria-label="Select share scope target"
                >
                  <option value="">Select...</option>
                  {activeScopeOptions.map((squad) => (
                    <option key={squad.id} value={squad.id}>{squad.name || squad.id}</option>
                  ))}
                </select>
              )}
              <Textarea
                value={draft.notes}
                onChange={(event) => updateDraftField('notes', event.target.value)}
                placeholder="Doctrine notes and rationale"
                className="min-h-[84px]"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={savePersonalDraft}>
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
                <Button size="sm" onClick={publishSharedPlan} disabled={busy || loading}>
                  <Share2 className="w-3 h-3 mr-1" />
                  Share
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="outline" onClick={() => resetDraft()} disabled={busy}>Reset</Button>
                <Button size="sm" variant="outline" onClick={applyDraftToAsset} disabled={!onApplyToActiveAsset || busy}>Apply Asset</Button>
              </div>
            </div>

            <div className="col-span-3 xl:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Slot Matrix</div>
                <div className="text-[10px] text-zinc-400">
                  Event: {activeEventTitle || 'Global'} {activeEventId ? `(${activeEventId})` : '(not bound)'}
                </div>
              </div>
              {!selectedTemplate ? (
                <div className="text-xs text-zinc-500">No template available.</div>
              ) : (
                <div className="space-y-2">
                  {selectedTemplate.slots.map((slot) => {
                    const options = fitTypeLibrary.modules?.[slot.category] || [];
                    const value = toText(draft.slotAssignments?.[slot.id]);
                    return (
                      <div key={slot.id} className="rounded border border-zinc-800 bg-zinc-950/40 p-2 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">
                            {slot.label}
                            {slot.required && <span className="text-red-300 ml-1">*</span>}
                          </span>
                          <span className="text-[10px] uppercase tracking-widest text-zinc-500">{slot.category}</span>
                        </div>
                        <select
                          value={value}
                          onChange={(event) => updateSlot(slot.id, event.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                          aria-label={`Select module for ${slot.label}`}
                        >
                          <option value="">Unassigned</option>
                          {options.map((module) => (
                            <option key={module.id} value={module.id}>{module.label}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-1">
                          {options.map((module) => (
                            <button
                              key={`${slot.id}-${module.id}`}
                              type="button"
                              onClick={() => updateSlot(slot.id, module.id)}
                              className={`text-[10px] px-2 py-0.5 rounded border transition ${
                                value === module.id
                                  ? 'border-orange-400/70 text-orange-200 bg-orange-500/10'
                                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
                              }`}
                            >
                              {module.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="col-span-5 xl:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Scenario Simulator</div>
                <div className="text-[10px] text-zinc-400">Weighted score {scenarioWeightedScore}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SCENARIO_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="sm"
                    variant="outline"
                    className="text-[10px]"
                    onClick={() => applyScenarioPreset(preset.id)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'threat', label: 'Threat Pressure' },
                  { id: 'travel', label: 'Travel Distance' },
                  { id: 'attrition', label: 'Attrition Risk' },
                ].map((entry) => (
                  <div key={entry.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500">
                      <span>{entry.label}</span>
                      <span className="text-zinc-300">{scenario[entry.id]}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scenario[entry.id]}
                      aria-label={entry.label}
                      onChange={(event) => setScenarioField(entry.id, Number(event.target.value || 0))}
                      className="w-full"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatRadar stats={scenarioProfile.adjusted} title="Scenario-Adjusted Radar" />
                <div className="space-y-2">
                  <MetricCard label="Base Score" value={`${fitOutcome.score}`} tone={fitOutcome.score >= 70 ? 'good' : fitOutcome.score >= 50 ? 'warn' : 'bad'} />
                  <MetricCard label="Scenario Score" value={`${scenarioProfile.adjustedScore}`} tone={scenarioProfile.adjustedScore >= 70 ? 'good' : scenarioProfile.adjustedScore >= 50 ? 'warn' : 'bad'} />
                  <MetricCard
                    label="Delta"
                    value={`${scenarioProfile.scoreDelta >= 0 ? '+' : ''}${scenarioProfile.scoreDelta}`}
                    tone={scenarioProfile.scoreDelta >= 0 ? 'good' : 'warn'}
                  />
                  <StatBars stats={scenarioProfile.adjusted} reference={fitOutcome.stats} />
                </div>
              </div>
              {fitOutcome.missingRequiredSlots.length > 0 && (
                <div className="text-[10px] text-orange-300">
                  Required slots missing: {fitOutcome.missingRequiredSlots.join(', ')}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Team Board
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <MetricCard label="Plans" value={`${teamSummary.total}`} tone="neutral" />
                <MetricCard label="Avg Score" value={`${teamSummary.avgScore}`} tone={teamSummary.avgScore >= 70 ? 'good' : teamSummary.avgScore >= 50 ? 'warn' : 'bad'} />
              </div>
              <select
                value={feedScopeFilter}
                onChange={(event) => setFeedScopeFilter(event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                aria-label="Filter collaboration board by scope"
              >
                <option value="all">All scopes</option>
                <option value="personal">Personal</option>
                <option value="squad">Squad</option>
                <option value="wing">Wing</option>
                <option value="fleet">Fleet</option>
              </select>
              <select
                value={feedTypeFilter}
                onChange={(event) => setFeedTypeFilter(event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                aria-label="Filter collaboration board by fit type"
              >
                <option value="all">All fit types</option>
                <option value="ship">Ship</option>
                <option value="vehicle">Vehicle</option>
                <option value="fps">FPS</option>
              </select>
              <Button size="sm" variant="outline" onClick={loadCollaboration} disabled={loading || busy}>
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Role Coverage</div>
                <RoleCoverage roleTags={teamSummary.roleTags} />
              </div>
            </div>

            <div className="col-span-3 bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
              <ComparePanel plans={comparePlans} />
              <div className="text-xs uppercase tracking-widest text-zinc-500">Shared Plans</div>
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredSharedPlans.length === 0 && (
                  <div className="text-xs text-zinc-500 border border-zinc-800 rounded p-3 bg-zinc-950/50">
                    No shared plans found for this filter and access scope.
                  </div>
                )}
                {filteredSharedPlans.map((plan) => {
                  const planComments = commentsByPlan.get(toText(plan.fitPlanId)) || [];
                  const ownerLabel = memberLabelMap.get(toText(plan.actorMemberProfileId)) || plan.actorMemberProfileId || 'Unknown';
                  const scopeName = plan.scopeId ? (squadById.get(plan.scopeId)?.name || plan.scopeId) : plan.scopeType;
                  const compared = compareIds.includes(toText(plan.id));
                  return (
                    <div key={plan.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm text-white font-semibold">{plan.title}</div>
                          <div className="text-[10px] text-zinc-500 uppercase">
                            {plan.type} · {plan.scopeType} ({scopeName}) · v{plan.version} · Score {plan.score}
                          </div>
                          <div className="text-[10px] text-zinc-500">by {ownerLabel} · {formatDate(plan.createdAt)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant={compared ? 'default' : 'outline'} onClick={() => toggleCompare(plan.id)}>
                            Compare
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDraft(buildDraftFromPlan(plan))}>
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setDraft(buildDraftFromPlan(plan));
                              setTab('builder');
                            }}
                          >
                            Branch
                          </Button>
                        </div>
                      </div>

                      <StatBars stats={plan.stats || {}} />
                      <div className="text-xs text-zinc-300">{plan.notes || 'No notes provided.'}</div>
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Collaboration ({planComments.length})
                        </div>
                        {planComments.slice(0, 3).map((comment) => (
                          <div key={comment.id} className="text-[11px] text-zinc-300 border border-zinc-800 rounded px-2 py-1 bg-zinc-950/40">
                            <span className="text-zinc-500 mr-1">
                              {memberLabelMap.get(toText(comment.actorMemberProfileId)) || comment.actorMemberProfileId || 'Unknown'}:
                            </span>
                            {comment.message}
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            value={commentDrafts[plan.fitPlanId] || ''}
                            onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [plan.fitPlanId]: event.target.value }))}
                            placeholder="Add collaboration note..."
                            aria-label={`Add collaboration note for ${plan.title}`}
                          />
                          <Button size="sm" onClick={() => submitComment(plan.fitPlanId)} disabled={busy}>Post</Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Personal Draft Library</div>
            {personalDrafts.length === 0 ? (
              <div className="text-xs text-zinc-500">No personal drafts yet. Build a fit and press Save.</div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {personalDrafts.map((entry) => (
                  <div key={entry.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-white font-semibold">{entry.title || entry.templateId || 'Draft'}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">
                        {entry.fitType} · {entry.scopeType} · base {entry.score ?? '-'} · scenario {entry.scenarioScore ?? '-'}
                      </div>
                      <div className="text-[10px] text-zinc-500">{formatDate(entry.savedAt || entry.createdAt)}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDraft(buildDraftFromPlan(entry))}>Load</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const next = personalDrafts.filter((draftRow) => toText(draftRow?.id) !== toText(entry?.id));
                          persistPersonalDrafts(next);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
