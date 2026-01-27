import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Key, ArrowLeft, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { isDemoMode } from '@/lib/demo-mode';

export default function AccessGate() {
  const [accessKey, setAccessKey] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [grantedRank, setGrantedRank] = useState('VAGRANT');
  const [grantedRoles, setGrantedRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const initDoneRef = useRef(false);

  // Admin bypass: check if user is admin and skip access gate (run once)
  useEffect(() => {
    if (initDoneRef.current) return;
    initDoneRef.current = true;

    const checkAdminBypass = async () => {
      try {
        const isAuthenticated = await base44.auth.isAuthenticated?.();
        if (isAuthenticated) {
          const user = await base44.auth.me();
          if (user?.role === 'admin') {
            navigate('/', { replace: true });
            return;
          }
        }
      } catch (error) {
        // Not authenticated, continue with access gate
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminBypass();
  }, [navigate]);

  const handleRedeemKey = async () => {
    if (!accessKey.trim()) {
      toast.error('Please enter an access key');
      return;
    }

    setIsRedeeming(true);
    try {
      const result = await base44.functions.invoke('redeemAccessKey', { 
        code: accessKey.trim() 
      });

      if (result.data?.success) {
        toast.success('Access key redeemed!');
        setGrantedRank(result.data.grants_rank);
        setGrantedRoles(result.data.grants_roles || []);
        setShowOnboarding(true);
      } else {
        toast.error(result.data?.error || 'Invalid access key');
      }
    } catch (error) {
      console.error('[ACCESS GATE] Redeem error:', error);
      toast.error('Failed to redeem access key');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleLogin = () => {
    const currentUrl = typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '/';
    base44.auth.redirectToLogin(currentUrl);
  };

  const handleDemoAccess = async () => {
    setIsRedeeming(true);
    try {
      const result = await base44.functions.invoke('redeemAccessKey', { code: 'DEMO-ACCESS' });
      setGrantedRank(result.data?.grants_rank || 'PIONEER');
      setGrantedRoles(result.data?.grants_roles || ['admin']);
      setShowOnboarding(true);
    } catch (error) {
      console.error('[ACCESS GATE] Demo access error:', error);
      toast.error('Failed to activate demo access');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleReturnHome = () => {
    navigate('/', { replace: true });
  };

  // Show onboarding wizard after successful key redemption
  if (showOnboarding) {
    return (
      <OnboardingWizard 
        grantedRank={grantedRank}
        grantedRoles={grantedRoles}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  // Show loading state while checking admin bypass
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#09090b] text-zinc-200 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:40px_40px] opacity-30" />
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Checking Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#09090b] text-zinc-200 flex items-center justify-center overflow-hidden relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%,transparent_100%)] bg-[length:40px_40px] opacity-30" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#ea580c]/5 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 blur-3xl" />

      {/* Loading Overlay */}
      {isRedeeming && (
        <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-2 border-[#ea580c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-mono text-zinc-400 uppercase tracking-wider">Verifying Access Key...</p>
            <p className="text-[10px] font-mono text-zinc-700 mt-2">AUTHENTICATING</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="border border-zinc-800 bg-zinc-950/90 backdrop-blur-sm p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <Shield className="w-12 h-12 text-[#ea580c] opacity-80" />
          </div>

          <h1 className="text-2xl font-black uppercase tracking-wider text-center mb-2 text-white">
            Access Gate
          </h1>
          <p className="text-xs text-zinc-500 text-center mb-8 font-mono uppercase tracking-wider">
            Authorization Required
          </p>
          {isDemoMode() && (
            <div className="mb-6 border border-amber-700/50 bg-amber-950/40 p-3 text-[10px] text-amber-200 font-mono uppercase tracking-widest">
              Demo Mode Active • Use quick access below
            </div>
          )}

          {/* Info Box */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 mb-6">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Access is invite-controlled. If you have an access key, enter it below. 
              Otherwise, contact command for authorization.
            </p>
          </div>

          {/* Access Key Input */}
          <div className="space-y-4 mb-6">
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                Access Key
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter access key..."
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeemKey()}
                  className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                  disabled={isRedeeming}
                />
                <Button
                  onClick={handleRedeemKey}
                  disabled={isRedeeming || !accessKey.trim()}
                  className="bg-[#ea580c] hover:bg-[#ea580c]/90 text-white"
                >
                  <Key className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-600">or</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleLogin}
              variant="outline"
              className="w-full gap-2 border-zinc-800 hover:border-[#ea580c]/50 hover:bg-zinc-900"
            >
              <LogIn className="w-4 h-4" />
              Go to Login
            </Button>
            {isDemoMode() && (
              <Button
                onClick={handleDemoAccess}
                className="w-full gap-2 bg-amber-500/90 hover:bg-amber-500 text-black"
                disabled={isRedeeming}
              >
                <Key className="w-4 h-4" />
                Demo Quick Access
              </Button>
            )}

            <Button
              onClick={handleReturnHome}
              variant="ghost"
              className="w-full gap-2 text-zinc-500 hover:text-zinc-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Return Home
            </Button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 pt-6 border-t border-zinc-800">
            <p className="text-[9px] text-zinc-600 text-center font-mono">
              AUTHORIZED PERSONNEL ONLY • SECURE ACCESS PROTOCOL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
