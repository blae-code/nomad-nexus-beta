import RosterPanel from '@/components/roster/RosterPanel';

export default function UserPresencePanel({ netId, eventId }) {
  return <RosterPanel mode="comms" netId={netId} eventId={eventId} />;
}