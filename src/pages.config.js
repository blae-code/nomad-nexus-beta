import Hub from './pages/Hub';
import AccessGate from './pages/AccessGate';
import PageNotFound from './pages/PageNotFound';
import Events from './pages/Events';
import CommsConsole from './pages/CommsConsole';
import UserDirectory from './pages/UserDirectory';
import FleetManager from './pages/FleetManager';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Hub": Hub,
    "AccessGate": AccessGate,
    "PageNotFound": PageNotFound,
    "Events": Events,
    "CommsConsole": CommsConsole,
    "UserDirectory": UserDirectory,
    "FleetManager": FleetManager,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};