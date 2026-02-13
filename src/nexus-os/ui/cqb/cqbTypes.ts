import type { CqbEvent, LocationEstimate } from '../../schemas/coreSchemas';
import type { ControlSignal } from '../../schemas/mapSchemas';
import type { Operation } from '../../schemas/opSchemas';

export type CqbElement = 'CE' | 'GCE' | 'ACE';
export type CqbElementFilter = CqbElement | 'ALL';

export interface CqbRosterMember {
  id: string;
  callsign: string;
  element: CqbElement;
  role: string;
}

export interface CqbPanelSharedProps {
  variantId: string;
  bridgeId?: string;
  opId?: string;
  elementFilter?: CqbElementFilter;
  roster: CqbRosterMember[];
  actorId: string;
  events: CqbEvent[];
  locationEstimates?: LocationEstimate[];
  controlSignals?: ControlSignal[];
  operations?: Operation[];
  focusOperationId?: string;
  onCreateMacroEvent?: (macroEventType: string, payload: Record<string, unknown>) => void;
  onOpenCqbConsole?: () => void;
  onOpenCommsNetwork?: () => void;
  onOpenCommsWorkspace?: (input: { opId?: string; netId?: string; view?: 'network' | 'voice' }) => void;
  onOpenMapFocus?: () => void;
  onOpenMobileCompanion?: () => void;
  onOpenOperationFocus?: () => void;
  onOpenForceDesign?: (opId?: string) => void;
  onOpenReports?: (opId?: string) => void;
}
