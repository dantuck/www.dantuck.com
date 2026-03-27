import { defineConfig } from 'astro/config';
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import UnoCSS from '@unocss/astro';
import { existsSync, createReadStream } from 'fs';
import { join, extname } from 'path';

/** Vite plugin: serves dist/pagefind/ during dev so search works after a build. */
const pagefindDevPlugin = {
  name: 'pagefind-dev',
  configureServer(server) {
    server.watcher.setMaxListeners(20);
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith('/pagefind/')) return next();
      const filePath = join(process.cwd(), 'dist', req.url.split('?')[0]);
      if (!existsSync(filePath)) return next();
      const ext = extname(filePath);
      const type = ext === '.js' ? 'application/javascript'
                 : ext === '.css' ? 'text/css'
                 : 'application/octet-stream';
      res.setHeader('Content-Type', type);
      createReadStream(filePath).pipe(res);
    });
  },
};

export default defineConfig({
  site: "https://www.dantuck.com/",
  redirects: {
    '/resume': '/about',
  },
  markdown: {
    shikiConfig: {
      theme: 'dracula',
    },
  },
  integrations: [svelte(), sitemap(), mdx(), UnoCSS({ injectReset: false })],
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
      },
    },
    plugins: [pagefindDevPlugin],
  },
});
