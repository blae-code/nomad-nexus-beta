import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight, Download, Shield, Lock, Database, Brain, AlertCircle, CheckCircle2, Zap, Eye, Server } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import RouteGuard from '@/components/auth/RouteGuard';

const glowStyle = `
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.35), inset 0 0 20px rgba(239, 68, 68, 0.05); }
    50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.15); }
  }
  .glow-box {
    animation: glow-pulse 4s ease-in-out infinite;
  }
  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  .scanline-overlay {
    animation: scan 8s linear infinite;
  }
`;

export default function Disclaimers() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [acceptedPWA, setAcceptedPWA] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [acceptedAI, setAcceptedAI] = useState(false);
  const [aiDefaults, setAiDefaults] = useState(true);

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleProceedToOnboarding = async () => {
    setLoading(true);
    try {
      // Create or update MemberProfile with disclaimer acceptance
      const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
      
      if (profiles.length === 0) {
        await base44.entities.MemberProfile.create({
          user_id: user.id,
          accepted_pwa_disclaimer_at: new Date().toISOString(),
          accepted_data_disclaimer_at: new Date().toISOString(),
          accepted_ai_disclaimer_at: new Date().toISOString(),
          ai_defaults_accepted: aiDefaults,
        });
      } else {
        await base44.entities.MemberProfile.update(profiles[0].id, {
          accepted_pwa_disclaimer_at: new Date().toISOString(),
          accepted_data_disclaimer_at: new Date().toISOString(),
          accepted_ai_disclaimer_at: new Date().toISOString(),
          ai_defaults_accepted: aiDefaults,
        });
      }

      window.location.href = createPageUrl('Onboarding');
    } catch (error) {
      console.error('Disclaimer error:', error);
      alert('Error processing disclaimers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard requiredAuth="authenticated">
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <style>{glowStyle}</style>
      
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-black opacity-100" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
      <div className="absolute inset-0 scanline-overlay bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />
      
      <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />
      
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="max-w-3xl w-full">
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-full h-1.5 transition-all duration-300 ${s <= step ? 'bg-gradient-to-r from-red-700 to-red-600' : 'bg-slate-800'} ${s < 3 ? 'mr-2' : ''}`}
                />
              ))}
            </div>
            <div className="text-xs text-slate-600 text-center font-mono uppercase tracking-widest">
              ▼ Disclaimer {step} of 3 ▼
            </div>
          </div>

          {/* Step 1: PWA Installation Disclaimer */}
          {step === 1 && (
            <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-8 shadow-2xl shadow-red-700/30 glow-box">
              <div className="flex items-center gap-3 mb-6">
                <Download className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  Nomad Nexus Installation
                </h2>
              </div>

              <div className="bg-slate-900/50 border-l-4 border-red-500 p-5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-red-400 font-bold">Nomad Nexus</span> is optimized as a <span className="text-red-400 font-bold">Progressive Web App (PWA)</span>—a web application you can install directly on your device. It works best in <span className="font-bold">full-screen mode on a dedicated monitor</span> for tactical operations and situational awareness.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3 mb-2">
                    <Download className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">How to Install</h3>
                      <ul className="text-sm text-slate-400 space-y-1 ml-2">
                        <li>• <span className="text-slate-300">Look for the <span className="font-mono text-orange-400">⬇️ Install</span> button in your browser's address bar</span></li>
                        <li>• <span className="text-slate-300">Click to add <span className="text-red-400 font-bold">Nomad Nexus</span> to your home screen or desktop</span></li>
                        <li>• <span className="text-slate-300">Launch like any other application</span></li>
                        <li>• <span className="text-slate-300">Works offline with cached data</span></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3 mb-2">
                    <Zap className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Advantages of Installing</h3>
                      <ul className="text-sm text-slate-400 space-y-1 ml-2">
                        <li>• <span className="text-slate-300">Faster load times and smoother performance</span></li>
                        <li>• <span className="text-slate-300">Full-screen immersion without browser UI clutter</span></li>
                        <li>• <span className="text-slate-300">Dedicated application icon in your taskbar/dock</span></li>
                        <li>• <span className="text-slate-300">Push notifications for ops and mission alerts</span></li>
                        <li>• <span className="text-slate-300">Works offline with data synchronization when reconnected</span></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Security & Trust</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        This PWA is served over encrypted HTTPS. Your data never leaves our secure servers. We use industry-standard encryption for all communications. Installing as a PWA does not grant any special access to your device—it's simply a packaged version of the web application. You maintain full control and can uninstall at any time like any other app.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Mobile & Tablet Coming Soon</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        <span className="text-red-400 font-bold">Mobile and tablet support</span> is currently in development. For now, the PWA is optimized for desktop and laptop displays in full-screen mode. Using it on mobile/tablet will still work, but the layout may not be optimal for those screen sizes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                  acceptedPWA 
                    ? 'border-red-500 bg-red-500/20' 
                    : 'border-slate-700 group-hover:border-slate-600'
                }`}>
                  {acceptedPWA && <Check className="w-3 h-3 text-red-500" />}
                </div>
                <div className="flex-1">
                  <input
                    type="checkbox"
                    checked={acceptedPWA}
                    onChange={(e) => setAcceptedPWA(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm text-white">
                    I understand that <span className="text-red-400 font-bold">Nomad Nexus</span> is optimized for PWA installation and desktop use, and that mobile support is coming soon.
                  </span>
                </div>
              </label>

              <div className="flex gap-3">
                <Button onClick={handleNext} disabled={!acceptedPWA} className="flex-1">
                  Accept & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Data & Privacy Disclaimer */}
          {step === 2 && (
            <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-8 shadow-2xl shadow-red-700/30 glow-box">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  Data & Privacy
                </h2>
              </div>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <Server className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">What Data We Collect</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">
                        When you use Nomad Nexus, we collect and store:
                      </p>
                      <ul className="text-sm text-slate-400 space-y-1 ml-3 list-disc">
                        <li>Your account information (callsign, email, profile data)</li>
                        <li>Operations and mission details you create or participate in</li>
                        <li>Communication messages in channels and voice nets</li>
                        <li>Fleet assets and tactical status information</li>
                        <li>Your rank, roles, and progression within Redscar</li>
                        <li>Usage logs for feature analytics and improvement</li>
                        <li>Device information and connection metrics (IP, browser, etc.)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">How We Store & Protect Data</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">
                        Your data is stored on secure, encrypted servers. We use:
                      </p>
                      <ul className="text-sm text-slate-400 space-y-1 ml-3 list-disc">
                        <li>HTTPS encryption for all data in transit</li>
                        <li>Industry-standard database encryption at rest</li>
                        <li>Role-based access control (only authorized admins can access data)</li>
                        <li>Regular security audits and updates</li>
                        <li>Automatic backups to prevent data loss</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">What We Don't Do With Your Data</h3>
                      <ul className="text-sm text-slate-400 space-y-1 ml-3 list-disc">
                        <li>We do <span className="font-bold text-slate-300">not</span> sell your data to third parties</li>
                        <li>We do <span className="font-bold text-slate-300">not</span> share your personal information without your consent</li>
                        <li>We do <span className="font-bold text-slate-300">not</span> track you outside of Nomad Nexus</li>
                        <li>We do <span className="font-bold text-slate-300">not</span> use your communications for advertising</li>
                        <li>We do <span className="font-bold text-slate-300">not</span> access your device files or camera</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Local Storage & Caching</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        As a PWA, Nomad Nexus caches data locally on your device to improve performance and allow offline functionality. This cached data is stored using browser APIs and remains on <span className="font-bold">your device only</span>. You can clear this cache anytime through your browser settings. This local cache never leaves your device without your explicit interaction.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Data Retention</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        We retain your data for as long as your account exists. You can request data deletion at any time by contacting the Nomad Nexus leadership. We will delete your personal information within 30 days, though operational records may be retained for historical purposes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center transition-all ${
                  acceptedData 
                    ? 'border-red-500 bg-red-500/20' 
                    : 'border-slate-700 group-hover:border-slate-600'
                }`}>
                  {acceptedData && <Check className="w-3 h-3 text-red-500" />}
                </div>
                <div className="flex-1">
                  <input
                    type="checkbox"
                    checked={acceptedData}
                    onChange={(e) => setAcceptedData(e.target.checked)}
                    className="sr-only"
                  />
                  <span className="text-sm text-white">
                    I understand how my data is collected, stored, and protected, and I accept the data practices of Nomad Nexus.
                  </span>
                </div>
              </label>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!acceptedData} className="flex-1">
                  Accept & Continue <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: AI Disclaimer */}
          {step === 3 && (
            <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-8 shadow-2xl shadow-red-700/30 glow-box">
              <div className="flex items-center gap-3 mb-6">
                <Brain className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">
                  AI-Powered Features
                </h2>
              </div>

              <div className="bg-slate-900/50 border-l-4 border-red-500 p-5 mb-6">
                <p className="text-sm text-slate-300 leading-relaxed">
                  <span className="text-red-400 font-bold">Nomad Nexus</span> uses AI to enhance your tactical operations with intelligent insights, analysis, and assistance. <span className="text-red-400 font-bold">All AI features are optional and customizable.</span>
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3 mb-2">
                    <Zap className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">What AI Powers in Nomad Nexus</h3>
                      <ul className="text-sm text-slate-400 space-y-1 ml-2">
                        <li>• <span className="text-slate-300"><span className="font-bold">Tactical Analysis</span> — AI recommends tactics based on mission type and assets</span></li>
                        <li>• <span className="text-slate-300"><span className="font-bold">Event Intelligence</span> — AI analyzes operations and suggests improvements</span></li>
                        <li>• <span className="text-slate-300"><span className="font-bold">Comms Assistance</span> — AI optimizes communication strategies and message clarity</span></li>
                        <li>• <span className="text-slate-300"><span className="font-bold">Readiness Insights</span> — AI evaluates crew preparedness and recommends training</span></li>
                        <li>• <span className="text-slate-300"><span className="font-bold">After-Action Reports</span> — AI summarizes operations and generates insights</span></li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3 mb-2">
                    <Eye className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">How AI Uses Your Data</h3>
                      <p className="text-sm text-slate-400 leading-relaxed mb-2">
                        AI analyzes your operations, communications, and tactical data to:
                      </p>
                      <ul className="text-sm text-slate-400 space-y-1 ml-2">
                        <li>• Generate contextual recommendations and insights</li>
                        <li>• Identify patterns in mission success and crew performance</li>
                        <li>• Provide personalized tactical suggestions</li>
                        <li>• Learn from your organization's unique playstyle</li>
                      </ul>
                      <p className="text-sm text-slate-400 leading-relaxed mt-2">
                        <span className="font-bold">Your data is never shared with third-party AI providers.</span> All analysis happens securely within the Nomad Nexus infrastructure.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded">
                  <div className="flex items-start gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">Customize Your Experience</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        After onboarding, you can control AI in your user settings:
                      </p>
                      <ul className="text-sm text-slate-400 space-y-1 ml-2 mt-2">
                        <li>• Enable or disable individual AI features</li>
                        <li>• Toggle conversation history storage for smarter recommendations</li>
                        <li>• Control which types of data AI analyzes</li>
                        <li>• Opt out of AI features entirely if preferred</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-950/40 border border-amber-900/60 p-4 rounded">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-white mb-2">AI Transparency</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        This application was designed and built with AI assistance. AI helped create the user interface, optimize performance, and design features. This is disclosed transparently so you understand how the application was constructed. The AI features themselves are optional and can be disabled anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 p-5 rounded mb-6">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="flex items-start gap-3 cursor-pointer group mb-3">
                      <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        acceptedAI 
                          ? 'border-red-500 bg-red-500/20' 
                          : 'border-slate-700 group-hover:border-slate-600'
                      }`}>
                        {acceptedAI && <Check className="w-3 h-3 text-red-500" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={acceptedAI}
                        onChange={(e) => setAcceptedAI(e.target.checked)}
                        className="sr-only"
                      />
                      <span className="text-sm text-white">
                        I understand how AI is used in Nomad Nexus and accept these AI-powered features.
                      </span>
                    </label>

                    {acceptedAI && (
                      <label className="flex items-start gap-3 cursor-pointer group ml-8">
                        <div className={`mt-0.5 w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          aiDefaults 
                            ? 'border-red-500 bg-red-500/20' 
                            : 'border-slate-700 group-hover:border-slate-600'
                        }`}>
                          {aiDefaults && <Check className="w-3 h-3 text-red-500" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={aiDefaults}
                          onChange={(e) => setAiDefaults(e.target.checked)}
                          className="sr-only"
                        />
                        <div>
                          <span className="text-sm text-slate-300">
                            Enable all AI features by default (with full customization available later)
                          </span>
                          <p className="text-xs text-slate-500 mt-1">Uncheck to disable AI features until you customize them in settings</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" className="flex-1">
                  Back
                </Button>
                <Button onClick={handleProceedToOnboarding} disabled={!acceptedAI || loading} className="flex-1">
                  {loading ? 'Finalizing...' : 'Accept & Proceed to Onboarding'}
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