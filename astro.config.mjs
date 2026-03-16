import { defineConfig } from 'astro/config';
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import UnoCSS from '@unocss/astro';

export default defineConfig({
  site: "https://www.dantuck.com/",
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
  },
});
