import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const staticEntries = ['css', 'js', 'images', 'robots.txt', 'sitemap.xml'];

function copyStaticSiteAssets() {
  return {
    name: 'copy-static-site-assets',
    writeBundle() {
      for (const entry of staticEntries) {
        const source = resolve(__dirname, entry);
        const target = resolve(__dirname, 'dist', entry);

        if (!existsSync(source)) {
          continue;
        }

        cpSync(source, target, { recursive: true });
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), copyStaticSiteAssets()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        blog: resolve(__dirname, 'blog.html'),
        'blog-article': resolve(__dirname, 'blog-article.html'),
        configurator: resolve(__dirname, 'configurator.html'),
        contact: resolve(__dirname, 'contact.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        'product-detail': resolve(__dirname, 'product-detail.html'),
        products: resolve(__dirname, 'products.html'),
        terms: resolve(__dirname, 'terms.html')
      }
    }
  }
});

