import React, { useCallback, useMemo, useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  MessageSquare, 
  Radio, 
  Shield,
  X 
} from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';

const TUTORIAL_MODULES = [
  {
    id: 'getting-started',
    title: 'Getting Started with NexusOS',
    icon: Shield,
    duration: '3 min',
    difficulty: 'beginner',
    steps: [
      {
        title: 'Welcome to NexusOS',
        content: 'NexusOS is your tactical operations platform. This tutorial will guide you through the core features.',
        actions: ['Continue to overview'],
      },
      {
        title: 'Interface Overview',
        content: 'The interface has three main areas:\n• Left Panel: Text Communications\n• Center Workspace: Focus Apps (Map, Ops, Comms)\n• Right Panel: Voice Command & Control',
        actions: ['Got it, next'],
      },
      {
        title: 'Command Deck',
        content: 'Press Ctrl+Shift+P to open the Command Deck anytime. Use it to:\n• Navigate between focus apps\n• Switch bridge configurations\n• Execute system commands',
        actions: ['Try it now'],
      },
      {
        title: 'Taskbar Navigation',
        content: 'The bottom taskbar shows running apps, notifications, and system status. Click an app icon to bring it to focus.',
        actions: ['Understood'],
      },
    ],
  },
  {
    id: 'tactical-map',
    title: 'Tactical Map Operations',
    icon: Compass,
    duration: '5 min',
    difficulty: 'intermediate',
    steps: [
      {
        title: 'Accessing the Map',
        content: 'Open the tactical map using:\n• Command: "open map" in Command Deck\n• Hotkey: Alt+1\n• Click Map icon in taskbar',
        actions: ['Open map now', 'Skip tutorial'],
      },
      {
        title: 'Map Navigation',
        content: 'Navigate the map using:\n• Click + Drag to pan\n• Scroll to zoom\n• Right-click on objects for radial menu',
        actions: ['Practice navigation'],
      },
      {
        title: 'Map Layers',
        content: 'Toggle different map layers:\n• Control Zones: Tactical territory control\n• Intel: Intelligence markers and reports\n• Logistics: Supply routes and nodes\n• Comms: Communication network overlay',
        actions: ['Explore layers'],
      },
      {
        title: 'Placing Markers',
        content: 'Add tactical markers to the map:\n• Select marker tool from command strip\n• Click on map to place\n• Right-click marker to edit or delete',
        actions: ['Complete tutorial'],
      },
    ],
  },
  {
    id: 'voice-comms',
    title: 'Voice Communications',
    icon: Radio,
    duration: '4 min',
    difficulty: 'beginner',
    steps: [
      {
        title: 'Voice Net Basics',
        content: 'Voice nets are communication channels for real-time voice coordination. Each net has:\n• Code: Short identifier (e.g., ALPHA, COMMAND)\n• Discipline Mode: Controls transmission rules\n• Access Control: Rank and role requirements',
        actions: ['Continue'],
      },
      {
        title: 'Joining a Voice Net',
        content: 'Join voice nets from the right panel:\n• Click "Join" to connect and transmit\n• Click "Monitor" to listen only\n• Multiple nets can be monitored simultaneously',
        actions: ['Next'],
      },
      {
        title: 'Push-to-Talk (PTT)',
        content: 'Transmit on voice nets using PTT:\n• Hold SPACEBAR to transmit\n• Release to stop\n• PTT button in voice panel works too',
        actions: ['Try PTT'],
      },
      {
        title: 'Discipline Modes',
        content: 'Voice nets support different discipline modes:\n• OPEN: Always transmitting\n• PTT: Push-to-talk required\n• REQUEST_TO_SPEAK: Approval needed\n• COMMAND_ONLY: Restricted to command staff',
        actions: ['Finish tutorial'],
      },
    ],
  },
  {
    id: 'text-comms',
    title: 'Text Communications',
    icon: MessageSquare,
    duration: '3 min',
    difficulty: 'beginner',
    steps: [
      {
        title: 'Text Channels',
        content: 'Text channels are organized in the left panel:\n• Command: High-priority tactical comms\n• Squad: Team coordination\n• Logistics: Supply and resource comms\n• General: Casual discussion',
        actions: ['Explore channels'],
      },
      {
        title: 'Sending Messages',
        content: 'Send messages in any channel:\n• Type in the message box\n• Press Enter to send\n• @mention users with @callsign\n• Use /commands for special actions',
        actions: ['Send a test message'],
      },
      {
        title: 'Channel Routing',
        content: 'Link text and voice channels:\n• Voice nets can auto-route to text channels\n• Commands in text can trigger voice actions\n• Unified comms experience',
        actions: ['Complete tutorial'],
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operation Management',
    icon: Shield,
    duration: '6 min',
    difficulty: 'advanced',
    steps: [
      {
        title: 'Creating Operations',
        content: 'Operations coordinate team activities:\n• Set objectives and tasks\n• Assign participants and assets\n• Define start/end times\n• Configure comms channels',
        actions: ['Create operation'],
      },
      {
        title: 'Operation Phases',
        content: 'Operations progress through phases:\n• PLANNING: Prepare objectives\n• BRIEFING: Communicate plan to team\n• ACTIVE: Execute operation\n• DEBRIEF: Review results\n• ARCHIVED: Historical record',
        actions: ['View phase transitions'],
      },
      {
        title: 'Comms Integration',
        content: 'Operations automatically provision:\n• Dedicated voice nets\n• Text channels for planning\n• Event-scoped communication routing',
        actions: ['Next'],
      },
      {
        title: 'Monitoring Progress',
        content: 'Track operation status in real-time:\n• Participant readiness states\n• Objective completion tracking\n• Resource allocation status\n• Communication health',
        actions: ['Finish tutorial'],
      },
    ],
  },
];

export default function NexusTutorialSystem({ open, onClose }) {
  const [selectedModuleId, setSelectedModuleId] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedModules, setCompletedModules] = useState(() => {
    try {
      const stored = localStorage.getItem('nexus.tutorials.completed');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const selectedModule = useMemo(
    () => TUTORIAL_MODULES.find((m) => m.id === selectedModuleId) || null,
    [selectedModuleId]
  );

  const currentStepData = selectedModule?.steps[currentStep] || null;

  const markModuleComplete = useCallback((moduleId) => {
    setCompletedModules((prev) => {
      const next = Array.from(new Set([...prev, moduleId]));
      localStorage.setItem('nexus.tutorials.completed', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    if (confirm('Reset all tutorial progress?')) {
      localStorage.removeItem('nexus.tutorials.completed');
      setCompletedModules([]);
      setSelectedModuleId(null);
      setCurrentStep(0);
    }
  }, []);

  const startModule = (moduleId) => {
    setSelectedModuleId(moduleId);
    setCurrentStep(0);
  };

  const nextStep = () => {
    if (!selectedModule) return;
    if (currentStep < selectedModule.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      markModuleComplete(selectedModule.id);
      setSelectedModuleId(null);
      setCurrentStep(0);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const exitTutorial = () => {
    setSelectedModuleId(null);
    setCurrentStep(0);
  };

  if (!open) return null;

  const difficultyTone = (difficulty) => {
    if (difficulty === 'beginner') return 'ok';
    if (difficulty === 'intermediate') return 'active';
    return 'warning';
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-3xl max-h-[85dvh] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl m-4 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-700/60 bg-zinc-900/80 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-100">
                {selectedModule ? selectedModule.title : 'NexusOS Tutorials'}
              </h2>
              <p className="text-[10px] text-zinc-500 truncate">
                {selectedModule ? `Step ${currentStep + 1} of ${selectedModule.steps.length}` : 'Interactive training modules'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-200 shrink-0"
            title="Close tutorials"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {!selectedModule ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-4">
                <p className="text-sm text-zinc-400">
                  Complete {completedModules.length} of {TUTORIAL_MODULES.length} tutorials
                </p>
                {completedModules.length > 0 && (
                  <button
                    type="button"
                    onClick={resetProgress}
                    className="text-xs text-zinc-500 hover:text-orange-400 transition-colors"
                  >
                    Reset Progress
                  </button>
                )}
              </div>

              {TUTORIAL_MODULES.map((module) => {
                const Icon = module.icon;
                const isCompleted = completedModules.includes(module.id);
                
                return (
                  <button
                    key={module.id}
                    type="button"
                    onClick={() => startModule(module.id)}
                    className="w-full text-left rounded-lg border border-zinc-700/60 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-600/80 transition-all p-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${
                        isCompleted 
                          ? 'bg-green-500/20 border border-green-500/40' 
                          : 'bg-orange-500/20 border border-orange-500/40'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : (
                          <Icon className="w-5 h-5 text-orange-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-300 transition-colors">
                            {module.title}
                          </h3>
                          {isCompleted && (
                            <NexusBadge tone="ok">Completed</NexusBadge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <NexusBadge tone={difficultyTone(module.difficulty)}>
                            {module.difficulty}
                          </NexusBadge>
                          <span className="text-xs text-zinc-500">{module.duration}</span>
                          <span className="text-xs text-zinc-600">·</span>
                          <span className="text-xs text-zinc-500">{module.steps.length} steps</span>
                        </div>
                      </div>
                      
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-1.5">
                {selectedModule.steps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      index < currentStep 
                        ? 'bg-green-500/80' 
                        : index === currentStep 
                          ? 'bg-orange-500' 
                          : 'bg-zinc-700/60'
                    }`}
                  />
                ))}
              </div>

              {/* Current step content */}
              {currentStepData && (
                <div className="rounded-lg border border-zinc-700/60 bg-zinc-900/60 p-4">
                  <h3 className="text-base font-semibold text-orange-300 mb-3">
                    {currentStepData.title}
                  </h3>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                    {currentStepData.content}
                  </div>

                  {/* Action buttons from step */}
                  {currentStepData.actions && currentStepData.actions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-700/40 flex flex-wrap gap-2">
                      {currentStepData.actions.map((action, idx) => (
                        <NexusButton
                          key={idx}
                          size="sm"
                          intent={idx === 0 ? 'primary' : 'subtle'}
                          onClick={nextStep}
                        >
                          {action}
                        </NexusButton>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Additional resources */}
              <div className="rounded border border-zinc-800/60 bg-zinc-950/40 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-2">
                  Quick Tips
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">•</span>
                    <span>You can pause and resume tutorials anytime</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">•</span>
                    <span>Access tutorials via Command Deck → "tutorial"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">•</span>
                    <span>Completed tutorials can be replayed for reference</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-zinc-700/60 bg-zinc-900/80 shrink-0">
          {selectedModule ? (
            <>
              <NexusButton size="sm" intent="subtle" onClick={exitTutorial}>
                <X className="w-3.5 h-3.5 mr-1" />
                Exit Tutorial
              </NexusButton>
              
              <div className="flex items-center gap-2">
                <NexusButton 
                  size="sm" 
                  intent="subtle" 
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  Previous
                </NexusButton>
                <NexusButton size="sm" intent="primary" onClick={nextStep}>
                  {currentStep === selectedModule.steps.length - 1 ? 'Complete' : 'Next'}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </NexusButton>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-zinc-500">
                {completedModules.length === TUTORIAL_MODULES.length && (
                  <span className="text-green-400">All tutorials completed! 🎯</span>
                )}
              </div>
              <NexusButton size="sm" intent="subtle" onClick={onClose}>
                Close
              </NexusButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
}