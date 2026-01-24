// src/pages.config.js
// Single source of truth for routing + page discovery.
// Provides BOTH named exports and a default export to satisfy old + new imports.
import AccessGate from './pages/AccessGate';
import AdminCockpit from './pages/AdminCockpit';
import Channels from './pages/Channels';
import CommandCenter from './pages/CommandCenter';
import CommsConsole from './pages/CommsConsole';
import CommsDevTest from './pages/CommsDevTest';
import CommsSettings from './pages/CommsSettings';
import Diagnostics from './pages/Diagnostics';
import EventReporting from './pages/EventReporting';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Hub from './pages/Hub';
import Intelligence from './pages/Intelligence';
import MissionControl from './pages/MissionControl';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import OperationControl from './pages/OperationControl';
import OperationWorkspace from './pages/OperationWorkspace';
import PageNotFound from './pages/PageNotFound';
import Profile from './pages/Profile';
import Ranks from './pages/Ranks';
import Rescue from './pages/Rescue';
import RoleManager from './pages/RoleManager';
import Settings from './pages/Settings';
import SquadDetail from './pages/SquadDetail';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import UserManager from './pages/UserManager';
import UserSettings from './pages/UserSettings';
import VoiceNetManager from './pages/VoiceNetManager';
import __Layout from './Layout.jsx';

const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true });

export const pagesConfig = {
    mainPage: "Hub",
    Pages: PAGES,
    Layout: __Layout,
};
<<<<<<< HEAD

export function resolveRouteAlias(pathname = '/') {
  return PAGE_ROUTE_ALIASES[pathname] ?? pathname;
}

export function getPageByPath(pathname = '/') {
  const resolved = resolveRouteAlias(pathname);

  // Exact route match
  const byRoute = pagesConfig.find((p) => p.route === resolved);

  // Try match by name (/hub -> Hub)
  const slug = resolved.replace(/^\/+/, '');
  const byName = pagesConfig.find((p) => p.name.toLowerCase() === slug.toLowerCase());
  return byName ?? null;
}

// Default export maintained for legacy imports like: import pagesConfig from '@/pages.config'
export default pagesConfig;

=======
>>>>>>> 5c2b417fe45fed091068b422d078f8d762d300b2