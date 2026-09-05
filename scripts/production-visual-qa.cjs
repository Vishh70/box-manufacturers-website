const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://arti-enterprises.vercel.app/configurator.html';
const OUT_DIR = path.join(__dirname, '../qa/screenshots/production_configurator');

const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 }
];

async function setDimensions(page, l, w, h, plyIdx = null) {
    await page.evaluate((l, w, h, plyIdx) => {
        const len = document.getElementById('sliderLength');
        if(len) { len.value = l; len.dispatchEvent(new Event('input', { bubbles: true })); }
        
        const wid = document.getElementById('sliderWidth');
        if(wid) { wid.value = w; wid.dispatchEvent(new Event('input', { bubbles: true })); }
        
        const hgt = document.getElementById('sliderHeight');
        if(hgt) { hgt.value = h; hgt.dispatchEvent(new Event('input', { bubbles: true })); }
        
        if (plyIdx !== null) {
            const plyBtns = document.querySelectorAll('.cfg-ply');
            if (plyBtns.length > plyIdx) plyBtns[plyIdx].click();
        }
    }, l, w, h, plyIdx);
    await new Promise(resolve => setTimeout(resolve, 1500)); // wait for animation
}

async function runProductionQA() {
    console.log('Starting Live Production Visual QA (Baseline Mode)...');
    
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
        console.log(`\nTesting viewport: ${vp.width}x${vp.height}`);
        await page.setViewport(vp);
        
        // Hard refresh equivalent
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 3000)); // wait for Tidio/Three.js

        // 1. Default State
        await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-default.png`), fullPage: true });

        // Run detailed tests only on specific viewports to save time, or do all. Prompt implies all, but specific screenshots were named.
        if (vp.width === 360 || vp.width === 1440) {
            
            // 2. Large Box (400x300x250) + 5-ply
            console.log('Testing Large Box (400x300x250)...');
            await setDimensions(page, 400, 300, 250, 1); // 5-ply is index 1
            await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-large-box.png`), fullPage: true });
            // Save configured alias as requested by prompt
            if (vp.width === 360) fs.copyFileSync(path.join(OUT_DIR, `360-large-box.png`), path.join(OUT_DIR, `360-configured.png`));

            // 3. Small Box (100x100x100)
            console.log('Testing Small Box (100x100x100)...');
            await setDimensions(page, 100, 100, 100);
            await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-small-box.png`), fullPage: true });

            // 4. Wide Box (600x200x150)
            console.log('Testing Wide Box (600x200x150)...');
            await setDimensions(page, 600, 200, 150);
            await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-wide-box.png`), fullPage: true });

            // 5. Exploded View (Show Layers)
            console.log('Testing Exploded View...');
            await page.evaluate(() => {
                const actionBtns = document.querySelectorAll('.cfg-btn-icon');
                if (actionBtns.length > 0) actionBtns[0].click();
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-exploded.png`), fullPage: true });
            if (vp.width === 1440) fs.copyFileSync(path.join(OUT_DIR, `1440-exploded.png`), path.join(OUT_DIR, `exploded.png`));

            // 6. Reset
            console.log('Testing Reset...');
            await page.evaluate(() => {
                const actionBtns = document.querySelectorAll('.cfg-btn-icon');
                if (actionBtns.length > 1) actionBtns[1].click();
            });
            await new Promise(resolve => setTimeout(resolve, 1500));
            await page.screenshot({ path: path.join(OUT_DIR, `${vp.width}-reset.png`), fullPage: true });
            if (vp.width === 1440) fs.copyFileSync(path.join(OUT_DIR, `1440-reset.png`), path.join(OUT_DIR, `reset.png`));
        }
    }

    await browser.close();
    console.log('\nProduction Visual QA complete!');
}

runProductionQA().catch(err => {
    console.error('Production Visual QA failed:', err);
    process.exit(1);
});
