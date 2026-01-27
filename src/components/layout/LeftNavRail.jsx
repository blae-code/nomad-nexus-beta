import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Radio, Settings, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import pagesConfig from '@/pages.config';
import NavItem from '@/components/layout/NavItem';
import { SURFACE_BG_CLASS, SURFACE_BORDER_CLASS } from '@/components/layout/headerStyles';

/**
 * ⚠️ DEPRECATED: LeftNavRail (Legacy)
 * 
 * Do not use this component. The app now uses AppShellV3 with HeaderV3.
 * This component will be removed in a future version.
 */
export default function LeftNavRail({ currentPage, user }) {
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [userRank, setUserRank] = useState('Vagrant');
  const [isAdmin, setIsAdmin] = useState(false);
  const [navSections, setNavSections] = useState([]);
  const [moreItems, setMoreItems] = useState([]);

  // Fetch user data to determine permissions and update nav
  useEffect(() => {
    if (user) {
      setUserRank(user.rank || 'Vagrant');
      setIsAdmin(user.role === 'admin');
    }

    // Update navigation items when rank/admin status changes
    if (pagesConfig?.getNavItemsForUser) {
      setNavSections(pagesConfig.getNavItemsForUser(userRank, isAdmin));
      setMoreItems(pagesConfig.getMoreItemsForUser(userRank, isAdmin));
    }
  }, [user, userRank, isAdmin]);

  // Flatten primary nav items for easier access
  const allNavItems = navSections.flatMap(section => section.items || []);

  return (
    <nav
      className={cn(
        'w-[72px] flex flex-col items-center shrink-0 relative h-screen border-r',
        SURFACE_BG_CLASS,
        SURFACE_BORDER_CLASS
      )}
    >
      {/* Logo / Top Icon */}
      <div className="w-12 h-12 bg-[#ea580c] flex items-center justify-center my-3 border border-[#ea580c]">
        <Radio className="w-6 h-6 text-white" />
      </div>

      {/* Primary Nav Items */}
      <div className="flex flex-col items-center gap-3 py-3">
        {allNavItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <NavItem
              key={item.id}
              to={createPageUrl(item.page)}
              title={item.label}
              icon={Icon}
              isActive={isActive}
              size="lg"
            />
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Controls Stack */}
      <div className="flex flex-col items-center gap-3 pb-3">
        {/* More Dropdown (if overflow items exist) */}
        {moreItems.length > 0 && (
          <div className="relative group">
            <NavItem
              as="button"
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              title="More Options"
              icon={MoreHorizontal}
              size="lg"
            />

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
                        className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/70 hover:text-white transition-colors"
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
        <NavItem
          to={createPageUrl('Profile')}
          title="Settings & Profile"
          icon={Settings}
          size="lg"
        />
      </div>
    </nav>
  );
}
