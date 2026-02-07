import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const LOGISTICS_ROLES = new Set(['LOGISTICS', 'QUARTERMASTER', 'SUPPLY', 'ADMIN']);

type UpdateAttempt = Record<string, unknown>;

function toToken(value: unknown) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function getActorRoleTokens(memberProfile: any) {
  const roles = new Set<string>();
  const rank = toToken(memberProfile?.rank);
  if (rank) roles.add(rank);
  const roleList = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles
    : memberProfile?.roles
    ? [memberProfile.roles]
    : [];
  for (const role of roleList) {
    const token = toToken(role);
    if (token) roles.add(token);
  }
  return roles;
}

async function applyFirstSuccessfulUpdate(base44: any, itemId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.InventoryItem.update(itemId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Inventory update failed');
}

function appendTransferNote(existing: unknown, entry: string) {
  const previous = String(existing || '').trim();
  if (!previous) return entry;
  return `${previous}\n${entry}`;
}

async function findDestinationItem(base44: any, sourceItem: any, destinationLocation: string) {
  try {
    const filtered = await base44.entities.InventoryItem.filter({
      name: sourceItem.name,
      category: sourceItem.category,
      location: destinationLocation,
    });
    if (Array.isArray(filtered) && filtered.length > 0) {
      return filtered.find((item) => item.id !== sourceItem.id) || filtered[0];
    }
  } catch {
    // ignore and fall back to list search
  }

  try {
    const list = await base44.entities.InventoryItem.list('-created_date', 500);
    if (!Array.isArray(list)) return null;
    return (
      list.find(
        (item) =>
          item.id !== sourceItem.id &&
          item.name === sourceItem.name &&
          item.category === sourceItem.category &&
          item.location === destinationLocation
      ) || null
    );
  } catch {
    return null;
  }
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

    const { sourceItemId, quantity, destinationLocation, reason = '' } = payload;
    if (!sourceItemId || !destinationLocation) {
      return Response.json({ error: 'sourceItemId and destinationLocation required' }, { status: 400 });
    }

    const transferQuantity = Number(quantity);
    if (!Number.isFinite(transferQuantity) || transferQuantity <= 0) {
      return Response.json({ error: 'Transfer quantity must be a positive number' }, { status: 400 });
    }

    const sourceItem = await base44.entities.InventoryItem.get(sourceItemId);
    if (!sourceItem) {
      return Response.json({ error: 'Source inventory item not found' }, { status: 404 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorAdminId = adminUser?.id || null;
    const actorRoles = getActorRoleTokens(memberProfile);
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const hasCommandRank = Array.from(actorRoles).some((token) => COMMAND_RANKS.has(token));
    const hasLogisticsRole = Array.from(actorRoles).some((token) => LOGISTICS_ROLES.has(token));
    const isItemManager =
      actorMemberId &&
      (sourceItem.managed_by_member_profile_id === actorMemberId ||
        sourceItem.owner_member_profile_id === actorMemberId);
    if (!isAdmin && !hasCommandRank && !hasLogisticsRole && !isItemManager) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const normalizedDestination = String(destinationLocation).trim();
    if (!normalizedDestination) {
      return Response.json({ error: 'Destination location required' }, { status: 400 });
    }
    if (normalizedDestination === String(sourceItem.location || '').trim()) {
      return Response.json({ error: 'Destination must differ from source location' }, { status: 409 });
    }

    const sourceQuantity = Number(sourceItem.quantity || 0);
    if (transferQuantity > sourceQuantity) {
      return Response.json({ error: 'Insufficient source quantity' }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    const noteEntry = `[transfer ${nowIso}] -${transferQuantity} -> ${normalizedDestination}${reason ? ` (${reason})` : ''}`;
    const nextSourceQuantity = Math.max(0, sourceQuantity - transferQuantity);
    const nextSourceStatus = nextSourceQuantity === 0 ? 'reserved' : sourceItem.status || 'available';

    const updatedSource = await applyFirstSuccessfulUpdate(base44, sourceItemId, [
      {
        quantity: nextSourceQuantity,
        status: nextSourceStatus,
        notes: appendTransferNote(sourceItem.notes, noteEntry),
        last_transfer_at: nowIso,
        last_transfer_by_member_profile_id: actorMemberId,
      },
      {
        quantity: nextSourceQuantity,
        status: nextSourceStatus,
        notes: appendTransferNote(sourceItem.notes, noteEntry),
      },
      {
        quantity: nextSourceQuantity,
        status: nextSourceStatus,
      },
      {
        quantity: nextSourceQuantity,
      },
    ]);

    const existingDestination = await findDestinationItem(base44, sourceItem, normalizedDestination);

    let destinationItem = null;
    if (existingDestination?.id) {
      const destinationQuantity = Number(existingDestination.quantity || 0);
      const destinationNote = `[transfer ${nowIso}] +${transferQuantity} from ${sourceItem.location || 'unknown'}${reason ? ` (${reason})` : ''}`;
      destinationItem = await applyFirstSuccessfulUpdate(base44, existingDestination.id, [
        {
          quantity: destinationQuantity + transferQuantity,
          status: 'available',
          notes: appendTransferNote(existingDestination.notes, destinationNote),
          last_transfer_at: nowIso,
          last_transfer_by_member_profile_id: actorMemberId,
        },
        {
          quantity: destinationQuantity + transferQuantity,
          status: 'available',
          notes: appendTransferNote(existingDestination.notes, destinationNote),
        },
        {
          quantity: destinationQuantity + transferQuantity,
          status: 'available',
        },
        {
          quantity: destinationQuantity + transferQuantity,
        },
      ]);
    } else {
      const destinationNote = `[transfer ${nowIso}] created from ${sourceItem.location || 'unknown'}${reason ? ` (${reason})` : ''}`;
      const createAttempts: UpdateAttempt[] = [
        {
          name: sourceItem.name,
          category: sourceItem.category || 'supplies',
          quantity: transferQuantity,
          location: normalizedDestination,
          status: 'available',
          notes: destinationNote,
          created_from_inventory_item_id: sourceItem.id,
          created_by_member_profile_id: actorMemberId,
        },
        {
          name: sourceItem.name,
          category: sourceItem.category || 'supplies',
          quantity: transferQuantity,
          location: normalizedDestination,
          status: 'available',
          notes: destinationNote,
        },
        {
          name: sourceItem.name,
          category: sourceItem.category || 'supplies',
          quantity: transferQuantity,
          location: normalizedDestination,
          status: 'available',
        },
        {
          name: sourceItem.name,
          category: sourceItem.category || 'supplies',
          quantity: transferQuantity,
          location: normalizedDestination,
        },
      ];

      let createError: Error | null = null;
      for (const attempt of createAttempts) {
        try {
          destinationItem = await base44.entities.InventoryItem.create(attempt);
          createError = null;
          break;
        } catch (error) {
          createError = error;
        }
      }
      if (createError) {
        throw createError;
      }
    }

    try {
      if (sourceItem.event_id) {
        await base44.entities.EventLog.create({
          event_id: sourceItem.event_id,
          type: 'LOGISTICS_TRANSFER',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `Transferred ${transferQuantity} ${sourceItem.name}`,
          details: {
            source_item_id: sourceItem.id,
            destination_item_id: destinationItem?.id || null,
            source_location: sourceItem.location || null,
            destination_location: normalizedDestination,
            quantity: transferQuantity,
            reason: reason || null,
          },
        });
      }
    } catch (error) {
      console.error('[transferInventoryStock] EventLog create failed:', error.message);
    }

    try {
      const recipientId = sourceItem.managed_by_member_profile_id || sourceItem.owner_member_profile_id;
      if (recipientId && recipientId !== actorMemberId) {
        await base44.entities.Notification.create({
          user_id: recipientId,
          type: 'system',
          title: 'Inventory Transfer',
          message: `${sourceItem.name || 'Inventory'} transfer completed`,
          related_entity_type: 'inventory_item',
          related_entity_id: sourceItem.id,
        });
      }
    } catch (error) {
      console.error('[transferInventoryStock] Notification create failed:', error.message);
    }

    return Response.json({
      success: true,
      transferredQuantity: transferQuantity,
      sourceItem: updatedSource,
      destinationItem,
      actorId: actorMemberId || actorAdminId,
    });
  } catch (error) {
    console.error('[transferInventoryStock] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
