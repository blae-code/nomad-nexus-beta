import React from 'react';
import OpsShell from '@/components/layout/OpsShell';

export default function Layout({ children, currentPageName }) {
  return (
    <OpsShell currentPageName={currentPageName}>
      {children}
    </OpsShell>
  );
}