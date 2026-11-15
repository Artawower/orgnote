import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { extensionI18nKeys } from 'src/constants/extension-i18n-keys';

type TranslateFn = (key: string) => string;

const resolveDateFormat = (date: Date): string =>
  date.getFullYear() === new Date().getFullYear() ? 'd MMM' : 'd MMM yyyy';

export const formatOrgDateLabel = (isoDate: string, t: TranslateFn): string => {
  const date = parseISO(isoDate);
  if (isToday(date)) return t(extensionI18nKeys.orgAgendaQuickAddToday);
  if (isTomorrow(date)) return t(extensionI18nKeys.orgAgendaQuickAddTomorrow);
  return format(date, resolveDateFormat(date));
};
