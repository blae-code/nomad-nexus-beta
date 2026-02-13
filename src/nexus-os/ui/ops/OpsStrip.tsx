import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import { alignRSVPPolicyToPosture, computeRosterSummary, getOrCreateRSVPPolicy } from '../../services/rsvpService';
import {
  alignOperationEnhancementsToPosture,
  initializeOperationEnhancements,
} from '../../services/operationEnhancementService';
import {
  canManageOperation,
  cloneOperation,
  createOperation,
  createOperationTemplateFromOperation,
  getFocusOperationId,
  instantiateOperationFromTemplate,
  joinOperation,
  listOperationAuditEvents,
  listOperationsForUser,
  listOperationTemplates,
  setFocusOperation,
  setPosture,
  subscribeOperations,
  updateOperation,
  updateStatus,
} from '../../services/operationService';
import { listAssumptions } from '../../services/planningService';
import type { Operation } from '../../schemas/opSchemas';
import type { DataClassification } from '../../schemas/crossOrgSchemas';
import { SkeletonTile } from '../components';
import { NexusBadge, NexusButton } from '../primitives';

interface OpsStripProps {
  actorId: string;
  onOpenOperationFocus?: () => void;
}

function postureTone(posture: Operation['posture']): 'active' | 'warning' {
  return posture === 'FOCUSED' ? 'active' : 'warning';
}

function statusTone(status: Operation['status']): 'ok' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'ok';
  if (status === 'PLANNING') return 'warning';
  return 'neutral';
}

