import React, { useMemo } from 'react';
import { BarChart3, Award, Users, ShieldCheck, TrendingUp, Target } from 'lucide-react';

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function parseNomadRegistryState(notes) {
  const raw = String(notes || '');
  const match = raw.match(/\[nomad_registry_state\]([\s\S]*?)\[\/nomad_registry_state\]/i);
  if (!match?.[1]) {
    return { achievements: [], mentor_member_profile_id: null };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return {
      achievements: Array.isArray(parsed?.achievements) ? parsed.achievements : [],
      mentor_member_profile_id: parsed?.mentor_member_profile_id ? String(parsed.mentor_member_profile_id) : null,
    };
  } catch {
    return { achievements: [], mentor_member_profile_id: null };
  }
}

function getCertifications(profile) {
  const raw = Array.isArray(profile?.certifications)
    ? profile.certifications
    : Array.isArray(profile?.certification_list)
      ? profile.certification_list
      : [];

  return raw
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return {
          id: entry.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: entry,
          level: 'STANDARD',
          status: 'active',
        };
      }
      const name = text(entry.name || entry.title);
      if (!name) return null;
      return {
        ...entry,
        id: text(entry.id || entry.certification_id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
        name,
        level: text(entry.level || 'STANDARD').toUpperCase(),
        status: text(entry.status || 'active').toLowerCase(),
      };
    })
    .filter(Boolean);
}

const RANK_SCORE = {
  VAGRANT: 1,
  MEMBER: 2,
  SPECIALIST: 3,
  OFFICER: 4,
  COMMANDER: 5,
  PIONEER: 6,
  FOUNDER: 7,
};

function memberProgressScore(profile, state) {
  const certifications = getCertifications(profile).filter((cert) => cert.status !== 'revoked');
  const certScore = Math.min(40, certifications.length * 8);
  const achievementScore = Math.min(30, (state?.achievements?.length || 0) * 6);
  const rank = text(profile?.rank || 'VAGRANT').toUpperCase();
  const rankScore = Math.min(20, (RANK_SCORE[rank] || 1) * 3);
  const mentorScore = state?.mentor_member_profile_id ? 10 : 0;
  return certScore + achievementScore + rankScore + mentorScore;
}

function scoreTone(score) {
  if (score >= 80) return 'text-green-300';
  if (score >= 55) return 'text-yellow-300';
  return 'text-zinc-300';
}

export default function ProgressionAnalytics({ member, allMembers = [] }) {
  const profile = member?.profile || null;

  const selectedMetrics = useMemo(() => {
    const state = parseNomadRegistryState(profile?.notes);
    const certifications = getCertifications(profile);
    const activeCertifications = certifications.filter((cert) => cert.status !== 'revoked');
    const score = memberProgressScore(profile, state);

    return {
      certifications: activeCertifications.length,
      achievements: state.achievements.length,
      hasMentor: Boolean(state.mentor_member_profile_id),
      score,
    };
  }, [profile]);

  const rosterMetrics = useMemo(() => {
    if (!Array.isArray(allMembers) || allMembers.length === 0) {
      return {
        totalMembers: 0,
        avgCertifications: 0,
        mentorLinked: 0,
        avgScore: 0,
      };
    }

    let certTotal = 0;
    let mentorLinked = 0;
    let scoreTotal = 0;

    for (const entry of allMembers) {
      const entryProfile = entry?.profile || {};
      const state = parseNomadRegistryState(entryProfile?.notes);
      const certifications = getCertifications(entryProfile).filter((cert) => cert.status !== 'revoked');
      certTotal += certifications.length;
      if (state.mentor_member_profile_id) mentorLinked += 1;
      scoreTotal += memberProgressScore(entryProfile, state);
    }

    return {
      totalMembers: allMembers.length,
      avgCertifications: Math.round((certTotal / allMembers.length) * 10) / 10,
      mentorLinked,
      avgScore: Math.round(scoreTotal / allMembers.length),
    };
  }, [allMembers]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Progress Score</span>
            <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className={`text-xl font-black mt-2 ${scoreTone(selectedMetrics.score)}`}>{selectedMetrics.score}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Readiness index (0-100)</div>
        </div>

        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Certifications</span>
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-white mt-2">{selectedMetrics.certifications}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Active cert records</div>
        </div>

        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Achievements</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white mt-2">{selectedMetrics.achievements}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Registry commendations</div>
        </div>

        <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">Mentor Link</span>
            <Target className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-black text-white mt-2">{selectedMetrics.hasMentor ? 'Assigned' : 'Open'}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Mentorship status</div>
        </div>
      </div>

      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Squad Progression Snapshot</h3>
          <TrendingUp className="w-4 h-4 text-orange-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded border border-zinc-700 bg-zinc-900/40">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Members</div>
            <div className="text-lg font-bold text-white mt-1">{rosterMetrics.totalMembers}</div>
          </div>
          <div className="p-3 rounded border border-zinc-700 bg-zinc-900/40">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Certs</div>
            <div className="text-lg font-bold text-white mt-1">{rosterMetrics.avgCertifications}</div>
          </div>
          <div className="p-3 rounded border border-zinc-700 bg-zinc-900/40">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Mentor Linked</div>
            <div className="text-lg font-bold text-white mt-1">{rosterMetrics.mentorLinked}</div>
          </div>
          <div className="p-3 rounded border border-zinc-700 bg-zinc-900/40">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Score</div>
            <div className={`text-lg font-bold mt-1 ${scoreTone(rosterMetrics.avgScore)}`}>{rosterMetrics.avgScore}</div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          Scores combine rank, active certifications, achievements, and mentor linkage for quick readiness triage.
        </div>
      </div>
    </div>
  );
}
