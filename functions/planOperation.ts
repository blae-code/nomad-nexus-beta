import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { objective, eventId, requiredRoles = [] } = payload;
    if (!objective) {
      return Response.json({ error: 'Objective required' }, { status: 400 });
    }

    const [members, assets, reports] = await Promise.all([
      base44.asServiceRole.entities.MemberProfile.list('-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.FleetAsset.list('name', 200).catch(() => []),
      base44.asServiceRole.entities.EventReport.filter(eventId ? { event_id: eventId } : {}, '-created_date', 50).catch(() => []),
    ]);

    const context = {
      objective,
      requiredRoles,
      members: members.map((m: any) => ({
        id: m.id,
        callsign: m.display_callsign || m.callsign,
        rank: m.rank,
        roles: m.roles || [],
        certifications: m.certifications || [],
      })),
      assets: assets.map((a: any) => ({
        id: a.id,
        name: a.name,
        model: a.model,
        status: a.status,
        type: a.type,
      })),
      aar: reports.filter((r: any) => r.report_type === 'AAR' || r.report_type === 'AAR_ENTRY').map((r: any) => ({
        summary: r.summary,
        lessons: r.lessons_learned,
        tags: r.tags || [],
      }))
    };

    const prompt = `You are an operations planner. Build a plan for the following objective.

Objective: ${objective}
Required Roles: ${requiredRoles.join(', ') || 'None specified'}

Members (callsign, rank, roles, certifications):
${JSON.stringify(context.members)}

Available Assets:
${JSON.stringify(context.assets)}

Relevant AAR Notes:
${JSON.stringify(context.aar)}

Return JSON with:
- recommended_fleet (array of assets to deploy)
- recommended_roles (array of roles with suggested members)
- skill_gaps (array of missing roles/certifications)
- route_plan (string summary)
- risk_notes (array)
`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          recommended_fleet: { type: 'array', items: { type: 'string' } },
          recommended_roles: { type: 'array', items: { type: 'string' } },
          skill_gaps: { type: 'array', items: { type: 'string' } },
          route_plan: { type: 'string' },
          risk_notes: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      plan: response,
      generated_by: memberProfile?.id || null
    });
  } catch (error) {
    console.error('[planOperation] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
