import { type Command } from 'orgnote-api';
import { camelCaseToWords } from 'src/utils/camel-case-to-words';
import { convertRouterNameToCommand } from 'src/utils/route-name-to-command';
import { isPresent } from 'orgnote-api/utils';
import { type Router, type RouteRecordNormalized, useRouter } from 'vue-router';

const hasRouteName = (
  r: RouteRecordNormalized,
): r is RouteRecordNormalized & { name: string | symbol } => {
  return isPresent(r.name);
};

export function getRoutesCommands(router?: Router): Command[] {
  router ??= useRouter();
  const routesCommands: Command[] = router
    .getRoutes()
    .filter(hasRouteName)
    .filter((r) => !r.path.includes(':') && r?.meta?.programmaticalNavigation !== false)
    .map((r) => ({
      command: convertRouterNameToCommand(r.name),
      title: camelCaseToWords(r.name.toString()) ?? '',
      description: `Open ${r.name.toString()}`,
      group: 'navigation' as const,
      icon: (r.meta?.icon as string) ?? 'assistant_navigation',
      handler: () => router!.push({ name: r.name }),
    }));

  return routesCommands;
}
