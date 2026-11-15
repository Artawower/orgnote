import type { Directive } from 'vue';
import { isNullable } from 'orgnote-api/utils';
import { clientOnly } from 'src/utils/platform-specific';

const updateHTML = clientOnly(async (el: HTMLElement, value: unknown): Promise<void> => {
  const html = isNullable(value) ? '' : String(value);
  const DOMPurify = (await import('dompurify')).default;
  const sanitized = DOMPurify.sanitize(html, { RETURN_TRUSTED_TYPE: true });
  el.innerHTML = sanitized as unknown as string;
});

export const vHtmlSafe: Directive<HTMLElement, unknown> = {
  mounted: (el, { value }) => updateHTML(el, value),
  updated: (el, { value, oldValue }) => {
    if (value === oldValue) return;
    updateHTML(el, value);
  },
};
