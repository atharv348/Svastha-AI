const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  for (const v of [170, 240, 320, 420]) {
    await page.evaluate((scrollTop) => {
      const route = document.querySelector('.bg-muted\\/20');
      if (route instanceof HTMLElement) route.scrollTop = scrollTop;
    }, v);
    await page.waitForTimeout(50);
    await page.screenshot({ path: `tmp-sahayak-scroll-${v}.png`, fullPage: false });
  }

  await browser.close();
})();
