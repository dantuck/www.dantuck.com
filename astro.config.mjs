import { defineConfig } from 'astro/config';
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import image from "@astrojs/image";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: "https://www.dantuck.com/",
  markdown: {
    drafts: false,
    shikiConfig: {
      theme: 'dracula',
    },
  },
  integrations: [svelte(), sitemap(), image(), mdx()],
  legacy: {
    // Example: Add support for legacy Markdown features
    astroFlavoredMarkdown: true,
  },
});