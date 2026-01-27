// Cache bust token: 2026-01-27T06:28:40Z
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
import SmokeCheck from './pages/SmokeCheck';
import SquadDetail from './pages/SquadDetail';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import UserManager from './pages/UserManager';
import UserSettings from './pages/UserSettings';
import VoiceNetManager from './pages/VoiceNetManager';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessGate": AccessGate,
    "AdminCockpit": AdminCockpit,
    "Channels": Channels,
    "CommandCenter": CommandCenter,
    "CommsConsole": CommsConsole,
    "CommsDevTest": CommsDevTest,
    "CommsSettings": CommsSettings,
    "Diagnostics": Diagnostics,
    "EventReporting": EventReporting,
    "Events": Events,
    "FleetManager": FleetManager,
    "Hub": Hub,
    "Intelligence": Intelligence,
    "MissionControl": MissionControl,
    "NomadOpsDashboard": NomadOpsDashboard,
    "NotificationSettings": NotificationSettings,
    "OperationControl": OperationControl,
    "OperationWorkspace": OperationWorkspace,
    "PageNotFound": PageNotFound,
    "Profile": Profile,
    "Ranks": Ranks,
    "Rescue": Rescue,
    "RoleManager": RoleManager,
    "Settings": Settings,
    "SmokeCheck": SmokeCheck,
    "SquadDetail": SquadDetail,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "UserDirectory": UserDirectory,
    "UserManager": UserManager,
    "UserSettings": UserSettings,
    "VoiceNetManager": VoiceNetManager,
}

export const pagesConfig = {
    mainPage: "Hub",
    Pages: PAGES,
    Layout: __Layout,
};