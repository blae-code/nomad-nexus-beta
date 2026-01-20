import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Radio, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import PAGES_CONFIG from '@/pages.config';
import { base44 } from '@/api/base44Client';

export default function LeftNavRail({ currentPage, user }) {
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userRank, setUserRank] = useState('Vagrant');
  const [isAdmin, setIsAdmin] = useState(false);

  // Fetch user data to determine permissions
  useEffect(() => {
    if (user) {
      setUserRank(user.rank || 'Vagrant');
      setIsAdmin(user.role === 'admin');
    }
  }, [user]);

  // Get nav items filtered by user permissions
  const navSections = PAGES_CONFIG.getNavItemsForUser(userRank, isAdmin);
  const moreItems = PAGES_CONFIG.getMoreItemsForUser(userRank, isAdmin);

  // Flatten primary nav items for easier access
  const allNavItems = navSections.flatMap(section => section.items);

  return (
    <nav className="w-20 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center gap-2 py-4 shrink-0 relative">
      {/* Logo / Top Icon */}
      <div className="w-12 h-12 bg-[#ea580c] flex items-center justify-center mb-4 border border-[#ea580c]">
        <Radio className="w-6 h-6 text-white" />
      </div>

      {/* Primary Nav Items */}
      <div className="flex flex-col gap-2">
        {allNavItems.map(item => {
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

      {/* More Dropdown (if overflow items exist) */}
      {moreItems.length > 0 && (
        <div className="relative group">
          <button
            onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
            title="More Options"
            className="w-12 h-12 flex items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-all"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Dropdown Menu */}
          {moreDropdownOpen && (
            <div className="absolute left-full bottom-0 ml-2 bg-zinc-900 border border-zinc-800 rounded shadow-lg z-50 min-w-max">
              <div className="py-2">
                {moreItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={createPageUrl(item.page)}
                      onClick={() => setMoreDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                      title={item.description || item.label}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-mono text-xs uppercase">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      <Link
        to={createPageUrl('Profile')}
        title="Settings & Profile"
        className="w-12 h-12 flex items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-all"
      >
        <Settings className="w-5 h-5" />
      </Link>
    </nav>
  );
}