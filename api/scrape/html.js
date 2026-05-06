const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, selector, full } = req.query;
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });

    let html;
    if (selector) {
      html = await page.locator(selector).first().innerHTML({ timeout: 8000 });
    } else if (full === 'true') {
      html = await page.content();
    } else {
      html = await page.locator('body').innerHTML();
    }

    const sizeKb = Math.round(Buffer.byteLength(html, 'utf-8') / 1024);
    const truncated = html.length > 100000;

    res.json({
      success: true,
      url,
      selector: selector || (full === 'true' ? 'document' : 'body'),
      sizeKb,
      truncated,
      elapsed_ms: Date.now() - t0,
      html: html.slice(0, 100000),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
