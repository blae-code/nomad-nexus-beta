import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, Trash2 } from 'lucide-react';
import { navigateToPage } from '@/utils';
import RouteGuard from '@/components/auth/RouteGuard';
import PageTransition from '@/components/transitions/PageTransition';
import AsyncLoadingOverlay from '@/components/transitions/AsyncLoadingOverlay';

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
    if (import.meta.env.DEV) {
      console.log('CUSTOM ACCESSGATE LOADED', window.location.href);
    }
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
            localStorage.removeItem('nexus.display_callsign');
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
              // CRITICAL: Always save login token (required for auth), regardless of "Remember Me"
              if (response?.data?.loginToken) {
                localStorage.setItem('nexus.login.token', response.data.loginToken);
              }
              // "Remember Me" now only affects whether we pre-fill the form on next visit
              if (!rememberMe) {
                // Still save token for this session, but clear form data
                localStorage.removeItem('nexus.login.code');
                localStorage.removeItem('nexus.login.callsign');
              }

              // Auth granted by backend, now verify it's established on client
              setMessage('Access granted! Confirming authentication...');
              setVerifyingAuth(true);

              try {
                // Token already saved by redeemAccessKey, just wait for AuthProvider to pick it up
                await new Promise(r => setTimeout(r, 500));

              // Auth confirmed by backend, determine redirect based on profile completion
              setMessage('Authorization confirmed. Resolving next step...');
              emitReadyBeacon('authenticated');

              const resolveNextPage = (member, fallbackRank) => {
                const normalizedRank = (member?.rank || fallbackRank || '').toString().toUpperCase();
                const roles = (member?.roles || []).map((r) => r.toString().toLowerCase());
                const isAdmin = normalizedRank === 'PIONEER' || normalizedRank === 'FOUNDER' || roles.includes('admin');
                if (isAdmin) return 'Hub';
                if (!member?.accepted_pwa_disclaimer_at) return 'Disclaimers';
                if (!member?.onboarding_completed) return 'Onboarding';
                return 'Hub';
              };

              let nextPage = 'Disclaimers';
              const grantedRank = response?.data?.grants_rank;
              try {
                const verify = await base44.functions.invoke('verifyMemberSession', {
                  code: trimmedCode,
                  callsign: trimmedCallsign,
                });
                if (verify?.data?.success && verify?.data?.member) {
                  nextPage = resolveNextPage(verify.data.member, grantedRank);
                } else {
                  const isAdmin = (grantedRank || '').toString().toUpperCase() === 'PIONEER';
                  nextPage = isAdmin ? 'Hub' : 'Disclaimers';
                }
              } catch (verifyErr) {
                console.warn('verifyMemberSession fallback:', verifyErr?.message);
                const isAdmin = (grantedRank || '').toString().toUpperCase() === 'PIONEER';
                nextPage = isAdmin ? 'Hub' : 'Disclaimers';
              }

              setTimeout(() => {
                navigateToPage(nextPage);
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

  const emitReadyBeacon = (state) => {
    setAuthState(state);
    window.dispatchEvent(new CustomEvent('nn:ready', { detail: { state } }));
  };

  useEffect(() => {
    if (error) {
      setAuthState('error');
      window.dispatchEvent(new CustomEvent('nn:ready', { detail: { state: 'error' } }));
    }
  }, [error]);

  if (error) {
    return (
      <div className="nexus-immersive-screen min-h-screen flex items-center justify-center px-4">
        {/* Hidden readiness beacon */}
        <div id="nn-ready" data-state="error" style={{ display: 'none' }} />
        
        <div className="nexus-immersive-panel max-w-md w-full p-8 rounded">
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
        <div className="nexus-immersive-screen w-full h-screen max-h-screen flex items-center justify-center px-4 overflow-y-auto relative">

      <div className="relative z-10 w-full max-w-md my-8">
        <div className="nexus-immersive-panel p-0 overflow-hidden flex-shrink-0">
          {/* Header Section */}
          <div className="border-b border-red-700/50 bg-gradient-to-r from-red-700/15 via-transparent to-transparent p-6 relative overflow-hidden">
            <div className="flex items-center justify-center mb-4">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                alt="Redscar Nomads"
                className="w-16 h-16 drop-shadow-lg"
              />
            </div>

            <div className="text-center space-y-2">
              <h1 className="nexus-section-title text-4xl font-black uppercase tracking-[0.2em] text-white drop-shadow-lg">
                Nexus <span className="text-red-600">Gate</span>
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
              <p className="text-[10px] text-gray-400 uppercase tracking-[0.25em] font-bold">
                Authorization Protocol
              </p>
            </div>
          </div>

          {/* Form Section */}
          <form
            className="p-6 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleRedeem();
            }}
          >
            {/* Access Code Field */}
            <div className="space-y-2 group">
              <label htmlFor="accessCode" className="nexus-label text-amber-300 block">
                ◆ Access Code
              </label>
              <div className="relative">
                <Input
                  id="accessCode"
                  type="password"
                  placeholder="XXXX-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="font-mono tracking-widest text-center h-11 text-yellow-300 border-yellow-500/35"
                  />
              </div>
            </div>

            {/* Callsign Field */}
            <div className="space-y-2 group">
              <label htmlFor="callsign" className="nexus-label text-emerald-300 block">
                ◆ Callsign
              </label>
              <div className="relative">
                <Input
                  id="callsign"
                  type="text"
                  placeholder="Enter callsign"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="tracking-wider text-center h-11 border-white/35"
                  />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center gap-3 pt-2 pb-1">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-cyan-500/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500"
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
                    const savedToken = localStorage.getItem('nexus.login.token');
                    if (savedToken) {
                      try {
                        const loginData = JSON.parse(atob(savedToken));
                        if (loginData?.memberProfileId) {
                          localStorage.removeItem(`nexus.display_callsign.${loginData.memberProfileId}`);
                        }
                      } catch (e) {
                        // ignore decode errors
                      }
                    }
                    localStorage.removeItem('nexus.login.token');
                    localStorage.removeItem('nexus.display_callsign');
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
              type="submit"
              disabled={loading || verifyingAuth || !accessCode.trim() || !callsign.trim()}
              className="w-full h-11 mt-6 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 relative overflow-hidden group"
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
              <div role="status" aria-live="polite" className={`p-4 rounded border-2 text-center whitespace-pre-line font-mono text-xs animate-in fade-in duration-300 ${
                message.includes('granted') 
                  ? 'bg-green-950/40 border-green-500/50 text-green-300 shadow-lg shadow-green-500/20' 
                  : message.includes('Revoked') 
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-lg shadow-amber-500/20' 
                  : 'bg-red-950/40 border-red-500/50 text-red-300 shadow-lg shadow-red-500/20'
              }`}>
                {message}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="border-t border-red-700/40 bg-gradient-to-r from-red-700/5 to-transparent px-6 py-4">
            <p className="text-[10px] text-red-700/70 text-center uppercase tracking-[0.2em] font-bold">
              ⸻ REDSCAR NOMADS COMMAND ⸻
            </p>
          </div>
        </div>

        {/* Security indicator */}
        <div className="mt-4 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse" />
            ENCRYPTED PROTOCOL
            <span className="w-1.5 h-1.5 bg-green-500/70 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </span>
        </div>
      </div>

      {/* Hidden readiness beacon */}
      {authState && <div id="nn-ready" data-state={authState} style={{ display: 'none' }} />}
      </div>
      </PageTransition>
      </RouteGuard>
      );
      }
