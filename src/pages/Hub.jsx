import React, { useEffect, useState } from 'react';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Shield, Users, Calendar, Radio, Map, Box, DollarSign, Settings } from 'lucide-react';

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
    { name: 'Access Gate', path: 'AccessGate', icon: Shield, description: 'Member verification and onboarding' },
    { name: 'Events', path: 'Events', icon: Calendar, description: 'Mission planning and operations' },
    { name: 'Comms Console', path: 'CommsConsole', icon: Radio, description: 'Communication channels' },
    { name: 'User Directory', path: 'UserDirectory', icon: Users, description: 'Member roster' },
    { name: 'Universe Map', path: 'UniverseMap', icon: Map, description: 'Tactical overview' },
    { name: 'Fleet Manager', path: 'FleetManager', icon: Box, description: 'Asset management' },
    { name: 'Treasury', path: 'Treasury', icon: DollarSign, description: 'Financial tracking' },
    { name: 'Settings', path: 'Settings', icon: Settings, description: 'App configuration' },
    { name: 'Recon', path: 'Recon', icon: Shield, description: 'Archive and historical operations' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <div className="inline-block mb-4 px-6 py-2 border-2 border-orange-500/30 bg-orange-500/5">
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-white">
              REDSCAR <span className="text-orange-500">NOMADS</span>
            </h1>
          </div>
          <p className="text-zinc-400 text-sm uppercase tracking-wider font-semibold">Operational Command Hub / Nomad Nexus</p>
          <div className="mt-4 h-px w-32 mx-auto bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={createPageUrl(item.path)}
                className="group relative bg-zinc-950/90 border-2 border-zinc-800 hover:border-orange-500 p-6 transition-all duration-200 hover:bg-zinc-900"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="relative">
                  <Icon className="w-10 h-10 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h3 className="text-lg font-black text-white mb-2 uppercase tracking-wider">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide font-semibold">{item.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}