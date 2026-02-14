import type { CqbRosterMember } from './cqbTypes';

/**
 * Dev-only CQB roster mock.
 * Includes required Redscar elements: CE, GCE, ACE.
 */
export const DEV_CQB_ROSTER: CqbRosterMember[] = [
  { id: 'ce-warden', callsign: 'Warden', element: 'CE', role: 'Lead' },
  { id: 'ce-anchor', callsign: 'Anchor', element: 'CE', role: 'Signals' },
  { id: 'gce-viper', callsign: 'Viper', element: 'GCE', role: 'Fireteam Lead' },
  { id: 'gce-mender', callsign: 'Mender', element: 'GCE', role: 'Medic' },
  { id: 'gce-bolt', callsign: 'Bolt', element: 'GCE', role: 'Breacher' },
  { id: 'ace-hawk', callsign: 'Hawk', element: 'ACE', role: 'Pilot' },
  { id: 'ace-raven', callsign: 'Raven', element: 'ACE', role: 'Gunship' },
];

