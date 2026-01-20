import Admin from './pages/Admin';
import Channels from './pages/Channels';
import CommsConsole from './pages/CommsConsole';
import CommsSettings from './pages/CommsSettings';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Hub from './pages/Hub';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import Profile from './pages/Profile';
import Ranks from './pages/Ranks';
import Rescue from './pages/Rescue';
import RoleManager from './pages/RoleManager';
import Treasury from './pages/Treasury';
import UserManager from './pages/UserManager';
import VoiceNetManager from './pages/VoiceNetManager';
import MissionControl from './pages/MissionControl';
import Diagnostics from './pages/Diagnostics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Channels": Channels,
    "CommsConsole": CommsConsole,
    "CommsSettings": CommsSettings,
    "Events": Events,
    "FleetManager": FleetManager,
    "Hub": Hub,
    "NomadOpsDashboard": NomadOpsDashboard,
    "NotificationSettings": NotificationSettings,
    "Profile": Profile,
    "Ranks": Ranks,
    "Rescue": Rescue,
    "RoleManager": RoleManager,
    "Treasury": Treasury,
    "UserManager": UserManager,
    "VoiceNetManager": VoiceNetManager,
    "MissionControl": MissionControl,
    "Diagnostics": Diagnostics,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};