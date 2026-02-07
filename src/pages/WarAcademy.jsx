import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpenCheck, GraduationCap, Medal, MonitorPlay, UserCog, Wrench } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const MODULE_CATALOG = [
  { id: 'flight-basics', name: 'Flight Basics', focus: 'Navigation, comms checks, and fuel discipline' },
  { id: 'medical-extract', name: 'Medical Extraction', focus: 'Casualty stabilization and rapid evac' },
  { id: 'boarding-recovery', name: 'Boarding Recovery', focus: 'Close-quarters breach and asset retrieval' },
  { id: 'convoy-security', name: 'Convoy Security', focus: 'Escort doctrine and route hazard mitigation' },
];

const DEFAULT_SCENARIO_FORM = {
  name: '',
  description: '',
  difficulty: 'standard',
  event_type: 'focused',
  priority: 'HIGH',
  tags: '',
  prerequisites: '',
};

const DEFAULT_CERT_FORM = {
  name: '',
  level: 'STANDARD',
};

const DEFAULT_SIM_FORM = {
  title: '',
  description: '',
  start_time: '',
};

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function asMilestones(profile) {
  if (Array.isArray(profile?.training_milestones)) return profile.training_milestones;
  if (Array.isArray(profile?.onboarding_training_milestones)) return profile.onboarding_training_milestones;
  return [];
}

function asCertifications(profile) {
  if (Array.isArray(profile?.certifications)) return profile.certifications;
  if (Array.isArray(profile?.certification_list)) return profile.certification_list;
  return [];
}

