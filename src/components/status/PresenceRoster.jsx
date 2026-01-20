import RosterPanel from '@/components/roster/RosterPanel';

export default function PresenceRoster({ eventId, netId }) {
  return <RosterPanel mode="presence" eventId={eventId} netId={netId} />;
}