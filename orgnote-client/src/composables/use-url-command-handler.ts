import { onScopeDispose, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryValue, type Router } from 'vue-router';
import type { URLOpenListenerEvent } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { api } from 'src/boot/api';
import { nativeMobileOnly } from 'src/utils/platform-specific';
import { ORGNOTE_SCHEME } from 'src/constants/orgnote-scheme';
import { to } from 'orgnote-api/utils';
import { isPresent } from 'orgnote-api/utils';
import { reporter } from 'src/boot/report';
import { RoutePaths } from 'orgnote-api';

const EXECUTE_PARAM = 'execute';

interface ExecutePayload {
  command: string;
  data?: Record<string, string>;
}

export function useUrlCommandHandler(): void {
  setupRouteWatcher();
  setupMobileDeepLinkHandler();
}

function setupRouteWatcher(): void {
  const router = useRouter();
  const route = useRoute();

  const stopWatch = watch(
    () => route.query[EXECUTE_PARAM],
    async (executeParam) => {
      await router.isReady();
      const payload = parseExecuteParam(executeParam);
      if (!payload) return;
      const success = await executeCommand(payload.command, payload.data ?? {});
      if (success) await clearExecuteParam(router, route);
    },
    { immediate: true },
  );

  onScopeDispose(stopWatch);
}

function setupMobileDeepLinkHandler(): void {
  const router = useRouter();
  let listenerHandle: PluginListenerHandle | undefined;

  nativeMobileOnly(async () => {
    const { App } = await import('@capacitor/app');
    listenerHandle = await App.addListener('appUrlOpen', (event) => handleDeepLink(event, router));
  })();

  onScopeDispose(() => {
    listenerHandle?.remove();
  });
}

async function handleDeepLink(event: URLOpenListenerEvent, router: Router): Promise<void> {
  if (isAuthCallback(event.url)) {
    await handleAuthDeepLink(event.url, router);
    return;
  }

  const payload = parseDeepLink(event.url);

  if (!payload) {
    return;
  }

  await executeCommand(payload.command, payload.data ?? {});
}

function normalizeDeepLinkUrl(url: string): string {
  return url.replace(`${ORGNOTE_SCHEME}/`, ORGNOTE_SCHEME);
}

function isAuthCallback(url: string): boolean {
  const normalizedUrl = normalizeDeepLinkUrl(url);
  return normalizedUrl.startsWith(`${ORGNOTE_SCHEME}${RoutePaths.AUTH_LOGIN}/login`);
}

async function handleAuthDeepLink(url: string, router: Router): Promise<void> {
  const urlObj = new URL(normalizeDeepLinkUrl(url));
  const route = '/' + urlObj.host + urlObj.pathname + urlObj.search;
  await router.push(route);
}

const parseExecuteParam = (
  param: LocationQueryValue | LocationQueryValue[] | undefined,
): ExecutePayload | undefined => {
  if (!param || typeof param !== 'string') {
    return;
  }

  const safeJsonParse = to(
    () => JSON.parse(param) as unknown,
    `Failed to parse execute parameter`,
  );

  const result = safeJsonParse();

  if (result.isErr()) {
    reporter.report(result.error, { level: 'warn' });
    return;
  }

  if (!isValidPayload(result.value)) {
    reporter.report(new Error(`Invalid execute payload: missing or invalid "command" field`), {
      level: 'warn',
    });
    return;
  }

  return result.value;
};

function isValidPayload(value: unknown): value is ExecutePayload {
  if (!isPresent(value) || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.command === 'string';
}

function parseDeepLink(url: string): ExecutePayload | undefined {
  if (!url.startsWith(ORGNOTE_SCHEME)) {
    return;
  }

  const queryString = url.slice(ORGNOTE_SCHEME.length).split('#')[0]?.split('?')[1];

  if (!queryString) {
    return;
  }

  const params = new URLSearchParams(queryString);
  const executeParam = params.get(EXECUTE_PARAM);

  return parseExecuteParam(executeParam);
}

async function executeCommand(command: string, data: Record<string, string>): Promise<boolean> {
  const commands = api.core.useCommands();
  const targetCommand = commands.get(command);

  if (!targetCommand) {
    return false;
  }

  const safeExecute = to(
    () => commands.execute(command, data),
    `Failed to execute URL command "${command}"`,
  );

  const result = await safeExecute();

  if (result.isErr()) {
    reporter.reportError(result.error);
    return false;
  }

  return true;
}

async function clearExecuteParam(
  router: ReturnType<typeof useRouter>,
  route: ReturnType<typeof useRoute>,
): Promise<void> {
  const { [EXECUTE_PARAM]: _unused, ...restQuery } = route.query;
  void _unused;
  await router.replace({ query: restQuery });
}
