import { test, vi, expect } from 'vitest';
import { copyToClipboard } from './clipboard';
import { Platform, copyToClipboard as quasarCopyToClipboard } from 'quasar';

vi.mock('quasar', () => ({
  Platform: {
    is: {
      nativeMobile: false,
    },
  },
  copyToClipboard: vi.fn(),
}));

test('uses Quasar copyToClipboard on non-mobile platforms', async () => {
  const mockText = 'Test text';
  await copyToClipboard(mockText);

  expect(quasarCopyToClipboard).toHaveBeenCalledWith(mockText);
});

test('uses legacyCopy on native mobile platforms', async () => {
  const mockText = 'Test text';
  Platform.is.nativeMobile = true;

  Object.defineProperty(document, 'execCommand', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
  });

  const appendChildSpy = vi.spyOn(document.body, 'appendChild');

  const realCreateElement = document.createElement.bind(document);

  vi.spyOn(document, 'createElement').mockImplementation((<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    options?: ElementCreationOptions,
  ) => {
    if (tagName === 'textarea') {
      const mockTextarea = realCreateElement('textarea', options);

      vi.spyOn(mockTextarea, 'select').mockImplementation(() => {});
      vi.spyOn(mockTextarea, 'remove').mockImplementation(() => {});

      return mockTextarea;
    }

    return realCreateElement(tagName, options);
  }) as typeof document.createElement);

  await copyToClipboard(mockText);

  const appendedTextarea = appendChildSpy.mock.calls[0]?.[0] as HTMLTextAreaElement;
  if (!appendedTextarea) throw new Error('appendedTextarea is undefined');
  expect(appendedTextarea.value).toBe(mockText);
  expect(appendedTextarea.select).toHaveBeenCalled();
  expect(document.execCommand).toHaveBeenCalledWith('copy');
  expect(appendedTextarea.remove).toHaveBeenCalled();

  Platform.is.nativeMobile = false;
  vi.restoreAllMocks();
});

test('returns undefined for mobile platforms', async () => {
  Platform.is.nativeMobile = true;

  const mockText = 'Test text';
  const result = await copyToClipboard(mockText);

  expect(result).toBeUndefined();

  Platform.is.nativeMobile = false;
});
