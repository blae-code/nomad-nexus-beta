import { createServiceClient } from './_shared/memberAuth.ts';

/**
 * Auto-detect distress situations from status updates
 * Triggered by PlayerStatus entity updates
 */
Deno.serve(async (req) => {
    try {
        const base44 = createServiceClient();
        const { event, data, old_data, payload_too_large } = await req.json();

        const statusData = payload_too_large 
            ? await base44.asServiceRole.entities.PlayerStatus.get(event.entity_id)
            : data;

        if (!statusData) {
            return Response.json({ success: true, skipped: 'no_data' });
        }

        // Detect DISTRESS or DOWN status
        const isDistress = statusData.status === 'DISTRESS' || statusData.status === 'DOWN';
        const wasDistress = old_data?.status === 'DISTRESS' || old_data?.status === 'DOWN';

        // Only act on new distress situations
        if (!isDistress || wasDistress) {
            return Response.json({ success: true, skipped: 'not_new_distress' });
        }

        // Get user details
        const memberProfileId = statusData.member_profile_id || statusData.user_id;
        let profile = null;
        if (memberProfileId) {
            try {
                profile = await base44.entities.MemberProfile.get(memberProfileId);
            } catch {
                const profiles = await base44.entities.MemberProfile.filter({ id: memberProfileId });
                profile = profiles?.[0] ?? null;
            }
        }
        const callsign = profile?.display_callsign || profile?.callsign || 'Unknown';

        // Create incident record
        const incident = await base44.asServiceRole.entities.Incident.create({
            event_id: statusData.event_id,
            type: 'DISTRESS',
            severity: 'HIGH',
            title: `${callsign} - Distress Signal`,
            description: statusData.notes || `${callsign} status: ${statusData.status}`,
            location: statusData.current_location,
            coordinates: statusData.coordinates,
            status: 'OPEN',
            reported_by: memberProfileId
        });

        // Find nearby rescue-capable assets
        const allAssets = await base44.asServiceRole.entities.FleetAsset.filter({ 
            status: 'OPERATIONAL' 
        });
        
        // Simple proximity check (if coordinates available)
        let nearbyAssets = [];
        if (statusData.coordinates?.lat && statusData.coordinates?.lng) {
            nearbyAssets = allAssets.filter(asset => {
                if (!asset.coordinates?.lat || !asset.coordinates?.lng) return false;
                const distance = Math.sqrt(
                    Math.pow(asset.coordinates.lat - statusData.coordinates.lat, 2) +
                    Math.pow(asset.coordinates.lng - statusData.coordinates.lng, 2)
                );
                return distance < 10; // Within ~10 unit radius
            }).slice(0, 3);
        }

        // Log AI recommendation
        await base44.asServiceRole.entities.AIAgentLog.create({
            agent_slug: 'logistics_ai',
            event_id: statusData.event_id,
            type: 'ALERT',
            severity: 'HIGH',
            summary: `Distress detected: ${callsign} at ${statusData.current_location || 'unknown location'}`,
            details: JSON.stringify({
                user_id: memberProfileId,
                status: statusData.status,
                location: statusData.current_location,
                coordinates: statusData.coordinates,
                incident_id: incident.id,
                nearby_assets: nearbyAssets.map(a => ({ id: a.id, name: a.name, model: a.model })),
                recommendation: nearbyAssets.length > 0 
                    ? `Dispatch ${nearbyAssets[0].name} for rescue` 
                    : 'No rescue assets in range - request backup'
            })
        });

        // Notify rescue-capable users (those with MEDIC or RESCUE role)
        const allProfiles = await base44.asServiceRole.entities.MemberProfile.list();
        const rescuers = allProfiles.filter(p => 
            p.roles?.includes('Rangers') || p.roles?.includes('Shamans')
        );

        for (const rescuer of rescuers.slice(0, 5)) { // Notify top 5
            await base44.entities.Notification.create({
                user_id: rescuer.id,
                type: 'DISTRESS_ALERT',
                title: `🆘 Distress Signal: ${callsign}`,
                message: `${statusData.current_location || 'Unknown location'} - ${statusData.notes || 'Assistance needed'}`,
                link: `/ops/incidents/${incident.id}`,
                priority: 'high'
            });
        }

        return Response.json({ 
            success: true, 
            incident_created: incident.id,
            notified_count: rescuers.length,
            nearby_assets: nearbyAssets.length
        });

    } catch (error) {
        console.error('Auto-distress response failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
