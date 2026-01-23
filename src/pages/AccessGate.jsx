import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Check, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessGatePage() {
  const [step, setStep] = useState(1); // 1: confirm, 2: redeem, 3: persona
  const [user, setUser] = useState(null);
  const [code, setCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [acceptCodes, setAcceptCodes] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [grantsRank, setGrantsRank] = useState('VAGRANT');
  const [grantsRoles, setGrantsRoles] = useState([]);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) {
        base44.auth.redirectToLogin();
        return;
      }
      setUser(u);
    });
  }, []);

  const handleRedeemKey = async () => {
    if (!code.trim()) {
      setError('Please enter an access key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('redeemAccessKey', { code });
      setGrantsRank(response.data?.grants_rank || 'VAGRANT');
      setGrantsRoles(response.data?.grants_roles || []);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to redeem key');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!callsign.trim()) {
      setError('Please enter a callsign');
      return;
    }

    if (!acceptCodes) {
      setError('Please accept the codes and policies');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create/update MemberProfile
      const existing = await base44.entities.MemberProfile.filter({ user_id: user.id });
      const profile = {
        user_id: user.id,
        callsign,
        rank: grantsRank,
        roles: grantsRoles,
        onboarding_completed: true,
        accepted_codes_at: new Date().toISOString(),
        ai_consent: aiConsent,
        access_key_code: code
      };

      if (existing && existing.length > 0) {
        await base44.entities.MemberProfile.update(existing[0].id, profile);
      } else {
        await base44.entities.MemberProfile.create(profile);
      }

      // Redirect to main app
      window.location.href = '/hub';
    } catch (err) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen bg-[#09090b] flex items-center justify-center">
        <Radio className="w-12 h-12 text-[#ea580c] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-[#09090b] via-[#18181b] to-[#27272a] flex items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#ea580c]/10 border border-[#ea580c]/30 mb-4">
            <Radio className="w-8 h-8 text-[#ea580c]" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">NEXUS</h1>
          <p className="text-xs text-zinc-500 font-mono">INVITE-ONLY ONBOARDING</p>
        </div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          {/* Step 1: Confirm Identity */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="border border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Identity Confirmed</h2>
                <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                  <p className="text-[11px] text-zinc-400 uppercase font-mono">Account</p>
                  <p className="text-sm text-white font-bold mt-1">{user.full_name || user.email}</p>
                </div>
                <p className="text-xs text-zinc-500">
                  You're all set. Next, redeem your access key to create your Nexus persona.
                </p>
              </div>

              <Button
                onClick={() => setStep(2)}
                className="w-full bg-[#ea580c] hover:bg-orange-700 font-bold uppercase"
              >
                Continue
              </Button>
            </motion.div>
          )}

          {/* Step 2: Redeem Key */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="border border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Redeem Access Key</h2>
                <p className="text-xs text-zinc-500">
                  Enter the 11-character access key issued by an org admin.
                </p>
                <Input
                  placeholder="XXXXXXXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength="12"
                  className="font-mono text-sm tracking-widest bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600"
                  disabled={loading}
                />
                {error && (
                  <div className="bg-red-950/30 border border-red-700/50 p-3 rounded flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1 border-zinc-800"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleRedeemKey}
                  className="flex-1 bg-[#ea580c] hover:bg-orange-700 font-bold uppercase"
                  disabled={loading}
                >
                  {loading ? 'Validating...' : 'Redeem'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Create Persona */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="border border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Create Persona</h2>

                <div>
                  <label className="block text-xs text-zinc-400 uppercase font-bold mb-2">Callsign</label>
                  <Input
                    placeholder="Enter your callsign"
                    value={callsign}
                    onChange={(e) => setCallsign(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600"
                    disabled={loading}
                  />
                  <p className="text-[10px] text-zinc-600 mt-1">Your primary identity in Nexus</p>
                </div>

                {/* Rank Display */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded">
                  <p className="text-[10px] text-zinc-400 uppercase font-mono mb-1">Granted Rank</p>
                  <p className="text-sm font-bold text-[#ea580c]">{grantsRank}</p>
                </div>

                {/* Policies */}
                <div className="space-y-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={acceptCodes}
                      onCheckedChange={setAcceptCodes}
                      disabled={loading}
                    />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
                      I accept the Codes of Conduct and operational policies
                    </span>
                  </label>
                </div>

                {/* AI Consent */}
                <div className="space-y-2 border-t border-zinc-800 pt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={aiConsent}
                      onCheckedChange={setAiConsent}
                      disabled={loading}
                    />
                    <span className="text-xs text-zinc-400 group-hover:text-zinc-300">
                      Enable AI features (optional, can be changed in settings)
                    </span>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-950/30 border border-red-700/50 p-3 rounded flex gap-2 items-start">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setStep(2);
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1 border-zinc-800"
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleCreateProfile}
                  className="flex-1 bg-[#ea580c] hover:bg-orange-700 font-bold uppercase"
                  disabled={loading || !acceptCodes}
                >
                  {loading ? 'Creating...' : 'Complete'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Indicator */}
        <div className="flex gap-2 mt-8 justify-center">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 w-8 transition-colors ${
                s <= step ? 'bg-[#ea580c]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}