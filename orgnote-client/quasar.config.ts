// Configuration for your app
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const DEFAULT_DEV_PORT = 3001;
const DEFAULT_UPDATE_CHANNEL = 'latest';
const UPDATE_CHANNEL_ENV_NAME = 'ORGNOTE_UPDATE_CHANNEL';
const ENABLE_DEVTOOLS_ENV_NAME = 'ORGNOTE_ENABLE_DEVTOOLS';
const MACOS_SIGNING_IDENTITY_ENV_NAME = 'ORGNOTE_MACOS_SIGNING_IDENTITY';

const getUpdateChannel = (): string =>
  process.env[UPDATE_CHANNEL_ENV_NAME]?.trim() || DEFAULT_UPDATE_CHANNEL;

const getEnableDevtools = (): boolean => process.env[ENABLE_DEVTOOLS_ENV_NAME] === 'true';

const getMacSigningIdentity = (): string | undefined =>
  process.env[MACOS_SIGNING_IDENTITY_ENV_NAME]?.trim() || undefined;

export default defineConfig((ctx) => {
  const updateChannel = getUpdateChannel();
  const enableDevtools = getEnableDevtools();

  return {
    // https://v2.quasar.dev/quasar-cli-vite/prefetch-feature
    // preFetch: true,

    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli-vite/boot-files
    boot: [
      { server: false, path: 'perf-bootstrap' },
      'directives',
      'polyfills',
      'logger',
      'repositories',
      'preload-store-data',
      'report',
      { server: false, path: 'error-handler' },
      'default-file-systems',
      'i18n',
      'axios',
      { server: false, path: 'infrastructure' },
      'api',
      { server: false, path: 'highlightjs' },
      {
        server: false,
        path: 'pane-snapshot',
      },
      'default-commands',
      'viewport-patch',
      'default-buffer-providers',
      'default-file-readers',
      { path: 'default-cron-tasks', server: false },
      { path: 'default-queues', server: false },
      { path: 'file-index', server: false },
      { path: 'extensions', server: false },
      { path: 'file-guards', server: false },
      { path: 'files-watchers', server: false },
      { path: 'auth', server: false },
      { path: 'app-update', server: false },
      { path: 'electron-updater', server: false },
      { path: 'fs-sync-bridge', server: false },
      { path: 'electron-deeplink', server: false },
      { path: 'katex', server: false },
      { path: 'app-ready-sentinel', server: false },
    ],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#css
    css: ['app.scss'],

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v7',
      // 'fontawesome-v6',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!

      'fontawesome-v6',
      'roboto-font', // optional, you are not bound to it
      'material-icons', // optional, you are not bound to it
      'material-icons-outlined',
      'material-symbols-outlined',
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#build
    build: {
      target: {
        browser: ['es2020', 'firefox78', 'chrome87', 'safari14'],
        node: 'node20',
      },

      typescript: {
        strict: true,
        vueShim: true,
        // extendTsConfig (tsConfig) {}
      },

      vueRouterMode: 'history',
      // vueRouterBase,
      // vueDevtools,
      // vueOptionsAPI: false,

      // rebuildCache: true, // rebuilds Vite/linter/etc cache on startup

      // publicPath: '/',
      // analyze: true,
      env: {
        API_URL: process.env.VITE_API_URL ?? '',
        AUTH_URL: process.env.VITE_AUTH_URL ?? '',
        WS_URL: process.env.VITE_WS_URL ?? '',
        DEPLOYMENT_ENV: process.env.VITE_DEPLOYMENT_ENV ?? '',
      },
      sourcemap: process.env.VITE_SOURCEMAP === 'true',
      // rawDefine: {}
      // ignorePublicFolder: true,
      // minify: false,
      // polyfillModulePreload: true,
      // distDir

      extendViteConf(viteConf) {
        viteConf.resolve = viteConf.resolve || {};
        viteConf.resolve.alias = {
          ...viteConf.resolve.alias,
          util: 'util/',
        };

        viteConf.build = viteConf.build || {};
        viteConf.build.minify = 'terser';
        viteConf.build.terserOptions = {
          keep_fnames: true,
          keep_classnames: true,
          mangle: {
            keep_fnames: true,
            keep_classnames: true,
          },
        };
      },
      // viteVuePluginOptions: {},

      vitePlugins: [
        [
          '@intlify/unplugin-vue-i18n/vite',
          {
            // if you want to use Vue I18n Legacy API, you need to set `compositionOnly: false`
            // compositionOnly: false,

            // if you want to use named tokens in your Vue I18n messages, such as 'Hello {name}',
            // you need to set `runtimeOnly: false`
            // runtimeOnly: false,

            ssr: ctx.modeName === 'ssr',

            // you need to set i18n resource including paths !
            include: [fileURLToPath(new URL('./src/i18n', import.meta.url))],
          },
        ],

        [
          'vite-plugin-checker',
          {
            vueTsc: true,
            eslint: {
              lintCommand: 'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
              useFlatConfig: true,
            },
          },
          { server: false },
        ],
      ],
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#devserver
    devServer: {
      // https: true,
      host: '0.0.0.0',
      https:
        process.env.VITE_DISABLE_HTTPS !== 'true' &&
        fs.existsSync('.certs/key.pem') &&
        fs.existsSync('.certs/cert.pem')
          ? {
              key: fs.readFileSync('.certs/key.pem'),
              cert: fs.readFileSync('.certs/cert.pem'),
            }
          : undefined,
      port: Number(process.env.VITE_DEV_PORT) || DEFAULT_DEV_PORT,
      strictPort: true,
      open: {
        app: { name: 'arc' },
      },
      proxy: {
        '/v1': {
          target: process.env.API_URL || 'http://localhost:8000',
          changeOrigin: true,
          ws: true,
        },
        '/media': {
          target: process.env.API_URL || 'http://localhost:8000',
        },
        '/api/ws': {
          target: process.env.API_URL || 'http://localhost:8000',
          changeOrigin: true,
          ws: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/ws/, '/ws'),
        },
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import strategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: ['Notify', 'Loading'],
    },

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli-vite/quasar-config-file#sourcefiles
    // sourceFiles: {
    //   rootComponent: 'src/App.vue',
    //   router: 'src/router/index',
    //   store: 'src/store/index',
    //   pwaRegisterServiceWorker: 'src-pwa/register-service-worker',
    //   pwaServiceWorker: 'src-pwa/custom-service-worker',
    //   pwaManifestFile: 'src-pwa/manifest.json',
    //   electronMain: 'src-electron/electron-main',
    //   electronPreload: 'src-electron/electron-preload'
    //   bexManifestFile: 'src-bex/manifest.json
    // },

    // https://v2.quasar.dev/quasar-cli-vite/developing-ssr/configuring-ssr
    ssr: {
      prodPort: 3000,
      middlewares: ['render'],
      pwa: true,
    },

    // https://v2.quasar.dev/quasar-cli-vite/developing-pwa/configuring-pwa
    pwa: {
      workboxMode: 'InjectManifest',
      injectPwaMetaTags: false,
      swFilename: 'sw.js',
      manifestFilename: 'manifest.json',
      useCredentialsForManifestTag: false,
      metaVariables: {
        appleMobileWebAppStatusBarStyle: 'black-translucent',
        appleMobileWebAppCapable: 'yes',
        msapplicationTileColor: 'red',
      },
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/configuring-electron
    electron: {
      extendElectronMainConf(esbuildConf) {
        esbuildConf.define = {
          ...esbuildConf.define,
          'process.env.ORGNOTE_UPDATE_CHANNEL': JSON.stringify(updateChannel),
          'process.env.ORGNOTE_ENABLE_DEVTOOLS': JSON.stringify(enableDevtools),
        };
      },
      // extendElectronPreloadConf (esbuildConf) {},

      // extendPackageJson (json) {},

      // Electron preload scripts (if any) from /src-electron, WITHOUT file extension
      preloadScripts: ['electron-preload'],

      // specify the debugging port to use for the Electron app when running in development mode
      inspectPort: 5858,

      bundler: 'builder',

      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options
        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',
        // Windows only
        // win32metadata: { ... }
        extraResource: ['src-electron/resources'],
      },

      builder: {
        // https://www.electron.build/configuration/configuration

        appId: 'com.orgnote.client',
        publish: [
          {
            provider: 'github',
            owner: 'Artawower',
            repo: 'orgnote-client',
            channel: updateChannel,
          },
        ],
        mac: {
          icon: 'src-electron/icons/icon.icon',
          target: [
            { target: 'dmg', arch: ['arm64'] },
            { target: 'zip', arch: ['arm64'] },
          ],
          artifactName: 'orgnote-macos-${arch}-${version}.${ext}',
          identity: getMacSigningIdentity() ?? '-',
          hardenedRuntime: false,
          gatekeeperAssess: false,
        },
        dmg: {
          icon: 'src-electron/icons/icon.icns',
        },
        linux: {
          target: [
            { target: 'rpm', arch: ['x64', 'arm64'] },
            { target: 'AppImage', arch: ['x64', 'arm64'] },
          ],
          artifactName: 'orgnote-linux-${arch}-${version}.${ext}',
          category: 'Office',
          maintainer: 'app.orgnote@gmail.com',
          vendor: 'OrgNote',
          synopsis: 'OrgRoam note-taking for Zettelkasten',
          description: 'OrgRoam implementation for web and mobile devices.',
          icon: 'src-electron/icons/icon.png',
        },
        extraResources: [
          {
            from: 'src-electron/resources',
            to: 'resources',
          },
        ],
      } as any,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli-vite/developing-browser-extensions/configuring-bex
    bex: {
      // extendBexScriptsConf (esbuildConf) {},
      // extendBexManifestJson (json) {},

      /**
       * The list of extra scripts (js/ts) not in your bex manifest that you want to
       * compile and use in your browser extension. Maybe dynamic use them?
       *
       * Each entry in the list should be a relative filename to /src-bex/
       *
       * @example [ 'my-script.ts', 'sub-folder/my-other-script.js' ]
       */
      extraScripts: [],
    },
  };
});
