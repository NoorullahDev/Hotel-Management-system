const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  
  console.log("Navigating to Login...");
  await page.goto('http://localhost:3000/login');
  
  console.log("Logging in...");
  await page.fill('input[type="text"]', 'noor');
  await page.fill('input[type="password"]', '123456');
  
  await page.click('button:has-text("Login")');

  console.log("Waiting for navigation to dashboard...");
  await page.waitForTimeout(3000);

  console.log("Navigating to Reports...");
  await page.goto('http://localhost:3000/reports');
  
  console.log("Waiting for Export PDF button...");
  await page.waitForTimeout(3000);
  
  console.log("Clicking Export PDF...");
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Export PDF')
  ]);
  
  const destPath = path.join(__dirname, 'test-report-updated.pdf');
  await download.saveAs(destPath);
  
  console.log('PDF saved to', destPath);
  await browser.close();
})();
