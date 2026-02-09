import React from 'react';
import { DegradedStateCard } from '../primitives';

export default class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[NexusOS][PanelErrorBoundary] panel "${this.props.panelId}" failed`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <DegradedStateCard
          state="OFFLINE"
          reason={this.state.error?.message || 'Panel render failed. Check console for details.'}
        />
      );
    }

    return this.props.children;
  }
}

