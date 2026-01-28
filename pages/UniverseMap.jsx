import StarCitizenMap from '@/components/ops/StarCitizenMap';

export default function UniverseMapPage() {
  return (
    <div className="w-full h-full flex flex-col bg-zinc-950">
      <StarCitizenMap interactive={true} />
    </div>
  );
}