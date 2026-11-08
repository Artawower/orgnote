import type { OrgDate, OrgRepeater, TimeUnit } from 'org-mode-ast';

const msPerUnit: Record<Exclude<TimeUnit, 'm' | 'y'>, number> = {
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

const toUtcMidnight = (isoDate: string): Date => new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);

const toIsoDate = (date: Date): string => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const lastDayOfUtcMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const addUtcMonths = (date: Date, months: number): Date => {
  const day = date.getUTCDate();
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  next.setUTCDate(Math.min(day, lastDayOfUtcMonth(next.getUTCFullYear(), next.getUTCMonth())));
  return next;
};

const addUtcYears = (date: Date, years: number): Date => {
  const day = date.getUTCDate();
  const month = date.getUTCMonth();
  const next = new Date(date);
  next.setUTCDate(1);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  next.setUTCDate(Math.min(day, lastDayOfUtcMonth(next.getUTCFullYear(), month)));
  return next;
};

const addInterval = (date: Date, repeater: OrgRepeater): Date => {
  if (repeater.unit === 'm') return addUtcMonths(date, repeater.value);
  if (repeater.unit === 'y') return addUtcYears(date, repeater.value);
  return new Date(date.getTime() + repeater.value * msPerUnit[repeater.unit]);
};

const nextCumulate = (scheduled: Date, repeater: OrgRepeater): Date =>
  addInterval(scheduled, repeater);

const nextCatchUp = (scheduled: Date, repeater: OrgRepeater, now: Date): Date => {
  const nowMidnight = toUtcMidnight(now.toISOString());
  let next = addInterval(scheduled, repeater);
  while (next <= nowMidnight) next = addInterval(next, repeater);
  return next;
};

const nextRestart = (repeater: OrgRepeater, completedAt: Date): Date =>
  addInterval(toUtcMidnight(completedAt.toISOString()), repeater);

const repeaterHandlers: Record<
  '+' | '++' | '.+',
  (scheduled: Date, repeater: OrgRepeater, completedAt: Date) => Date
> = {
  '+': (scheduled, repeater) => nextCumulate(scheduled, repeater),
  '++': (scheduled, repeater, completedAt) => nextCatchUp(scheduled, repeater, completedAt),
  '.+': (_scheduled, repeater, completedAt) => nextRestart(repeater, completedAt),
};

export const nextDateFromRepeater = (scheduled: OrgDate, completedAt: Date): string => {
  const repeater = scheduled.repeater;
  if (!repeater) return scheduled.date;
  const handler = repeaterHandlers[repeater.type as '+' | '++' | '.+'];
  if (!handler) return scheduled.date;
  return toIsoDate(handler(toUtcMidnight(scheduled.date), repeater, completedAt));
};
