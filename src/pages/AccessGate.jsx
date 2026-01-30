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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-md w-full">
        <div className="border-2 border-orange-500/30 bg-zinc-950/95 backdrop-blur-sm p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center">
                <Shield className="w-10 h-10 text-orange-500" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-2xl font-black uppercase tracking-widest text-center text-white mb-2">
            Security Checkpoint
          </h1>
          <p className="text-center text-zinc-500 text-[11px] uppercase tracking-wider font-semibold mb-8">Authorization Protocol / Credentials Required</p>
          
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="ACCESS CODE"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="text-center font-mono uppercase tracking-wider"
            />
            
            <Input
              type="text"
              placeholder="CALLSIGN"
              value={callsign}
              onChange={(e) => setCallsign(e.target.value)}
              className="text-center font-mono uppercase tracking-wider"
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            />
            
            <Button
              onClick={handleRedeem}
              disabled={loading || !accessCode.trim() || !callsign.trim()}
              className="w-full"
            >
              {loading ? 'VERIFYING...' : 'VERIFY ACCESS'}
            </Button>
            
            {message && (
              <div className={`text-center text-sm whitespace-pre-line ${message.includes('granted') ? 'text-green-400' : message.includes('Revoked') ? 'text-amber-400' : 'text-red-400'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}