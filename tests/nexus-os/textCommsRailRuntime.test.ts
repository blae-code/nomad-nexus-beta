import { describe, expect, it } from 'vitest';
import { createOrderDispatch } from '../../src/components/nexus-os/ui/comms/commsOrderRuntime';
import {
  buildChannelGroups,
  buildCurrentMessages,
  buildMentionsInbox,
  buildOrdersRuntime,
  buildThreadSummaries,
  paginate,
  TEXT_COMMS_PAGE_SIZES,
} from '../../src/components/nexus-os/ui/comms/useTextCommsRailRuntime';

describe('useTextCommsRailRuntime', () => {
  it('builds channel groups and paginates with caps', () => {
    const operations = Array.from({ length: 12 }, (_, index) => ({ id: `op-${index + 1}`, name: `Operation ${index + 1}` }));
    const groups = buildChannelGroups({
      operations,
      focusOperationId: 'op-1',
      online: true,
      bridgeId: 'OPS',
      unreadByChannel: { command: 4, 'op-op-1': 3 },
      acknowledgedUnreadByChannel: { command: 1 },
    });

    expect(groups.tactical[0].unread).toBe(3);
    expect(groups.operations.length).toBe(12);

    const paged = paginate(groups.operations, 0, TEXT_COMMS_PAGE_SIZES.channels);
    expect(paged.visible.length).toBeLessThanOrEqual(7);
    expect(paged.pageCount).toBeGreaterThan(1);
  });

  it('sorts channel messages and detects mentions', () => {
    const messages = buildCurrentMessages({
      selectedChannel: 'command',
      eventMessagesByChannel: {
        command: [
          { id: 'evt-1', text: 'Status check @operator', createdAtMs: 1700000002000, source: 'event', author: 'Ops' },
          { id: 'evt-2', text: 'Older', createdAtMs: 1700000001000, source: 'event', author: 'Ops' },
        ],
      },
      localMessagesByChannel: {
        command: [{ id: 'local-1', text: 'Copy that', createdAtMs: 1700000003000, source: 'local', author: 'Operator' }],
      },
    });

    expect(messages[0].id).toBe('local-1');

    const mentions = buildMentionsInbox({ messages, actorId: 'operator' });
    expect(mentions).toHaveLength(1);
    expect(mentions[0].id).toBe('evt-1');
  });

  it('builds thread summaries and reconciles order runtime statuses', () => {
    const currentMessages = [
      { id: 'msg-1', text: 'Hold lane', author: 'Ops', createdAtMs: 1700000000000, threadCount: 0 },
      { id: 'msg-2', text: 'Move now', author: 'Ops', createdAtMs: 1700000010000, threadCount: 0 },
    ];
    const threads = {
      'msg-2': [{ id: 'reply-1', text: 'Copy', createdAtMs: 1700000020000 }],
    };

    const summaries = buildThreadSummaries({ selectedChannel: 'command', currentMessages, threadsByMessageId: threads });
    expect(summaries).toHaveLength(1);
    expect(summaries[0].messageId).toBe('msg-2');

    const dispatch = createOrderDispatch({
      channelId: 'command',
      directive: 'CHECK_IN_REQUEST',
      eventType: 'SELF_CHECK',
      nowMs: 1700000000000,
    });

    const runtime = buildOrdersRuntime({
      dispatches: [dispatch],
      events: [
        {
          id: 'evt-ack',
          createdAt: '2024-01-01T00:00:02.000Z',
          eventType: 'ROGER',
          channelId: 'command',
          payload: { dispatchId: dispatch.dispatchId },
        },
      ],
      incidents: [],
      nowMs: 1700000004000,
      page: 0,
    });

    expect(runtime.stats.total).toBe(1);
    expect(runtime.visible[0].status).toBe('ACKED');
  });
});
