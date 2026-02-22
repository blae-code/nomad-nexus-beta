import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { navigateToPage } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Compass, ChevronRight, Check, AlertCircle, CheckCircle2, Zap, Brain } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import RouteGuard from '@/components/auth/RouteGuard';
import { upsertUserOperationPreference } from '@/components/nexus-os/services/operationEnhancementService';
import {
  WORKSPACE_ACTIVITY_OPTIONS,
  deriveWorkspacePreferenceFromOnboarding,
} from '@/components/nexus-os/services/workspaceConfigurationService';

export default function Onboarding() {
  const { user, refreshAuth } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activityNotice, setActivityNotice] = useState('');
  const [formData, setFormData] = useState({
    rsiCallsign: '',
    nomadCallsign: '',
    bio: '',
    preferredActivities: [],
    acceptedCode: false,
    aiConsent: false,
    aiUseHistory: true,
  });

  // Load user's existing MemberProfile callsign
  useEffect(() => {
    if (!user) return;
    
    const loadProfile = async () => {
      try {
        if (!user.member_profile_id) return;
        const profiles = await base44.entities.MemberProfile.filter({ id: user.member_profile_id });
        if (profiles.length > 0) {
          setFormData(prev => ({
            ...prev,
            rsiCallsign: profiles[0]?.callsign || ''
          }));
        }
      } catch (err) {
        console.error('Profile load error:', err);
      }
    };
    
    loadProfile();
  }, [user]);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);
  const toggleActivity = (activityId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.preferredActivities) ? prev.preferredActivities : [];
      if (current.includes(activityId)) {
        return {
          ...prev,
          preferredActivities: current.filter((entry) => entry !== activityId),
        };
      }
      if (current.length >= 3) {
        setActivityNotice('Select up to 3 activity themes for your initial workspace packs.');
        return prev;
      }
      setActivityNotice('');
      return {
        ...prev,
        preferredActivities: [...current, activityId],
      };
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (!user?.member_profile_id) {
        alert('No member profile found');
        return;
      }

      const profiles = await base44.entities.MemberProfile.filter({ id: user.member_profile_id });
      if (profiles.length === 0) {
        alert('No member profile found');
        return;
      }

      const profile = profiles[0];

      const trimmedDisplay = formData.nomadCallsign?.trim() || '';
      const updatePayload = {
        bio: formData.bio,
        onboarding_completed: true,
        accepted_codes_at: new Date().toISOString(),
        ai_consent: formData.aiConsent,
        ai_use_history: formData.aiUseHistory,
        ...(trimmedDisplay ? { display_callsign: trimmedDisplay } : {}),
      };

      try {
        await base44.entities.MemberProfile.update(profile.id, updatePayload);
      } catch (updateErr) {
        if (updatePayload.display_callsign) {
          const { display_callsign, ...fallbackPayload } = updatePayload;
          await base44.entities.MemberProfile.update(profile.id, fallbackPayload);
        } else {
          throw updateErr;
        }
      }

      if (trimmedDisplay) {
        localStorage.setItem(`nexus.display_callsign.${profile.id}`, trimmedDisplay);
      }
      const derivedPreference = deriveWorkspacePreferenceFromOnboarding(formData.preferredActivities);
      try {
        upsertUserOperationPreference({
          userId: profile.id,
          activityTags: derivedPreference.activityTags,
          preferredRoles: derivedPreference.preferredRoles,
          postureAffinity: 'ANY',
          availability: 'AUTO',
          notifyOptIn: true,
        });
      } catch (prefErr) {
        console.warn('Unable to save workspace activity preference:', prefErr);
      }

      await refreshAuth();
      navigateToPage('Hub');
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard requiredAuth="authenticated">
    <div className="nexus-immersive-screen min-h-screen relative overflow-hidden">
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full">
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    s < step 
                      ? 'bg-green-500/80' 
                      : s === step 
                        ? 'bg-gradient-to-r from-red-600 to-red-500 shadow-lg shadow-red-500/40' 
                        : 'bg-zinc-800/60'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em]">
              <div className="h-px w-6 bg-red-700/40" />
              <span className="text-zinc-500 font-bold">Step {step} of 5</span>
              <div className="h-px w-6 bg-red-700/40" />
            </div>
          </div>

          {step === 1 && (
           <div className="nexus-immersive-panel p-10 rounded-lg shadow-2xl shadow-red-900/30">
             <div className="flex items-center justify-center mb-8 relative">
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-28 h-28 rounded-full bg-red-500/10 animate-pulse" />
               </div>
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                 alt="Redscar Nomads"
                 className="w-24 h-24 drop-shadow-2xl relative z-10"
               />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-[0.25em] text-center text-white mb-6 drop-shadow-lg">
                Welcome, Wanderer
              </h1>
              <p className="text-center text-zinc-300 text-sm mb-8 leading-relaxed max-w-xl mx-auto">
                You have been granted passage to join <span className="text-red-400 font-semibold">Redscar Nomads</span>, 
                a band of wanderers united by <span className="text-red-400 font-semibold">The Eternal Voyage</span>. 
                Together, we explore the new and exotic of the 'verse, building real-world friendships 
                and carving our path among the stars.
              </p>
              <div className="bg-zinc-950/60 border-l-4 border-red-500/70 p-5 mb-8 rounded max-w-xl mx-auto">
                <p className="text-xs text-zinc-400 italic leading-relaxed">
                  "Members always know they have a bonfire to come back to, no matter how long they have been gone."
                </p>
              </div>
              <Button onClick={handleNext} className="w-full h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold uppercase tracking-wide shadow-lg shadow-red-500/30 hover:shadow-red-400/40 transition-all">
                Begin Journey <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
           <div className="nexus-immersive-panel p-10 rounded-lg shadow-2xl shadow-red-900/30">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30">
                  <Compass className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white">
                  Establish Identity
                </h2>
              </div>

              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-amber-300/90 mb-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 bg-amber-400/70 rounded-full" />
                      RSI Callsign (Verified)
                    </span>
                  </label>
                  <Input
                    value={formData.rsiCallsign}
                    disabled
                    className="h-11 bg-zinc-950/40 border-amber-500/30 text-zinc-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">This is your verified Star Citizen identity</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-emerald-300/90 mb-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 bg-emerald-400/70 rounded-full" />
                      Nomad Nexus Callsign (Display Name)
                    </span>
                  </label>
                  <Input
                    placeholder="Choose your display name..."
                    value={formData.nomadCallsign}
                    onChange={(e) => setFormData({ ...formData, nomadCallsign: e.target.value })}
                    className="h-11 bg-zinc-950/40 border-emerald-500/40 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <p className="text-xs text-zinc-600 mt-1.5">
                    This is how you'll appear to other Nomads. Can be changed anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-cyan-300/90 mb-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 bg-cyan-400/70 rounded-full" />
                      Bio (Optional)
                    </span>
                  </label>
                  <Textarea
                    placeholder="Tell us your story, wanderer..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="h-24 bg-zinc-950/40 border-cyan-500/40 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-500/30 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.15em] text-violet-300/90 mb-2.5">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-1 h-1 bg-violet-400/70 rounded-full" />
                      Preferred Activity Themes (Up to 3)
                    </span>
                  </label>
                  <p className="text-xs text-zinc-500 mb-3 leading-relaxed">
                    Your selections drive preconfigured NexusOS workspace packs when you first enter the app.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {WORKSPACE_ACTIVITY_OPTIONS.map((option) => {
                      const selected = formData.preferredActivities.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleActivity(option.id)}
                          className={`text-left rounded-lg border px-3.5 py-3 transition-all ${
                            selected
                              ? 'border-red-500/60 bg-red-500/15 shadow-lg shadow-red-500/20'
                              : 'border-zinc-700/70 bg-zinc-900/40 hover:border-zinc-600 hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className="text-sm font-semibold text-zinc-100">{option.label}</div>
                          <div className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{option.description}</div>
                        </button>
                      );
                    })}
                  </div>
                  {activityNotice ? <p className="text-xs text-amber-400 mt-2.5 font-medium">{activityNotice}</p> : null}
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-11">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold uppercase tracking-wide shadow-lg shadow-red-500/30 hover:shadow-red-400/40 transition-all">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
           <div className="nexus-immersive-panel p-10 rounded-lg shadow-2xl shadow-red-900/30">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30">
                  <Shield className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white">
                  The Redscar Code
                </h2>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/60 p-6 mb-8 space-y-3 max-h-64 overflow-y-auto rounded-lg">
                <div className="text-sm text-slate-300 space-y-2">
                  <p className="text-red-400 font-bold">Rules to be followed by all who wander with us:</p>
                  <p>1. <span className="text-red-400">Help First. Combat Second.</span> Redscar will always try to help wanderers, no matter background or status.</p>
                  <p>2. Bigotry, racism, homophobia, transphobia, and discrimination in general has no place in Redscar.</p>
                  <p>3. Extreme or excessive profanity is not allowed, including in any usernames.</p>
                  <p>4. <span className="text-red-400">Have respect for one another.</span> We are all Wanderers in the end.</p>
                  <p>5. Any disagreements that cannot be resolved in private need to be brought to The Pioneer.</p>
                  <p>6. To become a full member of Redscar, you must participate in voice for a length of time so we all get to know you and make sure you're a good fit with us.</p>
                  <p>7. <span className="text-red-400">Respect Voice comms.</span> If joining a Focused channel, please be courteous.</p>
                </div>
              </div>

              <label className="flex items-start gap-3.5 mb-8 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                  formData.acceptedCode 
                    ? 'border-red-500 bg-red-500/20' 
                    : 'border-zinc-700 group-hover:border-zinc-600'
                }`}>
                  {formData.acceptedCode && <Check className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <div className="flex-1">
                  <input
                    type="checkbox"
                    checked={formData.acceptedCode}
                    onChange={(e) => setFormData({ ...formData, acceptedCode: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="text-sm text-zinc-100 leading-relaxed">
                    I accept and will abide by <span className="text-red-400 font-semibold">The Redscar Code</span>
                  </span>
                </div>
              </label>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-11">
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.acceptedCode} className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold uppercase tracking-wide shadow-lg shadow-red-500/30 hover:shadow-red-400/40 transition-all">
                  Accept & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
           <div className="nexus-immersive-panel p-10 rounded-lg shadow-2xl shadow-red-900/30">
             <div className="flex items-center gap-4 mb-8">
               <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30">
                 <Brain className="w-7 h-7 text-red-400" />
               </div>
                <h2 className="text-3xl font-black uppercase tracking-[0.2em] text-white">
                  AI Capabilities
                </h2>
              </div>

              <div className="bg-zinc-950/60 border-l-4 border-red-500/70 p-5 mb-8 rounded">
                <p className="text-sm text-slate-300 mb-2">
                  Redscar Nomads optionally uses AI to enhance your experience with tactical analysis, 
                  mission insights, and comms assistance. <span className="text-red-400 font-bold">All AI features are optional.</span>
                </p>
                <p className="text-xs text-slate-500 italic mt-2">💡 You can change these settings anytime in your preferences after onboarding.</p>
              </div>

              <div className="space-y-5 mb-6">
                {/* Main AI Features Toggle */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className={`mt-1 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      formData.aiConsent 
                        ? 'border-red-500 bg-red-500/20' 
                        : 'border-slate-700 group-hover:border-slate-600'
                    }`}>
                      {formData.aiConsent && <Check className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="flex-1">
                      <input
                        type="checkbox"
                        checked={formData.aiConsent}
                        onChange={(e) => setFormData({ ...formData, aiConsent: e.target.checked })}
                        className="sr-only"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">Enable AI-Powered Features</span>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          Enables tactical analysis, mission intelligence, comms optimization, and AI-assisted decision-making across the Nexus.
                        </p>
                      </div>
                    </div>
                  </label>

                  <div className="mt-4 ml-8 flex gap-2 text-xs">
                    {formData.aiConsent ? (
                      <div className="flex items-center gap-1.5 text-green-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>AI features <span className="font-bold">ENABLED</span></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>AI features <span className="font-bold">DISABLED</span> — only manual tools available</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Conversation History Sub-option */}
                {formData.aiConsent && (
                  <div className="bg-slate-900/40 border border-slate-800 p-5 rounded ml-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div className={`mt-1 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          formData.aiUseHistory 
                            ? 'border-red-500 bg-red-500/20' 
                            : 'border-slate-700 group-hover:border-slate-600'
                        }`}>
                        {formData.aiUseHistory && <Check className="w-3 h-3 text-red-500" />}
                      </div>
                      <div className="flex-1">
                        <input
                          type="checkbox"
                          checked={formData.aiUseHistory}
                          onChange={(e) => setFormData({ ...formData, aiUseHistory: e.target.checked })}
                          className="sr-only"
                        />
                        <div>
                          <span className="text-sm font-bold text-white block">Store Conversation History</span>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            AI remembers your past interactions to provide smarter recommendations and context-aware assistance.
                          </p>
                        </div>
                      </div>
                    </label>

                    <div className="mt-4 ml-8 flex gap-2 text-xs">
                      {formData.aiUseHistory ? (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <Zap className="w-3.5 h-3.5" />
                          <span>History <span className="font-bold">RETAINED</span> — better AI context</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>History <span className="font-bold">DISCARDED</span> — AI starts fresh each session</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-11">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold uppercase tracking-wide shadow-lg shadow-red-500/30 hover:shadow-red-400/40 transition-all">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 5 && (
           <div className="nexus-immersive-panel p-10 rounded-lg shadow-2xl shadow-red-900/30">
             <div className="flex items-center justify-center mb-8 relative">
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-28 h-28 rounded-full bg-red-500/10 animate-pulse" />
               </div>
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                 alt="Redscar Nomads"
                 className="w-20 h-20 drop-shadow-2xl relative z-10"
               />
             </div>
              
              <h2 className="text-4xl font-black uppercase tracking-[0.25em] text-center text-white mb-6 drop-shadow-lg">
                Welcome to the Bonfire
              </h2>
              
              <p className="text-center text-zinc-300 mb-10 text-sm leading-relaxed">
                You are now a <span className="text-red-400 font-semibold">Vagrant</span> of Redscar Nomads. 
                Your journey on The Eternal Voyage begins now.
              </p>

              <div className="bg-zinc-950/60 border border-zinc-800/60 p-6 mb-8 space-y-3 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">RSI Callsign:</span>
                  <span className="text-white font-mono">{formData.rsiCallsign}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">Display Name:</span>
                  <span className="text-white font-mono">{formData.nomadCallsign || formData.rsiCallsign}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">Rank:</span>
                  <span className="text-red-400 font-bold">VAGRANT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">Code Accepted:</span>
                  <span className="text-green-400 font-bold">YES</span>
                </div>
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-slate-500 font-bold uppercase tracking-wide">Activity Packs:</span>
                  <span className="text-white font-mono text-right">
                    {formData.preferredActivities.length > 0
                      ? WORKSPACE_ACTIVITY_OPTIONS.filter((entry) => formData.preferredActivities.includes(entry.id))
                          .map((entry) => entry.label)
                          .join(', ')
                      : 'General'}
                  </span>
                </div>
              </div>

              <div className="bg-red-950/30 border-l-4 border-red-500/70 p-5 mb-8 rounded">
                <p className="text-xs text-zinc-300 italic leading-relaxed">
                  "The nomadic theme runs deep. Not only in our playstyle of constant motion, 
                  but also in real life. Members always knowing they have a bonfire to come back to."
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1 h-11">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1 h-11 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold uppercase tracking-wide shadow-lg shadow-red-500/30 hover:shadow-red-400/40 transition-all relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700" />
                  <span className="relative z-10">{loading ? 'Finalizing...' : 'Enter the Nexus'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}