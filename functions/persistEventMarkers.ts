import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event_id, marker_data } = await req.json();

    if (!event_id || !marker_data) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate marker has required fields
    if (!marker_data.type || !marker_data.label || !marker_data.coordinates) {
      return Response.json({ error: 'Marker missing required fields' }, { status: 400 });
    }

    // Create persistent marker
    const marker = await base44.entities.MapMarker.create({
      event_id,
      type: marker_data.type,
      label: marker_data.label,
      coordinates: marker_data.coordinates,
      color: marker_data.color || '#ea580c',
      description: marker_data.description,
      is_persistent: true,
      created_at: new Date().toISOString()
    });

    // Log to event
    await base44.entities.EventLog.create({
      event_id,
      type: 'SYSTEM',
      severity: 'LOW',
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
      message: `Marker "${marker_data.label}" created and persisted`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});