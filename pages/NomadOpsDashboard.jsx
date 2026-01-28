import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function NomadOpsDashboard() {
  useEffect(() => {
    window.location.href = createPageUrl('Hub');
  }, []);

  return null;
}