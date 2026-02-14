
import { 
  MessageSquare, Radio, Ship, Calendar, Users, Map, Activity, Bell, 
  Brain, Target, AlertTriangle, Heart, Gauge, TrendingUp, Shield, 
  Package, Crosshair, Network, Award, DollarSign, Video, Palette, 
  Sliders, Maximize2, Radar, Zap, Rocket, Wrench, FileText, Lock, 
  Lightbulb, Terminal, Mic, Inbox, Cloud, Skull
} from 'lucide-react';


// Next-gen widgets
import NeuralCommandConsole from '@/components/widgets/NeuralCommandConsole';
import HolographicMissionDirector from '@/components/widgets/HolographicMissionDirector';
import QuantumCommsMatrix from '@/components/widgets/QuantumCommsMatrix';
import TacticalIntelligenceFeed from '@/components/widgets/TacticalIntelligenceFeed';
import FourDBattlespaceVisualizer from '@/components/widgets/FourDBattlespaceVisualizer';
import BiometricCrewMonitor from '@/components/widgets/BiometricCrewMonitor';
import AssetTelemetryDashboard from '@/components/widgets/AssetTelemetryDashboard';
import SectorThreatAnalyzer from '@/components/widgets/SectorThreatAnalyzer';
import DynamicOperationComposer from '@/components/widgets/DynamicOperationComposer';
import SquadronCommandMatrix from '@/components/widgets/SquadronCommandMatrix';
import ResourceFlowOptimizer from '@/components/widgets/ResourceFlowOptimizer';
import CombatEngagementSequencer from '@/components/widgets/CombatEngagementSequencer';
import PredictiveIntelEngine from '@/components/widgets/PredictiveIntelEngine';
import SocialNetworkAnalyzer from '@/components/widgets/SocialNetworkAnalyzer';
import PerformanceAnalyticsSuite from '@/components/widgets/PerformanceAnalyticsSuite';
import EconomyPulseMonitor from '@/components/widgets/EconomyPulseMonitor';
import CinematicEventRecorder from '@/components/widgets/CinematicEventRecorder';
import AmbientMoodEngine from '@/components/widgets/AmbientMoodEngine';
import NeuralLinkCustomizer from '@/components/widgets/NeuralLinkCustomizer';
import AROverlayController from '@/components/widgets/AROverlayController';
import LiveThreatRadar from '@/components/widgets/LiveThreatRadar';
import PowerGridMonitor from '@/components/widgets/PowerGridMonitor';
import QuantumJumpPlanner from '@/components/widgets/QuantumJumpPlanner';
import ShipLoadoutDesigner from '@/components/widgets/ShipLoadoutDesigner';
import MissionBriefingTerminal from '@/components/widgets/MissionBriefingTerminal';
import SecureDataVault from '@/components/widgets/SecureDataVault';
import AITacticalAdvisor from '@/components/widgets/AITacticalAdvisor';
import QuickLaunchPad from '@/components/widgets/QuickLaunchPad';
import LiveKillFeed from '@/components/widgets/LiveKillFeed';
import WeatherSatellite from '@/components/widgets/WeatherSatellite';
import RealtimeLogStream from '@/components/widgets/RealtimeLogStream';
import VoiceActivityWaveform from '@/components/widgets/VoiceActivityWaveform';
import ObjectiveTracker from '@/components/widgets/ObjectiveTracker';
import CrewStatusBoard from '@/components/widgets/CrewStatusBoard';
import AnomalyDetector from '@/components/widgets/AnomalyDetector';
import SupplyChainVisualizer from '@/components/widgets/SupplyChainVisualizer';
import CreditBalanceTracker from '@/components/widgets/CreditBalanceTracker';
import EnvironmentalScanner from '@/components/widgets/EnvironmentalScanner';
import PriorityMessageQueue from '@/components/widgets/PriorityMessageQueue';

