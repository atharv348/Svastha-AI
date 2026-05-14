const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const route = document.querySelector('.bg-muted\\/20');
    if (route instanceof HTMLElement) route.scrollTop = 135;
  });
  await page.waitForTimeout(100);
  await page.screenshot({ path: 'tmp-sahayak-scroll135.png', fullPage: false });
  const stats = await page.evaluate(() => {
    const route = document.querySelector('.bg-muted\\/20');
    return route instanceof HTMLElement ? { scrollTop: route.scrollTop, client: route.clientHeight, scroll: route.scrollHeight } : null;
  });
  console.log(JSON.stringify(stats));
  await browser.close();
})();
