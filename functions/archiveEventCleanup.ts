import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // Calculate cutoff: 48 hours ago
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

        // Fetch all events (filtering in memory to be safe with date comparisons)
        // Using service role to ensure we can clean up all events
        const allEvents = await base44.asServiceRole.entities.Event.list({ limit: 1000 });
        
        const eventsToArchive = allEvents.filter(event => {
            // Use end_time if available, otherwise start_time
            const eventTime = event.end_time ? new Date(event.end_time) : new Date(event.start_time);
            return eventTime < cutoff;
        });

        console.log(`Found ${eventsToArchive.length} events to archive.`);

        let archivedCount = 0;
        const errors = [];

        for (const event of eventsToArchive) {
            try {
                // Prepare archived data
                const { id, created_date, updated_date, created_by, ...eventData } = event;
                
                // Create archived record
                await base44.asServiceRole.entities.ArchivedEvent.create({
                    ...eventData,
                    original_event_id: id,
                    archived_at: new Date().toISOString()
                });

                // Delete original record
                await base44.asServiceRole.entities.Event.delete(id);
                
                archivedCount++;
            } catch (err) {
                console.error(`Failed to archive event ${event.id}:`, err);
                errors.push({ id: event.id, error: err.message });
            }
        }

        return Response.json({ 
            status: 'success', 
            message: `Successfully archived ${archivedCount} events.`,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});