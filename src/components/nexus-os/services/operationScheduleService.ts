import type { Operation, OperationSchedule } from '../schemas/opSchemas';

export interface OperationScheduleValidation {
  valid: boolean;
  reason: string;
}

function toIsoUtc(value: unknown): string {
  const parsed = Date.parse(String(value || ''));
  if (Number.isNaN(parsed)) return '';
  return new Date(parsed).toISOString();
}

function toIcsUtc(value: string): string {
  return value.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function sanitizeSummary(value: string): string {
  return String(value || 'Operation').replace(/[\r\n]+/g, ' ').trim() || 'Operation';
}

function sanitizeDescription(value: string): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function formatUtcStamp(nowMs = Date.now()): string {
  return toIcsUtc(new Date(nowMs).toISOString());
}

export function validateOperationSchedule(schedule: OperationSchedule | undefined): OperationScheduleValidation {
  if (!schedule) {
    return { valid: false, reason: 'Schedule missing.' };
  }
  const startIso = toIsoUtc(schedule.plannedStartAt);
  const endIso = toIsoUtc(schedule.plannedEndAt);
  if (!startIso) return { valid: false, reason: 'Invalid planned start timestamp.' };
  if (!endIso) return { valid: false, reason: 'Invalid planned end timestamp.' };
  if (Date.parse(endIso) <= Date.parse(startIso)) {
    return { valid: false, reason: 'Planned end must be after planned start.' };
  }
  return { valid: true, reason: 'Schedule valid.' };
}

export function buildOperationScheduleIcs(
  operation: Operation,
  options: {
    organizerEmail?: string;
    uidSuffix?: string;
    nowMs?: number;
  } = {}
): string {
  const validation = validateOperationSchedule(operation.schedule);
  if (!validation.valid || !operation.schedule) {
    throw new Error(validation.reason || 'Invalid operation schedule');
  }

  const startIso = toIsoUtc(operation.schedule.plannedStartAt);
  const endIso = toIsoUtc(operation.schedule.plannedEndAt);
  const uidSuffix = String(options.uidSuffix || 'nexus');
  const uid = `${operation.id}@${uidSuffix}`;
  const summary = sanitizeSummary(operation.name);
  const location = sanitizeSummary(operation.ao?.nodeId || 'system-stanton');
  const description = sanitizeDescription(
    `${operation.archetypeId || 'CUSTOM'} | posture:${operation.posture} | status:${operation.status}${
      operation.ao?.note ? ` | note:${operation.ao.note}` : ''
    }`
  );
  const dtStamp = formatUtcStamp(options.nowMs);
  const dtStart = toIcsUtc(startIso);
  const dtEnd = toIcsUtc(endIso);
  const organizer = String(options.organizerEmail || 'ops@nexus.local').trim();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nomad Nexus//Operation Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER:mailto:${organizer}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function buildOperationIcsFilename(operation: Operation): string {
  const base = sanitizeSummary(operation.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${base || operation.id}.ics`;
}

