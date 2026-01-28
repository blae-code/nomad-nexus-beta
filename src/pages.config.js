import AccessGate from './pages/AccessGate';
import CommsConsole from './pages/CommsConsole';
import Events from './pages/Events';
import FleetManager from './pages/FleetManager';
import Hub from './pages/Hub';
import Settings from './pages/Settings';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import PageNotFound from './pages/PageNotFound';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessGate": AccessGate,
    "CommsConsole": CommsConsole,
    "Events": Events,
    "FleetManager": FleetManager,
    "Hub": Hub,
    "Settings": Settings,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "UserDirectory": UserDirectory,
    "PageNotFound": PageNotFound,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};