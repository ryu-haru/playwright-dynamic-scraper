const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, filter } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!validateUrl(url)) return res.status(400).json({ error: 'Invalid URL' });

  const t0 = Date.now();
  let browser;
  try {
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const origin = new URL(url).origin;

    const links = await page.evaluate((origin) => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({
          text: a.textContent?.trim().slice(0, 100) || '',
          href: a.href,
          isExternal: !a.href.startsWith(origin),
          rel: a.rel || null,
          title: a.title || null,
        }))
        .filter(l => l.href && l.href.startsWith('http'));
    }, origin);

    let filtered = links;
    if (filter === 'internal') filtered = links.filter(l => !l.isExternal);
    if (filter === 'external') filtered = links.filter(l => l.isExternal);

    const seen = new Set();
    const unique = filtered.filter(l => {
      if (seen.has(l.href)) return false;
      seen.add(l.href);
      return true;
    });

    res.json({
      success: true,
      url,
      total: unique.length,
      internal: unique.filter(l => !l.isExternal).length,
      external: unique.filter(l => l.isExternal).length,
      elapsed_ms: Date.now() - t0,
      links: unique,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
