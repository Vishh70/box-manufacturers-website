const puppeteer = require('puppeteer-core');
const chromeLauncher = require('chrome-launcher');

const baseUrl = 'https://arti-enterprises.vercel.app';
const slugs = [
  '3ply-corrugated-box',
  '5ply-heavy-duty-box',
  '7ply-industrial-box',
  'ecommerce-mailer-box',
  'diecut-custom-box',
  'custom-printed-box',
  'food-grade-box',
  '5ply-export-quality-box',
  '3ply-flap-box-medium'
];

async function runValidation() {
  console.log(`\n🔍 Starting PRODUCT URL SEO VALIDATION against: ${baseUrl}`);
  
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

  let passed = 0;
  let failures = [];

  for (const slug of slugs) {
    const targetUrl = `${baseUrl}/product-detail.html?product=${slug}`;
    console.log(`\nTesting: ${targetUrl}`);
    
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', err => pageErrors.push(err.toString()));

    try {
      const response = await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
      
      const status = response.status();
      if (status !== 200) {
        throw new Error(`HTTP Status is ${status}, expected 200`);
      }

      const seoData = await page.evaluate(() => {
        const title = document.title;
        const metaDesc = document.querySelector('meta[name="description"]')?.content;
        const canonical = document.querySelector('link[rel="canonical"]')?.href;
        const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
        const ogImage = document.querySelector('meta[property="og:image"]')?.content;
        
        const schemaTag = document.querySelector('#productSchema');
        let schema = null;
        if (schemaTag) {
          try { schema = JSON.parse(schemaTag.textContent); } catch (e) {}
        }
        
        const productName = document.querySelector('#productTitle')?.textContent;
        const sku = document.querySelector('#productSku')?.textContent;
        
        return { title, metaDesc, canonical, ogTitle, ogImage, schema, productName, sku };
      });
      
      const expectedCanonical = targetUrl;
      const canonicalMatch = seoData.canonical === expectedCanonical;
      const isUniqueTitle = seoData.title && seoData.title.includes('ARTI ENTERPRISES');
      const schemaMatch = seoData.schema && seoData.schema.name;
      const noErrors = pageErrors.length === 0;

      if (!canonicalMatch) throw new Error(`Canonical mismatch! Expected: ${expectedCanonical}, Found: ${seoData.canonical}`);
      if (!isUniqueTitle) throw new Error(`Missing or invalid title: ${seoData.title}`);
      if (!schemaMatch) throw new Error(`Product schema missing or invalid`);
      if (!seoData.productName) throw new Error(`Product name did not render`);
      if (!noErrors) throw new Error(`Console errors detected: ${pageErrors.join(', ')}`);

      console.log(`  ✅ HTTP 200`);
      console.log(`  ✅ Rendered Product: ${seoData.productName}`);
      console.log(`  ✅ Canonical matches target: ${seoData.canonical}`);
      console.log(`  ✅ Schema validated: ${seoData.schema.name}`);
      console.log(`  ✅ Zero console errors`);
      passed++;

    } catch (err) {
      console.log(`  ❌ FAIL: ${err.message}`);
      failures.push({ slug, error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.disconnect();
  try { await chrome.kill(); } catch (e) {}

  console.log(`\n================================================================`);
  console.log(`📊 PRODUCT URL VALIDATION RESULTS: ${passed}/${slugs.length} Passed`);
  console.log(`================================================================\n`);
  
  if (failures.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runValidation();
