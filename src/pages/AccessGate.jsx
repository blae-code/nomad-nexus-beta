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
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(234,88,12,0.03)_1px,transparent_1px),linear-gradient(rgba(234,88,12,0.03)_1px,transparent_1px)] bg-[length:50px_50px] opacity-20" />

      {/* Animated corner accents */}
      <div className="absolute top-0 left-0 w-24 h-24 border-t-2 border-l-2 border-orange-500/30 opacity-50" />
      <div className="absolute top-0 right-0 w-24 h-24 border-t-2 border-r-2 border-orange-500/30 opacity-50" />
      <div className="absolute bottom-0 left-0 w-24 h-24 border-b-2 border-l-2 border-orange-500/30 opacity-50" />
      <div className="absolute bottom-0 right-0 w-24 h-24 border-b-2 border-r-2 border-orange-500/30 opacity-50" />

      <div className="relative z-10 w-full max-w-md">
        <div className="border-2 border-orange-500/40 bg-zinc-950/80 backdrop-blur-lg p-0 overflow-hidden">
          {/* Header Section */}
          <div className="border-b border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-lg blur-xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500/30 to-orange-600/10 border-2 border-orange-500/50 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-orange-400" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl font-black uppercase tracking-widest text-white">
                Nexus Gate
              </h1>
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                Authorization Protocol
              </p>
            </div>
          </div>

          {/* Form Section */}
          <div className="p-8 space-y-5">
            {/* Access Code Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                Access Code
              </label>
              <Input
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="font-mono uppercase tracking-widest text-center h-11 bg-zinc-900/80 border-orange-500/20 focus:border-orange-500/50 text-orange-300"
              />
            </div>

            {/* Callsign Field */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block">
                Callsign
              </label>
              <Input
                type="text"
                placeholder="Enter callsign"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                className="uppercase tracking-wider text-center h-11 bg-zinc-900/80 border-orange-500/20 focus:border-orange-500/50 text-zinc-100"
                onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              />
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleRedeem}
              disabled={loading || !accessCode.trim() || !callsign.trim()}
              className="w-full h-11 mt-6 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Verify Access'
              )}
            </Button>

            {/* Status Messages */}
            {message && (
              <div className={`p-4 rounded border text-sm text-center whitespace-pre-line font-mono text-xs ${
                message.includes('granted') 
                  ? 'bg-green-950/30 border-green-500/30 text-green-400' 
                  : message.includes('Revoked') 
                  ? 'bg-amber-950/30 border-amber-500/30 text-amber-400' 
                  : 'bg-red-950/30 border-red-500/30 text-red-400'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-orange-500/20 bg-zinc-900/30 px-8 py-4">
            <p className="text-xs text-zinc-500 text-center uppercase tracking-wider">
              ⸻ Redscar Nomads Command ⸻
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}