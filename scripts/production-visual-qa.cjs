const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'https://arti-enterprises.vercel.app/configurator.html';
const OUT_DIR = path.join(__dirname, '../qa/screenshots/production_configurator');

const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
];

async function runProductionQA() {
    console.log('Starting Live Production Visual QA...');
    
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
        console.log(`Testing viewport: ${vp.width}x${vp.height}`);
        await page.setViewport(vp);
        
        // Wait for page to load and network to settle
        await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        // Wait an extra 3 seconds for Tidio widget and 3D rendering to fully settle
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take default screenshot
        await page.screenshot({ path: path.join(OUT_DIR, `prod-configurator-${vp.width}-default.png`), fullPage: true });

        // Configure a different size if mobile (for configured test)
        if (vp.width === 360) {
            console.log('Testing configured state (400x300x250) on 360x800...');
            
            // Wait for inputs
            await page.waitForSelector('#sliderLength');
            
            // Set 400x300x250 and click buttons
            await page.evaluate(() => {
                const len = document.getElementById('sliderLength');
                if(len) { len.value = 400; len.dispatchEvent(new Event('input', { bubbles: true })); }
                
                const wid = document.getElementById('sliderWidth');
                if(wid) { wid.value = 300; wid.dispatchEvent(new Event('input', { bubbles: true })); }
                
                const hgt = document.getElementById('sliderHeight');
                if(hgt) { hgt.value = 250; hgt.dispatchEvent(new Event('input', { bubbles: true })); }
                
                // Select 5-Ply
                const plyBtns = document.querySelectorAll('.cfg-ply-btn');
                if (plyBtns.length > 1) plyBtns[1].click();
            });
            
            // Wait for 3D model to update
            await new Promise(resolve => setTimeout(resolve, 1500));
            await page.screenshot({ path: path.join(OUT_DIR, `prod-configurator-360-configured.png`), fullPage: true });
            
            console.log('Testing Show Layers...');
            await page.evaluate(() => {
                const actionBtns = document.querySelectorAll('.cfg-btn-icon');
                // The first button is usually "Show Layers"
                if (actionBtns.length > 0) actionBtns[0].click();
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            await page.screenshot({ path: path.join(OUT_DIR, `prod-configurator-360-layers.png`), fullPage: true });
            
            console.log('Testing Reset...');
            await page.evaluate(() => {
                const actionBtns = document.querySelectorAll('.cfg-btn-icon');
                // The second button is usually "Reset"
                if (actionBtns.length > 1) actionBtns[1].click();
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            await page.screenshot({ path: path.join(OUT_DIR, `prod-configurator-360-reset.png`), fullPage: true });
        }
    }

    await browser.close();
    console.log('Production Visual QA complete! Screenshots saved to qa/screenshots/production_configurator/');
}

runProductionQA().catch(err => {
    console.error('Production Visual QA failed:', err);
    process.exit(1);
});
