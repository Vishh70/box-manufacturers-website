#!/usr/bin/env node

/**
 * Domain Updater Utility
 * Synchronizes canonical URLs, Open Graph tags, sitemap.xml, robots.txt,
 * and JavaScript configuration when switching to a custom domain.
 *
 * Usage:
 *   node scripts/update-domain.js https://your-new-domain.com
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const targetDomain = process.argv[2];

if (!targetDomain || !targetDomain.startsWith('http')) {
  console.error('❌ Error: Please provide a valid domain starting with http:// or https://');
  console.error('Example: node scripts/update-domain.js https://artienterprises.in');
  process.exit(1);
}

// Clean trailing slash
const cleanNewDomain = targetDomain.replace(/\/+$/, '');

// Detect current domain from site-config.js
const siteConfigPath = path.join(rootDir, 'js', 'site-config.js');
let currentDomain = 'https://arti-enterprises-delta.vercel.app';

if (fs.existsSync(siteConfigPath)) {
  const configContent = fs.readFileSync(siteConfigPath, 'utf-8');
  const match = configContent.match(/website:\s*['"]([^'"]+)['"]/);
  if (match && match[1]) {
    currentDomain = match[1].replace(/\/+$/, '');
  }
}

console.log(`\n🌐 Domain Synchronization Tool`);
console.log(`-----------------------------------------------`);
console.log(`Current Domain: ${currentDomain}`);
console.log(`Target Domain:  ${cleanNewDomain}`);
console.log(`-----------------------------------------------\n`);

if (currentDomain === cleanNewDomain) {
  console.log('ℹ️ Current domain matches target domain. No changes required.');
  process.exit(0);
}

const targetExtensions = ['.html', '.js', '.xml', '.txt'];
const filesToScan = [
  'robots.txt',
  'sitemap.xml',
  'index.html',
  'about.html',
  'products.html',
  'product-detail.html',
  'configurator.html',
  'blog.html',
  'blog-article.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  'js/site-config.js',
  'js/main.js',
  'js/blog-data.js',
  'js/blog-article-page.js',
  'js/product-detail-page.js'
];

let totalReplaced = 0;
let updatedFilesCount = 0;

for (const relPath of filesToScan) {
  const filePath = path.join(rootDir, relPath);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(currentDomain)) {
    const occurrences = content.split(currentDomain).length - 1;
    const newContent = content.replaceAll(currentDomain, cleanNewDomain);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`  ✅ Updated ${relPath} (${occurrences} occurrences)`);
    totalReplaced += occurrences;
    updatedFilesCount++;
  }
}

console.log(`\n🎉 Success! Replaced ${totalReplaced} domain references across ${updatedFilesCount} files.`);
console.log(`👉 Next steps:`);
console.log(`   1. Run 'npm run build' to regenerate the production bundle.`);
console.log(`   2. Run 'npm run audit:routes' to verify.`);
console.log(`   3. Deploy to production.\n`);
