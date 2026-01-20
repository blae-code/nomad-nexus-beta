import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validates Voyager Number uniqueness.
 * Called before User update to prevent duplicate Voyager Numbers.
 * Returns { valid: boolean, error?: string }
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

    const { userId, newRank, voyagerNumber } = await req.json();

    // Only validate if rank is Voyager and number is provided
    if (newRank !== 'Voyager' || voyagerNumber === null || voyagerNumber === undefined) {
      if (newRank === 'Voyager' && (voyagerNumber === null || voyagerNumber === undefined)) {
        return Response.json({
          valid: false,
          error: 'Voyager Number (10-99) is required for Voyager rank'
        });
      }
      return Response.json({ valid: true });
    }

    // Validate number format: 01-99
    const num = parseInt(voyagerNumber, 10);
    if (isNaN(num) || num < 1 || num > 99) {
      return Response.json({
        valid: false,
        error: 'Voyager Number must be between 01-99'
      });
    }

    // Check for duplicates
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
    const duplicate = allUsers.find(
      u => u.voyager_number === num && u.id !== userId
    );

    if (duplicate) {
      return Response.json({
        valid: false,
        error: `Voyager Number ${num} is already assigned to ${duplicate.callsign || duplicate.email}`
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