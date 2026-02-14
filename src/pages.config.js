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
import CommandCenter from './pages/CommandCenter';
import CommsConsole from './pages/CommsConsole';
import DataVault from './pages/DataVault';
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
import MissionBoard from './pages/MissionBoard';
import MissionCatalog from './pages/MissionCatalog';
import MissionControl from './pages/MissionControl';
import NexusTraining from './pages/NexusTraining';
import NomadRegistry from './pages/NomadRegistry';
import OnboardingPipeline from './pages/OnboardingPipeline';
import Recon from './pages/Recon';
import ReportBuilder from './pages/ReportBuilder';
import StrategicObjectives from './pages/StrategicObjectives';
import SystemAdmin from './pages/SystemAdmin';
import TradeNexus from './pages/TradeNexus';
import Treasury from './pages/Treasury';
import UXRoadmap from './pages/UXRoadmap';
import UniverseMap from './pages/UniverseMap';
import UserDirectory from './pages/UserDirectory';
import AccessGate from './pages/AccessGate';
import Disclaimers from './pages/Disclaimers';
import NexusOSWorkspace from './pages/NexusOSWorkspace';
import Onboarding from './pages/Onboarding';
import PageNotFound from './pages/PageNotFound';
import PublicUpdate from './pages/PublicUpdate';
import QAConsole from './pages/QAConsole';
import Settings from './pages/Settings';
import WarAcademy from './pages/WarAcademy';
import Workspace from './pages/Workspace';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CommandCenter": CommandCenter,
    "CommsConsole": CommsConsole,
    "DataVault": DataVault,
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
    "MissionBoard": MissionBoard,
    "MissionCatalog": MissionCatalog,
    "MissionControl": MissionControl,
    "NexusTraining": NexusTraining,
    "NomadRegistry": NomadRegistry,
    "OnboardingPipeline": OnboardingPipeline,
    "Recon": Recon,
    "ReportBuilder": ReportBuilder,
    "StrategicObjectives": StrategicObjectives,
    "SystemAdmin": SystemAdmin,
    "TradeNexus": TradeNexus,
    "Treasury": Treasury,
    "UXRoadmap": UXRoadmap,
    "UniverseMap": UniverseMap,
    "UserDirectory": UserDirectory,
    "AccessGate": AccessGate,
    "Disclaimers": Disclaimers,
    "NexusOSWorkspace": NexusOSWorkspace,
    "Onboarding": Onboarding,
    "PageNotFound": PageNotFound,
    "PublicUpdate": PublicUpdate,
    "QAConsole": QAConsole,
    "Settings": Settings,
    "WarAcademy": WarAcademy,
    "Workspace": Workspace,
}

export const pagesConfig = {
    mainPage: "AccessGate",
    Pages: PAGES,
    Layout: __Layout,
};