import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filters } = await req.json();

    // Fetch data based on filters
    const [events, users, assets] = await Promise.all([
      base44.entities.Event.list('-start_time', 100),
      base44.entities.User.list(),
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
    const memberData = await Promise.all(
      users.map(async (user) => {
        const operationsCount = filteredEvents.filter((e) => e.assigned_user_ids?.includes(user.id)).length;
        let profile = null;
        try {
          const profiles = await base44.entities.MemberProfile.filter({ user_id: user.id });
          profile = profiles[0];
        } catch {
          // No profile
        }
        return {
          id: user.id,
          full_name: user.full_name,
          rank: profile?.rank || 'VAGRANT',
          roles: profile?.roles || [],
          operations_count: operationsCount,
        };
      })
    );

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