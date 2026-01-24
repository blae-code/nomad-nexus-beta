import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVisibleNavItems } from '@/components/nav/navItems';
import NavItem from '@/components/layout/NavItem';
import { SURFACE_BG_CLASS, SURFACE_BORDER_CLASS } from '@/components/layout/headerStyles';
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
          'flex flex-col h-screen overflow-hidden transition-all duration-200 border-r',
          SURFACE_BG_CLASS,
          SURFACE_BORDER_CLASS,
          isExpanded ? 'w-[var(--rail-w-expanded)]' : 'w-[var(--rail-w-collapsed)]'
        )}
      >
        {/* Logo / Branding */}
        <div className={cn('h-10 flex items-center justify-center shrink-0 border-b', SURFACE_BORDER_CLASS)}>
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
                <div className="px-3 py-2 text-xs font-black text-zinc-500 uppercase tracking-widest border-t border-zinc-800/70 first:border-t-0">
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
                        <NavItem
                          key={item.id}
                          to={createPageUrl(item.page)}
                          data-nav-index={globalIdx}
                          onFocus={() => setFocusedIndex(globalIdx)}
                          size="rail"
                          icon={Icon}
                          isActive={isActive}
                          className={cn(
                            'px-2',
                            isExpanded ? 'justify-start' : 'justify-center',
                            focusedIndex === globalIdx && !isActive && 'bg-zinc-900/80 border-zinc-700/80 text-zinc-100'
                          )}
                        >
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
                        </NavItem>
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
        <div className={cn('flex flex-col gap-1 p-1 border-t', SURFACE_BORDER_CLASS)}>
          {/* Collapse/Expand Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <NavItem
                as="button"
                type="button"
                onClick={onToggleExpand}
                size="rail"
                className="justify-center"
              >
                {isExpanded ? (
                  <ChevronLeft className="w-5 h-5" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
              </NavItem>
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
              <NavItem
                to={createPageUrl('Profile')}
                size="rail"
                icon={Settings}
                className="justify-center"
              />
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
