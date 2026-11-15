import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach, type Mock } from 'vitest';
import FileUploader from './FileUploader.vue';
import { extractFiles } from 'src/utils/file-traversal';

vi.mock('src/utils/file-traversal', () => ({
  extractFiles: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  vi.clearAllMocks();
  (extractFiles as Mock).mockResolvedValue([]);
});

const createDragEvent = (type: string) => {
  return {
    type,
    preventDefault: vi.fn(),
    dataTransfer: {
      items: [],
    },
  };
};

test('FileUploader: should render slot content', () => {
  const wrapper = mount(FileUploader, {
    slots: {
      default: '<div class="content">Content</div>',
    },
  });
  expect(wrapper.find('.content').exists()).toBe(true);
});

test('FileUploader: should show overlay when drag enters', async () => {
  const wrapper = mount(FileUploader);

  await wrapper.trigger('dragenter', createDragEvent('dragenter'));
  expect(wrapper.find('.upload-overlay').exists()).toBe(true);
});

test('FileUploader: should hide overlay when drag leaves', async () => {
  const wrapper = mount(FileUploader);

  await wrapper.trigger('dragenter', createDragEvent('dragenter'));
  expect(wrapper.find('.upload-overlay').exists()).toBe(true);

  await wrapper.trigger('dragleave', createDragEvent('dragleave'));
  expect(wrapper.find('.upload-overlay').exists()).toBe(false);
});

test('FileUploader: should emit uploaded event with files on drop', async () => {
  const wrapper = mount(FileUploader);
  const mockFiles = [new File([''], 'test.js')];
  (extractFiles as Mock).mockResolvedValue(mockFiles);

  await wrapper.trigger('dragenter', createDragEvent('dragenter'));
  await wrapper.trigger('drop', createDragEvent('drop'));

  expect(wrapper.emitted('uploaded')).toBeTruthy();
  expect(wrapper.emitted('uploaded')![0]).toEqual([mockFiles]);
  expect(wrapper.find('.upload-overlay').exists()).toBe(false);
});

test('FileUploader: should respect accept prop', async () => {
  const wrapper = mount(FileUploader, {
    props: {
      accept: ['js'],
    },
  });

  await wrapper.trigger('drop', createDragEvent('drop'));
  expect(extractFiles).toHaveBeenCalledWith(expect.anything(), ['js']);
});

test('FileUploader: should attach/detach window event listeners', () => {
  const addSpy = vi.spyOn(window, 'addEventListener');
  const removeSpy = vi.spyOn(window, 'removeEventListener');

  const wrapper = mount(FileUploader);
  expect(addSpy).toHaveBeenCalledWith('dragover', expect.any(Function), undefined);
  expect(addSpy).toHaveBeenCalledWith('drop', expect.any(Function), undefined);

  wrapper.unmount();
  expect(removeSpy).toHaveBeenCalledWith('dragover', expect.any(Function), undefined);
  expect(removeSpy).toHaveBeenCalledWith('drop', expect.any(Function), undefined);
});
