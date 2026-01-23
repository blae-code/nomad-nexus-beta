import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WIDGET_REGISTRY, getAccessibleWidgets } from './widgetRegistry';
import { getTemplateConfig, getLayoutForRole } from './templateConfigs';

export default function OpsWorkspaceShell({ operationId, user }) {
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const queryClient = useQueryClient();

  // Determine user's operational role for this operation
  useEffect(() => {
    if (!user || !operationId) return;
    
    // Check squad membership and roles
    const determineRole = async () => {
      try {
        const memberships = await base44.entities.SquadMembership.filter({
          user_id: user.id
        });
        const role = memberships?.[0]?.custom_title || 'Member';
        setUserRole(role);
      } catch (err) {
        setUserRole('Member');
      }
    };
    
    determineRole();
  }, [user?.id, operationId]);

  // Fetch operation
  const { data: operation, isLoading, error } = useQuery({
    queryKey: ['operation', operationId],
    queryFn: () => base44.entities.Event.filter({ id: operationId }).then(r => r?.[0]),
    staleTime: 5000
  });

  // Fetch or create layout
  const { data: layout, isLoading: layoutLoading } = useQuery({
    queryKey: ['workspace-layout', operationId, userRole],
    queryFn: async () => {
      if (!operationId || !userRole || !operation) return null;

      const existing = await base44.entities.WorkspaceLayout.filter({
        operation_id: operationId,
        role: userRole,
        user_id: user.id
      });

      if (existing?.length > 0) {
        return existing[0];
      }

      // Create default layout from template
      const templateConfig = getTemplateConfig(operation.event_type);
      if (!templateConfig) return null;

      const defaultLayout = getLayoutForRole(operation.event_type, userRole);
      const newLayout = {
        operation_id: operationId,
        user_id: user.id,
        role: userRole,
        template_type: operation.event_type,
        ...defaultLayout,
        is_default: true
      };

      try {
        const created = await base44.entities.WorkspaceLayout.create(newLayout);
        return created;
      } catch (err) {
        console.error('Failed to create layout:', err);
        return newLayout;
      }
    },
    enabled: !!operationId && !!userRole && !!operation && !isLoading,
    staleTime: 60000
  });

  const updateLayoutMutation = useMutation({
    mutationFn: (updatedLayout) => {
      if (layout?.id) {
        return base44.entities.WorkspaceLayout.update(layout.id, updatedLayout);
      }
      return Promise.resolve(updatedLayout);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-layout'] });
    }
  });

  if (isLoading || layoutLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <p className="text-sm font-mono text-zinc-500">LOADING WORKSPACE...</p>
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-400">Operation not found</p>
        </div>
      </div>
    );
  }

  const currentLayout = layout || getLayoutForRole(operation.event_type, userRole);
  if (!currentLayout) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <p className="text-sm text-zinc-500">No layout available</p>
      </div>
    );
  }

  const isCommandRole = ['Commander', 'XO', 'Comms Officer'].includes(userRole);
  const gridCols = currentLayout.grid_cols || 12;

  const handleDragStart = (e, widget, data) => {
    setDraggedWidget({ widget, data });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, gridCell) => {
    e.preventDefault();
    if (!draggedWidget || !isCommandRole) return;

    // Handle drop logic - update widget position
    if (draggedWidget.data.type === 'objective') {
      // Log objective marker creation
      base44.entities.OpsSession.update(operation.id, {
        operation_log: [
          ...(operation.operation_log || []),
          {
            timestamp: new Date().toISOString(),
            type: 'command',
            actor_id: user.id,
            content: `Objective "${draggedWidget.data.data.text}" mapped to grid`,
            metadata: { gridCell }
          }
        ]
      });
    }

    setDraggedWidget(null);
  };

  return (
    <div
      className="h-full overflow-auto bg-black p-2"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        gap: '8px',
        gridAutoFlow: 'dense',
        gridAutoRows: 'minmax(200px, auto)'
      }}
    >
      {currentLayout.widgets.map(widget => {
        const widgetConfig = WIDGET_REGISTRY[widget.widget_type];
        if (!widgetConfig) return null;

        const WidgetComponent = widgetConfig.component;
        const isAccessible = getAccessibleWidgets(userRole, operation).some(
          w => w.type === widget.widget_type
        );

        if (!isAccessible) return null;

        return (
          <div
            key={widget.id}
            style={{
              gridColumn: `span ${widget.width}`,
              gridRow: `span ${widget.height}`
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, { col: widget.col, row: widget.row })}
            className={cn(
              'border rounded-none overflow-hidden flex flex-col transition-all',
              draggedWidget ? 'border-[#ea580c]/50' : 'border-zinc-800 hover:border-zinc-700',
              'bg-zinc-950/60'
            )}
          >
            <WidgetComponent
              operation={operation}
              user={user}
              isCommandRole={isCommandRole}
              onDragStart={handleDragStart}
              layout={layout}
            />
          </div>
        );
      })}
    </div>
  );
}