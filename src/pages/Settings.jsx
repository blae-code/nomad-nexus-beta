import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, ToggleRight, Trash2, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [clearingCache, setClearingCache] = useState(false);
  const queryClient = useQueryClient();

  // Load user and profile
  useEffect(() => {
    const load = async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);

        if (u) {
          const profiles = await base44.entities.MemberProfile.filter({ user_id: u.id });
          setMemberProfile(profiles?.[0]);
        }
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // AI consent mutation
  const updateAiConsentMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!memberProfile) return;
      await base44.entities.MemberProfile.update(memberProfile.id, {
        ai_consent: enabled
      });
    },
    onSuccess: async () => {
      setSuccess('AI consent updated');
      setTimeout(() => setSuccess(null), 3000);
      queryClient.invalidateQueries({ queryKey: ['memberProfile'] });
      // Refetch profile
      const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
      setMemberProfile(profiles?.[0]);
    },
    onError: (err) => {
      setError(err.message);
    }
  });

  // Clear onboarding cache
  const handleClearCache = async () => {
    setClearingCache(true);
    setError(null);
    try {
      // Clear localStorage of onboarding-related data
      localStorage.removeItem('nexus_onboarding_state');
      localStorage.removeItem('nexus_access_code');
      localStorage.removeItem('nexus_persona_draft');

      setSuccess('Onboarding cache cleared. Your membership is preserved.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  if (loading) {
    return (
      <PageLayout
        title="Settings"
        subtitle="User preferences & privacy"
      >
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#ea580c] animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!user || !memberProfile) {
    return (
      <PageLayout
        title="Settings"
        subtitle="User preferences & privacy"
      >
        <div className="p-6">
          <p className="text-zinc-400">Unable to load settings. Please refresh.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Settings"
      subtitle="User preferences & privacy"
    >
      <div className="h-full overflow-auto p-6">
        <div className="max-w-2xl space-y-6">
          {/* Alerts */}
          {error && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 flex gap-3 items-start text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-950/40 border border-green-800/60 flex gap-3 items-start text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              <p className="text-green-300">{success}</p>
            </div>
          )}

          {/* Identity Section */}
          <div className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Identity</h2>
              <p className="text-xs text-zinc-500">Your operational identity within Nexus</p>
            </div>

            <div className="space-y-3">
              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                <p className="text-[11px] text-zinc-500 font-mono uppercase mb-1">Callsign</p>
                <p className="text-lg font-bold text-[#ea580c]">{memberProfile.callsign}</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                <p className="text-[11px] text-zinc-500 font-mono uppercase mb-1">Rank</p>
                <p className="text-sm font-semibold text-zinc-300">{memberProfile.rank}</p>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                <p className="text-[11px] text-zinc-500 font-mono uppercase mb-1">Member Since</p>
                <p className="text-sm text-zinc-400">
                  {memberProfile.created_date ? new Date(memberProfile.created_date).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* AI & Privacy Section */}
          <div className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">AI & Privacy</h2>
              <p className="text-xs text-zinc-500">Control AI-powered features and data usage</p>
            </div>

            {/* AI Consent Toggle */}
            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <ToggleRight className="w-4 h-4 text-[#ea580c]" />
                    AI-Powered Features
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Enable summaries, suggestions, and analytics
                  </p>
                </div>

                <label className="ml-4 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memberProfile.ai_consent || false}
                    onChange={(e) => updateAiConsentMutation.mutate(e.target.checked)}
                    disabled={updateAiConsentMutation.isPending}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400">
                    {updateAiConsentMutation.isPending ? 'Updating...' : (memberProfile.ai_consent ? 'Enabled' : 'Disabled')}
                  </span>
                </label>
              </div>

              <p className="text-[10px] text-zinc-600 px-1">
                When disabled, comms are processed locally only. When enabled, non-PII summaries are generated for operational insights.
              </p>
            </div>

            {/* Privacy Cue */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 p-3 rounded">
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                🔒 <strong>Your Privacy:</strong> Email is never displayed publicly. Your callsign is your operational identity. Operational comms stay inside the Dock—no external marketing or mailing lists.
              </p>
            </div>
          </div>

          {/* Cache & Data Section */}
          <div className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Cache & Data</h2>
              <p className="text-xs text-zinc-500">Local storage management</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-zinc-500" />
                    Clear Onboarding Cache
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Remove local onboarding state (does not affect membership)
                  </p>
                </div>

                <Button
                  onClick={handleClearCache}
                  disabled={clearingCache}
                  variant="outline"
                  size="sm"
                  className="ml-4 text-xs"
                >
                  {clearingCache ? 'Clearing...' : 'Clear'}
                </Button>
              </div>

              <p className="text-[10px] text-zinc-600 px-1">
                Clears the local browser cache of onboarding data. Your membership and profile remain intact.
              </p>
            </div>
          </div>

          {/* Data Export */}
          <div className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Data & Account</h2>
              <p className="text-xs text-zinc-500">Account management</p>
            </div>

            <div className="space-y-2 text-xs text-zinc-500">
              <p>Your operational data is stored securely on Nexus infrastructure. No third-party data sharing.</p>
              <p className="mt-2">For account deletion or data export requests, contact your Founder or admin.</p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}