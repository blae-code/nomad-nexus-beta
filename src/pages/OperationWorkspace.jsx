import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageLayout from '@/components/layout/PageLayout';
import OpsWorkspaceShell from '@/components/operations/workspace/OpsWorkspaceShell';

export default function OperationWorkspacePage() {
  const { opId } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  if (!user) {
    return (
      <PageLayout title="Operation Workspace">
        <div className="h-full flex items-center justify-center">
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`WORKSPACE • ${opId}`}>
      <OpsWorkspaceShell operationId={opId} user={user} />
    </PageLayout>
  );
}