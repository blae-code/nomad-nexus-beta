import Events from './pages/Events';
import Channels from './pages/Channels';
import Treasury from './pages/Treasury';
import CommsConsole from './pages/CommsConsole';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import Ranks from './pages/Ranks';
import Profile from './pages/Profile';
import RoleManager from './pages/RoleManager';
import UserManager from './pages/UserManager';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Events": Events,
    "Channels": Channels,
    "Treasury": Treasury,
    "CommsConsole": CommsConsole,
    "NomadOpsDashboard": NomadOpsDashboard,
    "Ranks": Ranks,
    "Profile": Profile,
    "RoleManager": RoleManager,
    "UserManager": UserManager,
}

export const pagesConfig = {
    mainPage: "Events",
    Pages: PAGES,
    Layout: __Layout,
};