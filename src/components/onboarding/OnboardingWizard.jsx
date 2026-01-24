import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Shield, 
  Zap, 
  Radio, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  User,
  FileText,
  Brain,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import FeatureOnboardingFlow from '@/components/onboarding/FeatureOnboardingFlow';

const steps = [
  { id: 'welcome', title: 'Welcome', icon: Shield },
  { id: 'callsign', title: 'Identity', icon: User },
  { id: 'codes', title: 'Charter', icon: FileText },
  { id: 'ai', title: 'AI Consent', icon: Brain },
  { id: 'complete', title: 'Ready', icon: CheckCircle2 }
];

export default function OnboardingWizard({ grantedRank = 'VAGRANT', grantedRoles = [], onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [callsign, setCallsign] = useState('');
  const [bio, setBio] = useState('');
  const [codesAccepted, setCodesAccepted] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [useHistory, setUseHistory] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = steps[currentStep];

  const handleNext = async () => {
    // Validation
    if (currentStep === 1 && !callsign.trim()) {
      toast.error('Callsign is required');
      return;
    }
    if (currentStep === 2 && !codesAccepted) {
      toast.error('You must accept the organizational charter');
      return;
    }

    // Final step: create profile
    if (currentStep === 3) {
      setIsSubmitting(true);
      try {
        const user = await base44.auth.me();
        
        // Create member profile
        await base44.entities.MemberProfile.create({
          user_id: user.id,
          callsign: callsign.trim(),
          rank: grantedRank,
          roles: Array.isArray(grantedRoles) ? grantedRoles : [],
          onboarding_completed: true,
          accepted_codes_at: codesAccepted ? new Date().toISOString() : null,
          ai_consent: aiConsent
        });

        // Create AI consent record if enabled
        if (aiConsent) {
          await base44.entities.AIConsent.create({
            user_id: user.id,
            feature: 'RIGGSY_CHAT',
            is_enabled: true,
            use_history: useHistory,
            consented_at: new Date().toISOString()
          });
        }

        setCurrentStep(4);
      } catch (error) {
        console.error('[ONBOARDING] Profile creation error:', error);
        toast.error('Failed to complete onboarding');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleFinish = () => {
    toast.success('Welcome to Nomad Nexus!');
    setTimeout(() => {
      onComplete?.();
      window.location.href = '/hub?showOnboarding=true';
    }, 1000);
  };

  return (
    <div className="h-screen w-screen bg-[#09090b] text-zinc-200 flex items-center justify-center overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:40px_40px] opacity-30" />
      <motion.div
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#ea580c]/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Loading Overlay */}
      {isSubmitting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Creating Your Profile...</p>
            <p className="text-[10px] font-mono text-zinc-700 mt-2">INITIALIZING MEMBER RECORD</p>
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-6">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-3">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;
              
              return (
                <React.Fragment key={s.id}>
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      opacity: isComplete || isActive ? 1 : 0.3
                    }}
                    className="relative"
                  >
                    <div className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center
                      ${isComplete ? 'border-[#ea580c] bg-[#ea580c]/20' : ''}
                      ${isActive ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-zinc-800 bg-zinc-950'}
                    `}>
                      {isComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-[#ea580c]" />
                      ) : (
                        <Icon className={`w-5 h-5 ${isActive ? 'text-[#ea580c]' : 'text-zinc-600'}`} />
                      )}
                    </div>
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-[#ea580c]"
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                      />
                    )}
                  </motion.div>
                  {idx < steps.length - 1 && (
                    <div className={`h-0.5 w-16 ${isComplete ? 'bg-[#ea580c]' : 'bg-zinc-800'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-zinc-600 font-mono uppercase tracking-wider mt-4">
            {step.title}
          </p>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm p-8 min-h-[400px] flex flex-col"
          >
            {/* Welcome Step */}
            {currentStep === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Shield className="w-24 h-24 text-[#ea580c] opacity-80 mb-4 mx-auto" />
                </motion.div>
                <h1 className="text-4xl font-black uppercase tracking-wider text-white">
                  Welcome to Nomad Nexus
                </h1>
                <p className="text-zinc-400 max-w-md leading-relaxed">
                  You have been granted access as a <span className="text-[#ea580c] font-bold">{grantedRank}</span>.
                  This marks the beginning of your journey with us.
                </p>
                <div className="bg-zinc-900/50 border border-zinc-800 p-6 max-w-md">
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Nomad Nexus is an operations hub for coordinated activities in the Star Citizen universe. 
                    We operate with structure, discipline, and mutual respect.
                  </p>
                </div>
              </div>
            )}

            {/* Callsign Step */}
            {currentStep === 1 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="text-center">
                  <User className="w-16 h-16 text-[#ea580c] opacity-80 mb-4 mx-auto" />
                  <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                    Choose Your Callsign
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Your callsign is your identity in Nexus. Choose wisely—it represents you.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                      Callsign *
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., VIPER, GHOST, NOMAD..."
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                      maxLength={20}
                      className="bg-zinc-900 border-zinc-800 text-xl font-bold tracking-wider text-center"
                      autoFocus
                    />
                    <p className="text-[10px] text-zinc-600 mt-2">
                      2-20 characters. This will be visible to all members.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold block mb-2">
                      Bio (Optional)
                    </label>
                    <Textarea
                      placeholder="A brief introduction about yourself or your operational focus..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={500}
                      rows={4}
                      className="bg-zinc-900 border-zinc-800 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Codes Step */}
            {currentStep === 2 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-[#ea580c] opacity-80 mb-4 mx-auto" />
                  <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                    Organizational Charter
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Review and accept our operational principles
                  </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 space-y-4 flex-1 overflow-y-auto max-h-64">
                  <div>
                    <h3 className="text-xs font-bold text-[#ea580c] uppercase tracking-wider mb-2">
                      Mission Statement
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Nomad Nexus operates as a coordinated collective, executing operations with precision, 
                      discipline, and mutual respect across the Star Citizen universe.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#ea580c] uppercase tracking-wider mb-2">
                      Core Values
                    </h3>
                    <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                      <li>Honor operational commitments</li>
                      <li>Maintain communication discipline</li>
                      <li>Support fellow members</li>
                      <li>Respect chain of command during operations</li>
                      <li>Contribute to collective success</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-[#ea580c] uppercase tracking-wider mb-2">
                      Code of Conduct
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      All members are expected to conduct themselves professionally, treat others with respect, 
                      and contribute positively to the organization's goals and reputation.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-900/50 border border-zinc-800 p-4">
                  <Switch
                    checked={codesAccepted}
                    onCheckedChange={setCodesAccepted}
                    className="mt-1"
                  />
                  <div>
                    <p className="text-sm text-zinc-300 font-medium">
                      I accept the organizational charter and code of conduct
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      By accepting, you agree to uphold these principles during operations
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Consent Step */}
            {currentStep === 3 && (
              <div className="flex-1 flex flex-col space-y-6">
                <div className="text-center">
                  <Brain className="w-16 h-16 text-[#ea580c] opacity-80 mb-4 mx-auto" />
                  <h2 className="text-2xl font-black uppercase tracking-wider text-white mb-2">
                    AI Assistant Access
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Configure your AI-powered features
                  </p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 p-6 space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Nomad Nexus includes AI-powered assistants to help with tactical planning, 
                    communications analysis, and operational insights. Your data stays within our system.
                  </p>

                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={aiConsent}
                        onCheckedChange={setAiConsent}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm text-zinc-300 font-medium">
                          Enable AI Assistant (Riggsy)
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Get AI-powered tactical insights and operational support
                        </p>
                      </div>
                    </div>

                    {aiConsent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pl-9"
                      >
                        <div className="flex items-start gap-3">
                          <Switch
                            checked={useHistory}
                            onCheckedChange={setUseHistory}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm text-zinc-300 font-medium">
                              Store conversation history
                            </p>
                            <p className="text-[10px] text-zinc-600 mt-1">
                              Improves AI responses by learning your preferences over time
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-zinc-600 text-center">
                  You can change these settings anytime in your profile
                </p>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 4 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20 
                  }}
                >
                  <div className="relative">
                    <CheckCircle2 className="w-24 h-24 text-[#ea580c] mx-auto" />
                    <motion.div
                      className="absolute inset-0 rounded-full border-4 border-[#ea580c]"
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeOut"
                      }}
                    />
                  </div>
                </motion.div>

                <div>
                  <h1 className="text-4xl font-black uppercase tracking-wider text-white mb-2">
                    You're Ready
                  </h1>
                  <p className="text-[#ea580c] font-bold text-xl uppercase tracking-wider">
                    {callsign}
                  </p>
                </div>

                <p className="text-zinc-400 max-w-md leading-relaxed">
                  Your profile has been created. Welcome to the nexus.
                </p>

                <div className="bg-zinc-900/50 border border-zinc-800 p-4 max-w-md space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Rank:</span>
                    <span className="text-[#ea580c] font-bold">{grantedRank}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-green-400 font-bold">ACTIVE</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">AI Access:</span>
                    <span className={`${aiConsent ? 'text-green-400' : 'text-zinc-600'} font-bold`}>
                      {aiConsent ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-zinc-800 mt-auto">
              {currentStep > 0 && currentStep < 4 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="border-zinc-800 hover:border-[#ea580c]/50"
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={handleNext}
                  className="flex-1 gap-2 bg-[#ea580c] hover:bg-[#ea580c]/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      {currentStep === 0 ? 'Begin' : currentStep === 3 ? 'Complete Setup' : 'Continue'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  className="flex-1 gap-2 bg-[#ea580c] hover:bg-[#ea580c]/90"
                >
                  <Sparkles className="w-4 h-4" />
                  Enter Nexus
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}