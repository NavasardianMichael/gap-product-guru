import { useEffect, useState } from 'react';

const TICK_MS = 250;

/**
 * Seconds left of a countdown that starts at `seconds` when the component mounts.
 * Mount a fresh component (or change its `key`) to restart it.
 */
export const useCountdown = (seconds = 0): number => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const deadline = Date.now() + seconds * 1000;
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) clearInterval(timer);
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [seconds]);

  return remaining;
};