export const WIDGET_REGISTRY = {
  // === CORE COMMAND & CONTROL ===
  neuralConsole: {
    component: NeuralCommandConsole,
    label: 'Neural Command Console',
    icon: Brain,
    description: 'AI-powered natural language command input',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: true,
    category: 'Command & Control',
  },
  holoMissionDirector: {
    component: HolographicMissionDirector,
    label: 'Holographic Mission Director',
    icon: Target,
    description: '3D operation planning and asset positioning',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    singleton: false,
    category: 'Command & Control',
  },
  quantumComms: {
    component: QuantumCommsMatrix,
    label: 'Quantum Comms Matrix',
    icon: Radio,
    description: 'Multi-channel voice/text with AI moderation',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: true,
    category: 'Command & Control',
  },
  intelFeed: {
    component: TacticalIntelligenceFeed,
    label: 'Tactical Intelligence Feed',
    icon: AlertTriangle,
    description: 'Live intel with AI threat classification',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Command & Control',
  },

  // === SITUATIONAL AWARENESS ===
  fourDBattlespace: {
    component: FourDBattlespaceVisualizer,
    label: '4D Battlespace Visualizer',
    icon: Map,
    description: 'Time-traveling tactical map with predictions',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    singleton: false,
    category: 'Situational Awareness',
  },
  biometrics: {
    component: BiometricCrewMonitor,
    label: 'Biometric Crew Monitor',
    icon: Heart,
    description: 'Live vitals and readiness scores',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Situational Awareness',
  },
  assetTelemetry: {
    component: AssetTelemetryDashboard,
    label: 'Asset Telemetry Dashboard',
    icon: Gauge,
    description: 'Real-time ship systems and maintenance',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Situational Awareness',
  },
  threatAnalyzer: {
    component: SectorThreatAnalyzer,
    label: 'Sector Threat Analyzer',
    icon: Crosshair,
    description: 'Risk heat maps and escape routes',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Situational Awareness',
  },

  // === OPERATIONS MANAGEMENT ===
  opComposer: {
    component: DynamicOperationComposer,
    label: 'Dynamic Operation Composer',
    icon: Calendar,
    description: 'Mission builder with success probability',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Operations Management',
  },
  squadMatrix: {
    component: SquadronCommandMatrix,
    label: 'Squadron Command Matrix',
    icon: Shield,
    description: 'Live org chart with role assignments',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Operations Management',
  },
  resourceFlow: {
    component: ResourceFlowOptimizer,
    label: 'Resource Flow Optimizer',
    icon: Package,
    description: 'Supply chain with bottleneck detection',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Operations Management',
  },
  combatSequencer: {
    component: CombatEngagementSequencer,
    label: 'Combat Engagement Sequencer',
    icon: Crosshair,
    description: 'Pre-planned action choreography',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Operations Management',
  },

  // === INTELLIGENCE & ANALYTICS ===
  predictiveIntel: {
    component: PredictiveIntelEngine,
    label: 'Predictive Intel Engine',
    icon: Brain,
    description: 'ML-powered event forecasting',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Intelligence & Analytics',
  },
  socialNetwork: {
    component: SocialNetworkAnalyzer,
    label: 'Social Network Analyzer',
    icon: Network,
    description: 'Relationship mapping visualization',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Intelligence & Analytics',
  },
  performance: {
    component: PerformanceAnalyticsSuite,
    label: 'Performance Analytics Suite',
    icon: Award,
    description: 'Team metrics and progression tracking',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Intelligence & Analytics',
  },
  economyPulse: {
    component: EconomyPulseMonitor,
    label: 'Economy Pulse Monitor',
    icon: DollarSign,
    description: 'Market trends and trade profitability',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Intelligence & Analytics',
  },

  // === IMMERSIVE EXPERIENCE ===
  cinematicRecorder: {
    component: CinematicEventRecorder,
    label: 'Cinematic Event Recorder',
    icon: Video,
    description: 'Auto-highlight reel generator',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: true,
    category: 'Immersive Experience',
  },
  moodEngine: {
    component: AmbientMoodEngine,
    label: 'Ambient Mood Engine',
    icon: Palette,
    description: 'Dynamic lighting and effects by status',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
    category: 'Immersive Experience',
  },
  neuralCustomizer: {
    component: NeuralLinkCustomizer,
    label: 'Neural Link Customizer',
    icon: Sliders,
    description: 'Personalized UI themes and layouts',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
    category: 'Immersive Experience',
  },
  arOverlay: {
    component: AROverlayController,
    label: 'AR Overlay Controller',
    icon: Maximize2,
    description: 'Mixed reality tactical markers',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
    category: 'Immersive Experience',
  },

  // === TACTICAL UTILITIES ===
  threatRadar: {
    component: LiveThreatRadar,
    label: 'Live Threat Radar',
    icon: Radar,
    description: '360° proximity detection',
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  powerGrid: {
    component: PowerGridMonitor,
    label: 'Power Grid Monitor',
    icon: Zap,
    description: 'Energy allocation and warnings',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  jumpPlanner: {
    component: QuantumJumpPlanner,
    label: 'Quantum Jump Planner',
    icon: Rocket,
    description: 'Route optimization with fuel calc',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  loadoutDesigner: {
    component: ShipLoadoutDesigner,
    label: 'Ship Loadout Designer',
    icon: Wrench,
    description: 'Component fitting and optimization',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  briefingTerminal: {
    component: MissionBriefingTerminal,
    label: 'Mission Briefing Terminal',
    icon: FileText,
    description: 'Operation briefs and documentation',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  dataVault: {
    component: SecureDataVault,
    label: 'Secure Data Vault',
    icon: Lock,
    description: 'Encrypted file storage and access',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },
  aiAdvisor: {
    component: AITacticalAdvisor,
    label: 'AI Tactical Advisor',
    icon: Lightbulb,
    description: 'Intelligent recommendations engine',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Tactical Utilities',
  },

  // === MONITORING & DIAGNOSTICS ===
  logStream: {
    component: RealtimeLogStream,
    label: 'Realtime Log Stream',
    icon: Terminal,
    description: 'Live system event monitoring',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  voiceWaveform: {
    component: VoiceActivityWaveform,
    label: 'Voice Activity Waveform',
    icon: Mic,
    description: 'Live audio visualization',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    singleton: true,
    category: 'Monitoring & Diagnostics',
  },
  objectives: {
    component: ObjectiveTracker,
    label: 'Objective Tracker',
    icon: Target,
    description: 'Mission goal progress tracking',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  crewBoard: {
    component: CrewStatusBoard,
    label: 'Crew Status Board',
    icon: Users,
    description: 'Real-time personnel status',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  anomalyDetector: {
    component: AnomalyDetector,
    label: 'Anomaly Detector',
    icon: AlertTriangle,
    description: 'Automated anomaly scanning',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  supplyChain: {
    component: SupplyChainVisualizer,
    label: 'Supply Chain Visualizer',
    icon: Package,
    description: 'Logistics flow tracking',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  credits: {
    component: CreditBalanceTracker,
    label: 'Credit Balance Tracker',
    icon: DollarSign,
    description: 'Financial tracking and history',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  envScanner: {
    component: EnvironmentalScanner,
    label: 'Environmental Scanner',
    icon: Cloud,
    description: 'Weather and atmospheric monitoring',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },
  priorityQueue: {
    component: PriorityMessageQueue,
    label: 'Priority Message Queue',
    icon: Inbox,
    description: 'High-priority notifications inbox',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Monitoring & Diagnostics',
  },

  // === QUICK ACCESS ===
  quickLaunch: {
    component: QuickLaunchPad,
    label: 'Quick Launch Pad',
    icon: Rocket,
    description: 'Instant access shortcuts',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    singleton: true,
    category: 'Quick Access',
  },
  killFeed: {
    component: LiveKillFeed,
    label: 'Live Kill Feed',
    icon: Skull,
    description: 'Combat event stream',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: true,
    category: 'Quick Access',
  },
  weatherSat: {
    component: WeatherSatellite,
    label: 'Weather Satellite',
    icon: Cloud,
    description: 'Multi-location weather tracking',
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
    singleton: false,
    category: 'Quick Access',
  },
};
