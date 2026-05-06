const chromium = require('@sparticuz/chromium');
const { chromium: playwright } = require('playwright-core');
const { validateRequest, validateUrl } = require('../_utils');

module.exports = async (req, res) => {
  if (!validateRequest(req, res)) return;

  const { url } = req.query;
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

    const metadata = await page.evaluate(() => {
      const getMeta = name =>
        document.querySelector(`meta[name="${name}"]`)?.content ||
        document.querySelector(`meta[property="${name}"]`)?.content ||
        null;

      return {
        title: document.title,
        description: getMeta('description') || getMeta('og:description'),
        ogTitle: getMeta('og:title'),
        ogImage: getMeta('og:image'),
        ogUrl: getMeta('og:url'),
        ogType: getMeta('og:type'),
        twitterTitle: getMeta('twitter:title'),
        twitterImage: getMeta('twitter:image'),
        twitterCard: getMeta('twitter:card'),
        canonical: document.querySelector('link[rel="canonical"]')?.href || null,
        lang: document.documentElement.lang || null,
        charset: document.characterSet,
        keywords: getMeta('keywords'),
        author: getMeta('author'),
        robots: getMeta('robots'),
        h1: document.querySelector('h1')?.textContent?.trim() || null,
        favicon: document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')?.href || null,
      };
    });

    res.json({ success: true, url, elapsed_ms: Date.now() - t0, metadata });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
};
