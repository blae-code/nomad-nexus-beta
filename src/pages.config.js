import Event from './pages/Event';
import Events from './pages/Events';
import Channels from './pages/Channels';
import OpsDashboard from './pages/OpsDashboard';
import Treasury from './pages/Treasury';
import CommsConsole from './pages/CommsConsole';


export const PAGES = {
    "Event": Event,
    "Events": Events,
    "Channels": Channels,
    "OpsDashboard": OpsDashboard,
    "Treasury": Treasury,
    "CommsConsole": CommsConsole,
}

export const pagesConfig = {
    mainPage: "Event",
    Pages: PAGES,
};