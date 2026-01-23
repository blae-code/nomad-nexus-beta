import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, CheckCircle2, Loader2, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import PageLayout from '@/components/layout/PageLayout';

export default function AccessGatePage() {
  const [step, setStep] = useState(0); // 0: identity, 1: redeem, 2: persona
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Redeem form
  const [accessCode, setAccessCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [grantedRank, setGrantedRank] = useState(null);
  const [grantedRoles, setGrantedRoles] = useState([]);
  
  // Persona form
  const [callsign, setCallsign] = useState('');
  const [callsignError, setCallsignError] = useState(null);
  const [acceptedCodes, setAcceptedCodes] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.pathname);
          return;
        }
        const u = await base44.auth.me();
        setUser(u);
        setStep(0);
      } catch (err) {
        console.error('Auth error:', err);
        base44.auth.redirectToLogin(window.location.pathname);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // Redeem access key
  const handleRedeem = async (e) => {
    e.preventDefault();
    setRedeeming(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('redeemAccessKey', {
        code: accessCode.trim().toUpperCase()
      });

      setGrantedRank(response.data.grants_rank);
      setGrantedRoles(response.data.grants_roles || []);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setRedeeming(false);
    }
  };

  // Validate callsign
  const validateCallsign = async (cs) => {
    if (!cs || cs.length < 2) {
      setCallsignError('Callsign must be at least 2 characters');
      return false;
    }
    if (cs.length > 20) {
      setCallsignError('Callsign must be 20 characters or less');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(cs)) {
      setCallsignError('Callsign can only contain letters, numbers, - and _');
      return false;
    }

    // Check uniqueness
    try {
      const profiles = await base44.entities.MemberProfile.filter({ callsign: cs });
      if (profiles && profiles.length > 0) {
        setCallsignError('Callsign already taken');
        return false;
      }
    } catch (err) {
      console.error('Callsign check error:', err);
    }

    setCallsignError(null);
    return true;
  };

  // Create profile
  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!acceptedCodes) {
      setError('You must accept the codes and policies');
      return;
    }

    const valid = await validateCallsign(callsign);
    if (!valid) return;

    setCreating(true);
    setError(null);

    try {
      // Create or update member profile
      const existing = await base44.entities.MemberProfile.filter({ user_id: user.id });
      
      if (existing && existing.length > 0) {
        // Update
        await base44.entities.MemberProfile.update(existing[0].id, {
          callsign,
          rank: grantedRank || 'VAGRANT',
          roles: grantedRoles,
          onboarding_completed: true,
          accepted_codes_at: new Date().toISOString(),
          ai_consent: aiConsent
        });
      } else {
        // Create
        await base44.entities.MemberProfile.create({
          user_id: user.id,
          callsign,
          rank: grantedRank || 'VAGRANT',
          roles: grantedRoles,
          onboarding_completed: true,
          accepted_codes_at: new Date().toISOString(),
          ai_consent: aiConsent
        });
      }

      // Redirect to main app
      window.location.href = '/hub';
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-b from-black to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Radio className="w-12 h-12 text-[#ea580c] animate-pulse mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-500">INITIALIZING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-b from-black to-zinc-950 overflow-auto flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-[#ea580c]/10 border border-[#ea580c]/30 rounded mx-auto mb-4 flex items-center justify-center">
            <Radio className="w-6 h-6 text-[#ea580c]" />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">NEXUS</h1>
          <p className="text-xs font-mono text-zinc-500">Operational Access Portal</p>

          {/* Privacy confidence cue */}
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
              🔒 No mailing list. No marketing email.<br />
              Operational comms stay inside the Dock.
            </p>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 flex gap-2 items-start text-[12px]">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Step Indicator */}
        <div className="mb-6 flex gap-2 justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'h-2 w-6 transition-all',
                i < step ? 'bg-[#ea580c]' : i === step ? 'bg-[#ea580c]/60' : 'bg-zinc-800'
              )}
            />
          ))}
        </div>

        {/* STEP 0: Identity Confirmed */}
        {step === 0 && (
          <div className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase mb-3">Step 1/3</p>
              <h2 className="text-lg font-bold text-white mb-2">Identity Confirmed</h2>
              <p className="text-xs text-zinc-400">
                Your credentials are verified. You're ready to join the operational network.
              </p>
            </div>

            <div className="pt-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Authentication verified</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-300">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Access gate reached</span>
              </div>
            </div>

            <Button
              onClick={() => setStep(1)}
              className="w-full bg-[#ea580c] hover:bg-[#ea580c]/90 text-white font-bold uppercase text-xs mt-6"
            >
              Continue to Redemption
            </Button>
          </div>
        )}

        {/* STEP 1: Redeem Access Key */}
        {step === 1 && (
          <form onSubmit={handleRedeem} className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase mb-3">Step 2/3</p>
              <h2 className="text-lg font-bold text-white mb-2">Redeem Access Code</h2>
              <p className="text-xs text-zinc-400">
                Enter your org-issued access code to proceed.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase">Access Code</label>
              <Input
                placeholder="e.g., ABC3XY9K2M"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                disabled={redeeming}
                className="font-mono text-base uppercase bg-zinc-900 border-zinc-700 text-white"
              />
              <p className="text-[10px] text-zinc-500">10-12 characters, no ambiguous chars</p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(0)}
                disabled={redeeming}
                className="flex-1 text-xs uppercase font-bold"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={redeeming || !accessCode}
                className="flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white font-bold uppercase text-xs"
              >
                {redeeming && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {redeeming ? 'VALIDATING...' : 'REDEEM CODE'}
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Create Persona */}
        {step === 2 && (
          <form onSubmit={handleCreateProfile} className="border border-zinc-800 bg-zinc-950/60 p-6 space-y-4">
            <div>
              <p className="text-xs font-mono text-zinc-500 uppercase mb-3">Step 3/3</p>
              <h2 className="text-lg font-bold text-white mb-2">Create Persona</h2>
              <p className="text-xs text-zinc-400">
                Select your callsign. This is your primary identity in Nexus.
              </p>
            </div>

            {/* Callsign */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-zinc-400 uppercase">Callsign</label>
              <Input
                placeholder="e.g., Viper, Phoenix-1"
                value={callsign}
                onChange={(e) => {
                  setCallsign(e.target.value);
                  if (callsignError) setCallsignError(null);
                }}
                disabled={creating}
                className="font-mono text-base bg-zinc-900 border-zinc-700 text-white"
              />
              {callsignError && (
                <p className="text-[10px] text-red-400">{callsignError}</p>
              )}
              <p className="text-[10px] text-zinc-500">
                2-20 chars, letters/numbers/dashes allowed
              </p>
            </div>

            {/* Granted Rank (read-only) */}
            {grantedRank && (
              <div className="bg-zinc-900/50 border border-zinc-800 p-3 text-xs">
                <p className="text-zinc-500 font-mono mb-1">Granted Rank</p>
                <p className="text-[#ea580c] font-bold uppercase">{grantedRank}</p>
              </div>
            )}

            {/* Accept Codes */}
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                checked={acceptedCodes}
                onCheckedChange={setAcceptedCodes}
                disabled={creating}
                id="accept-codes"
              />
              <label htmlFor="accept-codes" className="text-xs text-zinc-400 cursor-pointer pt-0.5">
                I accept the Nexus operational codes and policies
              </label>
            </div>

            {/* AI Consent */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={aiConsent}
                onCheckedChange={setAiConsent}
                disabled={creating}
                id="ai-consent"
              />
              <label htmlFor="ai-consent" className="text-xs text-zinc-400 cursor-pointer pt-0.5">
                Allow AI-powered features (analytics, summaries, suggestions)
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={creating}
                className="flex-1 text-xs uppercase font-bold"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={creating || !callsign || !acceptedCodes}
                className="flex-1 bg-[#ea580c] hover:bg-[#ea580c]/90 text-white font-bold uppercase text-xs"
              >
                {creating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                {creating ? 'FINALIZING...' : 'COMPLETE ONBOARDING'}
              </Button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-zinc-600 mt-6 font-mono">
          v1.0 • Operational Access Control
        </p>
      </div>
    </div>
  );
}