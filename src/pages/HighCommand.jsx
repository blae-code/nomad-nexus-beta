import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl, getDisplayCallsign } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadgeCheck, Gavel, Handshake, Scale, Users } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const DEFAULT_DIRECTIVE_FORM = {
  title: '',
  summary: '',
  policyArea: 'operations',
  priority: 'STANDARD',
  tags: '',
};

const DEFAULT_VOTE_FORM = {
  question: '',
  options: 'Approve,Reject,Abstain',
};

const DEFAULT_DIPLOMACY_FORM = {
  partnerName: '',
  stance: 'neutral',
  status: 'active',
  terms: '',
  envoyMemberProfileId: '',
  notes: '',
};

const DEFAULT_ALLIANCE_FORM = {
  allianceName: '',
  partners: '',
  status: 'proposed',
  terms: '',
};

const DEFAULT_ALLIANCE_STATUS_FORM = {
  allianceName: '',
  status: 'active',
  reason: '',
};

function toList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asDateLabel(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function hasCouncilAccess(member) {
  const rank = String(member?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  if (Boolean(member?.is_admin)) return true;
  const roles = Array.isArray(member?.roles) ? member.roles.map((role) => String(role || '').toLowerCase()) : [];
  return roles.includes('admin') || roles.includes('command') || roles.includes('officer') || roles.includes('diplomat');
}

function parseHighCommandLogs(logs) {
  const normalized = Array.isArray(logs) ? logs : [];
  const directives = normalized
    .filter((entry) => String(entry?.type || '').toUpperCase() === 'HIGH_COMMAND_DIRECTIVE')
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.created_date || null,
      summary: entry.summary || '',
      ...entry.details,
    }));

  const diplomacy = normalized
    .filter((entry) => String(entry?.type || '').toUpperCase() === 'HIGH_COMMAND_DIPLOMACY')
    .map((entry) => ({
      id: entry.id,
      createdAt: entry.created_date || null,
      summary: entry.summary || '',
      ...entry.details,
    }));

  const allianceLogs = normalized.filter((entry) => {
    const type = String(entry?.type || '').toUpperCase();
    return type === 'HIGH_COMMAND_ALLIANCE' || type === 'HIGH_COMMAND_ALLIANCE_STATUS';
  });

  const allianceMap = new Map();
  for (const entry of allianceLogs.sort((a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime())) {
    const details = entry?.details || {};
    const allianceName = String(details?.alliance_name || '').trim();
    if (!allianceName) continue;
    const current = allianceMap.get(allianceName) || {
      allianceName,
      status: 'proposed',
      partners: [],
      terms: '',
      updatedAt: entry?.created_date || null,
      timeline: [],
    };
    current.status = String(details?.status || current.status || 'proposed').toLowerCase();
    if (Array.isArray(details?.partners)) current.partners = details.partners;
    if (details?.terms) current.terms = String(details.terms);
    current.updatedAt = entry?.created_date || current.updatedAt;
    current.timeline.push({
      id: entry.id,
      type: entry.type,
      status: String(details?.status || '').toLowerCase(),
      reason: String(details?.reason || ''),
      createdAt: entry.created_date || null,
    });
    allianceMap.set(allianceName, current);
  }

  const alliances = Array.from(allianceMap.values()).sort(
    (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
  );

  return { directives, diplomacy, alliances };
}

function tallyPoll(poll) {
  const counts = {};
  const options = Array.isArray(poll?.options) ? poll.options : [];
  for (const option of options) counts[String(option?.id || '')] = 0;
  const votes = Array.isArray(poll?.votes) ? poll.votes : [];
  for (const vote of votes) {
    const selected = Array.isArray(vote?.selected_option_ids) ? vote.selected_option_ids : [];
    for (const optionId of selected) {
      const key = String(optionId || '');
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

export default function HighCommand() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const councilAccess = useMemo(() => hasCouncilAccess(member), [member]);
  const voterUserId = user?.id || member?.user_id || member?.id || '';
  const [tab, setTab] = useState('governance');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [polls, setPolls] = useState([]);
  const [members, setMembers] = useState([]);
  const [directiveForm, setDirectiveForm] = useState(DEFAULT_DIRECTIVE_FORM);
  const [voteForm, setVoteForm] = useState(DEFAULT_VOTE_FORM);
  const [diplomacyForm, setDiplomacyForm] = useState(DEFAULT_DIPLOMACY_FORM);
  const [allianceForm, setAllianceForm] = useState(DEFAULT_ALLIANCE_FORM);
  const [allianceStatusForm, setAllianceStatusForm] = useState(DEFAULT_ALLIANCE_STATUS_FORM);

  const { directives, diplomacy, alliances } = useMemo(
    () => parseHighCommandLogs(eventLogs),
    [eventLogs]
  );

  const metrics = useMemo(() => {
    const openVotes = polls.filter((poll) => {
      if (!poll?.closes_at) return true;
      return new Date(poll.closes_at).getTime() > Date.now();
    }).length;
    const activeDiplomacy = diplomacy.filter((entry) => String(entry?.status || '').toLowerCase() === 'active').length;
    const activeAlliances = alliances.filter((entry) => ['active', 'ratified'].includes(String(entry?.status || '').toLowerCase())).length;
    return {
      directives: directives.length,
      openVotes,
      activeDiplomacy,
      activeAlliances,
    };
  }, [directives, diplomacy, alliances, polls]);

  const loadHighCommand = async () => {
    setLoading(true);
    try {
      const [logList, pollList, memberList] = await Promise.all([
        base44.entities.EventLog.list('-created_date', 450).catch(() => []),
        base44.entities.Poll.filter({ scope: 'GLOBAL', scope_id: 'HIGH_COMMAND' }, '-created_date', 80).catch(() => []),
        base44.entities.MemberProfile.list('-created_date', 250).catch(() => []),
      ]);

      const scopedLogs = (logList || []).filter((entry) => String(entry?.type || '').toUpperCase().startsWith('HIGH_COMMAND_'));
      const pollsWithVotes = await Promise.all(
        (pollList || []).map(async (poll) => {
          const votes = await base44.entities.PollVote.filter({ poll_id: poll.id }).catch(() => []);
          return { ...poll, votes: votes || [] };
        })
      );
      setEventLogs(scopedLogs);
      setPolls(pollsWithVotes);
      setMembers(memberList || []);
    } catch (error) {
      console.error('HighCommand load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load High Command data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHighCommand();
  }, []);

  useEffect(() => {
    if (!diplomacyForm.envoyMemberProfileId && member?.id) {
      setDiplomacyForm((prev) => ({ ...prev, envoyMemberProfileId: member.id }));
    }
  }, [member?.id, diplomacyForm.envoyMemberProfileId]);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateHighCommand', payload);
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'High Command update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || 'High Command updated.' });
      }
      await loadHighCommand();
      return result;
    } catch (error) {
      console.error('HighCommand action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'High Command update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const submitDirective = async () => {
    if (!directiveForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'issue_directive',
        title: directiveForm.title.trim(),
        summary: directiveForm.summary.trim(),
        policyArea: directiveForm.policyArea.trim(),
        priority: directiveForm.priority,
        tags: toList(directiveForm.tags),
      },
      'Governance directive issued.'
    );
    if (result?.success) setDirectiveForm(DEFAULT_DIRECTIVE_FORM);
  };

  const submitVote = async () => {
    if (!voteForm.question.trim()) return;
    const result = await runAction(
      {
        action: 'open_vote',
        question: voteForm.question.trim(),
        options: toList(voteForm.options),
      },
      'Council vote opened.'
    );
    if (result?.success) setVoteForm(DEFAULT_VOTE_FORM);
  };

  const castVote = async (pollId, optionId) => {
    await runAction(
      {
        action: 'cast_vote',
        pollId,
        optionId,
        userId: voterUserId,
      },
      'Vote submitted.'
    );
  };

  const submitDiplomacy = async () => {
    if (!diplomacyForm.partnerName.trim()) return;
    const result = await runAction(
      {
        action: 'register_diplomatic_entry',
        partnerName: diplomacyForm.partnerName.trim(),
        stance: diplomacyForm.stance,
        status: diplomacyForm.status,
        terms: diplomacyForm.terms.trim(),
        envoyMemberProfileId: diplomacyForm.envoyMemberProfileId || null,
        notes: diplomacyForm.notes.trim(),
      },
      'Diplomatic registry updated.'
    );
    if (result?.success) setDiplomacyForm((prev) => ({ ...DEFAULT_DIPLOMACY_FORM, envoyMemberProfileId: prev.envoyMemberProfileId }));
  };

  const submitAlliance = async () => {
    if (!allianceForm.allianceName.trim()) return;
    const result = await runAction(
      {
        action: 'register_alliance',
        allianceName: allianceForm.allianceName.trim(),
        partners: toList(allianceForm.partners),
        status: allianceForm.status,
        terms: allianceForm.terms.trim(),
      },
      'Alliance recorded.'
    );
    if (result?.success) {
      setAllianceStatusForm((prev) => ({ ...prev, allianceName: allianceForm.allianceName.trim() }));
      setAllianceForm(DEFAULT_ALLIANCE_FORM);
    }
  };

  const submitAllianceStatus = async () => {
    if (!allianceStatusForm.allianceName.trim()) return;
    const result = await runAction(
      {
        action: 'update_alliance_status',
        allianceName: allianceStatusForm.allianceName.trim(),
        status: allianceStatusForm.status,
        reason: allianceStatusForm.reason.trim(),
      },
      'Alliance status updated.'
    );
    if (result?.success) setAllianceStatusForm((prev) => ({ ...prev, reason: '' }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading High Command...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">High Command</h1>
          <p className="text-zinc-400 text-sm">Governance directives, organization-wide voting, diplomatic registry, and alliance management</p>
          <div className="text-[10px] text-zinc-500 mt-2 uppercase">Council Access: <span className={councilAccess ? 'text-green-400' : 'text-zinc-400'}>{councilAccess ? 'Granted' : 'Restricted'}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('CommandCenter')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Command Center</a>
          <a href={createPageUrl('CommsConsole')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Comms</a>
        </div>
      </div>

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

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Directives</div><div className="text-lg font-bold text-cyan-300">{metrics.directives}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Open Votes</div><div className="text-lg font-bold text-orange-300">{metrics.openVotes}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Active Diplomatic Entries</div><div className="text-lg font-bold text-yellow-300">{metrics.activeDiplomacy}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Active Alliances</div><div className="text-lg font-bold text-green-300">{metrics.activeAlliances}</div></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="governance">Governance Framework</TabsTrigger>
          <TabsTrigger value="voting">Voting System</TabsTrigger>
          <TabsTrigger value="diplomacy">Diplomatic Registry</TabsTrigger>
          <TabsTrigger value="alliances">Alliance Management</TabsTrigger>
        </TabsList>

        <TabsContent value="governance" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Gavel className="w-3 h-3" />Issue Directive</div>
              <Input value={directiveForm.title} onChange={(event) => setDirectiveForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Directive title" />
              <Textarea value={directiveForm.summary} onChange={(event) => setDirectiveForm((prev) => ({ ...prev, summary: event.target.value }))} className="min-h-[90px]" placeholder="Policy summary" />
              <Input value={directiveForm.policyArea} onChange={(event) => setDirectiveForm((prev) => ({ ...prev, policyArea: event.target.value }))} placeholder="Policy area" />
              <select value={directiveForm.priority} onChange={(event) => setDirectiveForm((prev) => ({ ...prev, priority: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="LOW">LOW</option>
                <option value="STANDARD">STANDARD</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <Input value={directiveForm.tags} onChange={(event) => setDirectiveForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
              <Button onClick={submitDirective} disabled={actionBusy || !councilAccess || !directiveForm.title.trim()}>Issue Directive</Button>
              {!councilAccess && <div className="text-[10px] text-zinc-500">Council privileges required.</div>}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Scale className="w-3 h-3" />Current Governance Directives</div>
              {directives.length === 0 ? (
                <div className="text-xs text-zinc-500">No directives recorded.</div>
              ) : (
                directives.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((directive) => (
                  <div key={directive.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{directive.title || directive.summary || 'Directive'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{directive.policy_area || 'operations'} · {directive.priority || 'STANDARD'}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(directive.createdAt)}</div>
                    </div>
                    {directive.summary && <div className="text-xs text-zinc-300 mt-1">{directive.summary}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="voting" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><BadgeCheck className="w-3 h-3" />Open Council Vote</div>
              <Input value={voteForm.question} onChange={(event) => setVoteForm((prev) => ({ ...prev, question: event.target.value }))} placeholder="Vote question" />
              <Textarea value={voteForm.options} onChange={(event) => setVoteForm((prev) => ({ ...prev, options: event.target.value }))} className="min-h-[80px]" placeholder="Options separated by commas" />
              <Button onClick={submitVote} disabled={actionBusy || !councilAccess || !voteForm.question.trim()}>Open Vote</Button>
              {!councilAccess && <div className="text-[10px] text-zinc-500">Council privileges required.</div>}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Open & Historical Votes</div>
              {polls.length === 0 ? (
                <div className="text-xs text-zinc-500">No votes created.</div>
              ) : (
                polls.map((poll) => {
                  const counts = tallyPoll(poll);
                  const totalVotes = Array.isArray(poll?.votes) ? poll.votes.length : 0;
                  const userVote = (poll?.votes || []).find((vote) => String(vote?.user_id || '') === String(voterUserId || ''));
                  const closed = poll?.closes_at ? new Date(poll.closes_at).getTime() < Date.now() : false;
                  return (
                    <div key={poll.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white font-semibold">{poll.question}</div>
                        <div className="text-[10px] text-zinc-500">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} · ends {poll.closes_at ? asDateLabel(poll.closes_at) : 'n/a'}</div>
                      </div>
                      <div className="space-y-1.5">
                        {(poll.options || []).map((option) => {
                          const count = counts[option.id] || 0;
                          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                          const voted = userVote?.selected_option_ids?.includes(option.id);
                          return (
                            <button
                              key={option.id}
                              onClick={() => !userVote && !closed && castVote(poll.id, option.id)}
                              disabled={Boolean(userVote) || closed || actionBusy}
                              className={`w-full p-2 rounded border text-left text-xs transition-colors ${
                                voted
                                  ? 'bg-orange-500/20 border-orange-500'
                                  : userVote || closed
                                    ? 'bg-zinc-900/30 border-zinc-700 cursor-not-allowed'
                                    : 'bg-zinc-900/30 border-zinc-700 hover:border-orange-500/50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-200">{option.text}</span>
                                <span className="text-[10px] text-zinc-500">{count} ({pct}%)</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diplomacy" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Handshake className="w-3 h-3" />Register Diplomatic Entry</div>
              <Input value={diplomacyForm.partnerName} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, partnerName: event.target.value }))} placeholder="Partner faction/org" />
              <select value={diplomacyForm.stance} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, stance: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="allied">allied</option>
                <option value="neutral">neutral</option>
                <option value="trade">trade</option>
                <option value="ceasefire">ceasefire</option>
                <option value="hostile">hostile</option>
              </select>
              <select value={diplomacyForm.status} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="active">active</option>
                <option value="pending">pending</option>
                <option value="suspended">suspended</option>
                <option value="terminated">terminated</option>
              </select>
              <select value={diplomacyForm.envoyMemberProfileId} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, envoyMemberProfileId: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="">No envoy selected</option>
                {members.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {getDisplayCallsign(profile) || profile.full_name || profile.id}
                  </option>
                ))}
              </select>
              <Textarea value={diplomacyForm.terms} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, terms: event.target.value }))} className="min-h-[70px]" placeholder="Terms/agreements" />
              <Textarea value={diplomacyForm.notes} onChange={(event) => setDiplomacyForm((prev) => ({ ...prev, notes: event.target.value }))} className="min-h-[60px]" placeholder="Notes" />
              <Button onClick={submitDiplomacy} disabled={actionBusy || !councilAccess || !diplomacyForm.partnerName.trim()}>Record Diplomacy</Button>
              {!councilAccess && <div className="text-[10px] text-zinc-500">Council privileges required.</div>}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Diplomatic Registry</div>
              {diplomacy.length === 0 ? (
                <div className="text-xs text-zinc-500">No diplomatic entries logged.</div>
              ) : (
                diplomacy.slice().sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((entry) => (
                  <div key={entry.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{entry.partner_name || 'Partner'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{entry.stance || 'neutral'} · {entry.status || 'active'}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(entry.createdAt)}</div>
                    </div>
                    {entry.terms && <div className="text-xs text-zinc-300 mt-1">{entry.terms}</div>}
                    {entry.notes && <div className="text-[10px] text-zinc-500 mt-1">{entry.notes}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alliances" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Users className="w-3 h-3" />Alliance Management</div>
              <Input value={allianceForm.allianceName} onChange={(event) => setAllianceForm((prev) => ({ ...prev, allianceName: event.target.value }))} placeholder="Alliance name" />
              <Input value={allianceForm.partners} onChange={(event) => setAllianceForm((prev) => ({ ...prev, partners: event.target.value }))} placeholder="Partners (comma-separated)" />
              <select value={allianceForm.status} onChange={(event) => setAllianceForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="proposed">proposed</option>
                <option value="active">active</option>
                <option value="ratified">ratified</option>
                <option value="suspended">suspended</option>
                <option value="dissolved">dissolved</option>
              </select>
              <Textarea value={allianceForm.terms} onChange={(event) => setAllianceForm((prev) => ({ ...prev, terms: event.target.value }))} className="min-h-[70px]" placeholder="Alliance terms" />
              <Button onClick={submitAlliance} disabled={actionBusy || !councilAccess || !allianceForm.allianceName.trim()}>Create / Record Alliance</Button>

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Update Alliance Status</div>
                <select value={allianceStatusForm.allianceName} onChange={(event) => setAllianceStatusForm((prev) => ({ ...prev, allianceName: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                  <option value="">Select alliance</option>
                  {alliances.map((entry) => <option key={entry.allianceName} value={entry.allianceName}>{entry.allianceName}</option>)}
                </select>
                <select value={allianceStatusForm.status} onChange={(event) => setAllianceStatusForm((prev) => ({ ...prev, status: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                  <option value="active">active</option>
                  <option value="ratified">ratified</option>
                  <option value="suspended">suspended</option>
                  <option value="dissolved">dissolved</option>
                </select>
                <Input value={allianceStatusForm.reason} onChange={(event) => setAllianceStatusForm((prev) => ({ ...prev, reason: event.target.value }))} placeholder="Reason/context" />
                <Button onClick={submitAllianceStatus} disabled={actionBusy || !councilAccess || !allianceStatusForm.allianceName.trim()}>Update Status</Button>
              </div>
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Alliance Registry</div>
              {alliances.length === 0 ? (
                <div className="text-xs text-zinc-500">No alliances tracked yet.</div>
              ) : (
                alliances.map((alliance) => (
                  <div key={alliance.allianceName} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{alliance.allianceName}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{alliance.status || 'proposed'} · updated {asDateLabel(alliance.updatedAt)}</div>
                      </div>
                      <div className="text-[10px] text-orange-300">{Array.isArray(alliance.partners) ? alliance.partners.length : 0} partner(s)</div>
                    </div>
                    {Array.isArray(alliance.partners) && alliance.partners.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {alliance.partners.map((partner) => (
                          <span key={`${alliance.allianceName}-${partner}`} className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400">
                            {partner}
                          </span>
                        ))}
                      </div>
                    )}
                    {alliance.terms && <div className="text-xs text-zinc-300 mt-1">{alliance.terms}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
