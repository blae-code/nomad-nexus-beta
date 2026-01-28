import React from 'react';
import { createPageUrl } from '@/utils';
import { Shield, Users, Calendar, Radio, Map, Box, DollarSign, Settings } from 'lucide-react';

export default function Hub() {
  const navItems = [
    { name: 'Access Gate', path: 'AccessGate', icon: Shield, description: 'Member verification and onboarding' },
    { name: 'Events', path: 'Events', icon: Calendar, description: 'Mission planning and operations' },
    { name: 'Comms Console', path: 'CommsConsole', icon: Radio, description: 'Communication channels' },
    { name: 'User Directory', path: 'UserDirectory', icon: Users, description: 'Member roster' },
    { name: 'Universe Map', path: 'UniverseMap', icon: Map, description: 'Tactical overview' },
    { name: 'Fleet Manager', path: 'FleetManager', icon: Box, description: 'Asset management' },
    { name: 'Treasury', path: 'Treasury', icon: DollarSign, description: 'Financial tracking' },
    { name: 'Settings', path: 'Settings', icon: Settings, description: 'App configuration' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black uppercase tracking-wider text-white mb-4">
            Nomad <span className="text-orange-500">Nexus</span>
          </h1>
          <p className="text-zinc-400 text-lg">Operational Command Hub</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.path}
                href={createPageUrl(item.path)}
                className="group relative bg-zinc-900/50 border-2 border-zinc-800 hover:border-orange-500/50 p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/10"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 blur-2xl group-hover:bg-orange-500/10 transition-all" />
                
                <div className="relative">
                  <Icon className="w-12 h-12 text-orange-500 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">
                    {item.name}
                  </h3>
                  <p className="text-sm text-zinc-400">{item.description}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}