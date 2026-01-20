import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Radio, Calendar, Compass, Settings, Shield, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeftNavRail({ currentPage }) {
  const navItems = [
    { id: 'hub', label: 'HUB', icon: Home, page: 'Hub' },
    { id: 'mission', label: 'MISSION CONTROL', icon: Compass, page: 'NomadOpsDashboard' },
    { id: 'events', label: 'EVENTS', icon: Calendar, page: 'Events' },
    { id: 'comms', label: 'COMMS', icon: Radio, page: 'CommsConsole' },
    { id: 'admin', label: 'ADMIN', icon: Shield, page: 'Admin' },
  ];

  return (
    <nav className="w-20 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center gap-2 py-4 shrink-0">
      {/* Logo / Top Icon */}
      <div className="w-12 h-12 bg-[#ea580c] flex items-center justify-center mb-4 border border-[#ea580c]">
        <Radio className="w-6 h-6 text-white" />
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <Link
              key={item.id}
              to={createPageUrl(item.page)}
              title={item.label}
              className={cn(
                'w-12 h-12 flex items-center justify-center border transition-all',
                isActive
                  ? 'bg-[#ea580c] border-[#ea580c] text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              )}
            >
              <Icon className="w-5 h-5" />
            </Link>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <Link
        to={createPageUrl('CommsSettings')}
        title="Settings"
        className="w-12 h-12 flex items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-all"
      >
        <Settings className="w-5 h-5" />
      </Link>
    </nav>
  );
}