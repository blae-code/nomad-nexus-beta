import { useState, useEffect } from 'react';

/**
 * Displays user's local time and UTC time
 */
export function useVerseTime() {
  const [timeData, setTimeData] = useState(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      
      // Local time with seconds
      const localHours = String(now.getHours()).padStart(2, '0');
      const localMinutes = String(now.getMinutes()).padStart(2, '0');
      const localSeconds = String(now.getSeconds()).padStart(2, '0');
      const localTime = `${localHours}:${localMinutes}:${localSeconds}`;

      // UTC time with seconds
      const utcHours = String(now.getUTCHours()).padStart(2, '0');
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      const utcTime = `${utcHours}:${utcMinutes}:${utcSeconds}`;

      setTimeData({
        localTime,
        utcTime,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 500);

    return () => clearInterval(interval);
  }, []);

  return timeData;
}