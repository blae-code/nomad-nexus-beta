import React from 'react';
import UXImprovementTracker from '@/components/admin/UXImprovementTracker';
import RouteGuard from '@/components/auth/RouteGuard';

export default function UXRoadmap() {
  return (
    <RouteGuard requiredAuth="admin">
      <div className="min-h-screen bg-zinc-950">
        <UXImprovementTracker />
      </div>
    </RouteGuard>
  );
}