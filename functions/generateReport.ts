import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filters } = payload;

    // Fetch data based on filters
    const [events, members, assets] = await Promise.all([
      base44.entities.Event.list('-start_time', 100),
      base44.entities.MemberProfile.list(),
      base44.entities.FleetAsset.list(),
    ]);

    // Filter events by date range
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);

    const filteredEvents = events.filter((e) => {
      const eventDate = new Date(e.start_time);
      return eventDate >= startDate && eventDate <= endDate;
    });

    // Compile member data with operation counts
    const memberData = members.map((member) => {
      const operationsCount = filteredEvents.filter((e) => {
        const assigned = e.assigned_member_profile_ids || e.assigned_user_ids || [];
        return assigned.includes(member.id);
      }).length;

      return {
        id: member.id,
        full_name: member.display_callsign || member.callsign || member.full_name || 'Unknown',
        rank: member.rank || 'VAGRANT',
        roles: member.roles || [],
        operations_count: operationsCount,
      };
    });

    // Asset deployment counts
    const assetData = assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      model: asset.model,
      status: asset.status,
      location: asset.location,
      deployments: filteredEvents.filter((e) => e.assigned_asset_ids?.includes(asset.id)).length,
    }));

    // Risk assessment summary
    let riskSummary = '';
    const riskLevels = filteredEvents.reduce(
      (acc, e) => {
        if (e.priority === 'CRITICAL') acc.critical += 1;
        else if (e.priority === 'HIGH') acc.high += 1;
        else if (e.priority === 'STANDARD') acc.standard += 1;
        else acc.low += 1;
        return acc;
      },
      { critical: 0, high: 0, standard: 0, low: 0 }
    );

    riskSummary = `Critical: ${riskLevels.critical}, High: ${riskLevels.high}, Standard: ${riskLevels.standard}, Low: ${riskLevels.low}`;

    const report = {
      summary: {
        total_operations: filteredEvents.length,
        total_members: memberData.length,
        total_assets: assetData.length,
        date_range: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      },
      events: filters.reportType !== 'members' ? filteredEvents.slice(0, 20) : [],
      members: filters.includeMembers ? memberData.filter((m) => m.operations_count > 0).slice(0, 15) : [],
      assets: filters.includeAssets ? assetData.filter((a) => a.deployments > 0).slice(0, 15) : [],
      risk_assessment: filters.includeRiskAssessment ? riskSummary : null,
    };

    return Response.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
