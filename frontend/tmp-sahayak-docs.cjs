const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });
  const info = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('#eligibility-form label')).map(l => l.textContent?.trim()).filter(Boolean);
    return {
      labelCount: labels.length,
      labels,
      htmlSnippet: document.querySelector('#eligibility-form')?.innerHTML?.slice(0, 4000)
    };
  });
  console.log(JSON.stringify({ labelCount: info.labelCount, labels: info.labels }, null, 2));
  await browser.close();
})();
