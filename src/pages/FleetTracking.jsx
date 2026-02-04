import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, List, Activity, BarChart3 } from 'lucide-react';
import { LoadingState } from '@/components/common/UIStates';
import FleetMap from '@/components/fleet/FleetMap';
import FleetList from '@/components/fleet/FleetList';
import AssetDetails from '@/components/fleet/AssetDetails';
import FleetTelemetryPanel from '@/components/fleet/FleetTelemetryPanel';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';

export default function FleetTracking() {
  const activeOp = useActiveOp();
  const [assets, setAssets] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    loadFleetData();
    // Subscribe to real-time asset updates
    const unsubscribeAssets = base44.entities.FleetAsset.subscribe((event) => {
      if (event.type === 'update') {
        setAssets((prev) => prev.map((a) => (a.id === event.id ? event.data : a)));
      } else if (event.type === 'create') {
        setAssets((prev) => [...prev, event.data]);
      } else if (event.type === 'delete') {
        setAssets((prev) => prev.filter((a) => a.id !== event.id));
      }
    });

    return () => unsubscribeAssets();
  }, []);

  const loadFleetData = async () => {
    setLoading(true);
    try {
      const [assetList, eventList] = await Promise.all([
        base44.entities.FleetAsset.list('-updated_date', 100),
        base44.entities.Event.filter({ status: 'active' }),
      ]);
      setAssets(assetList);
      setEvents(eventList);
    } catch (error) {
      console.error('Failed to load fleet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeployedEvents = (assetId) => {
    return events.filter((e) => e.assigned_asset_ids?.includes(assetId));
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto h-screen">
        <LoadingState label="Loading fleet data..." />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto h-screen flex flex-col">
      <div className="border-b border-zinc-800 p-4 bg-zinc-900/50">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">Fleet Tracking</h1>
            <p className="text-zinc-400 text-sm">Real-time asset locations and status</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-blue-400">{assets.length}</div>
            <div className="text-xs text-zinc-400">Assets Tracked</div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="map" className="flex-1 flex flex-col border-t border-zinc-800">
        <div className="border-b border-zinc-800 px-4 bg-zinc-900/50">
          <TabsList>
            <TabsTrigger value="map">
              <MapPin className="w-4 h-4 mr-2" />
              Live Map
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="w-4 h-4 mr-2" />
              Fleet List
            </TabsTrigger>
            <TabsTrigger value="details">
              <Activity className="w-4 h-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="telemetry">
              <BarChart3 className="w-4 h-4 mr-2" />
              Telemetry
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="map" className="flex-1 m-0 p-0">
          <FleetMap assets={assets} events={events} selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} />
        </TabsContent>

        <TabsContent value="list" className="flex-1 m-0 p-0">
          <FleetList assets={assets} selectedAsset={selectedAsset} onSelectAsset={setSelectedAsset} getDeployedEvents={getDeployedEvents} />
        </TabsContent>

        <TabsContent value="details" className="flex-1 m-0 p-0">
          {selectedAsset ? (
            <AssetDetails asset={selectedAsset} deployedEvents={getDeployedEvents(selectedAsset.id)} />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500">Select an asset to view details</div>
          )}
        </TabsContent>

        <TabsContent value="telemetry" className="flex-1 m-0 p-0">
          <FleetTelemetryPanel assets={assets} activeEvent={activeOp?.activeEvent || events.find((e) => e.status === 'active')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
