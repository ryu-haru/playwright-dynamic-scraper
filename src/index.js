const express = require('express');
const rateLimit = require('express-rate-limit');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

// ===== Shared browser instance =====
let browser = null;

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  browser.on('disconnected', () => { browser = null; });
  return browser;
}

async function withPage(fn) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close().catch(() => {});
  }
}

// RapidAPIはX-RapidAPI-Proxyで認証済みリクエストを送ってくる
function rapidApiAuth(req, res, next) {
  const proxySecret = req.headers['x-rapidapi-proxy-secret'];
  if (process.env.RAPIDAPI_PROXY_SECRET && proxySecret !== process.env.RAPIDAPI_PROXY_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use(limiter);
app.use(rapidApiAuth);

// テキスト取得
app.get('/scrape/text', async (req, res) => {
  const { url, selector, wait_for } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  try {
    const result = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (wait_for) await page.waitForSelector(wait_for, { timeout: 10000 }).catch(() => {});
      let text;
      if (selector) {
        text = await page.locator(selector).first().textContent({ timeout: 8000 });
      } else {
        text = await page.evaluate(() => document.body.innerText);
      }
      return text?.trim();
    });
    res.json({ url, text: result, selector: selector || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 複数要素をリスト取得
app.get('/scrape/list', async (req, res) => {
  const { url, selector, attribute } = req.query;
  if (!url || !selector) return res.status(400).json({ error: 'url と selector は必須です' });

  try {
    const items = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      return page.$$eval(selector, (els, attr) =>
        els.map(el => attr ? el.getAttribute(attr) : el.textContent?.trim()).filter(Boolean),
        attribute || null
      );
    });
    res.json({ url, selector, count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// テーブルデータ取得
app.get('/scrape/table', async (req, res) => {
  const { url, selector = 'table' } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  try {
    const table = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      return page.$eval(selector, el => {
        const headers = Array.from(el.querySelectorAll('thead th, tr:first-child th'))
          .map(th => th.textContent.trim());
        const rows = Array.from(el.querySelectorAll('tbody tr, tr:not(:first-child)'))
          .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
        return { headers, rows };
      });
    });
    res.json({ url, ...table });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// メタデータ取得（title, description, og:*, twitter:*, JSON-LD）
app.get('/scrape/meta', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  try {
    const meta = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return page.evaluate(() => {
        const get = (sel) => document.querySelector(sel)?.getAttribute('content') ?? null;
        const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
          .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
          .filter(Boolean);
        return {
          title: document.title || null,
          description: get('meta[name="description"]'),
          canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
          og: {
            title: get('meta[property="og:title"]'),
            description: get('meta[property="og:description"]'),
            image: get('meta[property="og:image"]'),
            url: get('meta[property="og:url"]'),
            type: get('meta[property="og:type"]'),
            site_name: get('meta[property="og:site_name"]'),
          },
          twitter: {
            card: get('meta[name="twitter:card"]'),
            title: get('meta[name="twitter:title"]'),
            description: get('meta[name="twitter:description"]'),
            image: get('meta[name="twitter:image"]'),
          },
          json_ld: jsonLd,
        };
      });
    });
    res.json({ url, ...meta });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// スクリーンショット
app.get('/scrape/screenshot', async (req, res) => {
  const { url, full_page = 'false' } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  try {
    const buffer = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      return page.screenshot({ fullPage: full_page === 'true' });
    });
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok', browser: browser?.isConnected() ?? false }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Scraping API 起動 → http://localhost:${PORT}`);
  getBrowser().then(() => console.log('Browser pre-warmed')).catch(() => {});
});
