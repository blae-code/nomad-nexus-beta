import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

/**
 * Validates that only one Pioneer exists in the system.
 * Called before User update to prevent multiple Pioneers.
 * Returns { valid: boolean, error?: string, currentPioneer?: { id, email, callsign } }
 */
Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { userId, newRank } = payload;

    // Only validate if rank is being changed to Pioneer
    if (newRank !== 'Pioneer' && newRank !== 'PIONEER') {
      return Response.json({ valid: true });
    }

    // Fetch all users with Pioneer rank
    const allMembers = await base44.entities.MemberProfile.list('-created_date', 500);
    const currentPioneer = allMembers.find(m => (m.rank || '').toUpperCase() === 'PIONEER' && m.id !== userId);

    if (currentPioneer) {
      return Response.json({
        valid: false,
        error: `Pioneer rank is already assigned to ${currentPioneer.display_callsign || currentPioneer.callsign || currentPioneer.full_name}. Remove that rank first.`,
        currentPioneer: {
          id: currentPioneer.id,
          email: currentPioneer.email,
          callsign: currentPioneer.display_callsign || currentPioneer.callsign
        }
      });
    }

    return Response.json({ valid: true });
  } catch (error) {
    return Response.json(
      { error: error.message, valid: false },
      { status: 500 }
    );
  }
});
