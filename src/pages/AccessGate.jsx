import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';
import DevelopmentRoadmap from '@/components/common/DevelopmentRoadmap';

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
        console.error('Auth check error:', err);
        setError(err.message);
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
      {/* Animated radial gradient background */}
      <div className="absolute inset-0 bg-radial-gradient from-orange-500/5 via-zinc-950 to-zinc-950 opacity-60" />
      
      {/* Animated scanning lines */}
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(234,88,12,0.03)_0px,transparent_1px,transparent_2px)] animate-pulse opacity-30" />
      
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(234,88,12,0.02)_1px,transparent_1px),linear-gradient(rgba(234,88,12,0.02)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40" />

      {/* Pulsing corner accents */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-orange-500/40 opacity-60 animate-pulse" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-orange-500/40 opacity-60 animate-pulse" style={{ animationDelay: '0.3s' }} />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-orange-500/40 opacity-60 animate-pulse" style={{ animationDelay: '0.6s' }} />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-orange-500/40 opacity-60 animate-pulse" style={{ animationDelay: '0.9s' }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-1/4 -right-40 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-md">
        <div className="border-2 border-orange-500/50 bg-zinc-950/85 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-orange-500/20">
          {/* Header Section */}
          <div className="border-b border-orange-500/30 bg-gradient-to-r from-orange-500/10 via-orange-500/5 to-transparent p-8 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
            
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/30 rounded-lg blur-2xl animate-pulse" />
                <div className="absolute inset-0 bg-orange-500/20 rounded-lg blur-xl animate-pulse" style={{ animationDelay: '0.2s' }} />
                <div className="relative w-20 h-20 rounded-lg bg-gradient-to-br from-orange-500/40 to-orange-600/15 border-2 border-orange-500/60 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <Shield className="w-10 h-10 text-orange-300" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <div>
                <h1 className="text-4xl font-black uppercase tracking-[0.15em] text-white drop-shadow-lg">
                  Nexus <span className="text-orange-400">Gate</span>
                </h1>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
              <p className="text-[11px] text-orange-300/70 uppercase tracking-[0.2em] font-bold">
                Authorization Protocol Active
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-6">
            {/* Access Code Field */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-bold text-orange-300 uppercase tracking-[0.15em] block">
                ◆ Access Code
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase tracking-widest text-center h-12 bg-zinc-900/60 border-2 border-orange-500/30 group-focus-within:border-orange-500/60 group-focus-within:bg-zinc-900 focus:border-orange-500/60 focus:bg-zinc-900 text-orange-300 placeholder:text-zinc-600 transition-all duration-200"
                />
                <div className="absolute -inset-1 border border-orange-500/0 group-focus-within:border-orange-500/20 rounded transition-all duration-200 pointer-events-none" />
              </div>
            </div>

            {/* Callsign Field */}
            <div className="space-y-2.5 group">
              <label className="text-[10px] font-bold text-orange-300 uppercase tracking-[0.15em] block">
                ◆ Callsign
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter callsign"
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  className="uppercase tracking-wider text-center h-12 bg-zinc-900/60 border-2 border-orange-500/30 group-focus-within:border-orange-500/60 group-focus-within:bg-zinc-900 focus:border-orange-500/60 focus:bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 transition-all duration-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                />
                <div className="absolute -inset-1 border border-orange-500/0 group-focus-within:border-orange-500/20 rounded transition-all duration-200 pointer-events-none" />
              </div>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleRedeem}
              disabled={loading || !accessCode.trim() || !callsign.trim()}
              className="w-full h-12 mt-8 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-400 hover:to-orange-500 text-white font-bold uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  VERIFYING...
                </span>
              ) : (
                '▶ VERIFY ACCESS'
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
          <div className="border-t border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-transparent px-8 py-5">
            <p className="text-[10px] text-orange-300/60 text-center uppercase tracking-[0.2em] font-bold">
              ⸻ REDSCAR NOMADS COMMAND ⸻
            </p>
          </div>
        </div>

        {/* Security indicator */}
        <div className="mt-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-green-500/60 rounded-full animate-pulse" />
            ENCRYPTED PROTOCOL ACTIVE
            <span className="w-1.5 h-1.5 bg-green-500/60 rounded-full animate-pulse" />
          </span>
        </div>
      </div>
    </div>
  );
}