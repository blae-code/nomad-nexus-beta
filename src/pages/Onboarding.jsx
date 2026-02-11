import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Compass, ChevronRight, Check, AlertCircle, CheckCircle2, Zap, Brain } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import RouteGuard from '@/components/auth/RouteGuard';

export default function Onboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rsiCallsign: '',
    nomadCallsign: '',
    bio: '',
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

      window.location.href = createPageUrl('Hub');
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
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-full h-1.5 transition-all duration-300 ${s <= step ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-slate-800'} ${s < 5 ? 'mr-2' : ''}`}
                />
              ))}
            </div>
            <div className="text-xs text-slate-600 text-center font-mono uppercase tracking-widest">
              ▼ Step {step} of 5 ▼
            </div>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
           <div className="nexus-immersive-panel p-8">
             <div className="flex items-center justify-center mb-6">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                 alt="Redscar Nomads"
                 className="w-20 h-20 drop-shadow-lg"
               />
              </div>
              <h1 className="nexus-section-title text-4xl font-black uppercase tracking-widest text-center text-white mb-4">
                Welcome, Wanderer
              </h1>
              <p className="text-center text-slate-400 text-sm mb-8 leading-relaxed">
                You have been granted passage to join <span className="text-red-400 font-bold">Redscar Nomads</span>, 
                a band of wanderers united by <span className="text-red-400">The Eternal Voyage</span>. 
                Together, we explore the new and exotic of the 'verse, building real-world friendships 
                and carving our path among the stars.
              </p>
              <div className="bg-slate-900/50 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-xs text-slate-400 italic">
                  "Members always know they have a bonfire to come back to, no matter how long they have been gone."
                </p>
              </div>
              <Button onClick={handleNext} className="w-full">
                Begin Journey <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Identity */}
          {step === 2 && (
           <div className="nexus-immersive-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <Compass className="w-8 h-8 text-red-600" />
                <h2 className="nexus-section-title text-2xl font-black uppercase tracking-widest text-white">
                  Establish Identity
                </h2>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="nexus-label block text-red-300 mb-2">
                    ◆ RSI Callsign (Verified)
                  </label>
                  <Input
                    value={formData.rsiCallsign}
                    disabled
                    className="border-red-500/35 text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-600 mt-1">This is your verified Star Citizen identity</p>
                </div>

                <div>
                  <label className="nexus-label block text-red-300 mb-2">
                    ◆ Nomad Nexus Callsign (Display Name)
                  </label>
                  <Input
                    placeholder="Choose your display name..."
                    value={formData.nomadCallsign}
                    onChange={(e) => setFormData({ ...formData, nomadCallsign: e.target.value })}
                    className="border-red-500/35"
                  />
                  <p className="text-xs text-slate-600 mt-1">
                    This is how you'll appear to other Nomads. Can be changed anytime.
                  </p>
                </div>

                <div>
                  <label className="nexus-label block text-red-300 mb-2">
                    ◆ Bio (Optional)
                  </label>
                  <Textarea
                    placeholder="Tell us your story, wanderer..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="h-24 border-red-500/35"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: The Code */}
          {step === 3 && (
           <div className="nexus-immersive-panel p-8">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-red-600" />
                <h2 className="nexus-section-title text-2xl font-black uppercase tracking-widest text-white">
                  The Redscar Code
                </h2>
              </div>

              <div className="bg-slate-900/50 border-2 border-slate-800 p-6 mb-6 space-y-3 max-h-64 overflow-y-auto">
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

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                  formData.acceptedCode 
                    ? 'border-red-500 bg-red-500/20' 
                    : 'border-slate-700 group-hover:border-slate-600'
                }`}>
                  {formData.acceptedCode && <Check className="w-3 h-3 text-red-500" />}
                </div>
                <div className="flex-1">
                  <input
                    type="checkbox"
                    checked={formData.acceptedCode}
                    onChange={(e) => setFormData({ ...formData, acceptedCode: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="text-sm text-white">
                    I accept and will abide by <span className="text-red-400 font-bold">The Redscar Code</span>
                  </span>
                </div>
              </label>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!formData.acceptedCode} className="flex-1">
                  Accept & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: AI Consent */}
          {step === 4 && (
           <div className="nexus-immersive-panel p-8">
             <div className="flex items-center gap-3 mb-6">
               <Brain className="w-8 h-8 text-red-600" />
                <h2 className="nexus-section-title text-2xl font-black uppercase tracking-widest text-white">
                  AI Capabilities & Preferences
                </h2>
              </div>

              <div className="bg-slate-900/50 border-l-4 border-red-500 p-4 mb-6">
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
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
           <div className="nexus-immersive-panel p-8">
             <div className="flex items-center justify-center mb-6">
               <img 
                 src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                 alt="Redscar Nomads"
                 className="w-16 h-16 drop-shadow-lg"
               />
             </div>
              
              <h2 className="nexus-section-title text-3xl font-black uppercase tracking-widest text-center text-white mb-4">
                Welcome to the Bonfire
              </h2>
              
              <p className="text-center text-slate-400 mb-8">
                You are now a <span className="text-red-400 font-bold">Vagrant</span> of Redscar Nomads. 
                Your journey on The Eternal Voyage begins now.
              </p>

              <div className="bg-slate-900/50 border-2 border-slate-800 p-6 mb-6 space-y-3">
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
              </div>

              <div className="bg-red-500/10 border-l-4 border-red-500 p-4 mb-6">
                <p className="text-xs text-slate-300 italic">
                  "The nomadic theme runs deep. Not only in our playstyle of constant motion, 
                  but also in real life. Members always knowing they have a bonfire to come back to."
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                  {loading ? 'Finalizing...' : 'Enter the Nexus'}
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
