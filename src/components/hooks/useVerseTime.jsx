import { useState, useEffect } from 'react';

/**
 * Displays user's local time and UTC time
 */
export function useVerseTime() {
  const [timeData, setTimeData] = useState(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      
      // Local time
      const localHours = String(now.getHours()).padStart(2, '0');
      const localMinutes = String(now.getMinutes()).padStart(2, '0');
      const localTime = `${localHours}:${localMinutes}`;

      // UTC time
      const utcHours = String(now.getUTCHours()).padStart(2, '0');
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const utcTime = `${utcHours}:${utcMinutes}`;

      setTimeData({
        localTime,
        utcTime,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return timeData;
}