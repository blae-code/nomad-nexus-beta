import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, CheckSquare, AlertTriangle, Users, Radio, Shield, Zap, FileText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PLAYBOOK_PROCEDURES = {
  combat: {
    title: 'Combat Operations',
    icon: Shield,
    color: 'red',
    procedures: [
      {
        id: 'combat-1',
        name: 'Ship-to-Ship Combat',
        description: 'Standard procedures for engaging hostile vessels',
        checklist: [
          'Verify target identification (IFF)',
          'Confirm weapons hot authorization',
          'Establish tactical formation',
          'Designate primary/secondary targets',
          'Monitor shield and hull status',
          'Coordinate fire discipline',
          'Prepare for immediate withdrawal if needed'
        ]
      },
      {
        id: 'combat-2',
        name: 'Ground Assault',
        description: 'Coordinated ground combat operations',
        checklist: [
          'Brief all squad members on objectives',
          'Assign fire teams and sectors',
          'Establish rally points',
          'Test comms before engagement',
          'Confirm medical support availability',
          'Set ROE (Rules of Engagement)',
          'Designate extraction points'
        ]
      }
    ]
  },
  rescue: {
    title: 'Rescue Operations',
    icon: AlertTriangle,
    color: 'orange',
    procedures: [
      {
        id: 'rescue-1',
        name: 'Emergency Medical Response',
        description: 'Rapid response for medical emergencies',
        checklist: [
          'Receive distress signal and location',
          'Dispatch nearest medical ship',
          'Establish secure comms with casualty',
          'Coordinate with local security',
          'Prepare medical bay',
          'Execute extraction under cover',
          'Transport to medical facility',
          'File incident report'
        ]
      },
      {
        id: 'rescue-2',
        name: 'Ship Recovery',
        description: 'Recover disabled or abandoned vessels',
        checklist: [
          'Survey area for hostiles',
          'Approach with caution',
          'Scan for survivors',
          'Secure the vessel',
          'Assess damage and repair options',
          'Tow or pilot to safe location',
          'Document findings'
        ]
      }
    ]
  },
  comms: {
    title: 'Communications Setup',
    icon: Radio,
    color: 'blue',
    procedures: [
      {
        id: 'comms-1',
        name: 'Event Comms Provisioning',
        description: 'Setting up communications for operations',
        checklist: [
          'Create command net (priority 1)',
          'Create squad nets as needed',
          'Assign net codes and labels',
          'Set discipline (casual vs focused)',
          'Configure rank/role permissions',
          'Test all nets before go-live',
          'Brief participants on net usage',
          'Monitor net health during ops'
        ]
      },
      {
        id: 'comms-2',
        name: 'Emergency Comms Protocol',
        description: 'Procedures for compromised communications',
        checklist: [
          'Switch to backup frequencies',
          'Implement radio silence if needed',
          'Use brevity codes',
          'Verify authentication',
          'Re-establish command net first',
          'Account for all units',
          'Resume normal comms when secure'
        ]
      }
    ]
  },
  logistics: {
    title: 'Logistics & Support',
    icon: Users,
    color: 'cyan',
    procedures: [
      {
        id: 'logistics-1',
        name: 'Resource Management',
        description: 'Managing org resources and treasury',
        checklist: [
          'Assess current treasury balance',
          'Allocate funds for operation',
          'Request additional resources if needed',
          'Track expenditures',
          'Distribute earnings post-op',
          'Update resource logs',
          'Plan for resupply'
        ]
      },
      {
        id: 'logistics-2',
        name: 'Fleet Deployment',
        description: 'Coordinating fleet assets',
        checklist: [
          'Review operation requirements',
          'Select appropriate vessels',
          'Assign pilots/crew',
          'Verify ship readiness',
          'Coordinate departure times',
          'Establish formation',
          'Monitor fuel and consumables'
        ]
      }
    ]
  },
  training: {
    title: 'Training & Drills',
    icon: Zap,
    color: 'purple',
    procedures: [
      {
        id: 'training-1',
        name: 'New Member Orientation',
        description: 'Onboarding new organization members',
        checklist: [
          'Welcome message and org overview',
          'Assign mentor/buddy',
          'Tour of systems and tools',
          'Voice comms test',
          'Rank and role explanation',
          'First training exercise',
          'Answer questions and provide resources'
        ]
      },
      {
        id: 'training-2',
        name: 'Combat Readiness Drill',
        description: 'Regular drills to maintain combat effectiveness',
        checklist: [
          'Schedule drill time',
          'Brief scenario objectives',
          'Form teams and assign roles',
          'Execute scenario',
          'Debrief and identify improvements',
          'Update training records',
          'Schedule next drill'
        ]
      }
    ]
  },
  admin: {
    title: 'Administrative',
    icon: FileText,
    color: 'zinc',
    procedures: [
      {
        id: 'admin-1',
        name: 'After Action Report (AAR)',
        description: 'Post-operation documentation',
        checklist: [
          'Gather all event logs',
          'Interview key participants',
          'Document objectives completed',
          'Note challenges encountered',
          'List lessons learned',
          'Calculate success metrics',
          'Generate formal AAR',
          'Share with leadership'
        ]
      },
      {
        id: 'admin-2',
        name: 'Incident Investigation',
        description: 'Investigating operational incidents',
        checklist: [
          'Collect incident details',
          'Interview witnesses',
          'Review comms logs',
          'Identify root cause',
          'Assess impact',
          'Recommend corrective actions',
          'Document findings',
          'Implement improvements'
        ]
      }
    ]
  }
};

