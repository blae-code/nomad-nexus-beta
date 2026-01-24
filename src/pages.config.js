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
import Academy from './pages/Academy';


export const PAGES = {
  Academy,
  AccessGate,
  AdminCockpit,
  Channels,
  CommandCenter,
  CommsConsole,
  CommsDevTest,
  CommsSettings,
  Diagnostics,
  EventReporting,
  Events,
  FleetManager,
  Hub,
  Intelligence,
  MissionControl,
  NomadOpsDashboard,
  NotificationSettings,
  OperationControl,
  OperationWorkspace,
  PageNotFound,
  Profile,
  Ranks,
  Rescue,
  RoleManager,
  Settings,
  SquadDetail,
  Treasury,
  UniverseMap,
  UserDirectory,
  UserManager,
  UserSettings,
  VoiceNetManager,
};
export const PAGE_ROUTE_OVERRIDES = {};
export const PAGE_ROUTE_ALIASES = {};

export const pagesConfig = {
    mainPage: "Hub",
    Pages: PAGES,
    Layout: __Layout,
};

export default pagesConfig;
