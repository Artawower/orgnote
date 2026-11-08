import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { reactive } from 'vue';
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia';

const mocks = vi.hoisted(() => ({
  createToken: vi.fn(),
  loadTokens: vi.fn(),
  removeToken: vi.fn(),
}));

const environmentState = reactive({
  apiUrl: '/v1',
  isSelfHosted: false,
});

vi.mock('./server-environment', () => ({
  useServerEnvironmentStore: () => environmentState,
}));

vi.mock('src/boot/axios', () => ({
  sdk: {
    auth: {
      authApiTokensGet: mocks.loadTokens,
      authTokenPost: mocks.createToken,
      authTokenTokenIdDelete: mocks.removeToken,
    },
  },
}));

let pinia: Pinia;

const createStores = async () => {
  const { useAuthStore } = await import('./auth');
  const { useSettingsStore } = await import('./settings');
  pinia = createPinia();
  setActivePinia(pinia);
  return { auth: useAuthStore(), settings: useSettingsStore() };
};

beforeEach(() => {
  environmentState.apiUrl = '/v1';
  environmentState.isSelfHosted = false;
  mocks.createToken.mockReset();
  mocks.loadTokens.mockReset().mockResolvedValue({ data: { data: [] } });
  mocks.removeToken.mockReset();
});

afterEach(() => {
  disposePinia(pinia);
});

test('initial state', async () => {
  const { settings } = await createStores();

  expect(settings.settings).toEqual({});
  expect(settings.tokens).toEqual([]);
});

test('able to mutate tokens', async () => {
  const { settings } = await createStores();

  settings.tokens.push({ id: '1', token: 'abc123' });
  settings.tokens.push({ id: '2', token: 'xyz987' });

  expect(settings.tokens).toHaveLength(2);
  expect(settings.tokens[0]).toEqual({ id: '1', token: 'abc123' });
});

test('self-hosted inactive users can load and create API tokens', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  auth.token = 'session-token';
  mocks.loadTokens.mockResolvedValue({ data: { data: [{ id: 'loaded', token: 'one' }] } });
  mocks.createToken.mockResolvedValue({ data: { data: { id: 'created', token: 'two' } } });

  await settings.loadApiTokens();
  await settings.createApiToken();

  expect(settings.tokens).toEqual([
    { id: 'loaded', token: 'one' },
    { id: 'created', token: 'two' },
  ]);
});

test('self-hosted inactive users can remove API tokens', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  mocks.removeToken.mockResolvedValue({ data: {} });
  const token = { id: 'token-id', token: 'token' };
  settings.tokens = [token];

  await settings.removeApiToken(token);

  expect(mocks.removeToken).toHaveBeenCalledWith('token-id');
  expect(settings.tokens).toEqual([]);
});

test('hosted inactive users cannot manage API tokens', async () => {
  const { auth, settings } = await createStores();
  auth.user = { id: 'hosted-user' };

  await settings.loadApiTokens();
  await settings.createApiToken();

  expect(mocks.loadTokens).not.toHaveBeenCalled();
  expect(mocks.createToken).not.toHaveBeenCalled();
});

test('anonymous self-hosted users cannot manage API tokens', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  const anonymousUser = { id: 'anonymous-user', isAnonymous: true };
  auth.user = anonymousUser;

  await settings.loadApiTokens();

  expect(mocks.loadTokens).not.toHaveBeenCalled();
});

test('changing between eligible servers clears and reloads API tokens', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  auth.token = 'same-token';
  await settings.loadApiTokens();
  mocks.loadTokens.mockReset();
  mocks.loadTokens
    .mockResolvedValueOnce({ data: { data: [{ id: 'server-a', token: 'a' }] } })
    .mockResolvedValueOnce({ data: { data: [{ id: 'server-b', token: 'b' }] } });
  await settings.loadApiTokens();

  environmentState.apiUrl = 'https://server-b.example/v1';
  await vi.waitFor(() => expect(settings.tokens).toEqual([{ id: 'server-b', token: 'b' }]));

  expect(mocks.loadTokens).toHaveBeenCalledTimes(2);
});

