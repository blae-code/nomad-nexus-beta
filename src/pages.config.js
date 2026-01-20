/**
 * pages.config.js
 * Single source of truth for all pages, navigation structure, routing, and role-based access control
 */

import {
  Home,
  Compass,
  Calendar,
  Radio,
  Shield,
  Settings,
  AlertCircle,
  Users,
  Lock,
  BarChart3,
  Map,
  Zap,
  BookOpen,
  MoreHorizontal
} from 'lucide-react';

/**
 * Role hierarchy for permission checking
 * Numeric values allow comparison (higher = higher privilege)
 */
export const RANK_HIERARCHY = {
  'Vagrant': 0,
  'Scout': 1,
  'Pathfinder': 2,
  'Sentinel': 3,
  'Commander': 4,
  'Fleet Admiral': 5,
};

/**
 * All pages in the system, organized by section
 * Each page can be navigated to directly (via createPageUrl)
 * Pages in "more" section are not shown in primary nav but are still accessible via deep links
 */
export const PAGES_CONFIG = {
  sections: [
    {
      id: 'mission-control',
      label: 'Mission Control',
      pages: [
        {
          id: 'hub',
          label: 'Hub',
          page: 'NomadOpsDashboard', // Primary page
          icon: Home,
          minRank: 'Vagrant',
          description: 'Operational command center and primary dashboard',
          aliases: ['Hub'], // Legacy routes that redirect here
        },
        {
          id: 'mission',
          label: 'Mission Control',
          page: 'NomadOpsDashboard',
          icon: Compass,
          minRank: 'Vagrant',
          description: 'Strategic planning and mission overview',
          hidden: true, // Don't show in nav (covered by Hub above)
        },
      ],
    },

    {
      id: 'operations',
      label: 'Operations',
      pages: [
        {
          id: 'events',
          label: 'Events',
          page: 'Events',
          icon: Calendar,
          minRank: 'Vagrant',
          description: 'Operations calendar and event management',
        },
        {
          id: 'rescue',
          label: 'Rescue',
          page: 'Rescue',
          icon: AlertCircle,
          minRank: 'Scout',
          description: 'Active rescue operations and coordination',
        },
        {
          id: 'map',
          label: 'Tactical Map',
          page: 'UniverseMap',
          icon: Map,
          minRank: 'Pathfinder',
          description: 'Theater operations and asset positioning',
        },
      ],
    },

    {
      id: 'comms',
      label: 'Comms',
      pages: [
        {
          id: 'comms-console',
          label: 'Comms Console',
          page: 'CommsConsole',
          icon: Radio,
          minRank: 'Vagrant',
          description: 'Voice nets, communications, and team coordination',
        },
        {
          id: 'channels',
          label: 'Channels',
          page: 'Channels',
          icon: Radio,
          minRank: 'Vagrant',
          description: 'Text channels and message history',
          hidden: true, // Integrated into Comms Console; keep accessible via deep link
        },
      ],
    },

    {
      id: 'intelligence',
      label: 'Intelligence (AI)',
      pages: [
        {
          id: 'diagnostics',
          label: 'Diagnostics',
          page: 'Diagnostics',
          icon: Zap,
          minRank: 'Pathfinder',
          description: 'System health, AI monitoring, and infrastructure status',
        },
        {
          id: 'mission-control-ai',
          label: 'Mission AI',
          page: 'MissionControl',
          icon: Compass,
          minRank: 'Scout',
          description: 'AI planning and tactical recommendations',
          hidden: true, // Accessible but not in primary nav
        },
      ],
    },

    {
      id: 'administration',
      label: 'Administration',
      pages: [
        {
          id: 'admin',
          label: 'System Admin',
          page: 'Admin',
          icon: Shield,
          minRank: 'Commander',
          requiresAdmin: true,
          description: 'User management, roles, voice nets, and system configuration',
          tabs: ['approvals', 'users', 'roles', 'voice-nets', 'health', 'audit'],
        },
        {
          id: 'rank-reference',
          label: 'Ranks',
          page: 'Ranks',
          icon: BookOpen,
          minRank: 'Vagrant',
          description: 'Rank structure and personnel information',
          hidden: true, // Informational; in More section
        },
      ],
    },

    {
      id: 'more',
      label: 'More',
      isOverflow: true,
      pages: [
        {
          id: 'settings',
          label: 'Settings',
          page: 'Profile',
          icon: Settings,
          minRank: 'Vagrant',
          description: 'User profile and communication preferences',
          tabs: ['profile', 'notifications', 'audio'],
        },
        {
          id: 'treasury',
          label: 'Treasury',
          page: 'Treasury',
          icon: BarChart3,
          minRank: 'Scout',
          description: 'aUEC and resource management',
        },
        {
          id: 'fleet-manager',
          label: 'Fleet Manager',
          page: 'FleetManager',
          icon: Users,
          minRank: 'Scout',
          description: 'Asset and fleet operations',
        },
      ],
    },
  ],

  /**
   * Get all pages in a flat list
   */
  getAllPages() {
    const pages = [];
    this.sections.forEach(section => {
      pages.push(...section.pages);
    });
    return pages;
  },

  /**
   * Get a page by ID or page name
   */
  getPageById(id) {
    return this.getAllPages().find(p => p.id === id);
  },

  getPageByName(pageName) {
    return this.getAllPages().find(p => p.page === pageName);
  },

  /**
   * Get navigation items for a user (filtered by role/rank)
   * Returns only pages the user can see and not marked as hidden
   */
  getNavItemsForUser(userRank = 'Vagrant', isAdmin = false) {
    const navItems = [];

    this.sections.forEach(section => {
      if (section.isOverflow) return; // Skip overflow section in primary nav

      const visiblePages = section.pages.filter(page => {
        // Skip hidden pages
        if (page.hidden) return false;

        // Skip admin-only pages if user isn't admin
        if (page.requiresAdmin && !isAdmin) return false;

        // Check rank requirement
        const userRankValue = RANK_HIERARCHY[userRank] || 0;
        const pageRankValue = RANK_HIERARCHY[page.minRank] || 0;
        if (userRankValue < pageRankValue) return false;

        return true;
      });

      if (visiblePages.length > 0) {
        navItems.push({
          section: section.label,
          sectionId: section.id,
          items: visiblePages,
        });
      }
    });

    return navItems;
  },

  /**
   * Get overflow (More) section items for a user
   */
  getMoreItemsForUser(userRank = 'Vagrant', isAdmin = false) {
    const moreSection = this.sections.find(s => s.isOverflow);
    if (!moreSection) return [];

    return moreSection.pages.filter(page => {
      if (page.requiresAdmin && !isAdmin) return false;

      const userRankValue = RANK_HIERARCHY[userRank] || 0;
      const pageRankValue = RANK_HIERARCHY[page.minRank] || 0;
      if (userRankValue < pageRankValue) return false;

      return true;
    });
  },

  /**
   * Check if user can access a page
   */
  canUserAccessPage(page, userRank = 'Vagrant', isAdmin = false) {
    if (page.requiresAdmin && !isAdmin) return false;

    const userRankValue = RANK_HIERARCHY[userRank] || 0;
    const pageRankValue = RANK_HIERARCHY[page.minRank] || 0;

    return userRankValue >= pageRankValue;
  },
};

// Named exports for flexibility
export { PAGES_CONFIG };
export const pagesConfig = PAGES_CONFIG;

// Default export
export default PAGES_CONFIG;