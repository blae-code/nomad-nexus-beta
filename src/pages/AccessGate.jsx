import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Zap, Trash2, Shield, Signal } from 'lucide-react';
import { navigateToPage } from '@/utils';
import RouteGuard from '@/components/auth/RouteGuard';
import { useAuth } from '@/components/providers/AuthProvider';
import PageTransition from '@/components/transitions/PageTransition';
import AsyncLoadingOverlay from '@/components/transitions/AsyncLoadingOverlay';

export default function AccessGate() {
  const { refreshAuth } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [callsign, setCallsign] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [verifyingAuth, setVerifyingAuth] = useState(false);
  const [hasSavedLogin, setHasSavedLogin] = useState(false);
  const [authState, setAuthState] = useState(null);

  const isAdminGrant = (member, fallbackRank = '') => {
    const rank = (member?.rank || fallbackRank || '').toString().toUpperCase();
    const roles = (member?.roles || []).map((r) => r.toString().toLowerCase());
    return rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
  };

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
                const isAdmin = isAdminGrant(member, fallbackRank);
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
                  const isAdmin = isAdminGrant(null, grantedRank);
                  nextPage = isAdmin ? 'Hub' : 'Disclaimers';
                }
              } catch (verifyErr) {
                console.warn('verifyMemberSession fallback:', verifyErr?.message);
                const isAdmin = isAdminGrant(null, grantedRank);
                nextPage = isAdmin ? 'Hub' : 'Disclaimers';
              }

              await refreshAuth();

              setTimeout(() => {
                navigateToPage(nextPage);
              }, 300);
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

      <div className="relative z-10 w-full max-w-md">
        <div className="nexus-immersive-panel p-0 overflow-hidden flex-shrink-0 shadow-2xl shadow-red-900/30">
          <div className="border-b border-red-700/50 bg-gradient-to-br from-red-900/20 via-zinc-900/40 to-zinc-950/60 p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(220,38,38,0.15),transparent_70%)]" />
            
            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-red-500/10 animate-pulse" />
              </div>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692e6bd486f10b06a9125c80/068c6849c_Redscar_Nomads_Icon_White.png"
                alt="Redscar Nomads"
                className="w-20 h-20 drop-shadow-2xl relative z-10"
              />
            </div>

            <div className="relative text-center space-y-3">
              <h1 className="text-4xl font-black uppercase tracking-[0.22em] text-white drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                Nexus<span className="text-red-500">Gate</span>
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-red-500/60" />
                <div className="w-1 h-1 bg-red-500/80 rounded-full" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-red-500/60" />
              </div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] font-bold">
                Authorization Required
              </p>
            </div>
          </div>

          <form
            className="p-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleRedeem();
            }}
          >
            <div className="space-y-2.5">
              <label htmlFor="accessCode" className="block text-xs font-bold uppercase tracking-[0.15em] text-amber-300/90">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-400/70 rounded-full" />
                  Access Code
                </span>
              </label>
              <Input
                id="accessCode"
                type="password"
                placeholder="XXXX-XXXX-XXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="font-mono tracking-[0.3em] text-center h-12 text-amber-200 bg-zinc-950/60 border-amber-500/40 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-500/30 transition-all placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-2.5">
              <label htmlFor="callsign" className="block text-xs font-bold uppercase tracking-[0.15em] text-emerald-300/90">
                <span className="inline-flex items-center gap-2">
                  <span className="w-1 h-1 bg-emerald-400/70 rounded-full" />
                  Callsign
                </span>
              </label>
              <Input
                id="callsign"
                type="text"
                placeholder="Your operator callsign"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="tracking-wider text-center h-12 text-zinc-100 bg-zinc-950/60 border-emerald-500/40 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-500/30 transition-all placeholder:text-zinc-700"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
                className="border-cyan-500/50 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-500"
              />
              <label htmlFor="rememberMe" className="text-xs text-cyan-300/90 cursor-pointer hover:text-cyan-200 transition-colors">
                Remember credentials on this device
              </label>
            </div>

            {hasSavedLogin && (
              <div className="flex items-center justify-between bg-cyan-950/25 border border-cyan-500/35 rounded-lg px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="text-[11px] text-cyan-300 font-medium">Saved credentials detected</span>
                </div>
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
                  className="h-7 px-2.5 text-cyan-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || verifyingAuth || !accessCode.trim() || !callsign.trim()}
              className="w-full h-12 mt-2 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-[0.2em] disabled:opacity-40 disabled:cursor-not-allowed shadow-xl shadow-red-500/40 hover:shadow-red-400/60 transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700" />
              {loading || verifyingAuth ? (
                <span className="flex items-center justify-center gap-2.5 relative z-10">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {verifyingAuth ? 'Confirming...' : 'Verifying...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2.5 relative z-10">
                  <Zap className="w-4 h-4" />
                  Verify Access
                </span>
              )}
            </Button>

            {message && (
              <div role="status" aria-live="polite" className={`p-4 rounded-lg border text-center whitespace-pre-line text-xs leading-relaxed animate-in fade-in duration-300 ${
                message.includes('granted') 
                  ? 'bg-green-950/50 border-green-500/60 text-green-200 shadow-xl shadow-green-500/25' 
                  : message.includes('Revoked') 
                  ? 'bg-amber-950/50 border-amber-500/60 text-amber-200 shadow-xl shadow-amber-500/25' 
                  : 'bg-red-950/50 border-red-500/60 text-red-200 shadow-xl shadow-red-500/25'
              }`}>
                <div className="font-semibold">{message}</div>
              </div>
            )}
          </form>

          <div className="border-t border-red-700/30 bg-gradient-to-r from-red-950/30 via-zinc-950/20 to-transparent px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px w-8 bg-red-700/40" />
              <p className="text-[10px] text-red-600/70 uppercase tracking-[0.25em] font-bold">
                Redscar Nomads
              </p>
              <div className="h-px w-8 bg-red-700/40" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-green-500/30" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/25 bg-green-500/5">
            <span className="w-1.5 h-1.5 bg-green-400/80 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-400/80 uppercase tracking-wider font-semibold">Secure Link</span>
            <span className="w-1.5 h-1.5 bg-green-400/80 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-green-500/30" />
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-red-700/25 bg-zinc-950/98 backdrop-blur-md px-6 py-3.5">
        <div className="flex items-center justify-center gap-2">
          <div className="h-px w-12 bg-red-700/30" />
          <p className="text-[10px] text-red-700/60 uppercase tracking-[0.25em] font-bold">
            Redscar Nomads Command
          </p>
          <div className="h-px w-12 bg-red-700/30" />
        </div>
      </footer>

      {/* Hidden readiness beacon */}
      {authState && <div id="nn-ready" data-state={authState} style={{ display: 'none' }} />}
      </div>
      </PageTransition>
      </RouteGuard>
      );
      }