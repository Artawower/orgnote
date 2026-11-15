import type { MultipleUploadParams, UploadParams } from 'orgnote-api';

function createFileInput(params: MultipleUploadParams): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = params.multiple ?? false;
  input.accept = params.accept ?? '';
  input.style.display = 'none';
  if (params.multiple) {
    input.directory = true;
    input.webkitdirectory = true;
  }
  document.body.appendChild(input);
  return input;
}

function handleFileSelection(input: HTMLInputElement): Promise<FileList> {
  return new Promise<FileList>((resolve, reject) => {
    const abortController = new AbortController();

    input.addEventListener(
      'change',
      () => {
        if (input.files?.length) {
          resolve(input.files);
        } else {
          reject(new Error('No files selected'));
        }
        document.body.removeChild(input);
      },
      { once: true, signal: abortController.signal },
    );

    input.addEventListener(
      'abort',
      () => {
        document.body.removeChild(input);
        reject(new Error('File selection aborted'));
      },
      { once: true },
    );

    input.click();
  });
}

export function uploadFiles(params: MultipleUploadParams): Promise<FileList> {
  const input = createFileInput(params);
  return handleFileSelection(input);
}

export async function uploadFile(params: UploadParams = {}): Promise<File | undefined> {
  const files = await uploadFiles({ ...params, multiple: false });

  if (!files.length) {
    return;
  }

  const file = files[0];

  return file;
}
