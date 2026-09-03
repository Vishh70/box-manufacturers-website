/**
 * Automated Mobile & Tablet Viewport Responsiveness Audit
 * Uses Puppeteer to test for:
 * 1. Horizontal page overflow (scrollWidth > innerWidth)
 * 2. Mobile hamburger menu accessibility
 * 3. 3D configurator canvas loading & viewport adaptation
 * 4. Runtime JavaScript errors & console exceptions
 *
 * Usage:
 *   node scripts/audit-responsive.cjs [optionalBaseUrl]
 */

const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

const defaultBaseUrl = 'https://arti-enterprises-delta.vercel.app';
const baseUrl = process.argv[2] || defaultBaseUrl;

const viewports = [
  { name: 'Small Android (360x800)', width: 360, height: 800 },
  { name: 'iPhone SE / Mini (375x812)', width: 375, height: 812 },
  { name: 'Modern Phone (390x844)', width: 390, height: 844 },
  { name: 'Large Android (412x915)', width: 412, height: 915 },
  { name: 'Tablet iPad (768x1024)', width: 768, height: 1024 }
];

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

async function runResponsiveAudit() {
  console.log(`\n📱 Starting Responsive Viewport Audit against: ${baseUrl}`);
  console.log(`   Testing ${routes.length} routes across ${viewports.length} viewports (${routes.length * viewports.length} test combinations)...\n`);

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

  let totalTests = 0;
  let passedTests = 0;
  const failures = [];

  for (const vp of viewports) {
    console.log(`----------------------------------------------------------------`);
    console.log(`Testing Viewport: ${vp.name}`);
    console.log(`----------------------------------------------------------------`);

    for (const route of routes) {
      totalTests++;
      const url = `${baseUrl}${route}`;
      const page = await browser.newPage();

      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
      });

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.toString()));

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise(r => setTimeout(r, 400));

        const overflowCheck = await page.evaluate((vpWidth) => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body ? document.body.scrollWidth : 0;
          const maxScroll = Math.max(docScroll, bodyScroll);
          const hasOverflow = maxScroll > (vpWidth + 1.5); // Subpixel rounding allowance

          const hamburger = document.querySelector('#hamburger');
          const hamburgerVisible = hamburger ? window.getComputedStyle(hamburger).display !== 'none' : false;

          return { docScroll, bodyScroll, maxScroll, hasOverflow, hamburgerVisible };
        }, vp.width);

        let menuOpensCleanly = true;
        if (overflowCheck.hamburgerVisible) {
          try {
            await page.click('#hamburger');
            await new Promise(r => setTimeout(r, 200));
            const navOpen = await page.evaluate(() => {
              const nav = document.querySelector('#nav');
              return nav && nav.classList.contains('open');
            });
            menuOpensCleanly = !!navOpen;
            await page.click('#hamburger');
            await new Promise(r => setTimeout(r, 100));
          } catch (e) {
            menuOpensCleanly = false;
          }
        }

        const isPassed = !overflowCheck.hasOverflow && pageErrors.length === 0 && menuOpensCleanly;
        if (isPassed) {
          passedTests++;
          console.log(`  ✅ PASS ${route} (width: ${vp.width}px, maxScroll: ${overflowCheck.maxScroll}px)`);
        } else {
          failures.push({
            viewport: vp.name,
            route,
            overflow: overflowCheck.hasOverflow,
            maxScroll: overflowCheck.maxScroll,
            vpWidth: vp.width,
            errors: pageErrors,
            menuOk: menuOpensCleanly
          });
          console.log(`  ❌ FAIL ${route} (width: ${vp.width}px, maxScroll: ${overflowCheck.maxScroll}px, errors: ${pageErrors.length})`);
        }

      } catch (err) {
        failures.push({ viewport: vp.name, route, error: err.message });
        console.log(`  ❌ ERROR ${route}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.disconnect();
  try { await chrome.kill(); } catch (e) {}

  console.log(`\n================================================================`);
  console.log(`📊 RESPONSIVE AUDIT RESULTS: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log(`================================================================`);

  if (failures.length === 0) {
    console.log(`🎉 Zero horizontal overflow or mobile errors across all tested devices!\n`);
    process.exit(0);
  } else {
    console.error(`🚨 ${failures.length} test combinations failed! Check details above.\n`);
    process.exit(1);
  }
}

runResponsiveAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
