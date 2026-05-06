const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, selector, wait_for } = req.query;
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
    if (wait_for) await page.waitForSelector(wait_for, { timeout: 8000 }).catch(() => {});
    const text = selector
      ? await page.locator(selector).first().textContent({ timeout: 8000 })
      : await page.evaluate(() => document.body.innerText);
    res.json({ success: true, url, selector: selector || null, elapsed_ms: Date.now() - t0, text: text?.trim() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
