import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Drag-and-drop tool system for operations workspace
 * Allows: User → Squad, Squad → Objective, Objective → Map
 */

export const useDragTools = (operation, user, isCommandRole, onLog) => {
  const [activeDrag, setActiveDrag] = useState(null);

  const assignUserToSquadMutation = useMutation({
    mutationFn: async ({ userId, squadId }) => {
      // Create assignment entry
      await base44.entities.OpsSession.update(operation.id, {
        operation_log: [
          ...(operation.operation_log || []),
          {
            timestamp: new Date().toISOString(),
            type: 'personnel_change',
            actor_id: user.id,
            content: `User assigned to squad`,
            metadata: { userId, squadId }
          }
        ]
      });
      
      onLog?.({
        type: 'personnel_change',
        content: `User assigned to squad`
      });
    }
  });

  const taskSquadToObjectiveMutation = useMutation({
    mutationFn: async ({ squadId, objectiveId }) => {
      await base44.entities.OpsSession.update(operation.id, {
        operation_log: [
          ...(operation.operation_log || []),
          {
            timestamp: new Date().toISOString(),
            type: 'command',
            actor_id: user.id,
            content: `Squad tasked to objective`,
            metadata: { squadId, objectiveId }
          }
        ]
      });

      onLog?.({
        type: 'command',
        content: `Squad tasked to objective`
      });
    }
  });

  const mapObjectiveToLocationMutation = useMutation({
    mutationFn: async ({ objectiveId, coordinates }) => {
      const objectives = operation?.brief_artifact?.objectives || [];
      const updated = objectives.map(o =>
        o.id === objectiveId ? { ...o, coordinates } : o
      );

      await base44.entities.OpsSession.update(operation.id, {
        brief_artifact: {
          ...operation.brief_artifact,
          objectives: updated
        },
        operation_log: [
          ...(operation.operation_log || []),
          {
            timestamp: new Date().toISOString(),
            type: 'command',
            actor_id: user.id,
            content: `Objective mapped to location`,
            metadata: { objectiveId, coordinates }
          }
        ]
      });

      onLog?.({
        type: 'command',
        content: `Objective mapped to location`
      });
    }
  });

  return {
    activeDrag,
    setActiveDrag,
    assignUserToSquad: (userId, squadId) => assignUserToSquadMutation.mutate({ userId, squadId }),
    taskSquadToObjective: (squadId, objectiveId) => taskSquadToObjectiveMutation.mutate({ squadId, objectiveId }),
    mapObjectiveToLocation: (objectiveId, coords) => mapObjectiveToLocationMutation.mutate({ objectiveId, coordinates: coords })
  };
};

export const DragHandle = ({ isDraggable = true, className }) => (
  isDraggable && (
    <GripHorizontal className={cn('w-3 h-3 text-zinc-600 shrink-0', className)} />
  )
);