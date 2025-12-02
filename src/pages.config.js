import Event from './pages/Event';
import Events from './pages/Events';
import Channels from './pages/Channels';
import OpsDashboard from './pages/OpsDashboard';


export const PAGES = {
    "Event": Event,
    "Events": Events,
    "Channels": Channels,
    "OpsDashboard": OpsDashboard,
}

export const pagesConfig = {
    mainPage: "Event",
    Pages: PAGES,
};