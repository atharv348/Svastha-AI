const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const routeContainer = document.querySelector('.bg-muted\\/20');
    const shell = document.querySelector('.h-screen.w-full.flex.overflow-hidden');
    const appRoot = document.getElementById('root');
    const pageRoot = routeContainer?.firstElementChild;
    const eligibility = Array.from(document.querySelectorAll('h2')).find(h => (h.textContent || '').includes('Check Your Eligibility'))?.closest('section');
    const search = Array.from(document.querySelectorAll('h2')).find(h => (h.textContent || '').includes('Search Government Schemes'))?.closest('section');

    return {
      viewportH: window.innerHeight,
      body: {
        clientHeight: document.body.clientHeight,
        scrollHeight: document.body.scrollHeight,
        overflowY: getComputedStyle(document.body).overflowY,
      },
      html: {
        clientHeight: document.documentElement.clientHeight,
        scrollHeight: document.documentElement.scrollHeight,
        overflowY: getComputedStyle(document.documentElement).overflowY,
      },
      root: appRoot ? {
        clientHeight: appRoot.clientHeight,
        scrollHeight: appRoot.scrollHeight,
      } : null,
      shell: shell ? {
        clientHeight: shell.clientHeight,
        scrollHeight: shell.scrollHeight,
      } : null,
      routeContainer: routeContainer ? {
        className: routeContainer.className,
        clientHeight: routeContainer.clientHeight,
        scrollHeight: routeContainer.scrollHeight,
        overflowY: getComputedStyle(routeContainer).overflowY,
      } : null,
      pageRoot: pageRoot ? {
        className: pageRoot.className,
        clientHeight: pageRoot.clientHeight,
        scrollHeight: pageRoot.scrollHeight,
      } : null,
      eligibility: eligibility ? {
        top: Math.round(eligibility.getBoundingClientRect().top),
        height: Math.round(eligibility.getBoundingClientRect().height),
      } : null,
      search: search ? {
        top: Math.round(search.getBoundingClientRect().top),
        height: Math.round(search.getBoundingClientRect().height),
      } : null,
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: 'tmp-sahayak-metrics.png', fullPage: true });
  await browser.close();
})();
