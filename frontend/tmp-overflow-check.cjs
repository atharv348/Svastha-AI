const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });
  const data = await page.evaluate(() => ({
    bodyOverflow: getComputedStyle(document.body).overflow,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    docScrollHeight: document.documentElement.scrollHeight,
    bodyScrollHeight: document.body.scrollHeight,
    viewportH: window.innerHeight,
  }));
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