function formatUpdatedAge(updatedAt: string): string {
  const deltaMs = Date.now() - new Date(updatedAt).getTime();
  if (!Number.isFinite(deltaMs) || deltaMs < 0) return 'now';
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const OP_TEMPLATES: Array<{
  id: string;
  label: string;
  name: string;
  posture: Operation['posture'];
  status: Operation['status'];
  classification: DataClassification;
  aoNode: string;
  aoNote: string;
}> = [
  {
    id: 'rapid-rescue',
    label: 'Rapid Rescue',
    name: 'Rapid Rescue Net',
    posture: 'FOCUSED',
    status: 'ACTIVE',
    classification: 'INTERNAL',
    aoNode: 'system-stanton',
    aoNote: 'Medical triage + extraction lanes.',
  },
  {
    id: 'convoy-escort',
    label: 'Convoy Escort',
    name: 'Convoy Escort Patrol',
    posture: 'CASUAL',
    status: 'PLANNING',
    classification: 'ALLIED',
    aoNode: 'system-pyro',
    aoNote: 'Freighter escort through hostile transit.',
  },
  {
    id: 'strike-package',
    label: 'Strike Package',
    name: 'Strike Package Alpha',
    posture: 'FOCUSED',
    status: 'PLANNING',
    classification: 'INTERNAL',
    aoNode: 'system-stanton',
    aoNote: 'Targeted objective with command net discipline.',
  },
];

export default function OpsStrip({ actorId, onOpenOperationFocus }: OpsStripProps) {
  useRenderProfiler('OpsStrip');
  const [opsVersion, setOpsVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [nameInput, setNameInput] = useState('');
  const [postureInput, setPostureInput] = useState<Operation['posture']>('CASUAL');
  const [statusInput, setStatusInput] = useState<Operation['status']>('PLANNING');
  const [classificationInput, setClassificationInput] = useState<DataClassification>('INTERNAL');
  const [aoNodeInput, setAoNodeInput] = useState('system-stanton');
  const [aoNoteInput, setAoNoteInput] = useState('');

  const [queryInput, setQueryInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | Operation['status']>('ALL');
  const [postureFilter, setPostureFilter] = useState<'ALL' | Operation['posture']>('ALL');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [joinOpIdInput, setJoinOpIdInput] = useState('');

  const [manageOpId, setManageOpId] = useState('');
  const [manageNameInput, setManageNameInput] = useState('');
  const [manageAoNodeInput, setManageAoNodeInput] = useState('');
  const [manageAoNoteInput, setManageAoNoteInput] = useState('');
  const [manageClassificationInput, setManageClassificationInput] = useState<DataClassification>('INTERNAL');
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [templateDescriptionInput, setTemplateDescriptionInput] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const [stripError, setStripError] = useState('');
  const [showBuildConsole, setShowBuildConsole] = useState(false);
  const [showFilterJoin, setShowFilterJoin] = useState(false);
  const [showManageConsole, setShowManageConsole] = useState(false);
  const [showTemplateBay, setShowTemplateBay] = useState(false);
  const [showAuditFeed, setShowAuditFeed] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeOperations(() => setOpsVersion((prev) => prev + 1));
    return unsubscribe;
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const handle = requestAnimationFrame(() => setIsLoading(false));
    return () => cancelAnimationFrame(handle);
  }, [opsVersion, actorId]);

  const operations = useMemo(
    () => listOperationsForUser({ userId: actorId, includeArchived }),
    [actorId, includeArchived, opsVersion]
  );
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);
  const operationTemplates = useMemo(() => listOperationTemplates(), [opsVersion]);

  const visibleOperations = useMemo(() => {
    const query = queryInput.trim().toLowerCase();
    return operations.filter((op) => {
      if (statusFilter !== 'ALL' && op.status !== statusFilter) return false;
      if (postureFilter !== 'ALL' && op.posture !== postureFilter) return false;
      if (!query) return true;
      return (
        op.name.toLowerCase().includes(query) ||
        op.id.toLowerCase().includes(query) ||
        op.ao.nodeId.toLowerCase().includes(query)
      );
    });
  }, [operations, postureFilter, queryInput, statusFilter]);

  const manageOperation = useMemo(
    () => operations.find((entry) => entry.id === manageOpId) || null,
    [manageOpId, operations]
  );
  const selectedTemplate = useMemo(
    () => operationTemplates.find((entry) => entry.id === selectedTemplateId) || null,
    [operationTemplates, selectedTemplateId]
  );
  const managePermission = useMemo(() => {
    if (!manageOperation) return { allowed: false, reason: 'No operation selected.' };
    return canManageOperation(manageOperation.id, actorId);
  }, [actorId, manageOperation?.id, opsVersion]);
  const auditFeed = useMemo(
    () => listOperationAuditEvents(manageOperation?.id, 12),
    [manageOperation?.id, opsVersion]
  );

  useEffect(() => {
    if (!operations.length) {
      setManageOpId('');
      return;
    }
    if (manageOpId && operations.some((entry) => entry.id === manageOpId)) return;
    setManageOpId(focusOperationId || operations[0].id);
  }, [focusOperationId, manageOpId, operations]);

  useEffect(() => {
    if (!manageOperation) return;
    setManageNameInput(manageOperation.name);
    setManageAoNodeInput(manageOperation.ao?.nodeId || '');
    setManageAoNoteInput(manageOperation.ao?.note || '');
    setManageClassificationInput(manageOperation.classification || 'INTERNAL');
    setTemplateNameInput(`${manageOperation.name} Template`);
    if (!templateDescriptionInput) {
      setTemplateDescriptionInput(`Template derived from ${manageOperation.name}.`);
    }
  }, [
    manageOperation?.id,
    manageOperation?.name,
    manageOperation?.ao?.nodeId,
    manageOperation?.ao?.note,
    manageOperation?.classification,
    templateDescriptionInput,
  ]);

  useEffect(() => {
    if (!operationTemplates.length) {
      setSelectedTemplateId('');
      return;
    }
    if (selectedTemplateId && operationTemplates.some((entry) => entry.id === selectedTemplateId)) return;
    setSelectedTemplateId(operationTemplates[0].id);
  }, [operationTemplates, selectedTemplateId]);

  const createNewOperation = () => {
    try {
      setStripError('');
      const op = createOperation({
        createdBy: actorId,
        name: nameInput.trim() || `Operation ${operations.length + 1}`,
        posture: postureInput,
        status: statusInput,
        classification: classificationInput,
        ao: { nodeId: aoNodeInput.trim() || 'system-stanton', note: aoNoteInput.trim() || undefined },
      });
      getOrCreateRSVPPolicy(op.id, op.posture);
      initializeOperationEnhancements(op.id, op.posture, actorId);
      setFocusOperation(actorId, op.id);
      setNameInput('');
      setAoNoteInput('');
      setManageOpId(op.id);
    } catch (error: any) {
      setStripError(error?.message || 'Failed to create operation');
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = OP_TEMPLATES.find((entry) => entry.id === templateId);
    if (!template) return;
    setNameInput(template.name);
    setPostureInput(template.posture);
    setStatusInput(template.status);
    setClassificationInput(template.classification);
    setAoNodeInput(template.aoNode);
    setAoNoteInput(template.aoNote);
  };

  const setManagedStatus = (nextStatus: Operation['status']) => {
    if (!manageOperation) return;
    setStripError('');
    updateStatus(manageOperation.id, nextStatus, actorId);
  };

  const setManagedPosture = (nextPosture: Operation['posture']) => {
    if (!manageOperation) return;
    setStripError('');
    setPosture(manageOperation.id, nextPosture, actorId);
    alignRSVPPolicyToPosture(manageOperation.id, nextPosture);
    alignOperationEnhancementsToPosture(manageOperation.id, nextPosture, actorId);
  };

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2.5 space-y-2 nexus-panel-glow nexus-terminal-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">Ops Strip</h3>
          <NexusBadge tone="neutral">{visibleOperations.length}/{operations.length} ops</NexusBadge>
        </div>
        <div className="flex items-center gap-2">
          <NexusButton size="sm" intent="subtle" onClick={onOpenOperationFocus}>
            Open Ops Focus
          </NexusButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <NexusButton size="sm" intent={showBuildConsole ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showBuildConsole ? 'true' : 'false'} onClick={() => setShowBuildConsole((prev) => !prev)}>
          Build {showBuildConsole ? 'Hide' : 'Show'}
        </NexusButton>
        <NexusButton size="sm" intent={showFilterJoin ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showFilterJoin ? 'true' : 'false'} onClick={() => setShowFilterJoin((prev) => !prev)}>
          Filter {showFilterJoin ? 'Hide' : 'Show'}
        </NexusButton>
        <NexusButton size="sm" intent={showManageConsole ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showManageConsole ? 'true' : 'false'} onClick={() => setShowManageConsole((prev) => !prev)}>
          Manage {showManageConsole ? 'Hide' : 'Show'}
        </NexusButton>
        <NexusButton size="sm" intent={showTemplateBay ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showTemplateBay ? 'true' : 'false'} onClick={() => setShowTemplateBay((prev) => !prev)}>
          Templates {showTemplateBay ? 'Hide' : 'Show'}
        </NexusButton>
        <NexusButton size="sm" intent={showAuditFeed ? 'primary' : 'subtle'} className="nexus-command-capsule" data-open={showAuditFeed ? 'true' : 'false'} onClick={() => setShowAuditFeed((prev) => !prev)}>
          Audit {showAuditFeed ? 'Hide' : 'Show'}
        </NexusButton>
      </div>

      {showBuildConsole ? (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 space-y-2 nexus-terminal-panel">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Operation Build Console</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
          <input
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
            placeholder="Operation name"
          />
          <input
            value={aoNodeInput}
            onChange={(event) => setAoNodeInput(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="AO node id"
          />
          <select
            value={postureInput}
            onChange={(event) => setPostureInput(event.target.value as Operation['posture'])}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Operation posture"
          >
            <option value="CASUAL">CASUAL</option>
            <option value="FOCUSED">FOCUSED</option>
          </select>
          <select
            value={statusInput}
            onChange={(event) => setStatusInput(event.target.value as Operation['status'])}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Operation status"
          >
            <option value="PLANNING">PLANNING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="WRAPPING">WRAPPING</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={classificationInput}
            onChange={(event) => setClassificationInput(event.target.value as DataClassification)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            aria-label="Operation classification"
          >
            <option value="INTERNAL">INTERNAL</option>
            <option value="ALLIED">ALLIED</option>
            <option value="PUBLIC">PUBLIC</option>
          </select>
          <input
            value={aoNoteInput}
            onChange={(event) => setAoNoteInput(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-4"
            placeholder="AO note / intent"
          />
          <div className="xl:col-span-2 flex items-center gap-2 flex-wrap">
            <NexusButton size="sm" intent="primary" onClick={createNewOperation}>
              Create Op
            </NexusButton>
            {OP_TEMPLATES.map((template) => (
              <NexusButton key={template.id} size="sm" intent="subtle" onClick={() => applyTemplate(template.id)}>
                {template.label}
              </NexusButton>
            ))}
          </div>
        </div>
      </div>
      ) : null}

      {showFilterJoin ? (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 space-y-2 nexus-terminal-panel">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Filter + Join</div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            className="h-8 w-52 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Search name, id, AO"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'ALL' | Operation['status'])}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          >
            <option value="ALL">Status: ALL</option>
            <option value="PLANNING">PLANNING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="WRAPPING">WRAPPING</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select
            value={postureFilter}
            onChange={(event) => setPostureFilter(event.target.value as 'ALL' | Operation['posture'])}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          >
            <option value="ALL">Posture: ALL</option>
            <option value="CASUAL">CASUAL</option>
            <option value="FOCUSED">FOCUSED</option>
          </select>
          <label className="h-8 px-2 rounded border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Include archived
          </label>
          <input
            value={joinOpIdInput}
            onChange={(event) => setJoinOpIdInput(event.target.value)}
            className="h-8 w-52 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Join op by id"
          />
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() => {
              try {
                setStripError('');
                const trimmed = joinOpIdInput.trim();
                if (!trimmed) return;
                joinOperation(trimmed, actorId);
                setFocusOperation(actorId, trimmed);
                setJoinOpIdInput('');
              } catch (error: any) {
                setStripError(error?.message || 'Join failed');
              }
            }}
          >
            Join
          </NexusButton>
        </div>
      </div>
      ) : null}

      {showManageConsole ? (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 space-y-2 nexus-terminal-panel">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Management Console</div>
        {!manageOperation ? (
          <div className="text-xs text-zinc-500">Select or create an operation to manage metadata and lifecycle.</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
              <select
                value={manageOperation.id}
                onChange={(event) => setManageOpId(event.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
              >
                {operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.status})
                  </option>
                ))}
              </select>
              <input
                value={manageNameInput}
                onChange={(event) => setManageNameInput(event.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
                placeholder="Operation name"
              />
              <input
                value={manageAoNodeInput}
                onChange={(event) => setManageAoNodeInput(event.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                placeholder="AO node"
              />
              <select
                value={manageClassificationInput}
                onChange={(event) => setManageClassificationInput(event.target.value as DataClassification)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="ALLIED">ALLIED</option>
                <option value="PUBLIC">PUBLIC</option>
              </select>
              <input
                value={manageAoNoteInput}
                onChange={(event) => setManageAoNoteInput(event.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-4"
                placeholder="AO note"
              />
              <div className="xl:col-span-2 flex items-center gap-2 flex-wrap">
                <NexusButton
                  size="sm"
                  intent="primary"
                  disabled={!managePermission.allowed}
                  onClick={() => {
                    try {
                      setStripError('');
                      updateOperation(
                        manageOperation.id,
                        {
                          name: manageNameInput.trim() || manageOperation.name,
                          ao: { nodeId: manageAoNodeInput.trim() || manageOperation.ao.nodeId, note: manageAoNoteInput.trim() || undefined },
                          classification: manageClassificationInput,
                        },
                        actorId
                      );
                    } catch (error: any) {
                      setStripError(error?.message || 'Failed to update operation metadata');
                    }
                  }}
                >
                  Save Metadata
                </NexusButton>
                <NexusButton size="sm" intent="subtle" onClick={() => setFocusOperation(actorId, manageOperation.id)}>
                  Set Focus
                </NexusButton>
              </div>
            </div>

            {!managePermission.allowed ? (
              <div className="rounded border border-amber-900/50 bg-amber-950/25 px-2 py-1 text-[11px] text-amber-200">
                {managePermission.reason}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-zinc-500 uppercase tracking-wide">Status</span>
              {(['PLANNING', 'ACTIVE', 'WRAPPING', 'ARCHIVED'] as Operation['status'][]).map((status) => (
                <NexusButton
                  key={status}
                  size="sm"
                  intent={manageOperation.status === status ? 'primary' : 'subtle'}
                  disabled={!managePermission.allowed}
                  onClick={() => {
                    try {
                      setManagedStatus(status);
                    } catch (error: any) {
                      setStripError(error?.message || 'Failed to change status');
                    }
                  }}
                >
                  {status}
                </NexusButton>
              ))}
              <span className="ml-2 text-[11px] text-zinc-500 uppercase tracking-wide">Posture</span>
              {(['CASUAL', 'FOCUSED'] as Operation['posture'][]).map((posture) => (
                <NexusButton
                  key={posture}
                  size="sm"
                  intent={manageOperation.posture === posture ? 'primary' : 'subtle'}
                  disabled={!managePermission.allowed}
                  onClick={() => {
                    try {
                      setManagedPosture(posture);
                    } catch (error: any) {
                      setStripError(error?.message || 'Failed to change posture');
                    }
                  }}
                >
                  {posture}
                </NexusButton>
              ))}
              <NexusButton
                size="sm"
                intent="subtle"
                disabled={!managePermission.allowed}
                onClick={() => {
                  try {
                    setStripError('');
                    const cloned = cloneOperation(manageOperation.id, {
                      createdBy: actorId,
                      name: `${manageOperation.name} Copy`,
                    });
                    getOrCreateRSVPPolicy(cloned.id, cloned.posture);
                    initializeOperationEnhancements(cloned.id, cloned.posture, actorId);
                    setFocusOperation(actorId, cloned.id);
                    setManageOpId(cloned.id);
                  } catch (error: any) {
                    setStripError(error?.message || 'Failed to clone operation');
                  }
                }}
              >
                Clone Op
              </NexusButton>
            </div>
          </>
        )}
      </div>
      ) : null}

      {showTemplateBay ? (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 space-y-2 nexus-terminal-panel">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Template Bay</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-2">
          <input
            value={templateNameInput}
            onChange={(event) => setTemplateNameInput(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
            placeholder="Template name"
          />
          <input
            value={templateDescriptionInput}
            onChange={(event) => setTemplateDescriptionInput(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-3"
            placeholder="Template description"
          />
          <NexusButton
            size="sm"
            intent="primary"
            disabled={!manageOperation || !managePermission.allowed}
            onClick={() => {
              try {
                if (!manageOperation) return;
                setStripError('');
                const template = createOperationTemplateFromOperation(manageOperation.id, actorId, {
                  name: templateNameInput.trim() || `${manageOperation.name} Template`,
                  description: templateDescriptionInput.trim() || undefined,
                });
                setSelectedTemplateId(template.id);
              } catch (error: any) {
                setStripError(error?.message || 'Failed to save template');
              }
            }}
          >
            Save Template
          </NexusButton>

          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-4"
          >
            {operationTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <NexusButton
            size="sm"
            intent="subtle"
            disabled={!selectedTemplate}
            onClick={() => {
              try {
                if (!selectedTemplate) return;
                setStripError('');
                const op = instantiateOperationFromTemplate(selectedTemplate.id, { createdBy: actorId });
                getOrCreateRSVPPolicy(op.id, op.posture);
                initializeOperationEnhancements(op.id, op.posture, actorId);
                setFocusOperation(actorId, op.id);
                setManageOpId(op.id);
              } catch (error: any) {
                setStripError(error?.message || 'Failed to instantiate template');
              }
            }}
          >
            Instantiate
          </NexusButton>
          {selectedTemplate ? (
            <div className="xl:col-span-1 text-[11px] text-zinc-500 truncate">
              {selectedTemplate.blueprint.posture}/{selectedTemplate.blueprint.status}
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {showAuditFeed ? (
      <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 space-y-2 nexus-terminal-panel">
        <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Audit Feed</div>
        <div className="max-h-36 overflow-auto pr-1 space-y-1 nexus-terminal-feed">
          {auditFeed.map((entry) => (
            <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/65 px-2 py-1 text-[10px] text-zinc-400">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-200">{entry.action}</span>
                <span>{formatUpdatedAge(entry.createdAt)} ago</span>
              </div>
              <div className="truncate">{entry.summary}</div>
              <div className="text-zinc-500 truncate">{entry.actorId}</div>
            </div>
          ))}
          {auditFeed.length === 0 ? <div className="text-xs text-zinc-500">No audit entries yet.</div> : null}
        </div>
      </div>
      ) : null}

      {stripError ? (
        <div className="text-xs text-red-300 rounded border border-red-900/70 bg-red-950/35 px-2 py-1">
          {stripError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {isLoading ? (
          <>
            <SkeletonTile />
            <SkeletonTile />
          </>
        ) : null}
        {!isLoading && visibleOperations.length === 0 ? (
          <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/45 px-2 py-2">
            No operations match the current filters.
          </div>
        ) : null}

        {!isLoading
          ? visibleOperations.map((op) => {
              const roster = computeRosterSummary(op.id);
              const escalations = listAssumptions(op.id).filter((assumption) => assumption.status === 'CHALLENGED').length;
              const isFocus = focusOperationId === op.id;
              const isManaged = manageOpId === op.id;

              return (
                <div
                  key={op.id}
                  className={`rounded border px-2 py-2 space-y-2 ${
                    isFocus ? 'border-sky-500/60 bg-zinc-900/85' : isManaged ? 'border-zinc-600 bg-zinc-900/65' : 'border-zinc-800 bg-zinc-900/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusOperation(actorId, op.id);
                        setManageOpId(op.id);
                      }}
                      className="text-left min-w-0"
                    >
                      <div className="text-sm text-zinc-200 truncate">{op.name}</div>
                      <div className="text-[11px] text-zinc-500 truncate">{op.id}</div>
                    </button>
                    <div className="flex items-center gap-1">
                      <NexusBadge tone={postureTone(op.posture)}>{op.posture}</NexusBadge>
                      <NexusBadge tone={statusTone(op.status)}>{op.status}</NexusBadge>
                      {!canManageOperation(op.id, actorId).allowed ? <NexusBadge tone="locked">READONLY</NexusBadge> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-400">
                    <span>AO: {op.ao.nodeId}</span>
                    <span>Open seats: {roster.openSeats.reduce((sum, seat) => sum + seat.openQty, 0)}</span>
                    <span>Hard: {roster.hardViolations}</span>
                    <span>Escalations: {escalations}</span>
                    <span>Updated: {formatUpdatedAge(op.updatedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <NexusBadge tone="neutral">{op.classification || 'INTERNAL'}</NexusBadge>
                    {isFocus ? <NexusBadge tone="active">FOCUS</NexusBadge> : null}
                  </div>
                </div>
              );
            })
          : null}
      </div>
    </section>
  );
}
