import { literal, object, safeParse, string, variant, type InferOutput } from 'valibot';

export const linkMenuDataSchema = variant('kind', [
  object({
    kind: literal('org'),
    target: string(),
    title: string(),
  }),
  object({
    kind: literal('external'),
    url: string(),
  }),
]);

export type LinkMenuData = InferOutput<typeof linkMenuDataSchema>;

export const parseLinkMenuData = (data: unknown): LinkMenuData | undefined => {
  const result = safeParse(linkMenuDataSchema, data);
  return result.success ? result.output : undefined;
};
