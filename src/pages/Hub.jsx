import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield, Users, Calendar, Radio, Map, Box, DollarSign, Settings, FileSearch, GraduationCap, FileText, Database, Package, BarChart3, BookOpen, Store, ClipboardList, Award, UserPlus, Sparkles, Gamepad2, Monitor, Wrench, Heart, Handshake, Radio as SignalIcon, Gavel, Target, Compass, HelpCircle, Bug, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MODULE_STATUS, getStatusColor, getStatusBgColor } from '@/components/constants/moduleStatus';

export default function Hub() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }
        
        // Check if onboarding completed (skip for admin users)
        const user = await base44.auth.me();
        if (user.role !== 'admin') {
          const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
          if (profiles.length === 0 || !profiles[0].onboarding_completed) {
            window.location.href = createPageUrl('Onboarding');
            return;
          }
        }
        
        setLoading(false);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  const navItems = [
    { name: 'Mission Control', path: 'MissionControl', icon: Monitor, description: 'Operations planning, execution, and war room' },
    { name: 'Intel Nexus', path: 'IntelNexus', icon: Database, description: 'Intelligence gathering and threat analysis' },
    { name: 'War Academy', path: 'WarAcademy', icon: GraduationCap, description: 'Training, simulations, and combat readiness' },
    { name: 'Fleet Command', path: 'FleetCommand', icon: Box, description: 'Asset management, engineering, and tactical map' },
    { name: 'Nomad Registry', path: 'NomadRegistry', icon: Users, description: 'Personnel, availability, and achievements' },
    { name: 'Trade Nexus', path: 'TradeNexus', icon: DollarSign, description: 'Treasury, marketplace, and commerce' },
    { name: 'Comms Central', path: 'CommsConsole', icon: Radio, description: 'Communication channels and broadcasts' },
    { name: 'High Command', path: 'HighCommand', icon: Gavel, description: 'Governance, diplomacy, and strategic council' },
    { name: 'Frontier Ops', path: 'FrontierOps', icon: Compass, description: 'Exploration, bounties, and frontier missions' },
    { name: 'Data Vault', path: 'DataVault', icon: BookOpen, description: 'Knowledge archive and analytics' },
    { name: 'Nexus Training', path: 'NexusTraining', icon: HelpCircle, description: 'Tutorials and guides for using the Nexus platform' },
    { name: 'Access Gate', path: 'AccessGate', icon: Shield, description: 'Member verification and onboarding' },
    { name: 'System Admin', path: 'Settings', icon: Settings, description: 'Configuration and administration' },
    { name: 'QA Console', path: 'QAConsole', icon: Bug, description: 'Development and QA testing tools for admins' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 flex-1 flex flex-col px-4 py-6">
        <div className="text-center mb-6">
          <div className="inline-block mb-2 px-4 py-1 border-2 border-orange-500/30 bg-orange-500/5">
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-white">
              REDSCAR <span className="text-orange-500">NOMADS</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">Command Hub</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 auto-rows-min">
          {navItems.map((item) => {
            const Icon = item.icon;
            const status = MODULE_STATUS[item.path];
            const statusPercentage = status?.completed || 0;

            return (
              <TooltipProvider key={item.path}>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <a
                      href={createPageUrl(item.path)}
                      className="group relative bg-zinc-900/30 border border-zinc-800/50 hover:border-orange-500/50 hover:bg-zinc-900/50 p-2 transition-all duration-200 rounded overflow-hidden cursor-help"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="relative flex flex-col items-center text-center gap-1">
                        <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 group-hover:border-orange-500/50 transition-colors rounded">
                          <Icon className="w-4 h-4 text-orange-500" />
                        </div>
                        <h3 className="text-[10px] font-bold text-white uppercase tracking-wider leading-tight">
                          {item.name}
                        </h3>
                        <p className="text-[7px] text-zinc-500 leading-tight opacity-75 group-hover:opacity-100 transition-opacity">
                          {item.description}
                        </p>
                      </div>
                    </a>
                  </TooltipTrigger>

                  {status && (
                    <TooltipContent side="right" align="center" className="w-72 bg-zinc-950 border-orange-500/40 p-0 overflow-hidden">
                      <div className="bg-zinc-900/80 border-b border-orange-500/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">{status.name}</h4>
                          <span className="text-xs font-mono text-orange-400 font-bold">{statusPercentage}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                            style={{ width: `${statusPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 space-y-2 max-h-56 overflow-y-auto">
                        {status.features.map((feature, idx) => {
                          const featureColor = getStatusColor(feature.status);
                          const bgColor = getStatusBgColor(feature.status);
                          const Icon = 
                            feature.status === 'complete' ? CheckCircle2 :
                            feature.status === 'in-progress' ? Clock :
                            AlertCircle;

                          return (
                            <div key={idx} className={`flex items-start gap-2 text-xs ${bgColor} p-2 rounded`}>
                              <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${featureColor}`} />
                              <div>
                                <div className={`font-semibold ${featureColor}`}>{feature.name}</div>
                                <div className="text-zinc-500 text-[10px] capitalize mt-0.5">
                                  {feature.status === 'complete' && 'Ready to use'}
                                  {feature.status === 'in-progress' && 'Currently in development'}
                                  {feature.status === 'planned' && 'Planned for future release'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-zinc-900/50 border-t border-orange-500/20 p-3 text-xs text-zinc-400 italic">
                        💡 Hover over features to see detailed development status
                      </div>
                    </TooltipContent>
                  )}
                  </Tooltip>
                  </TooltipProvider>
                  );
                  })}
                  </div>
                  </div>
                  </div>
                  </div>
                  );
}