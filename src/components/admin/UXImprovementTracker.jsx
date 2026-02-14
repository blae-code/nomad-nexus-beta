import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Circle, Clock, AlertTriangle, Zap } from 'lucide-react';

const UX_TODOS = {
  quickWins: [
    { id: 'loading-skeletons', title: 'Add loading skeletons to major views', priority: 'high', effort: 'low', status: 'completed' },
    { id: 'empty-states', title: 'Add empty state CTAs for new users', priority: 'high', effort: 'low', status: 'completed' },
    { id: 'mobile-comms-dock', title: 'Fix mobile comms dock padding', priority: 'high', effort: 'low', status: 'completed' },
    { id: 'tooltip-library', title: 'Add tooltips for complex terms', priority: 'high', effort: 'low', status: 'completed' },
    { id: 'voice-health-indicator', title: 'Voice connection health indicator', priority: 'high', effort: 'low', status: 'completed' },
    { id: 'keyboard-shortcuts', title: 'Keyboard shortcut documentation', priority: 'medium', effort: 'low', status: 'pending' },
    { id: 'notification-badges', title: 'Notification priority badges', priority: 'medium', effort: 'low', status: 'pending' },
    { id: 'ai-activity-indicator', title: 'AI processing indicator', priority: 'medium', effort: 'low', status: 'pending' },
  ],
  foundation: [
    { id: 'mobile-nav', title: 'Mobile navigation optimization', priority: 'high', effort: 'medium', status: 'pending' },
    { id: 'error-handling', title: 'Global error boundary with recovery', priority: 'high', effort: 'medium', status: 'pending' },
    { id: 'onboarding-tutorial', title: 'Interactive onboarding tutorial', priority: 'high', effort: 'high', status: 'pending' },
    { id: 'voice-wizard', title: 'Voice net setup wizard', priority: 'high', effort: 'medium', status: 'pending' },
  ],
  refinement: [
    { id: 'event-wizard', title: 'Event creation wizard with smart defaults', priority: 'high', effort: 'high', status: 'pending' },
    { id: 'notification-system', title: 'Priority notification system', priority: 'high', effort: 'medium', status: 'pending' },
    { id: 'map-layers', title: 'Tactical map layer controls', priority: 'medium', effort: 'medium', status: 'pending' },
    { id: 'ai-transparency', title: 'AI feature transparency dashboard', priority: 'medium', effort: 'medium', status: 'pending' },
  ],
  scale: [
    { id: 'accessibility', title: 'ARIA labels and keyboard navigation', priority: 'high', effort: 'high', status: 'pending' },
    { id: 'performance', title: 'Lazy loading and optimistic updates', priority: 'high', effort: 'high', status: 'pending' },
    { id: 'personalization', title: 'Workspace layouts and custom views', priority: 'medium', effort: 'high', status: 'pending' },
    { id: 'analytics', title: 'UX analytics and A/B testing', priority: 'medium', effort: 'high', status: 'pending' },
  ],
};

const priorityColors = {
  high: 'bg-red-500/10 text-red-400 border-red-500/30',
  medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
};

const effortIcons = {
  low: <Zap className="w-3 h-3" />,
  medium: <Clock className="w-3 h-3" />,
  high: <AlertTriangle className="w-3 h-3" />,
};

export default function UXImprovementTracker() {
  const [filter, setFilter] = useState('all');

  const renderTodoItem = (todo) => {
    const isCompleted = todo.status === 'completed';
    
    return (
      <div
        key={todo.id}
        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
          isCompleted
            ? 'bg-green-950/20 border-green-500/30 opacity-75'
            : 'bg-zinc-900/50 border-zinc-800 hover:border-orange-500/30'
        }`}
      >
        <div className="pt-0.5">
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-600" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
            {todo.title}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-[10px] px-2 py-0.5 ${priorityColors[todo.priority]}`}>
              {todo.priority}
            </Badge>
            
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              {effortIcons[todo.effort]}
              <span>{todo.effort} effort</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPhase = (phase, items) => {
    const completed = items.filter(i => i.status === 'completed').length;
    const total = items.length;
    const percentage = Math.round((completed / total) * 100);

    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-orange-400 uppercase tracking-wide">
              {phase}
            </CardTitle>
            <div className="text-sm text-zinc-400">
              {completed}/{total} ({percentage}%)
            </div>
          </div>
          
          <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {items.map(renderTodoItem)}
        </CardContent>
      </Card>
    );
  };

  const allTodos = [
    ...UX_TODOS.quickWins,
    ...UX_TODOS.foundation,
    ...UX_TODOS.refinement,
    ...UX_TODOS.scale,
  ];

  const totalCompleted = allTodos.filter(t => t.status === 'completed').length;
  const totalTodos = allTodos.length;
  const overallPercentage = Math.round((totalCompleted / totalTodos) * 100);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-wide">
            UX Improvement Roadmap
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Surgical enhancements to elevate user experience
          </p>
        </div>

        <Card className="bg-gradient-to-r from-orange-950/30 to-zinc-900/50 border-orange-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-orange-300">Overall Progress</span>
              <span className="text-2xl font-black text-orange-400">
                {overallPercentage}%
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {totalCompleted} of {totalTodos} improvements completed
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="quickWins" className="space-y-4">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="quickWins">Quick Wins</TabsTrigger>
          <TabsTrigger value="foundation">Foundation</TabsTrigger>
          <TabsTrigger value="refinement">Refinement</TabsTrigger>
          <TabsTrigger value="scale">Scale</TabsTrigger>
        </TabsList>

        <TabsContent value="quickWins" className="space-y-4">
          {renderPhase('Quick Wins (High Impact, Low Effort)', UX_TODOS.quickWins)}
        </TabsContent>

        <TabsContent value="foundation" className="space-y-4">
          {renderPhase('Foundation (1-2 weeks)', UX_TODOS.foundation)}
        </TabsContent>

        <TabsContent value="refinement" className="space-y-4">
          {renderPhase('Refinement (2-4 weeks)', UX_TODOS.refinement)}
        </TabsContent>

        <TabsContent value="scale" className="space-y-4">
          {renderPhase('Scale (1-2 months)', UX_TODOS.scale)}
        </TabsContent>
      </Tabs>
    </div>
  );
}