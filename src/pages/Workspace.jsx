import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy workspace route retired.
 * Keep route compatibility by redirecting all traffic to Hub.
 */
export default function Workspace() {
  return <Navigate to="/Hub" replace />;
}
