import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/components/providers/AuthProvider';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const normalizeRouteKey = (value = '') => value.toLowerCase().replace(/[-_\s]/g, '');

const RouteResolver = () => {
  const location = useLocation();
  const raw = (location.pathname || '').replace(/^\//, '');
  const lowered = raw.toLowerCase();

  if (!raw) {
    return <Navigate to={`/${mainPageKey}`} replace />;
  }

  const aliasMap = {
    admin: 'Settings',
    adminconsole: 'Settings',
    systemadmin: 'Settings',
    'system-admin': 'Settings',
    settings: 'Settings',
    hub: 'Hub',
    accessgate: 'AccessGate',
    'access-gate': 'AccessGate',
    login: 'AccessGate',
  };

  const aliasTarget = aliasMap[lowered];
  if (aliasTarget && Pages[aliasTarget]) {
    return <Navigate to={`/${aliasTarget}`} replace />;
  }

  const normalized = normalizeRouteKey(raw);
  const matchedKey = Object.keys(Pages).find(
    (key) => normalizeRouteKey(key) === normalized
  );

  if (matchedKey) {
    return <Navigate to={`/${matchedKey}`} replace />;
  }

  return <PageNotFound />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={
      <LayoutWrapper currentPageName={mainPageKey}>
        <MainPage />
      </LayoutWrapper>
    } />
    {Object.entries(Pages).map(([path, Page]) => (
      <Route
        key={path}
        path={`/${path}`}
        element={
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        }
      />
    ))}
    <Route path="*" element={<RouteResolver />} />
  </Routes>
);


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
