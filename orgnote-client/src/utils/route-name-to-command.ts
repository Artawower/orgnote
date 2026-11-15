import { camelCaseToWords } from './camel-case-to-words';

export function convertRouterNameToCommand(routerName: string | symbol): string {
  return camelCaseToWords(routerName.toString()).toLocaleLowerCase();
}
