/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccessGate from './pages/AccessGate';
import CommandCenter from './pages/CommandCenter';
import CommsConsole from './pages/CommsConsole';
import DataVault from './pages/DataVault';
import Disclaimers from './pages/Disclaimers';
import Events from './pages/Events';
import FleetCommand from './pages/FleetCommand';
import FleetManager from './pages/FleetManager';
import FleetTracking from './pages/FleetTracking';
import FrontierOps from './pages/FrontierOps';
import HighCommand from './pages/HighCommand';
import Hub from './pages/Hub';
import HudMode from './pages/HudMode';
import IntelNexus from './pages/IntelNexus';
import LogisticsHub from './pages/LogisticsHub';
import MemberManagement from './pages/MemberManagement';
import MemberProgression from './pages/MemberProgression';
import MissionCatalog from './pages/MissionCatalog';
import MissionBoard from './pages/MissionBoard';
import MissionControl from './pages/MissionControl';
import NomadRegistry from './pages/NomadRegistry';
import NexusTraining from './pages/NexusTraining';
import OnboardingPipeline from './pages/OnboardingPipeline';
import Onboarding from './pages/Onboarding';
import PageNotFound from './pages/PageNotFound';
import QAConsole from './pages/QAConsole';
import Recon from './pages/Recon';
import ReportBuilder from './pages/ReportBuilder';
import Settings from './pages/Settings';
import StrategicObjectives from './pages/StrategicObjectives';
import SystemAdmin from './pages/SystemAdmin';
import TradeNexus from './pages/TradeNexus';
import Treasury from './pages/Treasury';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import WarAcademy from './pages/WarAcademy';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccessGate": AccessGate,
    "CommandCenter": CommandCenter,
    "CommsConsole": CommsConsole,
    "DataVault": DataVault,
    "Disclaimers": Disclaimers,
    "Events": Events,
    "FleetCommand": FleetCommand,
    "FleetManager": FleetManager,
    "FleetTracking": FleetTracking,
    "FrontierOps": FrontierOps,
    "HighCommand": HighCommand,
    "Hub": Hub,
    "HudMode": HudMode,
    "IntelNexus": IntelNexus,
    "LogisticsHub": LogisticsHub,
    "MemberManagement": MemberManagement,
    "MemberProgression": MemberProgression,
    "MissionCatalog": MissionCatalog,
    "MissionBoard": MissionBoard,
    "MissionControl": MissionControl,
    "NomadRegistry": NomadRegistry,
    "NexusTraining": NexusTraining,
    "OnboardingPipeline": OnboardingPipeline,
    "Onboarding": Onboarding,
    "PageNotFound": PageNotFound,
    "QAConsole": QAConsole,
    "Recon": Recon,
    "ReportBuilder": ReportBuilder,
    "Settings": Settings,
    "StrategicObjectives": StrategicObjectives,
    "SystemAdmin": SystemAdmin,
    "TradeNexus": TradeNexus,
    "Treasury": Treasury,
    "UniverseMap": UniverseMap,
    "UserDirectory": UserDirectory,
    "WarAcademy": WarAcademy,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};
