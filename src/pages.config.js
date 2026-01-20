import Channels from './pages/Channels';
import CommsConsole from './pages/CommsConsole';
import CommsSettings from './pages/CommsSettings';
import Diagnostics from './pages/Diagnostics';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Hub from './pages/Hub';
import MissionControl from './pages/MissionControl';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import NotificationSettings from './pages/NotificationSettings';
import Profile from './pages/Profile';
import Ranks from './pages/Ranks';
import Rescue from './pages/Rescue';
import RoleManager from './pages/RoleManager';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserManager from './pages/UserManager';
import VoiceNetManager from './pages/VoiceNetManager';
import Intelligence from './pages/Intelligence';
import AdminConsole from './pages/AdminConsole';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Channels": Channels,
    "CommsConsole": CommsConsole,
    "CommsSettings": CommsSettings,
    "Diagnostics": Diagnostics,
    "Events": Events,
    "FleetManager": FleetManager,
    "Hub": Hub,
    "MissionControl": MissionControl,
    "NomadOpsDashboard": NomadOpsDashboard,
    "NotificationSettings": NotificationSettings,
    "Profile": Profile,
    "Ranks": Ranks,
    "Rescue": Rescue,
    "RoleManager": RoleManager,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "UserManager": UserManager,
    "VoiceNetManager": VoiceNetManager,
    "Intelligence": Intelligence,
    "AdminConsole": AdminConsole,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};