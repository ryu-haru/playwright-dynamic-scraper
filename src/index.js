const express = require('express');
const rateLimit = require('express-rate-limit');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

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

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    if (wait_for) await page.waitForSelector(wait_for, { timeout: 10000 }).catch(() => {});

    let text;
    if (selector) {
      text = await page.locator(selector).first().textContent({ timeout: 8000 });
    } else {
      text = await page.evaluate(() => document.body.innerText);
    }

    res.json({ url, text: text?.trim(), selector: selector || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

// 複数要素をリスト取得
app.get('/scrape/list', async (req, res) => {
  const { url, selector, attribute } = req.query;
  if (!url || !selector) return res.status(400).json({ error: 'url と selector は必須です' });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const items = await page.$$eval(selector, (els, attr) =>
      els.map(el => attr ? el.getAttribute(attr) : el.textContent?.trim()).filter(Boolean),
      attribute || null
    );

    res.json({ url, selector, count: items.length, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

// テーブルデータ取得
app.get('/scrape/table', async (req, res) => {
  const { url, selector = 'table' } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const table = await page.$eval(selector, el => {
      const headers = Array.from(el.querySelectorAll('thead th, tr:first-child th'))
        .map(th => th.textContent.trim());
      const rows = Array.from(el.querySelectorAll('tbody tr, tr:not(:first-child)'))
        .map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
      return { headers, rows };
    });

    res.json({ url, ...table });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

// スクリーンショット
app.get('/scrape/screenshot', async (req, res) => {
  const { url, full_page = 'false' } = req.query;
  if (!url) return res.status(400).json({ error: 'url は必須です' });

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const buffer = await page.screenshot({ fullPage: full_page === 'true' });
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

app.get('/health', (_, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Scraping API 起動 → http://localhost:${PORT}`));
