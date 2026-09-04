/**
 * Fast Desktop & Route Integrity Audit
 * Uses Puppeteer to test all 14 routes for:
 * 1. HTTP 200 responses
 * 2. Zero console errors
 * 3. Zero runtime JavaScript exceptions
 * 4. Zero failed network assets (CSS, JS, images)
 *
 * Usage:
 *   node scripts/audit-routes.cjs [optionalBaseUrl]
 */

const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');

const defaultBaseUrl = 'https://arti-enterprises.vercel.app';
const baseUrl = process.argv[2] || defaultBaseUrl;

const routes = [
  '/',
  '/about.html',
  '/products.html',
  '/product-detail.html?product=3ply-corrugated-box',
  '/configurator.html',
  '/blog.html',
  '/blog-article.html?slug=how-to-choose-the-right-corrugated-box',
  '/blog-article.html?slug=3-ply-vs-5-ply-vs-7-ply-guide',
  '/blog-article.html?slug=best-shipping-boxes-for-ecommerce',
  '/blog-article.html?slug=custom-printed-boxes-branding-guide',
  '/blog-article.html?slug=sustainable-corrugated-packaging-green-choice',
  '/contact.html',
  '/privacy.html',
  '/terms.html'
];

async function runRouteAudit() {
  console.log(`\n🔍 Starting Desktop Route Integrity Audit against: ${baseUrl}`);
  console.log(`   Auditing ${routes.length} routes...\n`);

  let chrome;
  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless=new', '--disable-gpu', '--no-sandbox']
    });
  } catch (err) {
    console.error('❌ Failed to launch Chrome:', err.message);
    process.exit(1);
  }

  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${chrome.port}`
  });

  let passedCount = 0;
  const failures = [];

  for (const route of routes) {
    const page = await browser.newPage();
    const errors = [];
    const failedRequests = [];

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    page.on('pageerror', err => errors.push(err.toString()));

    page.on('requestfailed', req => {
      if (req.url().includes('tidio.co') || req.url().includes('google-analytics')) return;
      failedRequests.push({ url: req.url(), failure: req.failure() ? req.failure().errorText : 'Unknown' });
    });

    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise(r => setTimeout(r, 400));

      const status = response ? response.status() : 'No response';
      const isOk = status === 200 && errors.length === 0 && failedRequests.length === 0;

      if (isOk) {
        passedCount++;
        console.log(`  ✅ [200] ${route}`);
      } else {
        failures.push({ route, status, errors, failedRequests });
        console.log(`  ❌ [${status}] ${route} | Errors: ${errors.length}, Failed Requests: ${failedRequests.length}`);
      }
    } catch (err) {
      failures.push({ route, error: err.message });
      console.log(`  ❌ ERROR ${route}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.disconnect();
  try { await chrome.kill(); } catch (e) {}

  console.log(`\n================================================================`);
  console.log(`📊 ROUTE INTEGRITY RESULTS: ${passedCount}/${routes.length} Passed`);
  console.log(`================================================================`);

  if (failures.length === 0) {
    console.log(`🎉 100% clean: 0 console errors, 0 failed network requests across all routes!\n`);
    process.exit(0);
  } else {
    console.error(`🚨 ${failures.length} routes reported errors. Review log above.\n`);
    process.exit(1);
  }
}

runRouteAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
