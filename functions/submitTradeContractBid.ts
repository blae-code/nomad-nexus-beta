import { getAuthContext, readJson } from './_shared/memberAuth.ts';

type BidEntry = {
  bid_id: string;
  amount: number;
  currency: string;
  bidder_member_profile_id: string | null;
  bidder_user_id: string | null;
  note: string | null;
  submitted_at: string;
};

type UpdateAttempt = Record<string, unknown>;

function asStringArray(input: unknown) {
  return Array.isArray(input) ? input.map((v) => String(v)) : [];
}

function parseBidHistory(raw: unknown): BidEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => ({
      bid_id: String(entry?.bid_id || ''),
      amount: Number(entry?.amount || 0),
      currency: String(entry?.currency || 'aUEC'),
      bidder_member_profile_id: entry?.bidder_member_profile_id ? String(entry.bidder_member_profile_id) : null,
      bidder_user_id: entry?.bidder_user_id ? String(entry.bidder_user_id) : null,
      note: entry?.note ? String(entry.note) : null,
      submitted_at: String(entry?.submitted_at || ''),
    }))
    .filter((entry) => entry.bid_id && Number.isFinite(entry.amount) && entry.amount > 0);
}

function parseHighestBid(bids: BidEntry[]) {
  return bids.reduce((max, bid) => Math.max(max, Number(bid.amount || 0)), 0);
}

async function applyFirstSuccessfulUpdate(base44: any, postId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.MissionBoardPost.update(postId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Bid update failed');
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, amount, note = '', currency = 'aUEC' } = payload;
    if (!postId) {
      return Response.json({ error: 'postId required' }, { status: 400 });
    }

    const bidAmount = Number(amount);
    if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
      return Response.json({ error: 'Bid amount must be a positive number' }, { status: 400 });
    }

    const post = await base44.entities.MissionBoardPost.get(postId);
    if (!post) {
      return Response.json({ error: 'Contract post not found' }, { status: 404 });
    }

    const status = String(post.status || 'open').toLowerCase();
    if (status !== 'open') {
      return Response.json({ error: 'Bids are only allowed on open contracts' }, { status: 409 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorAdminId = adminUser?.id || null;
    const nowIso = new Date().toISOString();
    const bidEntry: BidEntry = {
      bid_id: `bid_${Date.now()}`,
      amount: bidAmount,
      currency: String(currency || 'aUEC'),
      bidder_member_profile_id: actorMemberId,
      bidder_user_id: actorAdminId,
      note: String(note || '').trim() || null,
      submitted_at: nowIso,
    };

    const bidHistory = parseBidHistory(post.bid_history);
    const nextBidHistory = [...bidHistory, bidEntry];
    const highestBid = parseHighestBid(nextBidHistory);
    const tags = asStringArray(post.tags);
    const bidTag = `bid:${actorMemberId || actorAdminId || 'actor'}:${Math.round(bidAmount)}`;
    const nextTags = Array.from(new Set([...tags, bidTag]));

    const updated = await applyFirstSuccessfulUpdate(base44, postId, [
      {
        bid_history: nextBidHistory,
        highest_bid_amount: highestBid,
        highest_bid_currency: bidEntry.currency,
        last_bid_at: nowIso,
      },
      {
        highest_bid_amount: highestBid,
        highest_bid_currency: bidEntry.currency,
        last_bid_at: nowIso,
        tags: nextTags,
      },
      {
        tags: nextTags,
      },
    ]);

    try {
      if (post.posted_by_member_profile_id && post.posted_by_member_profile_id !== actorMemberId) {
        await base44.entities.Notification.create({
          user_id: post.posted_by_member_profile_id,
          type: 'system',
          title: 'New Contract Bid',
          message: `${post.title || 'Contract'} received a bid of ${Math.round(bidAmount)} ${bidEntry.currency}`,
          related_entity_type: 'mission_board_post',
          related_entity_id: postId,
        });
      }
    } catch (error) {
      console.error('[submitTradeContractBid] Notification failed:', error.message);
    }

    if (post.event_id) {
      try {
        await base44.entities.EventLog.create({
          event_id: post.event_id,
          type: 'CONTRACT_BID',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `Bid submitted on contract: ${post.title || postId}`,
          details: {
            contract_post_id: postId,
            bid_amount: bidAmount,
            currency: bidEntry.currency,
            highest_bid_amount: highestBid,
          },
        });
      } catch (error) {
        console.error('[submitTradeContractBid] EventLog failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      post: updated,
      bid: bidEntry,
      highestBid,
    });
  } catch (error) {
    console.error('[submitTradeContractBid] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
