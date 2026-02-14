import { beforeEach, describe, expect, it } from 'vitest';
import {
  addComment,
  listCommentReplies,
  listComments,
  listThreadSummaries,
  listUnreadThreadNotifications,
  markThreadRead,
  resetOpThreadServiceState,
} from '../../src/components/nexus-os/services/opThreadService';

describe('opThreadService', () => {
  beforeEach(() => {
    resetOpThreadServiceState();
  });

  it('supports parent-linked replies within the same operation', () => {
    const root = addComment({
      opId: 'op-1',
      by: 'lead-1',
      body: 'Initial objective post.',
    });
    const reply = addComment({
      opId: 'op-1',
      by: 'pilot-2',
      body: 'Acknowledged and moving.',
      parentCommentId: root.id,
    });

    expect(reply.parentCommentId).toBe(root.id);
    expect(listCommentReplies('op-1', root.id).length).toBe(1);
    expect(listComments('op-1').length).toBe(2);
  });

  it('rejects replies to comments in other operations', () => {
    const root = addComment({
      opId: 'op-1',
      by: 'lead-1',
      body: 'Parent in op-1.',
    });

    expect(() =>
      addComment({
        opId: 'op-2',
        by: 'pilot-2',
        body: 'Cross-op reply should fail.',
        parentCommentId: root.id,
      })
    ).toThrow(/same operation/i);
  });

  it('builds thread summaries and tracks unread replies per viewer', () => {
    const root = addComment(
      {
        opId: 'op-1',
        by: 'lead-1',
        body: 'Stack at breachpoint.',
      },
      Date.parse('2026-02-11T10:00:00.000Z')
    );
    addComment(
      {
        opId: 'op-1',
        by: 'pilot-2',
        body: 'Copy. Moving now.',
        parentCommentId: root.id,
      },
      Date.parse('2026-02-11T10:01:00.000Z')
    );
    addComment(
      {
        opId: 'op-1',
        by: 'medic-3',
        body: 'Covering route.',
        parentCommentId: root.id,
      },
      Date.parse('2026-02-11T10:02:00.000Z')
    );

    const summariesBeforeRead = listThreadSummaries('op-1', 'lead-1');
    expect(summariesBeforeRead.length).toBe(1);
    expect(summariesBeforeRead[0].replyCount).toBe(2);
    expect(summariesBeforeRead[0].unreadReplies).toBe(2);

    markThreadRead('op-1', 'lead-1', root.id, Date.parse('2026-02-11T10:03:00.000Z'));
    const summariesAfterRead = listThreadSummaries('op-1', 'lead-1');
    expect(summariesAfterRead[0].unreadReplies).toBe(0);

    const notifications = listUnreadThreadNotifications('op-1', 'lead-1');
    expect(notifications.length).toBe(0);
  });
});

