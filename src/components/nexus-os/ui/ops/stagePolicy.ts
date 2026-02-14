import type { Operation } from '../../schemas/opSchemas';

export interface OperationStagePolicy {
  isCommandRole: boolean;
  canChangeLifecycle: boolean;
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
export function deriveOperationStagePolicy(operation: Operation, actorId: string): OperationStagePolicy {
  const isCommandRole = hasOperationCommandAuthority(operation, actorId);

  if (operation.status === 'PLANNING') {
    return {
      isCommandRole,
      canChangeLifecycle: isCommandRole,
      canEditPlan: true,
      canEditRequirements: true,
      canManageRoster: true,
      canPostComms: true,
      bannerText: 'Planning window open. Plan and policy edits are enabled.',
    };
  }

  if (operation.status === 'ACTIVE') {
    return {
      isCommandRole,
      canChangeLifecycle: isCommandRole,
      canEditPlan: isCommandRole,
      canEditRequirements: isCommandRole,
      canManageRoster: true,
      canPostComms: true,
      bannerText: isCommandRole
        ? 'Active operation: command override allows plan/policy updates.'
        : 'Active operation: plan/policy edits are command-locked.',
    };
  }

  if (operation.status === 'WRAPPING') {
    return {
      isCommandRole,
      canChangeLifecycle: isCommandRole,
      canEditPlan: isCommandRole,
      canEditRequirements: isCommandRole,
      canManageRoster: isCommandRole,
      canPostComms: true,
      bannerText: isCommandRole
        ? 'Wrap phase: command can finalize artifacts and roster adjustments.'
        : 'Wrap phase: edits are command-locked pending archive.',
    };
  }

  return {
    isCommandRole,
    canChangeLifecycle: false,
    canEditPlan: false,
    canEditRequirements: false,
    canManageRoster: false,
    canPostComms: false,
    bannerText: 'Archived operation is read-only.',
  };
}

