import { beforeEach, expect, test, vi } from "vitest";

const mockRead = vi.fn();
const mockWrite = vi.fn();
const mockWatch = vi.fn();

vi.mock("src/boot/api", () => ({
	api: {
		core: {
			useFileContent: () => ({
				read: mockRead,
				write: mockWrite,
			}),
		},
	},
}));

vi.mock("src/stores/file-watcher", () => ({
	useFileWatcherStore: () => ({
		watch: mockWatch,
	}),
}));

const { createFileSystemBufferProvider } = await import(
	"./file-system-buffer-provider"
);

beforeEach(() => {
	vi.clearAllMocks();
	mockRead.mockResolvedValue(new Uint8Array());
	mockWrite.mockResolvedValue(undefined);
	mockWatch.mockReturnValue(() => {});
});

test("read delegates to useFileContent", async () => {
	const content = new TextEncoder().encode("* Test Note");
	mockRead.mockResolvedValue(content);

	const provider = createFileSystemBufferProvider();
	const result = await provider.read("/notes/test.org");

	expect(mockRead).toHaveBeenCalledWith("/notes/test.org");
	expect(result).toEqual(content);
});

test("read propagates errors from useFileContent", async () => {
	mockRead.mockRejectedValue(new Error("No file system selected"));

	const provider = createFileSystemBufferProvider();

	await expect(provider.read("/notes/test.org")).rejects.toThrow(
		"No file system selected",
	);
});

test("write delegates to useFileContent", async () => {
	const content = new TextEncoder().encode("* Note");

	const provider = createFileSystemBufferProvider();
	await provider.write!("/notes/test.org", content);

	expect(mockWrite).toHaveBeenCalledWith("/notes/test.org", content);
});

test("write propagates errors from useFileContent", async () => {
	mockWrite.mockRejectedValue(new Error("No file system selected"));
	const content = new TextEncoder().encode("test");

	const provider = createFileSystemBufferProvider();

	await expect(provider.write!("/notes/test.org", content)).rejects.toThrow(
		"No file system selected",
	);
});

test("watch delegates to file watcher store", () => {
	const callback = vi.fn();
	const unwatch = vi.fn();
	mockWatch.mockReturnValue(unwatch);

	const provider = createFileSystemBufferProvider();
	const result = provider.watch!("/notes/test.org", callback);

	expect(mockWatch).toHaveBeenCalledWith("/notes/test.org", callback);
	expect(result).toBe(unwatch);
});

test("getContext extracts title from path", () => {
	const provider = createFileSystemBufferProvider();
	const context = provider.getContext!("/path/to/my-note.org");

	expect(context.title).toBe("my-note");
});

test("getContext returns Untitled for empty filename", () => {
	const provider = createFileSystemBufferProvider();
	const context = provider.getContext!("/path/to/");

	expect(context.title).toBe("Untitled");
});

test("scheme is file", () => {
	const provider = createFileSystemBufferProvider();

	expect(provider.scheme).toBe("file");
});
