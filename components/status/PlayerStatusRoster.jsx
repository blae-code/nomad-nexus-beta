import RosterPanel from '@/components/roster/RosterPanel';

export default function PlayerStatusRoster({ eventId }) {
  return <RosterPanel mode="status" eventId={eventId} showLocation={false} />;
}