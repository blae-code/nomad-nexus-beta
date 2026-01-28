import PageNotFound from './pages/PageNotFound';
import Hub from './pages/Hub';
import AccessGate from './pages/AccessGate';
import __Layout from './Layout.jsx';


export const PAGES = {
    "PageNotFound": PageNotFound,
    "Hub": Hub,
    "AccessGate": AccessGate,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};