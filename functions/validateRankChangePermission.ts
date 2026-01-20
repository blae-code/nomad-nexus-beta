import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Validates permission to change a user's organizational rank.
 * Rules:
 * - User can only set rank on first registration/login (if rank is 'Vagrant')
 * - After initial setup, only system admins or Pioneer can change ranks
 * Returns { permitted: boolean, error?: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { targetUserId, newRank } = await req.json();

    // If user is changing their own rank
    if (targetUserId === user.id) {
      // Allow only if user is still at Vagrant rank (first login/registration)
      if (user.rank === 'Vagrant') {
        return Response.json({ permitted: true });
      }
      // User cannot change their own rank after initial setup
      return Response.json({
        permitted: false,
        error: 'You can only set your rank during initial registration. Contact an administrator to change your rank.'
      });
    }

    // If user is changing another user's rank, they must be admin or Pioneer
    const isAdmin = user.role === 'admin';
    const isPioneer = user.rank === 'Pioneer';
    const isSysAdmin = user.is_system_administrator === true;

    if (!isAdmin && !isPioneer && !isSysAdmin) {
      return Response.json({
        permitted: false,
        error: 'Only system administrators or the Pioneer can change other users\' ranks.'
      });
    }

    return Response.json({ permitted: true });
  } catch (error) {
    return Response.json(
      { error: error.message, permitted: false },
      { status: 500 }
    );
  }
});