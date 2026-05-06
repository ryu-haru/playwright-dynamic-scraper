# Playwright Dynamic Scraper API

A serverless web scraping API powered by Playwright and Chromium, hosted on Vercel. Available on [RapidAPI](https://rapidapi.com/search/playwright-dynamic-scraper).

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/scrape/text` | GET | Extract text content |
| `/scrape/html` | GET | Extract HTML content |
| `/scrape/links` | GET | Extract all links |
| `/scrape/metadata` | GET | Extract page metadata (OG, Twitter, etc.) |
| `/scrape/list` | GET | Extract multiple elements as an array |
| `/scrape/table` | GET | Extract table data |
| `/scrape/screenshot` | GET | Capture page screenshot (PNG) |
| `/scrape/pdf` | GET | Export page as PDF |

## Parameters

### Common
- `url` (required) — Target URL to scrape

### `/scrape/text`
- `selector` — CSS selector (optional, defaults to full page text)
- `wait_for` — Wait for this selector before extracting

### `/scrape/html`
- `selector` — CSS selector (optional)
- `full=true` — Return full HTML document instead of body

### `/scrape/links`
- `filter` — `internal` | `external` | (all if omitted)

### `/scrape/list`
- `selector` (required) — CSS selector for elements
- `attribute` — Extract attribute instead of text content

### `/scrape/table`
- `selector` — CSS selector for table element (default: `table`)

### `/scrape/screenshot`
- `full_page=true` — Capture full scrollable page
- `width` — Viewport width in pixels (default: 1280, range: 320–3840)
- `height` — Viewport height in pixels (default: 800, range: 240–2160)

### `/scrape/pdf`
- `format` — `A4` | `A3` | `Letter` | `Legal` (default: `A4`)
- `landscape=true` — Landscape orientation

## Authentication

Requests must come through RapidAPI. The `X-RapidAPI-Proxy-Secret` header is validated server-side.

## Local Development

```bash
npm install
npm run dev   # starts Express server on port 4000
```

## Deployment

```bash
vercel --prod
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RAPIDAPI_PROXY_SECRET` | RapidAPI proxy secret for request validation |
