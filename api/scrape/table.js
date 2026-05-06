const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, selector = 'table' } = req.query;
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const table = await page.$eval(selector, el => {
      const headers = Array.from(el.querySelectorAll('thead th, tr:first-child th'))
        .map(th => th.textContent.trim());
      const rows = Array.from(el.querySelectorAll('tbody tr, tr:not(:first-child)'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
      return { headers, rows };
    });

    res.json({ success: true, url, selector, elapsed_ms: Date.now() - t0, ...table });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
