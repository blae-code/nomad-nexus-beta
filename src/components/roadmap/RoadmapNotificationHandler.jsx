import React, { useEffect, useState } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { base44 } from '@/api/base44Client';
import { AlertCircle, CheckCircle2, Zap } from 'lucide-react';

/**
 * RoadmapNotificationHandler
 * Monitors roadmap milestones and triggers notifications on phase changes
 */
export default function RoadmapNotificationHandler({ roadmapMilestones = [] }) {
  const { addNotification } = useNotification();
  const [previousState, setPreviousState] = useState(null);

  useEffect(() => {
    if (!roadmapMilestones || roadmapMilestones.length === 0) return;

    const currentState = JSON.stringify(roadmapMilestones);

    // Check if roadmap state has changed
    if (previousState && previousState !== currentState) {
      roadmapMilestones.forEach((milestone) => {
        const previousMilestone = JSON.parse(previousState).find(
          (m) => m.phase === milestone.phase
        );

        if (!previousMilestone) return;

        // Detect completion status change
        if (previousMilestone.completion !== milestone.completion) {
          if (milestone.completion === 100) {
            // Milestone completed
            addNotification({
              type: 'success',
              title: `${milestone.phase} Complete!`,
              message: `${milestone.title} (v${milestone.version}) has been completed.`,
              icon: CheckCircle2,
              duration: 5000,
            });

            // Trigger email notification
            notifyAboutCompletion(milestone);
          } else if (milestone.completion >= 50 && previousMilestone.completion < 50) {
            // Reached 50% progress
            addNotification({
              type: 'info',
              title: `${milestone.phase} Halfway There`,
              message: `${milestone.title} is now 50% complete.`,
              icon: Zap,
              duration: 5000,
            });
          }
        }

        // Detect feature status changes
        milestone.features.forEach((feature, idx) => {
          const prevFeature = previousMilestone.features[idx];
          if (prevFeature && prevFeature.status !== feature.status) {
            if (feature.status === 'complete') {
              addNotification({
                type: 'success',
                title: 'Feature Complete',
                message: `${feature.name} has been completed in ${milestone.phase}.`,
                duration: 4000,
              });
            } else if (feature.status === 'in-progress' && prevFeature.status === 'planned') {
              addNotification({
                type: 'info',
                title: 'Development Started',
                message: `${feature.name} development is now in progress.`,
                duration: 4000,
              });
            }
          }
        });
      });
    }

    setPreviousState(currentState);
  }, [roadmapMilestones, previousState, addNotification]);

  return null;
}

async function notifyAboutCompletion(milestone) {
  try {
    const user = await base44.auth.me();
    if (!user || !user.email) return;

    await base44.functions.invoke('notifyRoadmapUpdate', {
      milestoneType: milestone.phase,
      change: `${milestone.title} has been completed`,
      severity: 'HIGH',
      emailRecipients: [user.email],
    });
  } catch (error) {
    console.warn('Failed to send milestone completion email:', error);
  }
}