const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const URL = 'http://localhost:3000/configurator.html';
const OUT_DIR = path.join(__dirname, '../qa/screenshots/configurator');

const VIEWPORTS = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
];

async function runVisualQA() {
    console.log('Starting Configurator Visual QA...');
    
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    for (const vp of VIEWPORTS) {
        console.log(`Testing viewport: ${vp.width}x${vp.height}`);
        await page.setViewport(vp);
        await page.goto(URL, { waitUntil: 'networkidle2' });

        // Hide chat widgets to prevent interference
        await page.evaluate(() => {
            const tidio = document.getElementById('tidio-chat-iframe');
            if (tidio) tidio.style.display = 'none';
            const wa = document.querySelector('.wa-float');
            if (wa) wa.style.display = 'none';
        });

        // Take default screenshot
        await page.screenshot({ path: path.join(OUT_DIR, `configurator-${vp.width}-default.png`), fullPage: true });

        // Configure a different size if mobile (for configured test)
        if (vp.width === 360) {
            console.log('Testing configured state (400x300x250) on 360x800...');
            
            // Wait for inputs
            await page.waitForSelector('#sliderLength');
            
            // Set 400x300x250
            await page.evaluate(() => {
                document.getElementById('sliderLength').value = 400;
                document.getElementById('sliderLength').dispatchEvent(new Event('input', { bubbles: true }));
                
                document.getElementById('sliderWidth').value = 300;
                document.getElementById('sliderWidth').dispatchEvent(new Event('input', { bubbles: true }));
                
                document.getElementById('sliderHeight').value = 250;
                document.getElementById('sliderHeight').dispatchEvent(new Event('input', { bubbles: true }));
                
                // Select 5-Ply
                const plyBtns = document.querySelectorAll('.cfg-ply-btn');
                if (plyBtns[1]) plyBtns[1].click();
            });
            
            // Wait for 3D model to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.screenshot({ path: path.join(OUT_DIR, `configurator-360-configured.png`), fullPage: true });
        }
    }

    await browser.close();
    console.log('Visual QA complete! Screenshots saved to qa/screenshots/configurator/');
}

runVisualQA().catch(err => {
    console.error('Visual QA failed:', err);
    process.exit(1);
});
