import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

const isCI = !!process.env.CI;

export default defineConfig({
  site: isCI ? 'https://artawower.github.io' : undefined,
  base: isCI ? '/orgnote-api' : '/',
  integrations: [
    starlight({
      title: 'OrgNote API',
      logo: {
        src: './src/assets/logo.png',
      },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/Artawower/orgnote-api' },
        { icon: 'discord', label: 'Discord', href: 'https://discord.com/invite/SFpUb2vSDm' },
        { icon: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@OrgNote' },
      ],
      editLink: {
        baseUrl: 'https://github.com/Artawower/orgnote-api/edit/master/docs/',
      },
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        typeDocSidebarGroup,
      ],
      plugins: [
        starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: '../tsconfig.json',
          output: 'api',
          watch: !isCI,
          sidebar: {
            label: 'API Reference',
            collapsed: false,
          },
          typeDoc: {
            excludePrivate: true,
            excludeProtected: true,
            excludeInternal: true,
            blockTags: [
              '@param',
              '@returns',
              '@throws',
              '@example',
              '@remarks',
              '@see',
              '@deprecated',
              '@group',
              '@internal',
              '@export',
              '@summary',
            ],
          },
        }),
      ],
    }),
  ],
});
