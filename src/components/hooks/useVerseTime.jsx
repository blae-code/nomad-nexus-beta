import { useState, useEffect } from 'react';

/**
 * Converts real-world Unix timestamp to Star Citizen's Verse Time
 * Based on: https://dydrmr.github.io/VerseTime/
 * 
 * Verse Time epoch: 2942-01-01 00:00:00 UTC
 * Verse Time runs at 1:1 ratio (1 real second = 1 verse second)
 */
export function useVerseTime() {
  const [verseTime, setVerseTime] = useState(null);

  useEffect(() => {
    const calculateVerseTime = () => {
      // Verse epoch: 2942-01-01 00:00:00 UTC
      const verseEpoch = new Date('2942-01-01T00:00:00Z').getTime();
      const now = Date.now();
      const secondsSinceEpoch = Math.floor((now - verseEpoch) / 1000);

      // Calculate date and time
      const secondsPerDay = 86400;
      const verseDay = Math.floor(secondsSinceEpoch / secondsPerDay);
      const secondsInDay = secondsSinceEpoch % secondsPerDay;

      // Convert seconds to HH:MM:SS
      const hours = Math.floor(secondsInDay / 3600);
      const minutes = Math.floor((secondsInDay % 3600) / 60);
      const seconds = secondsInDay % 60;

      // Calculate verse year/month/day (rough approximation)
      // Verse year = 365.25 days (same as Earth)
      const verseYear = 2942 + Math.floor(verseDay / 365.25);
      const dayInYear = Math.floor(verseDay % 365.25);
      
      // Month approximation (30.44 days per month avg)
      const verseMonth = Math.floor(dayInYear / 30.44) + 1;
      const verseMonthDay = Math.floor(dayInYear % 30.44) + 1;

      const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const dateString = `${String(verseMonth).padStart(2, '0')}.${String(verseMonthDay).padStart(2, '0')}.${verseYear}`;

      setVerseTime({
        time: timeString,
        date: dateString,
        full: `${dateString} ${timeString}`,
        hours,
        minutes,
        seconds,
      });
    };

    calculateVerseTime();
    const interval = setInterval(calculateVerseTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return verseTime;
}