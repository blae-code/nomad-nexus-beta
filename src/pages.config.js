import PageNotFound from './pages/PageNotFound';
import Hub from './pages/Hub';
import AccessGate from './pages/AccessGate';
import Events from './pages/Events';
import CommsConsole from './pages/CommsConsole';
import UserDirectory from './pages/UserDirectory';
import UniverseMap from './pages/UniverseMap';
import FleetManager from './pages/FleetManager';
import Treasury from './pages/Treasury';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';

export const PAGES = {
    "PageNotFound": PageNotFound,
    "Hub": Hub,
    "AccessGate": AccessGate,
    "Events": Events,
    "CommsConsole": CommsConsole,
    "UserDirectory": UserDirectory,
    "UniverseMap": UniverseMap,
    "FleetManager": FleetManager,
    "Treasury": Treasury,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};