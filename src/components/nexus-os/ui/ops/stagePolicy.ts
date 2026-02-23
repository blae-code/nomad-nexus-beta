import type { Operation } from '../../schemas/opSchemas';
import type { OperationActorContext, OperationRoleView } from '../../services/operationAuthorityService';
import {
  canControlLifecycle,
  resolveOperationRoleView,
} from '../../services/operationAuthorityService';

export interface OperationStagePolicy {
  isCommandRole: boolean;
  roleView: OperationRoleView;
  canChangeLifecycle: boolean;
  lifecycleReason: string;
  canEditPlan: boolean;
  canEditRequirements: boolean;
  canManageRoster: boolean;
  canPostComms: boolean;
  bannerText: string;
}

export function hasOperationCommandAuthority(operation: Operation, actorId: string): boolean {
  if (!actorId) return false;
  if (operation.createdBy === actorId) return true;
  if (operation.permissions.ownerIds?.includes(actorId)) return true;
  if (operation.permissions.commanderIds?.includes(actorId)) return true;
  return false;
}

/**
 * Stage-aware operation policy for focus UI.
 * Command roles retain override capability during active/wrapping phases.
 */
export function deriveOperationStagePolicy(
  operation: Operation,
  actorId: string,
  actorContext?: Partial<OperationActorContext>
): OperationStagePolicy {
  const context: OperationActorContext = {
    actorId,
    rank: actorContext?.rank,
    roles: actorContext?.roles,
    orgId: actorContext?.orgId,
    isAdmin: actorContext?.isAdmin,
  };
  const resolvedRoleView = resolveOperationRoleView({ context, operation });
  const roleView = resolvedRoleView.roleView;
  const isCommandRole = roleView === 'COMMAND';
  const lifecyclePermission = canControlLifecycle(context, operation);
  const lifecycleReason = lifecyclePermission.allowed
    ? lifecyclePermission.reason
    : `${lifecyclePermission.reason} (role view: ${roleView})`;
  const isLeadRole = roleView === 'LEAD';
  const participantCanManageRoster = roleView === 'PARTICIPANT';

  if (operation.status === 'PLANNING') {
    return {
      isCommandRole,
      roleView,
      canChangeLifecycle: lifecyclePermission.allowed,
      lifecycleReason,
      canEditPlan: isCommandRole || isLeadRole,
      canEditRequirements: isCommandRole || isLeadRole,
      canManageRoster: true,
      canPostComms: true,
      bannerText: isCommandRole
        ? 'Planning window open. Command has full edit controls.'
        : isLeadRole
        ? 'Planning window open. Lead view can update plan and requirements.'
        : 'Planning window open. Participant view is roster/comms-forward.',
    };
  }

  if (operation.status === 'ACTIVE') {
    return {
      isCommandRole,
      roleView,
      canChangeLifecycle: lifecyclePermission.allowed,
      lifecycleReason,
      canEditPlan: isCommandRole,
      canEditRequirements: isCommandRole,
      canManageRoster: isCommandRole || isLeadRole || participantCanManageRoster,
      canPostComms: true,
      bannerText: isCommandRole
        ? 'Active operation: command override allows plan/policy updates.'
        : isLeadRole
        ? 'Active operation: lead view can manage roster and execute assignments.'
        : 'Active operation: participant view is limited to execution participation.',
    };
  }

  if (operation.status === 'WRAPPING') {
    return {
      isCommandRole,
      roleView,
      canChangeLifecycle: lifecyclePermission.allowed,
      lifecycleReason,
      canEditPlan: isCommandRole,
      canEditRequirements: isCommandRole,
      canManageRoster: isCommandRole || isLeadRole,
      canPostComms: true,
      bannerText: isCommandRole
        ? 'Wrap phase: command can finalize artifacts and roster adjustments.'
        : isLeadRole
        ? 'Wrap phase: lead view can assist roster finalization, plan changes are command-locked.'
        : 'Wrap phase: participant view is read-mostly pending archive.',
    };
  }

  return {
    isCommandRole,
    roleView,
    canChangeLifecycle: false,
    lifecycleReason: 'Archived operation is read-only.',
    canEditPlan: false,
    canEditRequirements: false,
    canManageRoster: false,
    canPostComms: false,
    bannerText: 'Archived operation is read-only.',
  };
}

