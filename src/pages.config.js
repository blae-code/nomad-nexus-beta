import Admin from './pages/Admin';
import Channels from './pages/Channels';
import CommsConsole from './pages/CommsConsole';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Home from './pages/Home';
import MissionControl from './pages/MissionControl';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import Profile from './pages/Profile';
import Ranks from './pages/Ranks';
import Rescue from './pages/Rescue';
import RoleManager from './pages/RoleManager';
import Treasury from './pages/Treasury';
import UserManager from './pages/UserManager';
import Hub from './pages/Hub';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "Channels": Channels,
    "CommsConsole": CommsConsole,
    "Events": Events,
    "FleetManager": FleetManager,
    "Home": Home,
    "MissionControl": MissionControl,
    "NomadOpsDashboard": NomadOpsDashboard,
    "Profile": Profile,
    "Ranks": Ranks,
    "Rescue": Rescue,
    "RoleManager": RoleManager,
    "Treasury": Treasury,
    "UserManager": UserManager,
    "Hub": Hub,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};