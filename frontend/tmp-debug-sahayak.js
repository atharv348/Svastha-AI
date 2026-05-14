const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const routeContainer = document.querySelector('.bg-muted\\/20');
    const pageRoot = routeContainer?.firstElementChild;
    const sections = Array.from(document.querySelectorAll('section')).map((el) => ({
      text: (el.querySelector('h1,h2,h3')?.textContent || '').trim(),
      top: Math.round(el.getBoundingClientRect().top),
      height: Math.round(el.getBoundingClientRect().height),
    }));

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      bodyScrollHeight: document.body.scrollHeight,
      docScrollHeight: document.documentElement.scrollHeight,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
      route: routeContainer ? {
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
      sections,
      hasSearchHeading: !!Array.from(document.querySelectorAll('h2')).find(h => (h.textContent || '').includes('Search Government Schemes')),
      hasFindMySchemesBtn: !!Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Find My Schemes')),
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: 'tmp-sahayak-debug.png', fullPage: true });
  await browser.close();
})();
