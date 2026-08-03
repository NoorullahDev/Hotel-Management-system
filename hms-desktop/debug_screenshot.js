const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  
  console.log("Navigating to Reports...");
  await page.goto('http://localhost:3000/reports');
  
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(__dirname, 'reports_page.png') });
  
  console.log('Screenshot saved to reports_page.png');
  await browser.close();
})();
