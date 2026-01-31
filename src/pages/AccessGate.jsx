import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Zap, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import DevelopmentRoadmap from '@/components/common/DevelopmentRoadmap';
import RouteGuard from '@/components/auth/RouteGuard';
import PageTransition from '@/components/transitions/PageTransition';
import AsyncLoadingOverlay from '@/components/transitions/AsyncLoadingOverlay';

const scanlineStyle = `
  @keyframes scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100%); }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.35), inset 0 0 20px rgba(239, 68, 68, 0.05); }
    50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.15); }
  }
  .scanline-overlay {
    animation: scan 8s linear infinite;
  }
  .glow-box {
    animation: glow-pulse 4s ease-in-out infinite;
  }
`;

export default function AccessGate() {
  const [accessCode, setAccessCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [verifyingAuth, setVerifyingAuth] = useState(false);
  const [hasSavedLogin, setHasSavedLogin] = useState(false);
  const [authState, setAuthState] = useState(null);

  // Debug marker
  useEffect(() => {
    console.log('CUSTOM ACCESSGATE LOADED', window.location.href);
  }, []);

  // Check for saved login token to pre-fill form (don't auto-redirect)
  useEffect(() => {
    let isMounted = true;

    const checkSavedLogin = async () => {
      try {
        // Check for saved login token to pre-fill form
        const savedToken = localStorage.getItem('nexus.login.token');
        if (savedToken && isMounted) {
          setHasSavedLogin(true);
          try {
            const loginData = JSON.parse(atob(savedToken));
            setAccessCode(loginData.code);
            setCallsign(loginData.callsign);
            setRememberMe(true);
          } catch (e) {
            localStorage.removeItem('nexus.login.token');
          }
        }

        emitReadyBeacon('unauthenticated');
      } catch (err) {
        if (isMounted) {
          emitReadyBeacon('error');
          setError(err.message || 'Authentication check failed');
        }
      }
    };

    checkSavedLogin();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRedeem = async () => {
    const trimmedCode = accessCode.trim();
    const trimmedCallsign = callsign.trim();

    if (!trimmedCode || !trimmedCallsign) {
      setMessage('Please enter both access code and callsign');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
            const response = await base44.functions.invoke('redeemAccessKey', { code: trimmedCode, callsign: trimmedCallsign });

            if (response?.data?.success) {
              // Save login token if "Remember Me" is checked
              if (rememberMe && response?.data?.loginToken) {
                localStorage.setItem('nexus.login.token', response.data.loginToken);
              } else {
                localStorage.removeItem('nexus.login.token');
              }

              // Auth granted by backend, now verify it's established on client
              setMessage('Access granted! Confirming authentication...');
              setVerifyingAuth(true);

              try {
                // Wait up to 10 seconds for auth confirmation
                const confirmAuthPromise = confirmAuthEstablished();
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Auth confirmation timeout')), 10000)
                );

                await Promise.race([confirmAuthPromise, timeoutPromise]);

                // Auth confirmed by backend, AuthProvider will handle session on next load
                setMessage('Authorization confirmed. Redirecting...');
                emitReadyBeacon('authenticated');

                // Redirect to Hub (AuthProvider will determine next page based on rank/onboarding)
                setTimeout(() => {
                  window.location.href = createPageUrl('Hub');
                }, 1000);
              } catch (authErr) {
                setVerifyingAuth(false);
                setMessage(`Authentication setup failed: ${authErr.message}. Please try again or contact an administrator.`);
                setLoading(false);
              }
            } else {
              const errorMsg = response?.data?.message || 'Invalid credentials';
              if (errorMsg.includes('REVOKED') || errorMsg.includes('revoked')) {
                setMessage('⸻ Authorization Revoked ⸻\n\nThis access code has been deactivated. Contact your issuing officer for reissuance.\n\n⸻');
              } else {
                setMessage(errorMsg);
              }
              setLoading(false);
            }
          } catch (error) {
            console.error('Redeem error:', error);
            setMessage('Error validating credentials');
            setLoading(false);
          }
  };

  const confirmAuthEstablished = async () => {
    // verifyMemberSession was already called by redeemAccessKey
    // Just a short delay to ensure token is written to localStorage
    await new Promise(r => setTimeout(r, 500));
    return true;
  };

  const emitReadyBeacon = (state) => {
    setAuthState(state);
    window.dispatchEvent(new CustomEvent('nn:ready', { detail: { state } }));
  };

  if (error) {
    emitReadyBeacon('error');
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4">
        {/* Hidden readiness beacon */}
        <div id="nn-ready" data-state="error" style={{ display: 'none' }} />
        
        <div className="max-w-md w-full bg-black/80 border-2 border-red-700/70 p-8 rounded shadow-2xl shadow-red-700/30">
          <div className="text-center space-y-6">
            <div className="text-red-400 text-lg font-bold">⚠ Initialization Error</div>
            <div className="text-red-300 text-sm">{error}</div>
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 hover:bg-red-500 text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RouteGuard requiredAuth="none">
      <AsyncLoadingOverlay isLoading={loading || verifyingAuth} message={verifyingAuth ? 'Confirming authorization...' : 'Verifying credentials...'} />
      <PageTransition>
        <div className="w-screen h-screen bg-zinc-950 flex items-center justify-center px-4 overflow-hidden relative">
        <style>{scanlineStyle}</style>
      
      {/* Animated radial gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-black opacity-100" />

      {/* Dynamic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
      
      {/* Animated scanline effect */}
      <div className="absolute inset-0 scanline-overlay bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />

      {/* Subtle background glow */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />

      <div className="relative z-10 w-full max-w-md">
        <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-red-700/30 glow-box">
          {/* Header Section */}
          <div className="border-b border-red-700/50 bg-gradient-to-r from-red-700/15 via-transparent to-transparent p-8 relative overflow-hidden">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                alt="Redscar Nomads"
                className="w-20 h-20 drop-shadow-lg"
              />
            </div>

            <div className="text-center space-y-2.5">
              <h1 className="text-5xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
                Nexus <span className="text-red-600">Gate</span>
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold">
                Authorization Protocol
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            {/* Access Code Field */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-bold text-amber-300 uppercase tracking-[0.15em] block">
                ◆ Access Code
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="XXXX-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest text-center h-12 bg-slate-900/60 border-2 border-yellow-500/30 group-focus-within:border-yellow-500/60 group-focus-within:bg-slate-900 focus:border-yellow-500/60 focus:bg-slate-900 text-yellow-300 placeholder:text-slate-600 transition-all duration-200"
                  />
                  <div className="absolute -inset-1 border border-yellow-500/0 group-focus-within:border-yellow-500/20 rounded transition-all duration-200 pointer-events-none" />
              </div>
            </div>

            {/* Callsign Field */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-bold text-emerald-300 uppercase tracking-[0.15em] block">
                ◆ Callsign
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter callsign"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="tracking-wider text-center h-12 bg-slate-900/60 border-2 border-white/30 group-focus-within:border-white/60 group-focus-within:bg-slate-900 focus:border-white/60 focus:bg-slate-900 text-white placeholder:text-slate-600 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                  />
                  <div className="absolute -inset-1 border border-white/0 group-focus-within:border-white/20 rounded transition-all duration-200 pointer-events-none" />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3 pt-2 pb-1">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-2 border-cyan-500/40 bg-slate-900 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500"
              />
              <label htmlFor="rememberMe" className="text-xs text-cyan-300 cursor-pointer">
                Remember me on this device
              </label>
            </div>

            {/* Saved Login Info */}
            {hasSavedLogin && (
              <div className="flex items-center justify-between bg-cyan-950/30 border border-cyan-500/30 rounded px-3 py-2">
                <span className="text-[10px] text-cyan-300">✓ Saved login detected</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('nexus.login.token');
                    setHasSavedLogin(false);
                    setAccessCode('');
                    setCallsign('');
                  }}
                  className="h-6 px-2 text-cyan-400 hover:text-red-400 hover:bg-red-950/30"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Verify Button */}
            <Button
              onClick={handleRedeem}
              disabled={loading || verifyingAuth || !accessCode.trim() || !callsign.trim()}
              className="w-full h-12 mt-8 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-500" />
              {loading || verifyingAuth ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {verifyingAuth ? 'CONFIRMING AUTH...' : 'VERIFYING...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <Zap className="w-4 h-4 animate-pulse" />
                  VERIFY ACCESS
                </span>
              )}
            </Button>

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded border-2 text-center whitespace-pre-line font-mono text-xs animate-in fade-in duration-300 ${
                message.includes('granted') 
                  ? 'bg-green-950/40 border-green-500/50 text-green-300 shadow-lg shadow-green-500/20' 
                  : message.includes('Revoked') 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20' 
                  : 'bg-red-950/40 border-red-500/50 text-red-300 shadow-lg shadow-red-500/20'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-red-700/40 bg-gradient-to-r from-red-700/5 to-transparent px-8 py-5">
            <p className="text-[10px] text-red-700/70 text-center uppercase tracking-[0.2em] font-bold">
              ⸻ REDSCAR NOMADS COMMAND ⸻
            </p>
          </div>
        </div>

        {/* Security indicator */}
        <div className="mt-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse" />
            ENCRYPTED PROTOCOL
            <span className="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </span>
        </div>
      </div>

      {/* Hidden readiness beacon */}
      {authState && <div id="nn-ready" data-state={authState} style={{ display: 'none' }} />}

      {/* Debug marker - bottom left corner */}
      <div className="fixed bottom-3 left-3 text-[9px] px-2 py-1 bg-green-900/40 border border-green-500/30 text-green-400 rounded opacity-60 hover:opacity-100 transition-opacity font-mono z-50">
        ✓ CUSTOM ACCESSGATE LOADED
      </div>
      </div>
      </PageTransition>
      </RouteGuard>
      );
      }