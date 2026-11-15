import { uploadFile, uploadFiles } from './file-upload';
import { test, expect, vi, type Mock } from 'vitest';

const createInputMatcher = (input: HTMLInputElement) => (tagName: string) =>
  tagName === 'input' ? input : document.createElement(tagName as never);

const spyDom = (input: HTMLInputElement) => {
  const matcher = createInputMatcher(input);
  const createSpy = vi
    .spyOn(document, 'createElement')
    .mockImplementation(matcher as typeof document.createElement);
  const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => input);
  const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => input);
  return { createSpy, appendSpy, removeSpy };
};

test('uploadFiles should resolve with a FileList when files are selected', async () => {
  const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });
  const mockFileList = {
    0: mockFile,
    length: 1,
    item: (index: number) => (index === 0 ? mockFile : null),
  } as unknown as FileList;

  const mockInput = {
    type: 'file',
    multiple: true,
    accept: 'image/*',
    files: null,
    style: { display: '' },
    click: vi.fn(),
    addEventListener: vi.fn(),
  } as unknown as HTMLInputElement;

  const addEventListenerMock = mockInput.addEventListener as Mock;
  addEventListenerMock.mockImplementation((event, callback) => {
    if (event === 'change') {
      mockInput.files = mockFileList;
      callback();
    }
  });

  const { appendSpy, removeSpy } = spyDom(mockInput);

  const params = { accept: 'image/*', multiple: true };
  const result = await uploadFiles(params);

  expect(result).toBe(mockFileList);
  expect(mockInput.click).toHaveBeenCalled();
  expect(appendSpy).toHaveBeenCalledWith(mockInput);
  expect(removeSpy).toHaveBeenCalledWith(mockInput);
});

test('uploadFiles should reject with an error if no files are selected', async () => {
  const mockInput = {
    type: 'file',
    multiple: false,
    accept: '',
    files: null,
    style: { display: '' },
    click: vi.fn(),
    addEventListener: vi.fn(),
  } as unknown as HTMLInputElement;

  const addEventListenerMock = mockInput.addEventListener as Mock;
  addEventListenerMock.mockImplementation((event, callback) => {
    if (event === 'change') {
      callback();
    }
  });

  const { appendSpy, removeSpy } = spyDom(mockInput);

  const params = { accept: '' };

  await expect(uploadFiles(params)).rejects.toThrowError('No files selected');
  expect(mockInput.click).toHaveBeenCalled();
  expect(appendSpy).toHaveBeenCalledWith(mockInput);
  expect(removeSpy).toHaveBeenCalledWith(mockInput);
});

test('uploadFile should resolve with the first file when one file is selected', async () => {
  const mockFile = new File(['content'], 'file.txt', { type: 'text/plain' });
  const mockFileList = {
    0: mockFile,
    length: 1,
    item: (index: number) => (index === 0 ? mockFile : null),
  } as unknown as FileList;

  const mockInput = {
    type: 'file',
    multiple: false,
    accept: '',
    files: mockFileList,
    style: { display: '' },
    click: vi.fn(),
    addEventListener: vi.fn(),
  } as unknown as HTMLInputElement;

  const addEventListenerMock = mockInput.addEventListener as Mock;
  addEventListenerMock.mockImplementation((event, callback) => {
    if (event === 'change') {
      callback();
    }
  });

  const { appendSpy, removeSpy } = spyDom(mockInput);

  const params = { accept: '' };
  const result = await uploadFile(params);

  expect(result).toBe(mockFile);
  expect(mockInput.click).toHaveBeenCalled();
  expect(appendSpy).toHaveBeenCalledWith(mockInput);
  expect(removeSpy).toHaveBeenCalledWith(mockInput);
});

test('uploadFile should throw an error if no file is selected', async () => {
  const mockInput = {
    type: 'file',
    multiple: false,
    accept: '',
    files: null,
    style: { display: '' },
    click: vi.fn(),
    addEventListener: vi.fn(),
  } as unknown as HTMLInputElement;

  const addEventListenerMock = mockInput.addEventListener as Mock;
  addEventListenerMock.mockImplementation((event, callback) => {
    if (event === 'change') {
      callback();
    }
  });

  const { appendSpy, removeSpy } = spyDom(mockInput);

  const params = { accept: '' };

  await expect(uploadFile(params)).rejects.toThrowError('No files selected');
  expect(mockInput.click).toHaveBeenCalled();
  expect(appendSpy).toHaveBeenCalledWith(mockInput);
  expect(removeSpy).toHaveBeenCalledWith(mockInput);
});
