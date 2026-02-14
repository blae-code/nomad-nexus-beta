/* CommsArray — Integrated Communications Hub */

.nx-comms-array {
  position: fixed;
  right-0;
  top-[3.5rem];
  bottom-[2rem];
  width: 320px;
  border-left: 1px solid rgba(113, 113, 122, 0.4);
  background: rgba(9, 9, 11, 0.92);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  transition: all 280ms cubic-bezier(0.18, 0.67, 0.25, 1);
  overflow: hidden;

  &.is-collapsed {
    width: 0;
    border-left: none;
    overflow: hidden;
  }

  &.is-open {
    box-shadow: -1px 0 0 0 rgba(239, 68, 68, 0.15) inset, -4px 0 12px rgba(0, 0, 0, 0.4);
  }
}

.nx-comms-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Header */
.nx-comms-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(113, 113, 122, 0.4);
  background: rgba(9, 9, 11, 0.6);
}

/* Tabs */
.nx-comms-tabs {
  display: flex;
  gap: 0;
  padding: 0;
  border-bottom: 1px solid rgba(113, 113, 122, 0.4);
  background: rgba(9, 9, 11, 0.4);
}

.nx-comms-tab {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(161, 161, 170, 0.8);
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 200ms ease-out;

  &:hover {
    color: rgba(244, 63, 94, 0.9);
  }

  &.is-active {
    color: rgba(239, 68, 68, 1);
    border-bottom-color: rgba(239, 68, 68, 0.7);
  }
}

/* Content Area */
.nx-comms-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(239, 68, 68, 0.3);
    border-radius: 2px;

    &:hover {
      background: rgba(239, 68, 68, 0.5);
    }
  }
}

/* Topology Diagram */
.nx-comms-topology {
  padding: 0.75rem;
  border: 1px solid rgba(113, 113, 122, 0.3);
  border-radius: 0.5rem;
  background: rgba(24, 24, 27, 0.5);
  margin-bottom: 0.5rem;
}

.nx-comms-legend {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.75rem;
}

/* Sections */
.nx-comms-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.nx-comms-section-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(161, 161, 170, 0.9);
  background: rgba(24, 24, 27, 0.6);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    background: rgba(39, 39, 42, 0.8);
    color: rgba(244, 63, 94, 0.8);
  }
}

/* List */
.nx-comms-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.375rem;
  background: rgba(24, 24, 27, 0.3);
  border: 1px solid rgba(113, 113, 122, 0.2);
  border-radius: 0.25rem;
}

.nx-comms-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(39, 39, 42, 0.4);
  transition: all 150ms ease-out;
  cursor: pointer;

  &:hover {
    background: rgba(39, 39, 42, 0.8);
  }
}

/* Toggle Items */
.nx-comms-toggle-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  background: rgba(24, 24, 27, 0.5);
  border: 1px solid rgba(113, 113, 122, 0.2);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 150ms ease-out;

  &:hover {
    border-color: rgba(113, 113, 122, 0.4);
    background: rgba(39, 39, 42, 0.5);
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .nx-comms-array {
    width: 280px;
  }
}

@media (max-width: 768px) {
  .nx-comms-array {
    position: fixed;
    right: -320px;
    width: 320px;
    top: 0;
    bottom: 0;
    border-left: 1px solid rgba(113, 113, 122, 0.4);
    border-right: 1px solid rgba(113, 113, 122, 0.4);

    &.is-open {
      right: 0;
      animation: slide-in-right 280ms cubic-bezier(0.18, 0.67, 0.25, 1);
    }

    &.is-collapsed {
      right: -320px;
    }
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(320px);
  }
  to {
    transform: translateX(0);
  }
}