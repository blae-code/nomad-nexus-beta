import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validates that only one Pioneer exists in the system.
 * Called before User update to prevent multiple Pioneers.
 * Returns { valid: boolean, error?: string, currentPioneer?: { id, email, callsign } }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const { userId, newRank } = await req.json();

    // Only validate if rank is being changed to Pioneer
    if (newRank !== 'Pioneer') {
      return Response.json({ valid: true });
    }

    // Fetch all users with Pioneer rank
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const currentPioneer = allUsers.find(u => u.rank === 'Pioneer' && u.id !== userId);

    if (currentPioneer) {
      return Response.json({
        valid: false,
        error: `Pioneer rank is already assigned to ${currentPioneer.callsign || currentPioneer.email}. Remove that rank first.`,
        currentPioneer: {
          id: currentPioneer.id,
          email: currentPioneer.email,
          callsign: currentPioneer.callsign
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