function isInstructor(profile) {
  const rank = String(profile?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(profile?.roles) ? profile.roles.map((role) => String(role || '').toLowerCase()) : [];
  return roles.includes('training') || roles.includes('instructor') || roles.includes('mentor') || roles.includes('admin');
}

function formatWhen(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function WarAcademy() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [tab, setTab] = useState('scenarios');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [scenarioForm, setScenarioForm] = useState(DEFAULT_SCENARIO_FORM);
  const [certForm, setCertForm] = useState(DEFAULT_CERT_FORM);
  const [simForm, setSimForm] = useState(DEFAULT_SIM_FORM);
  const [noteDraft, setNoteDraft] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const instructorMode = useMemo(() => isInstructor(member), [member]);

  const selectedMember = useMemo(
    () => members.find((profile) => profile.id === selectedMemberId) || members[0] || null,
    [members, selectedMemberId]
  );

  const scenarioLibrary = useMemo(() => {
    return (templates || [])
      .filter((template) => {
        const tags = Array.isArray(template?.tags) ? template.tags.map((tag) => String(tag).toLowerCase()) : [];
        return tags.includes('war-academy') || tags.includes('scenario');
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [templates]);

  const trainingEvents = useMemo(() => {
    return (events || [])
      .filter((event) => {
        const tags = Array.isArray(event?.tags) ? event.tags.map((tag) => String(tag).toLowerCase()) : [];
        return tags.includes('training') || tags.includes('simulation') || tags.includes('war-academy');
      })
      .sort((a, b) => new Date(a?.start_time || 0).getTime() - new Date(b?.start_time || 0).getTime());
  }, [events]);

  const memberMilestones = useMemo(() => asMilestones(selectedMember), [selectedMember]);
  const memberCertifications = useMemo(() => asCertifications(selectedMember), [selectedMember]);

  const progressionSummary = useMemo(() => {
    const completed = memberMilestones.filter((milestone) => String(milestone?.status || '').toLowerCase() === 'complete').length;
    const score = memberMilestones.length > 0
      ? Math.round(memberMilestones.reduce((sum, milestone) => sum + Number(milestone?.score || 0), 0) / memberMilestones.length)
      : 0;
    return {
      completed,
      total: memberMilestones.length,
      score,
      certifications: memberCertifications.length,
    };
  }, [memberMilestones, memberCertifications]);

  const loadAcademy = async () => {
    setLoading(true);
    try {
      const [memberList, templateList, eventList] = await Promise.all([
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
        base44.entities.EventTemplate.list('-created_date', 250).catch(() => []),
        base44.entities.Event.list('-start_time', 200).catch(() => []),
      ]);
      setMembers(memberList || []);
      setTemplates(templateList || []);
      setEvents(eventList || []);
      if (!selectedMemberId && memberList?.[0]?.id) {
        setSelectedMemberId(memberList[0].id);
      }
    } catch (error) {
      console.error('WarAcademy load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load War Academy data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademy();
  }, []);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateWarAcademyProgress', payload);
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'War Academy update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || 'War Academy updated.' });
      }
      await loadAcademy();
      return result;
    } catch (error) {
      console.error('WarAcademy action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'War Academy update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const saveScenario = async () => {
    if (!scenarioForm.name.trim()) return;
    const result = await runAction(
      {
        action: 'upsert_scenario',
        scenario: {
          name: scenarioForm.name.trim(),
          description: scenarioForm.description.trim(),
          difficulty: scenarioForm.difficulty,
          event_type: scenarioForm.event_type,
          priority: scenarioForm.priority,
          tags: parseTags(scenarioForm.tags),
          prerequisites: scenarioForm.prerequisites.trim(),
        },
      },
      'Scenario saved to library.'
    );
    if (result?.success) setScenarioForm(DEFAULT_SCENARIO_FORM);
  };

  const completeScenario = async (scenario) => {
    if (!selectedMember?.id || !scenario?.id) return;
    await runAction(
      {
        action: 'complete_scenario',
        targetMemberProfileId: selectedMember.id,
        scenarioId: scenario.id,
        scenarioTitle: scenario.name || scenario.title || 'Scenario',
        score: 85,
      },
      'Scenario completion recorded.'
    );
  };

  const issueCertification = async () => {
    if (!selectedMember?.id || !certForm.name.trim()) return;
    const result = await runAction(
      {
        action: 'issue_certification',
        targetMemberProfileId: selectedMember.id,
        certificationName: certForm.name.trim(),
        certificationLevel: certForm.level,
      },
      'Certification issued.'
    );
    if (result?.success) setCertForm(DEFAULT_CERT_FORM);
  };

  const createSimulation = async () => {
    if (!simForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'create_simulation',
        title: simForm.title.trim(),
        description: simForm.description.trim(),
        start_time: simForm.start_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      'Simulation scheduled.'
    );
    if (result?.success) setSimForm(DEFAULT_SIM_FORM);
  };

  const submitInstructorNote = async () => {
    if (!selectedMember?.id || !noteDraft.trim()) return;
    const result = await runAction(
      {
        action: 'instructor_note',
        targetMemberProfileId: selectedMember.id,
        note: noteDraft.trim(),
      },
      'Instructor note saved.'
    );
    if (result?.success) setNoteDraft('');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading War Academy...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">War Academy</h1>
          <p className="text-zinc-400 text-sm">Scenario library, progression tracking, certification workflows, simulation engine, and instructor tools</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('MissionControl')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Operations</a>
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
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Scenarios</div>
          <div className="text-lg font-bold text-cyan-300">{scenarioLibrary.length}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Milestones</div>
          <div className="text-lg font-bold text-orange-300">{progressionSummary.completed}/{progressionSummary.total}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Certifications</div>
          <div className="text-lg font-bold text-yellow-300">{progressionSummary.certifications}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Training Score</div>
          <div className="text-lg font-bold text-green-300">{progressionSummary.score}</div>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 flex items-center gap-3">
        <label htmlFor="war-academy-member" className="text-xs uppercase tracking-widest text-zinc-500">Trainee</label>
        <select
          id="war-academy-member"
          value={selectedMember?.id || ''}
          onChange={(event) => setSelectedMemberId(event.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded min-w-[300px]"
        >
          {members.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_callsign || profile.callsign || profile.full_name || profile.id}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scenarios">Scenario Library</TabsTrigger>
          <TabsTrigger value="progression">Skill Progression</TabsTrigger>
          <TabsTrigger value="certifications">Certification System</TabsTrigger>
          <TabsTrigger value="simulations">Simulation Engine</TabsTrigger>
          <TabsTrigger value="instructor">Instructor Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <BookOpenCheck className="w-3 h-3" />
                Training Modules UI
              </div>
              {MODULE_CATALOG.map((module) => (
                <div key={module.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="text-sm text-white font-semibold">{module.name}</div>
                  <div className="text-xs text-zinc-400">{module.focus}</div>
                </div>
              ))}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Training Scenario Library</div>
              {scenarioLibrary.length === 0 ? (
                <div className="text-xs text-zinc-500">No scenarios saved yet.</div>
              ) : (
                scenarioLibrary.map((scenario) => (
                  <div key={scenario.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{scenario.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{scenario.event_type || 'focused'} · {scenario.priority || 'STANDARD'}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => completeScenario(scenario)} disabled={actionBusy || !selectedMember}>
                        Mark Complete
                      </Button>
                    </div>
                    {scenario.description && <div className="text-xs text-zinc-300 mt-1">{scenario.description}</div>}
                  </div>
                ))
              )}

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Author Scenario</div>
                <Input value={scenarioForm.name} onChange={(event) => setScenarioForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Scenario name" />
                <Textarea value={scenarioForm.description} onChange={(event) => setScenarioForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[70px]" placeholder="Scenario description" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={scenarioForm.difficulty} onChange={(event) => setScenarioForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                    <option value="elite">Elite</option>
                  </select>
                  <select value={scenarioForm.priority} onChange={(event) => setScenarioForm((prev) => ({ ...prev, priority: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                    <option value="LOW">Low</option>
                    <option value="STANDARD">Standard</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <Input value={scenarioForm.tags} onChange={(event) => setScenarioForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
                <Input value={scenarioForm.prerequisites} onChange={(event) => setScenarioForm((prev) => ({ ...prev, prerequisites: event.target.value }))} placeholder="Prerequisites" />
                <Button onClick={saveScenario} disabled={actionBusy || !instructorMode || !scenarioForm.name.trim()}>
                  Save Scenario
                </Button>
                {!instructorMode && <div className="text-[10px] text-zinc-500">Instructor privileges are required to author scenarios.</div>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <GraduationCap className="w-3 h-3" />
              Skill Progression
            </div>
            {memberMilestones.length === 0 ? (
              <div className="text-xs text-zinc-500">No completed scenarios recorded for this trainee.</div>
            ) : (
              memberMilestones.map((milestone) => (
                <div key={milestone.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">{milestone.title || milestone.id}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{milestone.status || 'pending'} · score {milestone.score ?? 'n/a'}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500">{formatWhen(milestone.completed_at)}</div>
                  </div>
                  {milestone.notes && <div className="text-xs text-zinc-300 mt-1">{milestone.notes}</div>}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Medal className="w-3 h-3" />
                Certification System
              </div>
              <Input value={certForm.name} onChange={(event) => setCertForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Certification name" />
              <select value={certForm.level} onChange={(event) => setCertForm((prev) => ({ ...prev, level: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="STANDARD">Standard</option>
                <option value="ADVANCED">Advanced</option>
                <option value="ELITE">Elite</option>
              </select>
              <Button onClick={issueCertification} disabled={actionBusy || !instructorMode || !selectedMember || !certForm.name.trim()}>
                Issue Certification
              </Button>
              {!instructorMode && <div className="text-[10px] text-zinc-500">Instructor privileges are required to issue certifications.</div>}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Current Certifications</div>
              {memberCertifications.length === 0 ? (
                <div className="text-xs text-zinc-500">No certifications recorded.</div>
              ) : (
                memberCertifications.map((cert) => (
                  <div key={cert.id || `${cert.name}-${cert.issued_at}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                    <div className="text-sm text-white">{cert.name || 'Certification'}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{cert.level || 'STANDARD'} · {formatWhen(cert.issued_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="simulations" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <MonitorPlay className="w-3 h-3" />
                Simulation Engine
              </div>
              <Input value={simForm.title} onChange={(event) => setSimForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Simulation title" />
              <Textarea value={simForm.description} onChange={(event) => setSimForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[80px]" placeholder="Simulation objective" />
              <Input type="datetime-local" value={simForm.start_time} onChange={(event) => setSimForm((prev) => ({ ...prev, start_time: event.target.value }))} />
              <Button onClick={createSimulation} disabled={actionBusy || !instructorMode || !simForm.title.trim()}>
                Schedule Simulation
              </Button>
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Training Simulations</div>
              {trainingEvents.length === 0 ? (
                <div className="text-xs text-zinc-500">No simulations scheduled.</div>
              ) : (
                trainingEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{event.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{event.event_type || 'focused'} · {event.priority || 'HIGH'} · {event.status || 'scheduled'}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{formatWhen(event.start_time)}</div>
                    </div>
                    {event.description && <div className="text-xs text-zinc-300 mt-1">{event.description}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="instructor" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <UserCog className="w-3 h-3" />
              Instructor Tools
            </div>
            <Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="min-h-[90px]" placeholder="Instructor feedback note" />
            <Button onClick={submitInstructorNote} disabled={actionBusy || !instructorMode || !selectedMember || !noteDraft.trim()}>
              Save Instructor Note
            </Button>
            <div className="text-xs text-zinc-500 flex items-start gap-2">
              <Wrench className="w-3 h-3 mt-0.5" />
              Instructor notes are stored with trainee progression and can be used during promotion reviews.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
