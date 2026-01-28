import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AccessGate() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRedeem = async () => {
    if (!accessCode.trim()) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      const response = await base44.functions.invoke('redeemAccessKey', { code: accessCode });
      if (response.data.success) {
        setMessage('Access granted! Redirecting...');
        setTimeout(() => {
          window.location.href = createPageUrl('Hub');
        }, 1500);
      } else {
        setMessage(response.data.message || 'Invalid access code');
      }
    } catch (error) {
      setMessage('Error validating access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-md w-full">
        <div className="border-2 border-zinc-800 bg-zinc-950/90 backdrop-blur-sm p-8">
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-16 h-16 text-orange-500" />
          </div>
          
          <h1 className="text-3xl font-black uppercase tracking-wider text-center text-white mb-2">
            Access Gate
          </h1>
          <p className="text-center text-zinc-400 mb-8">Enter your access code</p>
          
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="ACCESS CODE"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="text-center font-mono uppercase tracking-wider"
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            />
            
            <Button
              onClick={handleRedeem}
              disabled={loading || !accessCode.trim()}
              className="w-full"
            >
              {loading ? 'VERIFYING...' : 'VERIFY ACCESS'}
            </Button>
            
            {message && (
              <div className={`text-center text-sm ${message.includes('granted') ? 'text-green-400' : 'text-red-400'}`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}