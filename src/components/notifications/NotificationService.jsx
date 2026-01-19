import { base44 } from "@/api/base44Client";

/**
 * Service to handle notification creation and distribution
 */
export class NotificationService {
  static async createNotification(userId, notification) {
    try {
      return await base44.entities.Notification.create({
        user_id: userId,
        ...notification
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  }

  /**
   * Check if user has notifications enabled for this type and channel
   */
  static async isNotificationEnabled(userId, type, channelId = null) {
    try {
      const prefs = await base44.entities.NotificationPreference.filter({
        user_id: userId
      });

      // Check channel-specific preference
      if (channelId) {
        const channelPref = prefs.find(p => p.channel_id === channelId);
        if (channelPref?.is_muted) return false;
      }

      // Check global preference
      const globalPref = prefs.find(p => !p.channel_id && !p.squad_id);
      if (!globalPref?.push_enabled) return false;

      return true;
    } catch (error) {
      console.error("Failed to check notification preference:", error);
      return true; // Default to enabled
    }
  }

  /**
   * Create mention notification
   */
  static async notifyMention(userId, mentionerName, channelName, messageId) {
    const enabled = await this.isNotificationEnabled(userId, 'mention');
    if (!enabled) return;

    return this.createNotification(userId, {
      type: 'mention',
      title: `${mentionerName} mentioned you`,
      message: `in #${channelName}`,
      related_entity_type: 'message',
      related_entity_id: messageId
    });
  }

  /**
   * Create direct message notification
   */
  static async notifyDirectMessage(userId, senderName, messageId) {
    const enabled = await this.isNotificationEnabled(userId, 'direct_message');
    if (!enabled) return;

    return this.createNotification(userId, {
      type: 'direct_message',
      title: `Direct message from ${senderName}`,
      message: `New private message received`,
      related_entity_type: 'message',
      related_entity_id: messageId
    });
  }

  /**
   * Create channel activity notification
   */
  static async notifyChannelActivity(userId, channelId, channelName, activity) {
    const enabled = await this.isNotificationEnabled(userId, 'channel_activity', channelId);
    if (!enabled) return;

    return this.createNotification(userId, {
      type: 'channel_activity',
      title: `Activity in #${channelName}`,
      message: activity,
      related_entity_type: 'channel',
      related_entity_id: channelId
    });
  }

  /**
   * Create moderation notification
   */
  static async notifyModeration(userId, action, details) {
    const enabled = await this.isNotificationEnabled(userId, 'moderation');
    if (!enabled) return;

    return this.createNotification(userId, {
      type: 'moderation',
      title: `Moderation Action: ${action}`,
      message: details,
      related_entity_type: 'user'
    });
  }

  /**
   * Create system notification
   */
  static async notifySystem(userId, title, message) {
    const enabled = await this.isNotificationEnabled(userId, 'system');
    if (!enabled) return;

    return this.createNotification(userId, {
      type: 'system',
      title,
      message
    });
  }

  /**
   * Play notification sound
   */
  static playSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(() => {});
    } catch (error) {
      console.error("Failed to play sound:", error);
    }
  }
}