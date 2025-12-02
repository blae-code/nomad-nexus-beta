import Event from './pages/Event';
import Events from './pages/Events';
import Channels from './pages/Channels';
import OpsDashboard from './pages/OpsDashboard';
import Treasury from './pages/Treasury';


export const PAGES = {
    "Event": Event,
    "Events": Events,
    "Channels": Channels,
    "OpsDashboard": OpsDashboard,
    "Treasury": Treasury,
}

export const pagesConfig = {
    mainPage: "Event",
    Pages: PAGES,
};