export default function OperationPlaybook({ user }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChecklist, setActiveChecklist] = useState({});

  const filteredPlaybook = Object.entries(PLAYBOOK_PROCEDURES).reduce((acc, [key, category]) => {
    const filteredProcedures = category.procedures.filter(proc =>
      proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proc.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filteredProcedures.length > 0) {
      acc[key] = { ...category, procedures: filteredProcedures };
    }
    return acc;
  }, {});

  const toggleChecklistItem = (procId, itemIndex) => {
    setActiveChecklist(prev => ({
      ...prev,
      [`${procId}-${itemIndex}`]: !prev[`${procId}-${itemIndex}`]
    }));
  };

  const resetChecklist = (procId, itemCount) => {
    const updates = {};
    for (let i = 0; i < itemCount; i++) {
      updates[`${procId}-${i}`] = false;
    }
    setActiveChecklist(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="border border-zinc-800 bg-zinc-950/50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search procedures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800"
          />
        </div>
      </div>

      {/* Playbook Categories */}
      <Accordion type="single" collapsible className="space-y-2">
        {Object.entries(filteredPlaybook).map(([key, category]) => {
          const Icon = category.icon;
          const colorMap = {
            red: 'text-red-400 border-red-900/50 bg-red-950/20',
            orange: 'text-orange-400 border-orange-900/50 bg-orange-950/20',
            blue: 'text-blue-400 border-blue-900/50 bg-blue-950/20',
            cyan: 'text-cyan-400 border-cyan-900/50 bg-cyan-950/20',
            purple: 'text-purple-400 border-purple-900/50 bg-purple-950/20',
            zinc: 'text-zinc-400 border-zinc-800 bg-zinc-950/50'
          };

          return (
            <AccordionItem key={key} value={key} className="border border-zinc-800 bg-zinc-950/50">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-zinc-900/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 border ${colorMap[category.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-bold text-zinc-200">{category.title}</div>
                    <div className="text-xs text-zinc-500">{category.procedures.length} procedures</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 mt-2">
                  {category.procedures.map(procedure => {
                    const completedItems = procedure.checklist.filter((_, i) =>
                      activeChecklist[`${procedure.id}-${i}`]
                    ).length;
                    const progress = Math.round((completedItems / procedure.checklist.length) * 100);

                    return (
                      <div key={procedure.id} className="border border-zinc-800 bg-zinc-900/30 p-3">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-sm font-bold text-zinc-200 mb-1">{procedure.name}</div>
                            <div className="text-xs text-zinc-500">{procedure.description}</div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {completedItems}/{procedure.checklist.length}
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Checklist */}
                        <div className="space-y-2 mb-3">
                          {procedure.checklist.map((item, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Checkbox
                                id={`${procedure.id}-${index}`}
                                checked={!!activeChecklist[`${procedure.id}-${index}`]}
                                onCheckedChange={() => toggleChecklistItem(procedure.id, index)}
                                className="mt-0.5"
                              />
                              <label
                                htmlFor={`${procedure.id}-${index}`}
                                className={`text-xs cursor-pointer ${
                                  activeChecklist[`${procedure.id}-${index}`]
                                    ? 'text-zinc-500 line-through'
                                    : 'text-zinc-300'
                                }`}
                              >
                                {item}
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resetChecklist(procedure.id, procedure.checklist.length)}
                            className="text-xs h-7"
                          >
                            Reset
                          </Button>
                          {progress === 100 && (
                            <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-800">
                              <CheckSquare className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}