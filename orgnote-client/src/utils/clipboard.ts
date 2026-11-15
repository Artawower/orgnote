import { Platform, copyToClipboard as cp } from 'quasar';

// NOTE: https://stackoverflow.com/questions/61243646/clipboard-api-call-throws-notallowederror-without-invoking-onpermissionrequest
export async function copyToClipboard(text: string): Promise<void> {
  if (Platform.is.nativeMobile) {
    legacyCopy(text);
    return;
  }
  return cp(text);
}

function legacyCopy(value: string) {
  const ta = document.createElement('textarea');
  ta.value = value ?? '';
  ta.style.position = 'absolute';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
}
