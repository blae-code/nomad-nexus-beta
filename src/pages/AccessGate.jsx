import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Zap } from 'lucide-react';
import { createPageUrl } from '@/utils';
import DevelopmentRoadmap from '@/components/common/DevelopmentRoadmap';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          window.location.href = createPageUrl('Hub');
        }
      } catch (err) {
        // Silently ignore auth errors - user is unauthenticated, which is expected on login page
      }
    };
    checkAuth();
  }, []);

  const handleRedeem = async () => {
    if (!accessCode.trim() || !callsign.trim()) {
      setMessage('Please enter both access code and callsign');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await base44.functions.invoke('redeemAccessKey', { code: accessCode, callsign: callsign });
            if (response?.data?.success) {
              setMessage('Access granted! Redirecting...');
              setTimeout(() => {
                window.location.href = createPageUrl('Onboarding');
              }, 1500);
            } else {
              const errorMsg = response?.data?.message || 'Invalid credentials';
              if (errorMsg.includes('REVOKED') || errorMsg.includes('revoked')) {
                setMessage('⸻ Authorization Revoked ⸻\n\nThis access code has been deactivated. Contact your issuing officer for reissuance.\n\n⸻');
              } else {
                setMessage(errorMsg);
              }
            }
    } catch (error) {
      console.error('Redeem error:', error);
      setMessage('Error validating credentials');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4">
        <div className="text-red-400">Initialization error: {error}</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-zinc-950 flex items-center justify-center px-4 overflow-hidden relative">
      <style>{scanlineStyle}</style>
      
      {/* Animated radial gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-slate-950 to-slate-900/40 opacity-60" />

      {/* Dynamic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(220,38,38,0.03)_1px,transparent_1px),linear-gradient(rgba(30,41,59,0.03)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40" />
      
      {/* Animated scanline effect */}
      <div className="absolute inset-0 scanline-overlay bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />

      {/* Subtle background glow */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-red-500/8 rounded-full blur-3xl opacity-20" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-500/5 rounded-full blur-3xl opacity-20" />

      <div className="relative z-10 w-full max-w-md">
        <div className="border-2 border-red-500/50 bg-slate-950/85 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-red-500/20 glow-box">
          {/* Header Section */}
          <div className="border-b border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-8 relative overflow-hidden">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/35 rounded-lg blur-2xl animate-pulse" />
                <div className="absolute inset-0 bg-red-600/20 rounded-lg blur-lg animate-pulse" style={{ animationDelay: '0.3s' }} />
                <div className="relative w-20 h-20 rounded-lg bg-gradient-to-br from-red-500/40 to-red-600/15 border-2 border-red-500/60 flex items-center justify-center shadow-lg shadow-red-500/30">
                  <Shield className="w-10 h-10 text-red-200" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2.5">
              <h1 className="text-4xl font-black uppercase tracking-[0.15em] text-white drop-shadow-lg">
                Nexus <span className="text-red-400">Gate</span>
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
              <p className="text-[11px] text-red-300/60 uppercase tracking-[0.2em] font-semibold">
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
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase tracking-widest text-center h-12 bg-slate-900/60 border-2 border-yellow-500/30 group-focus-within:border-yellow-500/60 group-focus-within:bg-slate-900 focus:border-yellow-500/60 focus:bg-slate-900 text-yellow-300 placeholder:text-slate-600 transition-all duration-200"
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
                  className="uppercase tracking-wider text-center h-12 bg-slate-900/60 border-2 border-white/30 group-focus-within:border-white/60 group-focus-within:bg-slate-900 focus:border-white/60 focus:bg-slate-900 text-white placeholder:text-slate-600 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                  />
                  <div className="absolute -inset-1 border border-white/0 group-focus-within:border-white/20 rounded transition-all duration-200 pointer-events-none" />
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleRedeem}
              disabled={loading || !accessCode.trim() || !callsign.trim()}
              className="w-full h-12 mt-8 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-full group-hover:-translate-x-full transition-transform duration-500" />
              {loading ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  VERIFYING...
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
          <div className="border-t border-red-500/30 bg-gradient-to-r from-red-500/5 to-transparent px-8 py-5">
            <p className="text-[10px] text-red-300/60 text-center uppercase tracking-[0.2em] font-bold">
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
    </div>
  );
}