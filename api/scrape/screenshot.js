const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, full_page = 'false', width = '1280', height = '800' } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!validateUrl(url)) return res.status(400).json({ error: 'Invalid URL' });

  const vpWidth = Math.min(Math.max(parseInt(width) || 1280, 320), 3840);
  const vpHeight = Math.min(Math.max(parseInt(height) || 800, 240), 2160);

  let browser;
  try {
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.setViewportSize({ width: vpWidth, height: vpHeight });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const buffer = await page.screenshot({ fullPage: full_page === 'true' });
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
