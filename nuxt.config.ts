// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineNuxtConfig({
  devtools: { enabled: false },

  experimental: {
    websocket: true,
  },

  modules: [
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/fonts",
    "@vee-validate/nuxt",
    "@nuxtjs/i18n",
    "nuxt-beastcss",
    "nuxt-vitalizer",
    "@vite-pwa/nuxt",
  ],

  // ── PWA ─────────────────────────────────────────────────────────────────
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Mirror Room",
      short_name: "MirrorRoom",
      description:
        "Real-time room for video calls, whiteboard, chat & screen share",
      theme_color: "#14b8a6",
      background_color: "#0f172a",
      display: "standalone",
      orientation: "portrait-primary",
      start_url: "/toolbox/rooms",
      scope: "/toolbox/",
      icons: [
        {
          src: "/pwa-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/pwa-512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: null,
      globPatterns: ["**/*.{js,css,html,png,svg,ico,woff2}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/unpkg\.com\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "cdn-cache",
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
            },
          },
        },
        {
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: "CacheFirst",
          options: {
            cacheName: "bootstrap-cache",
            expiration: {
              maxEntries: 5,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    devOptions: {
      enabled: false, // enable during dev if needed
      suppressWarnings: true,
      type: "module",
    },
  },

  vitalizer: {
    disableStylesheets: "entry",
    disablePrefetchLinks: true,
    disablePreloadLinks: true,
  },

  beastcss: {
    config: {
      pruneSource: true,
      additionalStylesheets: [],
      asyncLoad: true,
    },
  },

  fonts: {
    defaults: { preload: true, display: "swap" },
  },

  routeRules: {
    "/gramkit/**": { ssr: false },
    "/toolbox/**": { ssr: false },
  },

  veeValidate: {
    autoImports: false,
    componentNames: {
      Form: "VeForm",
      Field: "VeField",
      FieldArray: "VeFieldArray",
      ErrorMessage: "VeErrorMessage",
    },
  },

  i18n: {
    strategy: "no_prefix",
    langDir: "locales/",
    defaultLocale: "ar",
    lazy: true,
    locales: [
      {
        code: "ar",
        iso: "ar-EG",
        name: "العربية",
        file: "ar.json",
        dir: "rtl",
      },
      {
        code: "en",
        iso: "en-US",
        name: "English",
        file: "en.json",
        dir: "ltr",
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
    experimental: {
      jsTsFormatResource: true,
    },
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  css: ["@/assets/scss/main.scss"],

  image: {
    provider: "ipx",
    domains: ["api.uaehandball.org"],
    format: ["webp"],
    quality: 80,
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    densities: [1, 2],
  },

  app: {
    head: {
      title: "KKit",
      htmlAttrs: {
        lang: "ar",
      },
      meta: [
        { charset: "utf-8" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
        { name: "description", content: "" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "theme-color", content: "#14b8a6" },
      ],
      style: [
        {
          children: `
          html,body{margin:0}
          .navbar{position:fixed;top:0;width:100%}
          /* Safe area insets for notched phones */
          .room-page { padding-bottom: env(safe-area-inset-bottom, 0); }
        `,
        },
      ],
      link: [
        {
          rel: "preconnect",
          href: "https://cdn.jsdelivr.net",
        },
        {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
          media: "print",
          onload: "this.media='all'",
        },
        {
          rel: "icon",
          href: "/logo.png",
          type: "image/x-icon",
        },
        {
          rel: "apple-touch-icon",
          href: "/pwa-192.png",
        },
      ],
      script: [],
    },
  },

  vite: {
    resolve: {
      alias: {
        crypto: "crypto-browserify",
      },
    },
    plugins: [
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    build: {
      rollupOptions: {
        external: [],
      },
      commonjsOptions: {
        include: [/telegram/, /node_modules/],
        transformMixedEsModules: true,
      },
    },
    optimizeDeps: {
      include: ["telegram"],
    },
    define: {
      global: "globalThis",
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/scss/theme/variables.scss" as *;',
        },
      },
    },
  },

  nitro: {
    experimental: {
      websocket: true,
    },
    compressPublicAssets: true,
    minify: true,
    routeRules: {
      "/ws/**": {
        headers: {
          "Cache-Control": "no-store",
        },
      },
      "/.well-known/**": {
        cors: true,
        headers: {
          "Cache-Control": "public, max-age=86400",
        },
      },
      "/_ipx/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    },
  },

  compatibilityDate: "2025-12-29",
});
