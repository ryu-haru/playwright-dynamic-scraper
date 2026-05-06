const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, selector, attribute } = req.query;
  if (!url || !selector) return res.status(400).json({ error: 'url and selector are required' });
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const items = await page.$$eval(selector, (els, attr) =>
      els.map(el => attr ? el.getAttribute(attr) : el.textContent?.trim()).filter(Boolean),
      attribute || null
    );
    res.json({ success: true, url, selector, count: items.length, elapsed_ms: Date.now() - t0, items });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
