import Event from './pages/Event';
import Events from './pages/Events';
import Channels from './pages/Channels';
import Treasury from './pages/Treasury';
import CommsConsole from './pages/CommsConsole';
import NomadOpsDashboard from './pages/NomadOpsDashboard';
import Ranks from './pages/Ranks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Event": Event,
    "Events": Events,
    "Channels": Channels,
    "Treasury": Treasury,
    "CommsConsole": CommsConsole,
    "NomadOpsDashboard": NomadOpsDashboard,
    "Ranks": Ranks,
}

export const pagesConfig = {
    mainPage: "Event",
    Pages: PAGES,
    Layout: __Layout,
};