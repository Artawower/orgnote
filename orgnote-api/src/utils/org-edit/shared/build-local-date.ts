import type { OrgPlanningDate } from '../types';

export const buildLocalDate = (parsed: OrgPlanningDate): Date => {
  const [datePart = '1970-01-01', timePart = '00:00'] = parsed.date.includes(
    'T'
  )
    ? parsed.date.split('T')
    : [parsed.date];
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = parsed.hasTime
    ? timePart.split(':').map(Number)
    : [0, 0];
  return new Date(
    year ?? 0,
    (month ?? 1) - 1,
    day ?? 1,
    hours ?? 0,
    minutes ?? 0
  );
};
