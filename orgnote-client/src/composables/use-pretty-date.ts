import { I18N } from 'orgnote-api';
import { useI18n } from 'vue-i18n';

const toDate = (value: Date | number | string): Date => {
  return value instanceof Date ? value : new Date(value);
};

const isSameDay = (left: Date, right: Date): boolean => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

const getYesterday = (value: Date): Date => {
  const yesterday = new Date(value);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

export const usePrettyDate = () => {
  const { t, locale } = useI18n({
    useScope: 'global',
    inheritLocale: true,
  });

  const prettyDate = (value: Date | number | string): string => {
    const date = toDate(value);
    if (Number.isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const now = new Date();
    if (isSameDay(date, now)) {
      return t(I18N.TODAY);
    }

    if (isSameDay(date, getYesterday(now))) {
      return t(I18N.YESTERDAY);
    }

    return date.toLocaleDateString(locale.value);
  };

  return { prettyDate };
};
