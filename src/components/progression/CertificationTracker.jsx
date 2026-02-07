import React, { useMemo, useState } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'training', 'mentor']);

function text(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
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
          issued_at: null,
          expires_at: null,
          notes: '',
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
        issued_at: text(entry.issued_at),
        expires_at: text(entry.expires_at),
        notes: text(entry.notes),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.status === b.status) {
        return b.issued_at.localeCompare(a.issued_at);
      }
      return a.status === 'active' ? -1 : 1;
    });
}

function hasCommandAccess(actorProfile) {
  const rank = text(actorProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(actorProfile?.roles)
    ? actorProfile.roles.map((role) => String(role || '').toLowerCase())
    : [];
  return roles.some((role) => COMMAND_ROLES.has(role));
}

function statusTone(status) {
  if (status === 'active') return 'text-green-300 border-green-500/30 bg-green-500/10';
  if (status === 'expired') return 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10';
  if (status === 'revoked') return 'text-red-300 border-red-500/30 bg-red-500/10';
  return 'text-zinc-300 border-zinc-600 bg-zinc-700/20';
}

export default function CertificationTracker({ member, actorProfile, onMemberUpdate }) {
  const profile = member?.profile || {};
  const certifications = useMemo(() => getCertifications(profile), [profile]);
  const commandAccess = useMemo(() => hasCommandAccess(actorProfile), [actorProfile]);

  const [form, setForm] = useState({
    name: '',
    level: 'STANDARD',
    expiresAt: '',
    notes: '',
  });
  const [revokeReasonById, setRevokeReasonById] = useState({});
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState(null);

  const issueCertification = async () => {
    if (!form.name.trim() || !member?.id) return;
    setSaving(true);
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateMemberProgression', {
        action: 'issue_certification',
        targetMemberProfileId: member.id,
        certificationName: form.name.trim(),
        certificationLevel: form.level,
        expiresAt: form.expiresAt || null,
        notes: form.notes.trim() || null,
      });

      if (response?.data?.success) {
        setBanner({ tone: 'success', message: `Issued certification: ${form.name.trim()}` });
        setForm({ name: '', level: 'STANDARD', expiresAt: '', notes: '' });
        onMemberUpdate?.();
      } else {
        setBanner({ tone: 'error', message: response?.data?.error || 'Certification issue failed' });
      }
    } catch (error) {
      setBanner({ tone: 'error', message: error?.message || 'Certification issue failed' });
    } finally {
      setSaving(false);
    }
  };

  const revokeCertification = async (certification) => {
    if (!member?.id || !certification?.id) return;
    setSaving(true);
    setBanner(null);
    try {
      const response = await invokeMemberFunction('updateMemberProgression', {
        action: 'revoke_certification',
        targetMemberProfileId: member.id,
        certificationId: certification.id,
        reason: text(revokeReasonById[certification.id]),
      });

      if (response?.data?.success) {
        setBanner({ tone: 'success', message: `Revoked certification: ${certification.name}` });
        onMemberUpdate?.();
      } else {
        setBanner({ tone: 'error', message: response?.data?.error || 'Certification revoke failed' });
      }
    } catch (error) {
      setBanner({ tone: 'error', message: error?.message || 'Certification revoke failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {banner && (
        <div
          className={`p-3 rounded border text-xs ${
            banner.tone === 'success'
              ? 'border-green-500/40 bg-green-500/10 text-green-200'
              : 'border-red-500/40 bg-red-500/10 text-red-200'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Certification Tracking</h3>
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <p className="text-xs text-zinc-400">
          Track member certifications, expiration windows, and command-controlled certification actions.
        </p>

        {commandAccess ? (
          <div className="space-y-3 border border-zinc-700 rounded p-3 bg-zinc-900/40">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Certification name"
                aria-label="Certification name"
              />
              <select
                value={form.level}
                onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value }))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
                aria-label="Certification level"
              >
                <option value="STANDARD">Standard</option>
                <option value="ADVANCED">Advanced</option>
                <option value="ELITE">Elite</option>
                <option value="MASTER">Master</option>
              </select>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                aria-label="Certification expiry"
              />
              <Input
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes or rationale"
                aria-label="Certification notes"
              />
            </div>
            <Button onClick={issueCertification} disabled={saving || !form.name.trim()}>
              {saving ? 'Processing…' : 'Issue Certification'}
            </Button>
          </div>
        ) : (
          <div className="p-3 rounded border border-zinc-700 bg-zinc-900/40 text-xs text-zinc-400 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5" />
            Certification issue/revoke actions require command privileges.
          </div>
        )}
      </div>

      <div className="space-y-2">
        {certifications.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-zinc-700 rounded text-zinc-500 text-sm">
            No certifications recorded for this member.
          </div>
        ) : (
          certifications.map((cert) => (
            <div key={cert.id} className="p-3 rounded border border-zinc-700 bg-zinc-900/50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">{cert.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Level: {cert.level || 'STANDARD'}</div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded border uppercase ${statusTone(cert.status)}`}>
                  {cert.status || 'active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                <div>
                  Issued: {cert.issued_at ? new Date(cert.issued_at).toLocaleString() : 'Unknown'}
                </div>
                <div>
                  Expires: {cert.expires_at ? new Date(cert.expires_at).toLocaleString() : 'Not set'}
                </div>
              </div>

              {cert.notes && <div className="text-xs text-zinc-400">{cert.notes}</div>}

              {commandAccess && cert.status === 'active' && (
                <div className="flex items-center gap-2">
                  <Input
                    value={text(revokeReasonById[cert.id])}
                    onChange={(e) =>
                      setRevokeReasonById((prev) => ({
                        ...prev,
                        [cert.id]: e.target.value,
                      }))
                    }
                    placeholder="Revocation reason (optional)"
                    aria-label={`Revocation reason for ${cert.name}`}
                  />
                  <Button size="sm" variant="outline" onClick={() => revokeCertification(cert)} disabled={saving}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Revoke
                  </Button>
                </div>
              )}
              {cert.status === 'revoked' && (
                <div className="text-xs text-red-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Revoked
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
