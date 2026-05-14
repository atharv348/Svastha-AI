const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 1365, height: 768 } });
  const page = await context.newPage();
  await page.goto('http://localhost:8080/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('token', 'debug-token'));
  await page.goto('http://localhost:8080/sahayak', { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => {
    const shell = document.querySelector('.h-svh.w-full.flex.overflow-hidden');
    const routeContainer = document.querySelector('.bg-muted\\/20');
    const sidebarContent = document.querySelector('[data-sidebar="content"]');
    const pageRoot = routeContainer?.firstElementChild;
    const pageChildRects = pageRoot ? Array.from(pageRoot.children).map((el, i) => ({
      i,
      tag: el.tagName,
      cls: el.className,
      top: Math.round(el.getBoundingClientRect().top),
      height: Math.round(el.getBoundingClientRect().height),
      text: ((el.querySelector('h1,h2,h3')?.textContent) || '').trim().slice(0, 80),
    })) : [];

    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      body: { client: document.body.clientHeight, scroll: document.body.scrollHeight, overflowY: getComputedStyle(document.body).overflowY },
      html: { client: document.documentElement.clientHeight, scroll: document.documentElement.scrollHeight, overflowY: getComputedStyle(document.documentElement).overflowY },
      shell: shell ? { client: shell.clientHeight, scroll: shell.scrollHeight } : null,
      route: routeContainer ? {
        cls: routeContainer.className,
        client: routeContainer.clientHeight,
        scroll: routeContainer.scrollHeight,
        overflowY: getComputedStyle(routeContainer).overflowY,
      } : null,
      sidebar: sidebarContent ? {
        client: sidebarContent.clientHeight,
        scroll: sidebarContent.scrollHeight,
        overflowY: getComputedStyle(sidebarContent).overflowY,
      } : null,
      pageRoot: pageRoot ? {
        cls: pageRoot.className,
        client: pageRoot.clientHeight,
        scroll: pageRoot.scrollHeight,
      } : null,
      pageChildRects,
      h2Texts: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim()),
    };
  });

  console.log(JSON.stringify(metrics, null, 2));
  await page.screenshot({ path: 'tmp-sahayak-live.png', fullPage: true });
  await browser.close();
})();
