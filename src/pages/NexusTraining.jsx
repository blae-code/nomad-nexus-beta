import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl, getDisplayCallsign } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, CheckCircle2, Film, GraduationCap, MessageSquare } from 'lucide-react';
import { sanitizeExternalUrl } from '@/components/comms/urlSafety';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const DEFAULT_TUTORIAL_FORM = {
  title: '',
  summary: '',
  difficulty: 'standard',
  estimatedMinutes: '20',
  tags: '',
  steps: '',
};

const DEFAULT_VIDEO_FORM = {
  title: '',
  url: '',
  platform: 'external',
  durationMinutes: '0',
  tags: '',
};

const DEFAULT_CERT_FORM = {
  certificationName: 'Nexus Platform Operator',
  certificationLevel: 'STANDARD',
};

const DEFAULT_FEEDBACK_FORM = {
  tutorialId: '',
  rating: '5',
  message: '',
};

function asDateLabel(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function asList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasTrainingAdminAccess(member) {
  const rank = String(member?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank) || Boolean(member?.is_admin)) return true;
  const roles = Array.isArray(member?.roles)
    ? member.roles.map((role) => String(role || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('training') || roles.includes('instructor') || roles.includes('mentor') || roles.includes('officer');
}

function parseTrainingState(notes) {
  const raw = String(notes || '');
  const match = raw.match(/\[nexus_training_state\]([\s\S]*?)\[\/nexus_training_state\]/i);
  if (!match?.[1]) {
    return {
      completed_tutorial_ids: [],
      guide_progress: [],
      platform_certifications: [],
      feedback_submissions: [],
    };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return {
      completed_tutorial_ids: Array.isArray(parsed?.completed_tutorial_ids) ? parsed.completed_tutorial_ids : [],
      guide_progress: Array.isArray(parsed?.guide_progress) ? parsed.guide_progress : [],
      platform_certifications: Array.isArray(parsed?.platform_certifications) ? parsed.platform_certifications : [],
      feedback_submissions: Array.isArray(parsed?.feedback_submissions) ? parsed.feedback_submissions : [],
    };
  } catch {
    return {
      completed_tutorial_ids: [],
      guide_progress: [],
      platform_certifications: [],
      feedback_submissions: [],
    };
  }
}

function parseTutorials(logs) {
  const latest = new Map();
  for (const entry of logs || []) {
    if (String(entry?.type || '').toUpperCase() !== 'NEXUS_TRAINING_TUTORIAL') continue;
    const details = entry?.details || {};
    const id = String(details?.id || '').trim();
    if (!id) continue;
    const current = latest.get(id);
    const at = new Date(entry?.created_date || 0).getTime();
    if (!current || at >= current.at) {
      latest.set(id, {
        id,
        title: details?.title || entry.summary || 'Tutorial',
        summary: details?.summary || '',
        difficulty: details?.difficulty || 'standard',
        estimated_minutes: Number(details?.estimated_minutes || 20),
        tags: Array.isArray(details?.tags) ? details.tags : [],
        steps: Array.isArray(details?.steps) ? details.steps : [],
        updatedAt: entry?.created_date || null,
        at,
      });
    }
  }
  return Array.from(latest.values()).sort((a, b) => b.at - a.at);
}

export default function NexusTraining() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const trainingAdminAccess = useMemo(() => hasTrainingAdminAccess(member), [member]);
  const [tab, setTab] = useState('tutorials');
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [tutorialForm, setTutorialForm] = useState(DEFAULT_TUTORIAL_FORM);
  const [videoForm, setVideoForm] = useState(DEFAULT_VIDEO_FORM);
  const [certForm, setCertForm] = useState(DEFAULT_CERT_FORM);
  const [feedbackForm, setFeedbackForm] = useState(DEFAULT_FEEDBACK_FORM);

  const tutorials = useMemo(() => parseTutorials(eventLogs), [eventLogs]);
  const videos = useMemo(() => {
    return (eventLogs || [])
      .filter((entry) => String(entry?.type || '').toUpperCase() === 'NEXUS_TRAINING_VIDEO')
      .map((entry) => ({
        id: entry.id,
        title: entry?.details?.title || 'Video',
        url: entry?.details?.url || '',
        safeUrl: sanitizeExternalUrl(entry?.details?.url || ''),
        platform: entry?.details?.platform || 'external',
        durationMinutes: Number(entry?.details?.duration_minutes || 0),
        tags: Array.isArray(entry?.details?.tags) ? entry.details.tags : [],
        createdAt: entry?.created_date || null,
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [eventLogs]);

  const feedbackFeed = useMemo(() => {
    return (eventLogs || [])
      .filter((entry) => String(entry?.type || '').toUpperCase() === 'NEXUS_TRAINING_FEEDBACK')
      .map((entry) => ({
        id: entry.id,
        tutorialId: entry?.details?.tutorial_id || '',
        targetMemberId: entry?.details?.target_member_profile_id || null,
        rating: Number(entry?.details?.rating || 0),
        message: entry?.details?.message || '',
        actorMemberId: entry?.actor_member_profile_id || null,
        createdAt: entry?.created_date || null,
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [eventLogs]);

  const selectedMember = useMemo(
    () => members.find((profile) => profile.id === selectedMemberId) || members[0] || null,
    [members, selectedMemberId]
  );
  const selectedState = useMemo(() => parseTrainingState(selectedMember?.notes), [selectedMember]);
  const selectedCertifications = useMemo(() => {
    const memberCerts = Array.isArray(selectedMember?.certifications)
      ? selectedMember.certifications
      : Array.isArray(selectedMember?.certification_list)
      ? selectedMember.certification_list
      : [];
    return [...memberCerts, ...selectedState.platform_certifications];
  }, [selectedMember, selectedState.platform_certifications]);

  const metrics = useMemo(() => {
    const completed = Array.isArray(selectedState.completed_tutorial_ids)
      ? selectedState.completed_tutorial_ids.length
      : 0;
    return {
      tutorials: tutorials.length,
      videos: videos.length,
      completedTutorials: completed,
      certifications: selectedCertifications.length,
    };
  }, [selectedCertifications.length, selectedState.completed_tutorial_ids, tutorials.length, videos.length]);

  const loadTraining = async () => {
    setLoading(true);
    try {
      const [logList, memberList] = await Promise.all([
        base44.entities.EventLog.list('-created_date', 650).catch(() => []),
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
      ]);
      const scopedLogs = (logList || []).filter((entry) => String(entry?.type || '').toUpperCase().startsWith('NEXUS_TRAINING_'));
      setEventLogs(scopedLogs);
      setMembers(memberList || []);
      if (!selectedMemberId) {
        const preferred = (memberList || []).find((profile) => profile.id === member?.id) || memberList?.[0];
        if (preferred?.id) setSelectedMemberId(preferred.id);
      }
    } catch (error) {
      console.error('NexusTraining load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load Nexus Training data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraining();
  }, []);

  useEffect(() => {
    if (!feedbackForm.tutorialId && tutorials[0]?.id) {
      setFeedbackForm((prev) => ({ ...prev, tutorialId: tutorials[0].id }));
    }
  }, [tutorials, feedbackForm.tutorialId]);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateNexusTraining', payload);
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'Nexus Training update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || 'Nexus Training updated.' });
      }
      await loadTraining();
      return result;
    } catch (error) {
      console.error('NexusTraining action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Nexus Training update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const submitTutorial = async () => {
    if (!tutorialForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'upsert_tutorial',
        title: tutorialForm.title.trim(),
        summary: tutorialForm.summary.trim(),
        difficulty: tutorialForm.difficulty,
        estimatedMinutes: Number(tutorialForm.estimatedMinutes || 20),
        tags: asList(tutorialForm.tags),
        steps: asList(tutorialForm.steps),
      },
      'Tutorial framework updated.'
    );
    if (result?.success) setTutorialForm(DEFAULT_TUTORIAL_FORM);
  };

  const completeTutorial = async (tutorial) => {
    if (!tutorial?.id || !selectedMember?.id) return;
    await runAction(
      {
        action: 'complete_tutorial',
        targetMemberProfileId: selectedMember.id,
        tutorialId: tutorial.id,
        tutorialTitle: tutorial.title,
      },
      'Tutorial marked complete.'
    );
  };

  const submitVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.url.trim()) return;
    const safeUrl = sanitizeExternalUrl(videoForm.url.trim());
    if (!safeUrl) {
      setBanner({ type: 'error', message: 'Video URL blocked for safety. Use a public http(s) URL.' });
      return;
    }
    const result = await runAction(
      {
        action: 'record_video_resource',
        title: videoForm.title.trim(),
        url: safeUrl,
        platform: videoForm.platform,
        durationMinutes: Number(videoForm.durationMinutes || 0),
        tags: asList(videoForm.tags),
      },
      'Video resource added.'
    );
    if (result?.success) setVideoForm(DEFAULT_VIDEO_FORM);
  };

  const issueCertification = async () => {
    if (!selectedMember?.id || !certForm.certificationName.trim()) return;
    await runAction(
      {
        action: 'issue_platform_certification',
        targetMemberProfileId: selectedMember.id,
        certificationName: certForm.certificationName.trim(),
        certificationLevel: certForm.certificationLevel,
      },
      'Certification issued.'
    );
  };

  const submitFeedback = async () => {
    if (!selectedMember?.id || !feedbackForm.message.trim()) return;
    const result = await runAction(
      {
        action: 'submit_feedback',
        targetMemberProfileId: selectedMember.id,
        tutorialId: feedbackForm.tutorialId || null,
        rating: Number(feedbackForm.rating || 5),
        message: feedbackForm.message.trim(),
      },
      'Feedback submitted.'
    );
    if (result?.success) setFeedbackForm((prev) => ({ ...DEFAULT_FEEDBACK_FORM, tutorialId: prev.tutorialId }));
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading Nexus Training...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Nexus Training</h1>
          <p className="text-zinc-400 text-sm">Tutorial framework, interactive guides, video library, certification tracking, and feedback loops</p>
          <div className="text-[10px] text-zinc-500 uppercase mt-2">Training Admin: <span className={trainingAdminAccess ? 'text-green-400' : 'text-zinc-400'}>{trainingAdminAccess ? 'Granted' : 'Restricted'}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('WarAcademy')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">War Academy</a>
          <a href={createPageUrl('Hub')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Hub</a>
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

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 flex items-center gap-3">
        <label htmlFor="nexus-training-member" className="text-xs uppercase tracking-widest text-zinc-500">Learner</label>
        <select
          id="nexus-training-member"
          value={selectedMember?.id || ''}
          onChange={(event) => setSelectedMemberId(event.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded min-w-[320px]"
        >
          {members.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {getDisplayCallsign(profile) || profile.full_name || profile.id}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Tutorials</div><div className="text-lg font-bold text-cyan-300">{metrics.tutorials}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Videos</div><div className="text-lg font-bold text-orange-300">{metrics.videos}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Completed Tutorials</div><div className="text-lg font-bold text-yellow-300">{metrics.completedTutorials}</div></div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3"><div className="text-[10px] uppercase tracking-widest text-zinc-500">Certifications</div><div className="text-lg font-bold text-green-300">{metrics.certifications}</div></div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="tutorials">Tutorial Framework</TabsTrigger>
          <TabsTrigger value="guides">Interactive Guides</TabsTrigger>
          <TabsTrigger value="videos">Video Library</TabsTrigger>
          <TabsTrigger value="certifications">Certification Tracking</TabsTrigger>
          <TabsTrigger value="feedback">Feedback System</TabsTrigger>
        </TabsList>

        <TabsContent value="tutorials" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><BookOpen className="w-3 h-3" />Author Tutorial</div>
              <Input value={tutorialForm.title} onChange={(event) => setTutorialForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tutorial title" />
              <Textarea value={tutorialForm.summary} onChange={(event) => setTutorialForm((prev) => ({ ...prev, summary: event.target.value }))} className="min-h-[80px]" placeholder="Summary" />
              <div className="grid grid-cols-2 gap-2">
                <select value={tutorialForm.difficulty} onChange={(event) => setTutorialForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                  <option value="basic">basic</option>
                  <option value="standard">standard</option>
                  <option value="advanced">advanced</option>
                </select>
                <Input type="number" value={tutorialForm.estimatedMinutes} onChange={(event) => setTutorialForm((prev) => ({ ...prev, estimatedMinutes: event.target.value }))} placeholder="Minutes" />
              </div>
              <Input value={tutorialForm.tags} onChange={(event) => setTutorialForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags" />
              <Textarea value={tutorialForm.steps} onChange={(event) => setTutorialForm((prev) => ({ ...prev, steps: event.target.value }))} className="min-h-[70px]" placeholder="Steps (comma-separated)" />
              <Button onClick={submitTutorial} disabled={actionBusy || !trainingAdminAccess || !tutorialForm.title.trim()}>Save Tutorial</Button>
              {!trainingAdminAccess && <div className="text-[10px] text-zinc-500">Training admin privileges required.</div>}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Tutorial Catalog</div>
              {tutorials.length === 0 ? (
                <div className="text-xs text-zinc-500">No tutorials authored yet.</div>
              ) : (
                tutorials.map((tutorial) => (
                  <div key={tutorial.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{tutorial.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{tutorial.difficulty} · {tutorial.estimated_minutes} min</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(tutorial.updatedAt)}</div>
                    </div>
                    {tutorial.summary && <div className="text-xs text-zinc-300 mt-1">{tutorial.summary}</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="guides" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><CheckCircle2 className="w-3 h-3" />Interactive Guides</div>
            {tutorials.length === 0 ? (
              <div className="text-xs text-zinc-500">No tutorials available.</div>
            ) : (
              tutorials.map((tutorial) => {
                const completed = selectedState.completed_tutorial_ids.includes(tutorial.id);
                const progress = selectedState.guide_progress.find((entry) => String(entry?.tutorial_id || '') === String(tutorial.id));
                return (
                  <div key={tutorial.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{tutorial.title}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">Last Step: {progress?.last_step || 'not started'}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => completeTutorial(tutorial)} disabled={actionBusy || (completed && !trainingAdminAccess && selectedMember?.id !== member?.id)}>
                        {completed ? 'Completed' : 'Mark Complete'}
                      </Button>
                    </div>
                    {Array.isArray(tutorial.steps) && tutorial.steps.length > 0 && (
                      <div className="mt-2 text-xs text-zinc-300">
                        Steps: {tutorial.steps.join(' -> ')}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="videos" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><Film className="w-3 h-3" />Add Video Resource</div>
              <Input value={videoForm.title} onChange={(event) => setVideoForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Video title" />
              <Input value={videoForm.url} onChange={(event) => setVideoForm((prev) => ({ ...prev, url: event.target.value }))} placeholder="Video URL" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={videoForm.platform} onChange={(event) => setVideoForm((prev) => ({ ...prev, platform: event.target.value }))} placeholder="Platform" />
                <Input type="number" value={videoForm.durationMinutes} onChange={(event) => setVideoForm((prev) => ({ ...prev, durationMinutes: event.target.value }))} placeholder="Minutes" />
              </div>
              <Input value={videoForm.tags} onChange={(event) => setVideoForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags" />
              <Button onClick={submitVideo} disabled={actionBusy || !trainingAdminAccess || !videoForm.title.trim() || !videoForm.url.trim()}>Add Video</Button>
              {!trainingAdminAccess && <div className="text-[10px] text-zinc-500">Training admin privileges required.</div>}
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Video Library</div>
              {videos.length === 0 ? (
                <div className="text-xs text-zinc-500">No videos in library.</div>
              ) : (
                videos.map((video) => (
                  <div key={video.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        {video.safeUrl ? (
                          <a href={video.safeUrl} target="_blank" rel="noreferrer" className="text-sm text-cyan-300 hover:text-cyan-200 underline">
                            {video.title}
                          </a>
                        ) : (
                          <div className="text-sm text-zinc-400">{video.title} (Blocked)</div>
                        )}
                        <div className="text-[10px] text-zinc-500 uppercase">{video.platform} · {video.durationMinutes} min</div>
                      </div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(video.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><GraduationCap className="w-3 h-3" />Issue Certification</div>
              <Input value={certForm.certificationName} onChange={(event) => setCertForm((prev) => ({ ...prev, certificationName: event.target.value }))} placeholder="Certification name" />
              <select value={certForm.certificationLevel} onChange={(event) => setCertForm((prev) => ({ ...prev, certificationLevel: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="STANDARD">STANDARD</option>
                <option value="ADVANCED">ADVANCED</option>
                <option value="ELITE">ELITE</option>
              </select>
              <Button onClick={issueCertification} disabled={actionBusy || !trainingAdminAccess || !selectedMember || !certForm.certificationName.trim()}>Issue Certification</Button>
              {!trainingAdminAccess && <div className="text-[10px] text-zinc-500">Training admin privileges required.</div>}
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Certification Tracking</div>
              {selectedCertifications.length === 0 ? (
                <div className="text-xs text-zinc-500">No certifications recorded.</div>
              ) : (
                selectedCertifications.map((cert) => (
                  <div key={cert.id || `${cert.name}-${cert.issued_at}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                    <div className="text-sm text-white">{cert.name || 'Certification'}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{cert.level || 'STANDARD'} · {asDateLabel(cert.issued_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2"><MessageSquare className="w-3 h-3" />Submit Feedback</div>
              <select value={feedbackForm.tutorialId} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, tutorialId: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="">General platform feedback</option>
                {tutorials.map((tutorial) => <option key={tutorial.id} value={tutorial.id}>{tutorial.title}</option>)}
              </select>
              <select value={feedbackForm.rating} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, rating: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Neutral</option>
                <option value="2">2 - Needs Work</option>
                <option value="1">1 - Poor</option>
              </select>
              <Textarea value={feedbackForm.message} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, message: event.target.value }))} className="min-h-[120px]" placeholder="Feedback details" />
              <Button onClick={submitFeedback} disabled={actionBusy || !feedbackForm.message.trim()}>Submit Feedback</Button>
            </div>
            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Feedback Feed</div>
              {feedbackFeed.length === 0 ? (
                <div className="text-xs text-zinc-500">No feedback submitted yet.</div>
              ) : (
                feedbackFeed.slice(0, 40).map((entry) => (
                  <div key={entry.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">{entry.rating}/5 · {entry.tutorialId || 'General'}</div>
                      <div className="text-[10px] text-zinc-500">{asDateLabel(entry.createdAt)}</div>
                    </div>
                    <div className="text-xs text-zinc-300 mt-1">{entry.message}</div>
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
