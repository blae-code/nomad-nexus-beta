import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Compass, Flame, ChevronRight, Check } from 'lucide-react';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    rsiCallsign: '',
    nomadCallsign: '',
    bio: '',
    acceptedCode: false,
    aiConsent: false,
    aiUseHistory: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }
        
        // Check if already onboarded
        const profiles = await base44.entities.MemberProfile.filter({ user_id: currentUser.id });
        if (profiles.length > 0 && profiles[0].onboarding_completed) {
          window.location.href = createPageUrl('Hub');
          return;
        }
        
        setUser(currentUser);
        setFormData(prev => ({ ...prev, rsiCallsign: profiles[0]?.callsign || '' }));
      } catch (err) {
        console.error('Auth error:', err);
        window.location.href = createPageUrl('AccessGate');
      }
    };
    checkAuth();
  }, []);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
      const profile = profiles[0];

      await base44.entities.MemberProfile.update(profile.id, {
        callsign: formData.nomadCallsign || formData.rsiCallsign,
        bio: formData.bio,
        onboarding_completed: true,
        accepted_codes_at: new Date().toISOString(),
        ai_consent: formData.aiConsent,
        ai_use_history: formData.aiUseHistory,
      });

      window.location.href = createPageUrl('Hub');
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl font-black uppercase tracking-widest">Initializing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`w-full h-1 ${s <= step ? 'bg-orange-500' : 'bg-zinc-800'} ${s < 5 ? 'mr-2' : ''}`}
                />
              ))}
            </div>
            <div className="text-xs text-zinc-500 text-center font-mono uppercase tracking-wider">
              Step {step} of 5
            </div>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="border-2 border-orange-500/30 bg-zinc-950/95 p-8">
              <div className="flex items-center justify-center mb-6">
                <Flame className="w-20 h-20 text-orange-500" />
              </div>
              <h1 className="text-4xl font-black uppercase tracking-widest text-center text-white mb-4">
                Welcome, Wanderer
              </h1>
              <p className="text-center text-zinc-400 text-sm mb-8 leading-relaxed">
                You have been granted passage to join <span className="text-orange-400 font-bold">Redscar Nomads</span>, 
                a band of wanderers united by <span className="text-orange-400">The Eternal Voyage</span>. 
                Together, we explore the new and exotic of the 'verse, building real-world friendships 
                and carving our path among the stars.
              </p>
              <div className="bg-zinc-900/50 border-l-4 border-orange-500 p-4 mb-6">
                <p className="text-xs text-zinc-400 italic">
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
            <div className="border-2 border-orange-500/30 bg-zinc-950/95 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Compass className="w-8 h-8 text-orange-500" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  Establish Identity
                </h2>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    RSI Callsign (Verified)
                  </label>
                  <Input
                    value={formData.rsiCallsign}
                    disabled
                    className="bg-zinc-900/50 border-zinc-700 text-zinc-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-zinc-600 mt-1">This is your verified Star Citizen identity</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Nomad Nexus Callsign (Display Name)
                  </label>
                  <Input
                    placeholder="Choose your display name..."
                    value={formData.nomadCallsign}
                    onChange={(e) => setFormData({ ...formData, nomadCallsign: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-700"
                  />
                  <p className="text-xs text-zinc-600 mt-1">
                    This is how you'll appear to other Nomads. Can be changed anytime.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-wider mb-2">
                    Bio (Optional)
                  </label>
                  <Textarea
                    placeholder="Tell us your story, wanderer..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-zinc-900/50 border-zinc-700 h-24"
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
            <div className="border-2 border-orange-500/30 bg-zinc-950/95 p-8">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-8 h-8 text-orange-500" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  The Redscar Code
                </h2>
              </div>

              <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6 mb-6 space-y-3 max-h-64 overflow-y-auto">
                <div className="text-sm text-zinc-300 space-y-2">
                  <p className="text-orange-400 font-bold">Rules to be followed by all who wander with us:</p>
                  <p>1. <span className="text-orange-400">Help First. Combat Second.</span> Redscar will always try to help wanderers, no matter background or status.</p>
                  <p>2. Bigotry, racism, homophobia, transphobia, and discrimination in general has no place in Redscar.</p>
                  <p>3. Extreme or excessive profanity is not allowed, including in any usernames.</p>
                  <p>4. <span className="text-orange-400">Have respect for one another.</span> We are all Wanderers in the end.</p>
                  <p>5. Any disagreements that cannot be resolved in private need to be brought to The Pioneer.</p>
                  <p>6. To become a full member of Redscar, you must participate in voice for a length of time so we all get to know you and make sure you're a good fit with us.</p>
                  <p>7. <span className="text-orange-400">Respect Voice comms.</span> If joining a Focused channel, please be courteous.</p>
                </div>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                  formData.acceptedCode 
                    ? 'border-orange-500 bg-orange-500/20' 
                    : 'border-zinc-700 group-hover:border-zinc-600'
                }`}>
                  {formData.acceptedCode && <Check className="w-3 h-3 text-orange-500" />}
                </div>
                <div className="flex-1">
                  <input
                    type="checkbox"
                    checked={formData.acceptedCode}
                    onChange={(e) => setFormData({ ...formData, acceptedCode: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="text-sm text-zinc-300">
                    I accept and will abide by <span className="text-orange-400 font-bold">The Redscar Code</span>
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
            <div className="border-2 border-orange-500/30 bg-zinc-950/95 p-8">
              <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-6">
                AI Features
              </h2>

              <div className="bg-zinc-900/50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm text-zinc-300 mb-2">
                  Redscar Nomads uses AI to enhance your experience, including tactical analysis, 
                  comms assistance, and operational intelligence.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                    formData.aiConsent 
                      ? 'border-orange-500 bg-orange-500/20' 
                      : 'border-zinc-700 group-hover:border-zinc-600'
                  }`}>
                    {formData.aiConsent && <Check className="w-3 h-3 text-orange-500" />}
                  </div>
                  <div className="flex-1">
                    <input
                      type="checkbox"
                      checked={formData.aiConsent}
                      onChange={(e) => setFormData({ ...formData, aiConsent: e.target.checked })}
                      className="sr-only"
                    />
                    <span className="text-sm text-zinc-300 font-bold">
                      Enable AI Features
                    </span>
                    <p className="text-xs text-zinc-500 mt-1">
                      Allow AI to assist with tactical operations and comms analysis
                    </p>
                  </div>
                </label>

                {formData.aiConsent && (
                  <label className="flex items-start gap-3 ml-8 cursor-pointer group">
                    <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                      formData.aiUseHistory 
                        ? 'border-orange-500 bg-orange-500/20' 
                        : 'border-zinc-700 group-hover:border-zinc-600'
                    }`}>
                      {formData.aiUseHistory && <Check className="w-3 h-3 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <input
                        type="checkbox"
                        checked={formData.aiUseHistory}
                        onChange={(e) => setFormData({ ...formData, aiUseHistory: e.target.checked })}
                        className="sr-only"
                      />
                      <span className="text-sm text-zinc-300">
                        Store conversation history for improved context
                      </span>
                    </div>
                  </label>
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
            <div className="border-2 border-orange-500/30 bg-zinc-950/95 p-8">
              <div className="flex items-center justify-center mb-6">
                <Flame className="w-16 h-16 text-orange-500 animate-pulse" />
              </div>
              
              <h2 className="text-3xl font-black uppercase tracking-widest text-center text-white mb-4">
                Welcome to the Bonfire
              </h2>
              
              <p className="text-center text-zinc-400 mb-8">
                You are now a <span className="text-orange-400 font-bold">Vagrant</span> of Redscar Nomads. 
                Your journey on The Eternal Voyage begins now.
              </p>

              <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6 mb-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-wide">RSI Callsign:</span>
                  <span className="text-white font-mono">{formData.rsiCallsign}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-wide">Display Name:</span>
                  <span className="text-white font-mono">{formData.nomadCallsign || formData.rsiCallsign}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-wide">Rank:</span>
                  <span className="text-orange-400 font-bold">VAGRANT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500 font-bold uppercase tracking-wide">Code Accepted:</span>
                  <span className="text-green-400 font-bold">YES</span>
                </div>
              </div>

              <div className="bg-orange-500/10 border-l-4 border-orange-500 p-4 mb-6">
                <p className="text-xs text-zinc-300 italic">
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
  );
}