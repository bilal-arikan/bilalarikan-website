import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { root } from './lib/legacy.mjs';
import { assertMasonryLayout, assertGalleryLayout } from './lib/browser-layout.mjs';

const base = process.env.PORTFOLIO_URL || 'http://127.0.0.1:4178';
const projects = JSON.parse(readFileSync(path.join(root, 'api.json'), 'utf8')).projects;
const artifacts = path.join(root, 'artifacts');
mkdirSync(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-project]:visible').count(), projects.length);
  await assertMasonryLayout(page, 5);
  assert.equal(await page.locator('[data-carousel]').count(), 0);
  assert.equal(await page.locator('#work-heading, input[type="search"], [data-view], .list-view').count(), 0);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), 'dark');
  const heights = await page.locator('[data-project]').evaluateAll(cards => cards.slice(0, 5).map(card => Math.round(card.getBoundingClientRect().height)));
  assert.ok(new Set(heights).size > 1, 'Masonry cards should retain different heights');
  await page.screenshot({ path: path.join(artifacts, 'desktop.png'), fullPage: false });
  for (const button of await page.locator('[data-filter]').all()) {
    const category = await button.getAttribute('data-filter');
    await button.click();
    assert.equal(await page.locator('[data-project]:visible').count(), category ? projects.filter(p => p.tags.includes(category)).length : projects.length);
    await assertMasonryLayout(page, 5);
  }
  await page.locator('[data-filter=""]').click();
  await page.goto(`${base}/?q=missing-project&view=list&category=Games&sort=newest`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-project]:visible').count(), projects.filter(p => p.tags.includes('Games')).length);
  assert.equal(await page.locator('.list-view').count(), 0);
  assert.equal(new URL(page.url()).searchParams.has('q'), false);
  assert.equal(new URL(page.url()).searchParams.has('view'), false);
  await assertMasonryLayout(page, 5);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-filter="Games"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-filter=""]').click();
  assert.equal(await page.locator('[data-project]:visible').count(), projects.length);
  await page.getByLabel('Sort projects').selectOption('newest');
  const dates = await page.locator('[data-project]').evaluateAll(cards => cards.map(card => card.dataset.date));
  assert.deepEqual(dates, [...dates].sort().reverse());
  await page.getByLabel('Sort projects').selectOption('featured');
  for (const [width, columns] of [[1440, 5], [1280, 5], [1100, 4], [900, 3], [600, 2], [390, 1], [320, 1]]) {
    await page.setViewportSize({ width, height: 900 });
    await assertMasonryLayout(page, columns);
    if (width === 390) await page.screenshot({ path: path.join(artifacts, 'mobile.png'), fullPage: false });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const image of await page.locator('#project-grid img').all()) {
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img => img.decode());
  }
  for (const slug of ['pocketbase-forge', 'neon', 'mice-company', 'sticcker', 'ar-motion-capturing', 'unity3d-barracuda-image-classification-example', 'portfolio', 'contact-2', 'terms-and-conditions']) {
    await page.goto(`${base}/${slug}/`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.locator('.related').count(), 0);
    for (const width of [1440, 800, 600, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${slug} overflows at ${width}px`);
      await assertGalleryLayout(page, width >= 1024 ? 3 : width >= 600 ? 2 : 1);
    }
    if (slug === 'pocketbase-forge') {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.locator('.media-gallery img').first().evaluate(img => img.decode());
      await page.screenshot({ path: path.join(artifacts, 'project.png'), fullPage: false });
    }
  }
  assert.deepEqual(errors, []);
  const noScript = await browser.newPage({ javaScriptEnabled: false });
  await noScript.goto(base);
  assert.equal(await noScript.locator('[data-project]').count(), projects.length);
  await noScript.close();
  console.log('Browser verified: dark masonry-only layout, filters, legacy URL compatibility, sorting, images, detail pages, no-JS content and 7 viewport widths.');
} finally { await browser.close(); }
