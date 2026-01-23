import AdminConsole from './pages/AdminConsole';
import Channels from './pages/Channels';
import CommsConsole from './pages/CommsConsole';
import CommsSettings from './pages/CommsSettings';
import Diagnostics from './pages/Diagnostics';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Hub from './pages/Hub';
import Intelligence from './pages/Intelligence';
import MissionControl from './pages/MissionControl';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import OperationControl from './pages/OperationControl';
import Profile from './pages/Profile';
import Ranks from './pages/Ranks';
import Rescue from './pages/Rescue';
import RoleManager from './pages/RoleManager';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import UserManager from './pages/UserManager';
import VoiceNetManager from './pages/VoiceNetManager';
import CommandCenter from './pages/CommandCenter';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminConsole": AdminConsole,
    "Channels": Channels,
    "CommsConsole": CommsConsole,
    "CommsSettings": CommsSettings,
    "Diagnostics": Diagnostics,
    "Events": Events,
    "FleetManager": FleetManager,
    "Hub": Hub,
    "Intelligence": Intelligence,
    "MissionControl": MissionControl,
    "NomadOpsDashboard": NomadOpsDashboard,
    "NotificationSettings": NotificationSettings,
    "OperationControl": OperationControl,
    "Profile": Profile,
    "Ranks": Ranks,
    "Rescue": Rescue,
    "RoleManager": RoleManager,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "UserDirectory": UserDirectory,
    "UserManager": UserManager,
    "VoiceNetManager": VoiceNetManager,
    "CommandCenter": CommandCenter,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};