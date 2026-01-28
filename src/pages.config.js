import PageNotFound from './pages/PageNotFound.jsx';
import Hub from './pages/Hub.js';
import AccessGate from './pages/AccessGate.jsx';
import Events from './pages/Events.jsx';
import CommsConsole from './pages/CommsConsole.jsx';
import UserDirectory from './pages/UserDirectory.jsx';
import UniverseMap from './pages/UniverseMap.jsx';
import FleetManager from './pages/FleetManager.jsx';
import Treasury from './pages/Treasury.jsx';
import Settings from './pages/Settings.jsx';
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