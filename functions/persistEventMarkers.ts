import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_id, marker_data } = await req.json();

    if (!event_id || !marker_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!marker_data.type || !marker_data.label || !marker_data.coordinates) {
      return Response.json({ error: 'Marker missing required fields' }, { status: 400 });
    }

    // Create persistent marker
    const marker = await base44.asServiceRole.entities.MapMarker.create({
      event_id,
      type: marker_data.type,
      label: marker_data.label,
      coordinates: marker_data.coordinates,
      color: marker_data.color || '#ea580c',
      description: marker_data.description
    });

    // Log marker creation to event
    await base44.asServiceRole.entities.EventLog.create({
      event_id,
      timestamp: new Date().toISOString(),
      type: 'SYSTEM',
      severity: 'LOW',
      actor_user_id: user.id,
      summary: `Map marker created: ${marker_data.label}`,
      details: {
        marker_id: marker.id,
        marker_type: marker_data.type,
        coordinates: marker_data.coordinates
      }
    });

    return Response.json({
      success: true,
      marker_id: marker.id,
      message: `Marker "${marker_data.label}" persisted`
    });
  } catch (error) {
    console.error('Error persisting marker:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});