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
    const searchSection = document.querySelector('#scheme-search');
    const searchCard = searchSection?.querySelector('.rounded-2xl');
    const searchForm = searchSection?.querySelector('form');

    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: Math.round(r.top),
        height: Math.round(r.height),
        bottom: Math.round(r.bottom),
      };
    };

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      route: routeContainer ? {
        className: routeContainer.className,
        clientHeight: routeContainer.clientHeight,
        scrollHeight: routeContainer.scrollHeight,
        scrollTop: routeContainer.scrollTop,
        overflowY: getComputedStyle(routeContainer).overflowY,
      } : null,
      pageRoot: pageRoot ? {
        className: pageRoot.className,
        clientHeight: pageRoot.clientHeight,
        scrollHeight: pageRoot.scrollHeight,
      } : null,
      searchSection: {
        section: rect(searchSection),
        card: rect(searchCard),
        form: rect(searchForm),
        computed: searchSection ? {
          sectionDisplay: getComputedStyle(searchSection).display,
          sectionMinHeight: getComputedStyle(searchSection).minHeight,
          cardMinHeight: searchCard ? getComputedStyle(searchCard).minHeight : null,
          cardHeight: searchCard ? getComputedStyle(searchCard).height : null,
          formDisplay: searchForm ? getComputedStyle(searchForm).display : null,
          formHeight: searchForm ? getComputedStyle(searchForm).height : null,
        } : null,
      },
      headings: Array.from(document.querySelectorAll('h2')).map((h) => h.textContent?.trim()),
      hasSchemesResults: !!document.querySelector('h2') && Array.from(document.querySelectorAll('h2')).some((h) => (h.textContent || '').includes('Schemes Found')),
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: 'tmp-sahayak-debug.png', fullPage: true });
  await browser.close();
})();
