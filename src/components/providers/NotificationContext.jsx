import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * NotificationContext — Global notification state and actions
 * Supports: alerts, success, error, info messages with optional actions
 * Advanced: custom rules, grouping, quiet hours, intelligent filtering
 */
const NotificationContext = createContext();

// Generate simple unique ID (no external deps)
const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Check if current time is within quiet hours
const isInQuietHours = (quietHours) => {
  if (!quietHours?.is_enabled) return false;
  const now = new Date();
  const [startH, startM] = (quietHours.start_time || '22:00').split(':').map(Number);
  const [endH, endM] = (quietHours.end_time || '08:00').split(':').map(Number);
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;
  return startMins > endMins
    ? currentMins >= startMins || currentMins < endMins
    : currentMins >= startMins && currentMins < endMins;
};

// Check if notification matches rule pattern
const matchesRule = (notification, rule) => {
  if (!rule.is_active) return false;
  const ruleTypes = rule.types || [];
  const typeMatches = ruleTypes.length === 0 || ruleTypes.includes(notification.type);
  const patternRegex = new RegExp(rule.pattern, 'i');
  const contentMatches = patternRegex.test(notification.title || '') || patternRegex.test(notification.message || '');
  return typeMatches && contentMatches;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [rules, setRules] = useState([]);
  const [quietHours, setQuietHours] = useState(null);
  const [groupedNotifications, setGroupedNotifications] = useState({});

  // Load user rules and quiet hours on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userRules = await base44.entities.NotificationRule.filter({
          is_active: true
        }, '-created_date', 50);
        setRules(userRules || []);
      } catch (e) {
        console.warn('[Notifications] Failed to load rules:', e?.message);
      }
    };
    loadSettings();
  }, []);

  const addNotification = useCallback((notification) => {
    const id = generateId();
    const notif = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      actions: [],
      priority: 'medium',
      groupKey: null,
      ...notification,
    };

    // Apply filtering rules
    let shouldDefer = false;
    let shouldBlock = false;
    let groupKey = null;
    let finalPriority = notif.priority;

    for (const rule of rules) {
      if (matchesRule(notif, rule)) {
        finalPriority = rule.priority || notif.priority;
        if (rule.action === 'block') {
          shouldBlock = true;
          break;
        } else if (rule.action === 'defer') {
          shouldDefer = true;
        } else if (rule.action === 'group') {
          groupKey = rule.name;
        } else if (rule.action === 'promote') {
          finalPriority = 'critical';
        }
      }
    }

    // Check quiet hours
    const inQuietHours = isInQuietHours(quietHours);
    if (inQuietHours && shouldDefer) {
      const isCritical = finalPriority === 'critical';
      const isAlert = notif.type === 'alert' || notif.type === 'error';
      const allowCritical = quietHours?.allow_critical !== false;
      const allowMentions = quietHours?.allow_mentions !== false;
      
      if ((isCritical && allowCritical) || (isAlert && allowMentions)) {
        // Allow through but mark as deferred
        notif.deferred = true;
      } else {
        shouldBlock = true;
      }
    }

    if (shouldBlock) {
      return id; // Return ID but don't add to state
    }

    notif.priority = finalPriority;
    notif.groupKey = groupKey;

    setNotifications((prev) => [...prev, notif]);

    // Handle grouping
    if (groupKey) {
      setGroupedNotifications((prev) => ({
        ...prev,
        [groupKey]: [...(prev[groupKey] || []), id]
      }));
    }

    // Auto-remove after duration
    if (notif.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notif.duration);
    }

    return id;
  }, [rules, quietHours]);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNotification = useCallback((id, updates) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  const createRule = useCallback(async (ruleData) => {
    try {
      const rule = await base44.entities.NotificationRule.create(ruleData);
      setRules((prev) => [rule, ...prev]);
      return rule;
    } catch (e) {
      console.error('[Notifications] Failed to create rule:', e);
      throw e;
    }
  }, []);

  const deleteRule = useCallback(async (ruleId) => {
    try {
      await base44.entities.NotificationRule.delete(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (e) {
      console.error('[Notifications] Failed to delete rule:', e);
      throw e;
    }
  }, []);

  const updateRule = useCallback(async (ruleId, updates) => {
    try {
      const updated = await base44.entities.NotificationRule.update(ruleId, updates);
      setRules((prev) => prev.map((r) => r.id === ruleId ? updated : r));
      return updated;
    } catch (e) {
      console.error('[Notifications] Failed to update rule:', e);
      throw e;
    }
  }, []);

  const setQuietHoursConfig = useCallback(async (config) => {
    setQuietHours(config);
    if (config?.id) {
      try {
        await base44.entities.QuietHours.update(config.id, config);
      } catch (e) {
        console.warn('[Notifications] Failed to persist quiet hours:', e?.message);
      }
    }
  }, []);

  const getGroupedNotifications = () => {
    const grouped = {};
    notifications.forEach((notif) => {
      if (notif.groupKey) {
        if (!grouped[notif.groupKey]) grouped[notif.groupKey] = [];
        grouped[notif.groupKey].push(notif);
      }
    });
    return grouped;
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    updateNotification,
    rules,
    createRule,
    deleteRule,
    updateRule,
    quietHours,
    setQuietHoursConfig,
    isInQuietHours: isInQuietHours(quietHours),
    getGroupedNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}