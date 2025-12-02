import Events from './pages/Events';
import Channels from './pages/Channels';
import Treasury from './pages/Treasury';
import CommsConsole from './pages/CommsConsole';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import Ranks from './pages/Ranks';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import FleetManager from './pages/FleetManager';
import MissionControl from './pages/MissionControl';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Events": Events,
    "Channels": Channels,
    "Treasury": Treasury,
    "CommsConsole": CommsConsole,
    "NomadOpsDashboard": NomadOpsDashboard,
    "Ranks": Ranks,
    "Profile": Profile,
    "Admin": Admin,
    "FleetManager": FleetManager,
    "MissionControl": MissionControl,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};