import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navItems, getVisibleNavItems } from '@/components/nav/navItems';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * NavRail v2: Crisp, grid-aligned, collapsible navigation
 */

export default function NavRail({ currentPage, user, isExpanded, onToggleExpand }) {
  const location = useLocation();
  const [visibleSections, setVisibleSections] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const navRef = useRef(null);

  // Get visible nav items based on user rank/role
  useEffect(() => {
    setVisibleSections(getVisibleNavItems(user));
  }, [user]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const allItems = visibleSections.flatMap(s => s.items);
      if (!allItems.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(i => (i + 1) % allItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(i => (i - 1 + allItems.length) % allItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < allItems.length) {
            navRef.current?.querySelector(`[data-nav-index="${focusedIndex}"]`)?.click();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleSections, focusedIndex]);

  // Flatten items for easier indexing
  const flatItems = visibleSections.flatMap(s => s.items);

  return (
    <TooltipProvider>
      <nav
        ref={navRef}
        className={cn(
          'flex flex-col h-screen bg-zinc-950 border-r border-[var(--divider-color)] overflow-hidden transition-all duration-200',
          isExpanded ? 'w-[var(--rail-w-expanded)]' : 'w-[var(--rail-w-collapsed)]'
        )}
      >
        {/* Logo / Branding */}
        <div className="h-10 flex items-center justify-center shrink-0 border-b border-[var(--divider-color)]">
          <div className="w-8 h-8 bg-[#ea580c] flex items-center justify-center border border-[#ea580c]">
            <Radio className="w-5 h-5 text-white" />
          </div>
          {isExpanded && (
            <span className="ml-2 text-xs font-black text-white uppercase tracking-widest">
              REDSCAR
            </span>
          )}
        </div>

        {/* Nav Sections */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {visibleSections.map((section, sectionIdx) => (
            <div key={section.section} className="flex flex-col">
              {/* Section Header (only in expanded) */}
              {isExpanded && (
                <div className="px-3 py-2 text-xs font-black text-zinc-500 uppercase tracking-widest border-t border-zinc-800 first:border-t-0">
                  {section.section}
                </div>
              )}

              {/* Section Items */}
              <div className="flex flex-col gap-1 p-1">
                {section.items.map((item, itemIdx) => {
                  const globalIdx = flatItems.findIndex(
                    i => i.id === item.id
                  );
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;

                  const itemEl = (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          key={item.id}
                          to={createPageUrl(item.page)}
                          data-nav-index={globalIdx}
                          onFocus={() => setFocusedIndex(globalIdx)}
                          className={cn(
                            'flex items-center gap-2 h-12 px-2 transition-colors border border-2',
                            isActive
                              ? 'bg-[#ea580c]/20 border-[#ea580c] text-[#ea580c]'
                              : focusedIndex === globalIdx
                                ? 'bg-zinc-800/50 border-zinc-700 text-zinc-100'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                          )}
                        >
                          <Icon className="w-5 h-5 shrink-0" />
                          {isExpanded && (
                            <span className="text-xs font-bold uppercase truncate">
                              {item.label}
                            </span>
                          )}
                          {item.badgeKey && (
                            <span className="ml-auto text-xs font-bold bg-[#ea580c] text-white px-1.5 py-0.5 rounded">
                              {/* Badge value would come from user state */}
                              0
                            </span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      {!isExpanded && (
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      )}
                    </Tooltip>
                  );

                  return itemEl;
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: Collapse Toggle + Settings + User */}
        <div className="flex flex-col gap-1 p-1 border-t border-[var(--divider-color)]">
          {/* Collapse/Expand Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleExpand}
                className="flex items-center justify-center h-12 border border-2 border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
              >
                {isExpanded ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">
                {isExpanded ? 'Collapse' : 'Expand'}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={createPageUrl('Profile')}
                className="flex items-center justify-center h-12 border border-2 border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 transition-colors"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">Settings</TooltipContent>
            )}
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  );
}