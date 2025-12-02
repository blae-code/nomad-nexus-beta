import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { nomineeId, reason } = await req.json();

        if (!nomineeId || !reason) {
            return Response.json({ error: 'Missing nomineeId or reason' }, { status: 400 });
        }

        // 1. Enforce 4-month cooldown for the nominator
        // Get the user's last nomination
        const myNominations = await base44.entities.Nomination.list({
            filter: { nominator_id: user.id },
            sort: { created_date: -1 },
            limit: 1
        });

        if (myNominations.length > 0) {
            const lastNominationDate = new Date(myNominations[0].created_date);
            const fourMonthsAgo = new Date();
            fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

            if (lastNominationDate > fourMonthsAgo) {
                const cooldownEnd = new Date(lastNominationDate);
                cooldownEnd.setMonth(cooldownEnd.getMonth() + 4);
                const daysLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60 * 24));
                
                return Response.json({ 
                    error: `Cooldown active. You can nominate again in ${daysLeft} days.` 
                }, { status: 403 });
            }
        }

        // 2. Create the nomination
        await base44.entities.Nomination.create({
            nominator_id: user.id,
            nominee_id: nomineeId,
            reason: reason
        });

        // 3. Check if this is the 2nd nomination for the nominee
        const nomineeNominations = await base44.entities.Nomination.list({
            filter: { nominee_id: nomineeId }
        });

        if (nomineeNominations.length === 2) {
            // Notify The Pioneer
            // Find users with 'Pioneer' rank
            const allUsers = await base44.entities.User.list();
            const pioneers = allUsers.filter(u => u.rank === 'Pioneer');
            
            // Get nominee details for the email
            const nominee = allUsers.find(u => u.id === nomineeId);
            const nomineeName = nominee ? (nominee.rsi_handle || nominee.full_name) : 'Unknown Scout';

            for (const pioneer of pioneers) {
                if (pioneer.email) {
                    await base44.integrations.Core.SendEmail({
                        to: pioneer.email,
                        subject: `[REDSCAR] Promotion Alert: ${nomineeName}`,
                        body: `
COMMAND UPLINK // PRIORITY MESSAGE

A Scout has received their second nomination for Voyager status.

NOMINEE: ${nomineeName} (ID: ${nomineeId})
NOMINATOR: ${user.rsi_handle || user.full_name}
REASON: ${reason}

Status pending final review.
                        `
                    });
                }
            }
        }

        return Response.json({ success: true });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});