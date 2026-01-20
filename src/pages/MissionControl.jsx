import { useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function MissionControl() {
  useEffect(() => {
    window.location.href = createPageUrl('Events');
  }, []);

  return null;
}