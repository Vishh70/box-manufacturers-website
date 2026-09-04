const puppeteer = require('puppeteer');

(async () => {
    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch();
    
    async function checkSite(url) {
        console.log(`\nChecking: ${url}`);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        const footerText = await page.evaluate(() => {
            const el = document.querySelector('.footer-contact p:nth-child(2)');
            return el ? el.textContent : 'Not found';
        });
        
        const waLink = await page.evaluate(() => {
            const el = document.querySelector('.wa-float');
            return el ? el.href : 'Not found';
        });

        console.log(`Footer WA Text: ${footerText}`);
        console.log(`Floating WA Link: ${waLink}`);
        await page.close();
    }

    try {
        await checkSite('https://arti-enterprises.vercel.app/');
        await checkSite('https://arti-enterprises-delta.vercel.app/');
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
