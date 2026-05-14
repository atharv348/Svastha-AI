const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const form = document.querySelector('#eligibility-form form');
    const route = document.querySelector('.bg-muted\\/20');
    const docLabels = Array.from(document.querySelectorAll('#eligibility-form form .grid label')).map((el) => {
      const r = el.getBoundingClientRect();
      return { text: (el.textContent || '').trim(), top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    });
    const submitBtn = Array.from(document.querySelectorAll('#eligibility-form button')).find((b) => (b.textContent || '').includes('Find My Schemes'));
    const submitRect = submitBtn ? submitBtn.getBoundingClientRect() : null;
    const formRect = form ? form.getBoundingClientRect() : null;
    const routeRect = route ? route.getBoundingClientRect() : null;

    return {
      viewportH: window.innerHeight,
      scrollY: window.scrollY,
      routeScrollTop: route instanceof HTMLElement ? route.scrollTop : null,
      routeClientH: route instanceof HTMLElement ? route.clientHeight : null,
      routeScrollH: route instanceof HTMLElement ? route.scrollHeight : null,
      formRect: formRect ? { top: Math.round(formRect.top), bottom: Math.round(formRect.bottom), height: Math.round(formRect.height) } : null,
      routeRect: routeRect ? { top: Math.round(routeRect.top), bottom: Math.round(routeRect.bottom), height: Math.round(routeRect.height) } : null,
      submitRect: submitRect ? { top: Math.round(submitRect.top), bottom: Math.round(submitRect.bottom), height: Math.round(submitRect.height) } : null,
      docLabels,
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
