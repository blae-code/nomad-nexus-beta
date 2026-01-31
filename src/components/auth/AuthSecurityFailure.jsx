import React from 'react';
import { AlertTriangle, Lock, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * AuthSecurityFailure - Themed error screen for authentication failures
 * Displays immersive, tactical messaging when auth fails during onboarding/disclaimers
 */
export default function AuthSecurityFailure({ reason = 'unknown', onRetry = null }) {
  const messages = {
    session_expired: {
      title: '⸻ SESSION REVOKED ⸻',
      subtitle: 'Authorization Protocol Timeout',
      message: 'Your session credentials have expired or been invalidated. Return to the gate and verify access.',
      icon: Lock,
    },
    invalid_credentials: {
      title: '⸻ SECURITY PROTOCOL FAILURE ⸻',
      subtitle: 'Invalid Authorization Parameters',
      message: 'The credentials provided do not match our database. Verify your access code and callsign, then retry.',
      icon: AlertTriangle,
    },
    member_not_found: {
      title: '⸻ IDENTITY VERIFICATION FAILED ⸻',
      subtitle: 'Member Profile Not Located',
      message: 'No member record exists for the provided credentials. Contact your recruiting officer for verification.',
      icon: Shield,
    },
    access_denied: {
      title: '⸻ ACCESS DENIED ⸻',
      subtitle: 'Authorization Level Insufficient',
      message: 'Your current clearance level does not permit access to this protocol. Escalate with command staff.',
      icon: Lock,
    },
    unknown: {
      title: '⸻ AUTHENTICATION ERROR ⸻',
      subtitle: 'System Status: COMPROMISED',
      message: 'An unexpected security event has occurred. Return to the gate and reinitialize your session.',
      icon: AlertTriangle,
    },
  };

  const config = messages[reason] || messages.unknown;
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-black opacity-100" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(200,68,50,0.05)_1px,transparent_1px),linear-gradient(rgba(200,68,50,0.05)_1px,transparent_1px)] bg-[length:40px_40px] opacity-30" />
      
      {/* Animated scanlines */}
      <div 
        className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]"
        style={{
          animation: 'scan 8s linear infinite',
          pointerEvents: 'none'
        }}
      />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-40 h-40 border-t-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute top-0 right-0 w-40 h-40 border-t-2 border-r-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 left-0 w-40 h-40 border-b-2 border-l-2 border-red-500/40 opacity-50" />
      <div className="absolute bottom-0 right-0 w-40 h-40 border-b-2 border-r-2 border-red-500/40 opacity-50" />

      {/* Subtle background glow */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-red-600/5 rounded-full blur-3xl opacity-15" />

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.35), inset 0 0 20px rgba(239, 68, 68, 0.05); }
          50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.5), inset 0 0 20px rgba(239, 68, 68, 0.15); }
        }
        .glow-error {
          animation: pulse-red 4s ease-in-out infinite;
        }
      `}</style>

      <div className="relative z-10 w-full max-w-md">
        <div className="border-2 border-red-700/70 bg-black/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-red-700/30 glow-error">
          {/* Header */}
          <div className="border-b border-red-700/50 bg-gradient-to-r from-red-700/20 via-transparent to-transparent p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 bg-red-950/40 border border-red-700/50 rounded">
                <Icon className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
            </div>

            <div className="text-center space-y-2.5">
              <h1 className="text-4xl font-black uppercase tracking-[0.2em] text-red-400 drop-shadow-lg">
                {config.title}
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-red-700/40 to-transparent" />
              <p className="text-[10px] text-red-600/70 uppercase tracking-[0.25em] font-bold">
                {config.subtitle}
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="p-8 space-y-6">
            <div className="bg-red-950/20 border border-red-700/30 rounded p-4">
              <p className="text-sm text-red-300 leading-relaxed text-center font-mono">
                {config.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.location.href = createPageUrl('AccessGate')}
                className="w-full h-12 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:via-red-400 hover:to-red-500 text-white font-bold uppercase tracking-widest shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Access Gate
              </Button>

              {onRetry && (
                <Button
                  onClick={onRetry}
                  variant="outline"
                  className="w-full h-12 border-2 border-red-700/50 hover:border-red-500/80 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider"
                >
                  Retry Authentication
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-red-700/40 bg-gradient-to-r from-red-700/5 to-transparent px-8 py-5">
            <p className="text-[10px] text-red-700/70 text-center uppercase tracking-[0.2em] font-bold">
              ⸻ SECURITY PROTOCOL ACTIVE ⸻
            </p>
          </div>
        </div>

        {/* Security indicator */}
        <div className="mt-6 text-center text-[10px] text-red-600/70 uppercase tracking-widest font-semibold">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500/70 rounded-full animate-pulse" />
            INCIDENT LOGGED
            <span className="w-1.5 h-1.5 bg-red-500/70 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          </span>
        </div>
      </div>
    </div>
  );
}