import { getAuthContext, readJson } from './_shared/memberAuth.ts';
import { RoomServiceClient, AccessToken } from 'npm:livekit-server-sdk@^2.0.0';

Deno.serve(async (req) => {
    try {
        const payload = await readJson(req);
        const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
            allowAdmin: true,
            allowMember: true
        });

        if (!actorType || !memberProfile) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { type, location, description } = payload;

        if (!type || !location) {
            return Response.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const apiKey = Deno.env.get("LIVEKIT_API_KEY");
        const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
        const livekitUrl = Deno.env.get("LIVEKIT_URL");

        // 1. Create Temporary LiveKit Room
        const roomName = `rescue-${Date.now()}-${memberProfile.id.substring(0, 5)}`;
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
                identity: memberProfile.id,
                name: memberProfile.callsign || memberProfile.display_callsign || memberProfile.full_name || 'Unknown',
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
            requester_id: memberProfile.id,
            type: type,
            location: location,
            description: description,
            status: 'ACTIVE',
            livekit_room_name: roomName
        });

        // 2a. Log distress event (if event_id is in context or available)
        // For now, we'll create a generic distress log
        await base44.entities.EventLog.create({
            event_id: 'global-distress', // Could be passed in payload
            type: 'RESCUE',
            severity: 'HIGH',
            actor_member_profile_id: memberProfile.id,
            summary: `DISTRESS BEACON: ${type} at ${location}`,
            details: {
                distress_type: type,
                location: location,
                description: description,
                requester: memberProfile.callsign || memberProfile.display_callsign || memberProfile.full_name || 'Unknown',
                rescue_ticket: rescueRecord.id,
                comms_room: roomName
            }
        });

        // 3. Update PlayerStatus to DISTRESS (triggers UI alerts)
        // Check if status exists
        const existingStatus = await base44.entities.PlayerStatus.filter({ member_profile_id: memberProfile.id });
        if (existingStatus.length > 0) {
            await base44.entities.PlayerStatus.update(existingStatus[0].id, {
                status: 'DISTRESS',
                notes: `[${type}] ${description || location}`,
                last_updated: new Date().toISOString()
            });
        } else {
            await base44.entities.PlayerStatus.create({
                member_profile_id: memberProfile.id,
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
        const allMembers = await base44.entities.MemberProfile.list();
        const rescueUnits = allMembers.filter(member => {
            const roles = Array.isArray(member.roles) ? member.roles : [];
            return roles.includes('Redscar Rescue') || roles.includes('Rangers') || roles.includes('Shamans');
        }
        );

        const emailPromises = rescueUnits.map(unit => {
            if (unit.email) {
                return base44.integrations.Core.SendEmail({
                    to: unit.email,
                    subject: `[REDSCAR] ACTIVE DISTRESS BEACON: ${type}`,
                    body: `
PRIORITY ALERT // RESCUE REQUESTED

OPERATOR: ${memberProfile.callsign || memberProfile.display_callsign || memberProfile.full_name || 'Unknown'}
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
