import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import frappeui from 'frappe-ui/vite'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'
import LucideIcons from './lucideIcons'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    frappeui(),
    vue(),
    vueJsx(),
    Components({
      resolvers: [IconsResolver({ prefix: false, enabledCollections: ['lucide'] })],
    }),
    Icons({
      customCollections: {
        lucide: LucideIcons,
      },
    }),
    visualizer({ emitFile: true }),
    {
      name: 'transform-index.html',
      transformIndexHtml(html, context) {
        if (!context.server) {
          return html.replace(
            /<\/body>/,
            `
            <script>
                {% for key in boot %}
                window["{{ key }}"] = {{ boot[key] | tojson }};
                {% endfor %}
            </script>
            </body>
            `,
          )
        }
        return html
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,json}'],
        navigateFallbackDenylist: [/^\/assets\/.*$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.(css|js)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Gameplan',
        short_name: 'Gameplan',
        start_url: '/g/discussions',
        display: 'standalone',
        background_color: '#1e1e1e',
        theme_color: '#1e1e1e',
        description: 'Project Management Tool',
        lang: 'en',
        scope: '/g',
        orientation: 'any',
        categories: ['productivity'],
        icons: [
          {
            src: "/assets/gameplan/manifest/android/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/gameplan/manifest/android/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/assets/gameplan/manifest/android/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/assets/gameplan/manifest/android/android-launchericon-512-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ],
        screenshots: [
          {
            src: '/assets/gameplan/manifest/desktop-screenshot.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Gameplan'
          },
          {
            src: '/assets/gameplan/manifest/mobile-screenshot.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Gameplan'
          }
        ],
        id: '/g/discussions',
        dir: 'ltr',
        prefer_related_applications: false,
        display_override: ['window-controls-overlay']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifestFilename: 'manifest.json'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'tailwind.config.js': path.resolve(__dirname, 'tailwind.config.js'),
    },
  },
  optimizeDeps: {
    include: ['feather-icons', 'showdown', 'tailwind.config.js'],
  },
  build: {
    outDir: '../gameplan/public/frontend',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/tailwind.config.js/, /node_modules/],
    },
    sourcemap: true,
  },
})
