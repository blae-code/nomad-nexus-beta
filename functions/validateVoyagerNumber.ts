import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

/**
 * Validates Voyager Number uniqueness.
 * Called before User update to prevent duplicate Voyager Numbers.
 * Returns { valid: boolean, error?: string }
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

    const { userId, newRank, voyagerNumber } = payload;

    // Only validate if rank is Voyager and number is provided
    const isVoyager = newRank === 'Voyager' || newRank === 'VOYAGER';
    if (!isVoyager || voyagerNumber === null || voyagerNumber === undefined) {
      if (isVoyager && (voyagerNumber === null || voyagerNumber === undefined)) {
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
    const allMembers = await base44.entities.MemberProfile.list('-created_date', 500);
    const duplicate = allMembers.find(
      m => m.voyager_number === num && m.id !== userId
    );

    if (duplicate) {
      return Response.json({
        valid: false,
        error: `Voyager Number ${num} is already assigned to ${duplicate.display_callsign || duplicate.callsign || duplicate.full_name || 'another member'}`
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
