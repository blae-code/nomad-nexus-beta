import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * NotificationContext — Global notification state and actions
 * Supports: alerts, success, error, info messages with optional actions
 */
const NotificationContext = createContext();

// Generate simple unique ID (no external deps)
const generateId = () => `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = generateId();
    const notif = {
      id,
      type: 'info', // info | success | warning | error | alert
      title: '',
      message: '',
      duration: 5000, // ms, null for persistent
      actions: [], // { label, onClick, variant }
      ...notification,
    };

    setNotifications((prev) => [...prev, notif]);

    // Auto-remove after duration
    if (notif.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notif.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const updateNotification = useCallback((id, updates) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
    );
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, updateNotification }}>
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