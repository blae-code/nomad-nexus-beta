import Hub from './pages/Hub';
import AccessGate from './pages/AccessGate';
import PageNotFound from './pages/PageNotFound';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Hub": Hub,
    "AccessGate": AccessGate,
    "PageNotFound": PageNotFound,
}

export const pagesConfig = {
    mainPage: "Hub",
    Pages: PAGES,
    Layout: __Layout,
};