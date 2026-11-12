import { MINUTES_PER_HOUR } from '../constants';

export const formatDurationMin = (min: number): string => {
  const h = Math.floor(min / MINUTES_PER_HOUR);
  const m = min % MINUTES_PER_HOUR;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
