const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  const routeSelector = '.bg-muted\\/20';
  const positions = [250, 350, 404];
  for (const p of positions) {
    const data = await page.evaluate(({ sel, scroll }) => {
      const route = document.querySelector(sel);
      if (!route) return { error: 'route not found' };
      route.scrollTop = scroll;
      const search = document.querySelector('#scheme-search');
      const form = search?.querySelector('form');
      const heading = Array.from(search?.querySelectorAll('h2') || [])[0];
      const rect = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
      };
      return {
        setScrollTop: scroll,
        actualScrollTop: route.scrollTop,
        maxScroll: route.scrollHeight - route.clientHeight,
        searchRect: rect(search),
        headingRect: rect(heading),
        formRect: rect(form),
      };
    }, { sel: routeSelector, scroll: p });
    console.log('---', p, JSON.stringify(data));
    await page.screenshot({ path: `tmp-sahayak-scroll-${p}.png` });
  }
  await browser.close();
})();
