import type { CompletionCandidate, CompletionSearchResult, FileSortConfig, FileSortField, SortDirection } from 'orgnote-api';
import { I18N } from 'orgnote-api';
import { api } from 'src/boot/api';
import { i18n } from 'src/boot/i18n';

const { t } = i18n.global;

interface SortOption {
  readonly field: FileSortField;
  readonly direction: SortDirection;
  readonly label: string;
  readonly icon: string;
}

const SORT_OPTIONS: readonly SortOption[] = [
  { field: 'name', direction: 'asc', label: I18N.SORT_BY_NAME, icon: 'sym_o_sort_by_alpha' },
  { field: 'name', direction: 'desc', label: I18N.SORT_BY_NAME, icon: 'sym_o_sort_by_alpha' },
  { field: 'mtime', direction: 'asc', label: I18N.SORT_BY_MODIFIED, icon: 'sym_o_schedule' },
  { field: 'mtime', direction: 'desc', label: I18N.SORT_BY_MODIFIED, icon: 'sym_o_schedule' },
  { field: 'size', direction: 'asc', label: I18N.SORT_BY_SIZE, icon: 'sym_o_straighten' },
  { field: 'size', direction: 'desc', label: I18N.SORT_BY_SIZE, icon: 'sym_o_straighten' },
];

const directionArrow = (dir: SortDirection): string =>
  dir === 'asc' ? '↑' : '↓';

const isActive = (option: SortOption, config: FileSortConfig): boolean =>
  option.field === config.field && option.direction === config.direction;

const buildCandidate = (option: SortOption, config: FileSortConfig): CompletionCandidate<FileSortConfig> => ({
  icon: () => isActive(option, config) ? 'check' : option.icon,
  title: `${t(option.label)} ${directionArrow(option.direction)}`,
  description: t(option.direction === 'asc' ? I18N.SORT_ASCENDING : I18N.SORT_DESCENDING),
  data: { field: option.field, direction: option.direction, directoriesFirst: config.directoriesFirst },
  commandHandler: (data: FileSortConfig) => {
    const fm = api.core.useFileManager();
    fm.sortConfig = data;
    api.core.useCompletion().close();
  },
});

export const buildSortCandidates = (
  currentConfig: FileSortConfig,
): CompletionSearchResult<FileSortConfig> => ({
  total: SORT_OPTIONS.length,
  result: SORT_OPTIONS.map((option) => buildCandidate(option, currentConfig)),
});
