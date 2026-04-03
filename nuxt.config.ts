// https://nuxt.com/docs/api/configuration/nuxt-config
import { nodePolyfills } from "vite-plugin-node-polyfills";
export default defineNuxtConfig({
  devtools: { enabled: false },
  // Enable WebSocket experimental features
  experimental: {
    websocket: true,
  },

  nitro: {
    experimental: {
      websocket: true,
    },
    // Don't compress WebSocket routes
    routeRules: {
      "/ws/**": {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    },
  },
  modules: [
    "@nuxt/icon",
    "@nuxt/image",
    "@nuxt/fonts",
    "@vee-validate/nuxt",
    "@nuxtjs/i18n",
    "nuxt-beastcss",
    "nuxt-vitalizer",
  ],

  vitalizer: {
    disableStylesheets: "entry",
    disablePrefetchLinks: true,
    disablePreloadLinks: true,
  },

  beastcss: {
    // Basic config
    config: {
      // 1. Critical CSS only
      pruneSource: true, // Removes the inlined CSS from the original stylesheet to avoid duplication

      // 2. Resource Management
      additionalStylesheets: [], // Add paths to extra CSS files (like Bootstrap CDN if you must use it)

      // 3. Performance
      asyncLoad: true, // Loads the remaining "non-critical" CSS asynchronously after the page paints
    },
  },

  fonts: {
    defaults: { preload: true, display: "swap" },
  },

  routeRules: {
    // Disable Server-Side Rendering for all routes starting with /account/
    "/gramkit/**": { ssr: false },
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
    strategy: "no_prefix", // بدون تغيير في الرابط
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
      useCookie: true, // IMPORTANT: Use cookies, not just browser settings
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
    // OPTIMIZATION: Define screens to generate specific responsive sizes
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
    // OPTIMIZATION: Prevent generating massive images for mobile
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
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content: "",
        },
      ],
      style: [
        {
          children: `
          html,body{margin:0}
          .navbar{position:fixed;top:0;width:100%}
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
      ],
      script: [],
    },
  },

  vite: {
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

  // only if image name change when changing the image
  nitro: {
    compressPublicAssets: true, // Gzip/Brotli compression for everything
    minify: true,
    routeRules: {
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
