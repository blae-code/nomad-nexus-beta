import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { RoomServiceClient, AccessToken } from 'npm:livekit-server-sdk@2.0.3';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, location, description } = await req.json();

        if (!type || !location) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        const livekitUrl = Deno.env.get("LIVEKIT_SERVER_URL");

        // 1. Create Temporary LiveKit Room
        const roomName = `rescue-${Date.now()}-${user.id.substring(0, 5)}`;
        let token = null;

        if (apiKey && apiSecret && livekitUrl) {
            const svc = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
            await svc.createRoom({
                name: roomName,
                emptyTimeout: 10 * 60, // 10 minutes timeout if empty
                maxParticipants: 10,
            });

            // Generate token for the requester immediately
            const at = new AccessToken(apiKey, apiSecret, {
                identity: user.id,
                name: user.rsi_handle || user.full_name,
            });
            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true,
            });
            token = await at.toJwt();
        }

        // 2. Create RescueRequest Record
        const rescueRecord = await base44.entities.RescueRequest.create({
            requester_id: user.id,
            type: type,
            location: location,
            description: description,
            status: 'ACTIVE',
            livekit_room_name: roomName
        });

        // 3. Update PlayerStatus to DISTRESS (triggers UI alerts)
        // Check if status exists
        const existingStatus = await base44.entities.PlayerStatus.list({ filter: { user_id: user.id } });
        if (existingStatus.length > 0) {
            await base44.entities.PlayerStatus.update(existingStatus[0].id, {
                status: 'DISTRESS',
                notes: `[${type}] ${description || location}`,
                last_updated: new Date().toISOString()
            });
        } else {
            await base44.entities.PlayerStatus.create({
                user_id: user.id,
                status: 'DISTRESS',
                notes: `[${type}] ${description || location}`,
                last_updated: new Date().toISOString()
            });
        }

        // 4. Trigger Notification to 'Redscar Rescue' Role
        // Find users with the tag
        // Note: Filter by role_tags isn't always direct if it's an array in JSON, 
        // but we can list and filter in memory for safety or use exact match if SDK supports array contains.
        // We'll list all users and filter.
        const allUsers = await base44.entities.User.list();
        const rescueUnits = allUsers.filter(u => 
            u.role_tags && u.role_tags.includes('Redscar Rescue')
        );

        const emailPromises = rescueUnits.map(unit => {
            if (unit.email) {
                return base44.integrations.Core.SendEmail({
                    to: unit.email,
                    subject: `[REDSCAR] ACTIVE DISTRESS BEACON: ${type}`,
                    body: `
PRIORITY ALERT // RESCUE REQUESTED

OPERATOR: ${user.rsi_handle || user.full_name}
LOCATION: ${location}
TYPE: ${type}
DETAILS: ${description || 'N/A'}
COMMS: ${roomName}

Respond immediately via Ops Dashboard.
                    `
                });
            }
        });

        await Promise.all(emailPromises);

        return Response.json({ 
            success: true, 
            ticketId: rescueRecord.id,
            livekitToken: token,
            roomName: roomName
        });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});