test('a token creation waits for a pending token load', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  await settings.loadApiTokens();
  mocks.loadTokens.mockReset();
  let resolveLoad: ((value: unknown) => void) | undefined;
  mocks.loadTokens.mockReturnValue(
    new Promise((resolve) => {
      resolveLoad = resolve;
    }),
  );
  mocks.createToken.mockResolvedValue({
    data: { data: { id: 'created-token', token: 'created' } },
  });

  const loading = settings.loadApiTokens();
  const creating = settings.createApiToken();
  await vi.waitFor(() => expect(mocks.loadTokens).toHaveBeenCalledTimes(1));
  expect(mocks.createToken).not.toHaveBeenCalled();
  resolveLoad?.({ data: { data: [{ id: 'loaded-token', token: 'loaded' }] } });
  await Promise.all([loading, creating]);

  expect(settings.tokens).toEqual([
    { id: 'loaded-token', token: 'loaded' },
    { id: 'created-token', token: 'created' },
  ]);
});

test('concurrent token creations retain every created credential', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  await settings.loadApiTokens();
  mocks.createToken
    .mockResolvedValueOnce({ data: { data: { id: 'first-token', token: 'first' } } })
    .mockResolvedValueOnce({ data: { data: { id: 'second-token', token: 'second' } } });

  await Promise.all([settings.createApiToken(), settings.createApiToken()]);

  expect(settings.tokens).toEqual([
    { id: 'first-token', token: 'first' },
    { id: 'second-token', token: 'second' },
  ]);
});

test('a token created after a server change cannot complete in the old context', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  await settings.loadApiTokens();
  mocks.loadTokens.mockReset().mockResolvedValue({ data: { data: [] } });
  let resolveCreate: ((value: unknown) => void) | undefined;
  mocks.createToken.mockReturnValue(
    new Promise((resolve) => {
      resolveCreate = resolve;
    }),
  );
  mocks.loadTokens.mockResolvedValue({
    data: { data: [{ id: 'server-b-token', token: 'server-b' }] },
  });

  const creating = settings.createApiToken();
  await vi.waitFor(() => expect(mocks.createToken).toHaveBeenCalledTimes(1));
  environmentState.apiUrl = 'https://server-b.example/v1';
  resolveCreate?.({ data: { data: { id: 'server-a-token', token: 'server-a' } } });
  await creating;
  await vi.waitFor(() =>
    expect(settings.tokens).toEqual([{ id: 'server-b-token', token: 'server-b' }]),
  );
});

test('a failed delete is restored before a later delete runs', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  await settings.loadApiTokens();
  const firstToken = { id: 'first-token', token: 'first' };
  const secondToken = { id: 'second-token', token: 'second' };
  settings.tokens = [firstToken, secondToken];
  let rejectFirstDelete: ((error: Error) => void) | undefined;
  mocks.removeToken
    .mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectFirstDelete = reject;
      }),
    )
    .mockResolvedValueOnce({ data: {} });

  const removingFirst = settings.removeApiToken(firstToken);
  const removingSecond = settings.removeApiToken(secondToken);
  await vi.waitFor(() => expect(mocks.removeToken).toHaveBeenCalledTimes(1));
  rejectFirstDelete?.(new Error('delete failed'));
  await Promise.all([removingFirst, removingSecond]);

  expect(mocks.removeToken).toHaveBeenNthCalledWith(1, 'first-token');
  expect(mocks.removeToken).toHaveBeenNthCalledWith(2, 'second-token');
  expect(settings.tokens).toEqual([firstToken]);
});

test('a failed delete cannot restore tokens after context loss and a newer load', async () => {
  environmentState.isSelfHosted = true;
  const { auth, settings } = await createStores();
  auth.user = { id: 'self-hosted-user' };
  await settings.loadApiTokens();
  mocks.loadTokens.mockReset().mockResolvedValue({ data: { data: [] } });
  const oldToken = { id: 'server-a-token', token: 'server-a' };
  settings.tokens = [oldToken];
  let rejectDelete: ((error: Error) => void) | undefined;
  mocks.removeToken.mockReturnValue(
    new Promise((_resolve, reject) => {
      rejectDelete = reject;
    }),
  );
  mocks.loadTokens.mockResolvedValue({
    data: { data: [{ id: 'server-b-token', token: 'server-b' }] },
  });

  const deleting = settings.removeApiToken(oldToken);
  await vi.waitFor(() => expect(mocks.removeToken).toHaveBeenCalledTimes(1));
  environmentState.apiUrl = 'https://server-b.example/v1';
  rejectDelete?.(new Error('delete failed'));
  await deleting;
  await vi.waitFor(() =>
    expect(settings.tokens).toEqual([{ id: 'server-b-token', token: 'server-b' }]),
  );
});

test('able to mutate settings', async () => {
  const { settings } = await createStores();

  settings.settings.newProp = 'hello';

  expect(settings.settings.newProp).toBe('hello');
});
