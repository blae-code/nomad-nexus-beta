import AccessGate from './pages/AccessGate.jsx';
import AdminCockpit from './pages/AdminCockpit.jsx';
import Channels from './pages/Channels.jsx';
import CommandCenter from './pages/CommandCenter.jsx';
import CommsConsole from './pages/CommsConsole.jsx';
import CommsDevTest from './pages/CommsDevTest.jsx';
import CommsSettings from './pages/CommsSettings.jsx';
import Diagnostics from './pages/Diagnostics.jsx';
import EventReporting from './pages/EventReporting.jsx';
import Events from './pages/Events.jsx';
import FleetManager from './pages/FleetManager.jsx';
import Hub from './pages/Hub.jsx';
import Intelligence from './pages/Intelligence.jsx';
import MissionControl from './pages/MissionControl.jsx';
import NomadOpsDashboard from './pages/NomadOpsDashboard.jsx';
import NotificationSettings from './pages/NotificationSettings.jsx';
import OperationControl from './pages/OperationControl.jsx';
import OperationWorkspace from './pages/OperationWorkspace.jsx';
import PageNotFound from './pages/PageNotFound.jsx';
import Profile from './pages/Profile.jsx';
import Ranks from './pages/Ranks.jsx';
import Rescue from './pages/Rescue.jsx';
import RoleManager from './pages/RoleManager.jsx';
import Settings from './pages/Settings.jsx';
import SmokeCheck from './pages/SmokeCheck.jsx';
import SquadDetail from './pages/SquadDetail.jsx';
import Treasury from './pages/Treasury.jsx';
import UniverseMap from './pages/UniverseMap.jsx';
import UserDirectory from './pages/UserDirectory.jsx';
import UserManager from './pages/UserManager.jsx';
import UserSettings from './pages/UserSettings.jsx';
import VoiceNetManager from './pages/VoiceNetManager.jsx';
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