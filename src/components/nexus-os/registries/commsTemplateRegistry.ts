/**
 * Comms Template Registry
 *
 * Canonical templates for channel topology. Extend by adding new template records;
 * do not rewrite downstream consumers.
 */

export type CommsTemplateId = 'FIRETEAM_PRIMARY' | 'SQUAD_NETS' | 'COMMAND_NET' | 'EMERGENCY_NET';

export interface CommsChannelDefinition {
  id: string;
  label: string;
  purpose: string;
}

export interface CommsMonitoringLink {
  sourceChannelId: string;
  targetChannelId: string;
  reason: string;
}

export interface CommsTemplateDefinition {
  id: CommsTemplateId;
  channels: CommsChannelDefinition[];
  defaultMembership: string[];
  monitoringLinks: CommsMonitoringLink[];
  authorityExpectations: string[];
}

export const CommsTemplateRegistry: Readonly<Record<CommsTemplateId, CommsTemplateDefinition>> = {
  FIRETEAM_PRIMARY: {
    id: 'FIRETEAM_PRIMARY',
    channels: [
      { id: 'fireteam-primary', label: 'Fireteam Primary', purpose: 'Primary tactical voice/text lane for one fireteam.' },
      { id: 'fireteam-support', label: 'Fireteam Support', purpose: 'Secondary callouts and sustainment requests.' },
    ],
    defaultMembership: ['fireteam_lead', 'fireteam_member', 'attached_medic'],
    monitoringLinks: [
      { sourceChannelId: 'fireteam-primary', targetChannelId: 'fireteam-support', reason: 'Mutual cross-monitor for survivability updates.' },
    ],
    authorityExpectations: [
      'Fireteam lead controls movement cadence.',
      'Members report contact/state changes with concise callouts.',
    ],
  },
  SQUAD_NETS: {
    id: 'SQUAD_NETS',
    channels: [
      { id: 'squad-alpha', label: 'Squad Alpha', purpose: 'Alpha squad tactical lane.' },
      { id: 'squad-bravo', label: 'Squad Bravo', purpose: 'Bravo squad tactical lane.' },
      { id: 'squad-coordination', label: 'Squad Coordination', purpose: 'Cross-squad deconfliction and sync.' },
    ],
    defaultMembership: ['squad_lead', 'fireteam_lead', 'squad_member'],
    monitoringLinks: [
      { sourceChannelId: 'squad-alpha', targetChannelId: 'squad-coordination', reason: 'Escalate blockers and objective changes.' },
      { sourceChannelId: 'squad-bravo', targetChannelId: 'squad-coordination', reason: 'Escalate blockers and objective changes.' },
    ],
    authorityExpectations: [
      'Squad leads arbitrate movement and phase transitions.',
      'Fireteams preserve lane discipline; coordination lane is escalation-only.',
    ],
  },
  COMMAND_NET: {
    id: 'COMMAND_NET',
    channels: [
      { id: 'command-primary', label: 'Command Primary', purpose: 'Operation-level intent and priority decisions.' },
      { id: 'command-intel', label: 'Command Intel', purpose: 'Threat and intel updates for command staff.' },
      { id: 'command-logistics', label: 'Command Logistics', purpose: 'Asset/route sustainment updates.' },
    ],
    defaultMembership: ['operation_commander', 'wing_lead', 'intel_officer', 'logistics_officer'],
    monitoringLinks: [
      { sourceChannelId: 'command-intel', targetChannelId: 'command-primary', reason: 'Threat updates inform intent changes.' },
      { sourceChannelId: 'command-logistics', targetChannelId: 'command-primary', reason: 'Sustainment affects command feasibility.' },
    ],
    authorityExpectations: [
      'Only command-authorized issuers can set operation intent.',
      'Intel/logistics officers provide scoped updates, not global assertions.',
    ],
  },
  EMERGENCY_NET: {
    id: 'EMERGENCY_NET',
    channels: [
      { id: 'emergency-priority', label: 'Emergency Priority', purpose: 'Distress, downed member, extraction-critical traffic.' },
      { id: 'emergency-medical', label: 'Emergency Medical', purpose: 'Triage and recovery coordination.' },
    ],
    defaultMembership: ['all_active_members', 'medic', 'command_watch'],
    monitoringLinks: [
      { sourceChannelId: 'emergency-medical', targetChannelId: 'emergency-priority', reason: 'Medical status updates impact extraction sequencing.' },
    ],
    authorityExpectations: [
      'Priority channel preempts non-critical chatter.',
      'Command watch validates and rebroadcasts only confirmed critical updates.',
    ],
  },
};

export function getCommsTemplate(templateId: CommsTemplateId): CommsTemplateDefinition {
  return CommsTemplateRegistry[templateId];
}

