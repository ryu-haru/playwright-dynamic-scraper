const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url, format = 'A4', landscape = 'false' } = req.query;
  if (!url) return res.status(400).json({ error: 'url is required' });
  if (!validateUrl(url)) return res.status(400).json({ error: 'Invalid URL' });

  const validFormats = ['A4', 'A3', 'Letter', 'Legal'];
  const pageFormat = validFormats.includes(format) ? format : 'A4';

  let browser;
  try {
    browser = await playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });

    const pdfBuffer = await page.pdf({
      format: pageFormat,
      landscape: landscape === 'true',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="page.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
