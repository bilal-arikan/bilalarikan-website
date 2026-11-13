import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { root, origin, cleanContent, parseDate } from './lib/legacy.mjs';
import { createHash } from 'node:crypto';
import { checkProjectContent } from './lib/check-project-content.mjs';

const readJson = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const archive = readJson('content/projects.json');
const feed = readJson('api.json');
const pages = readJson('content/pages.json');
const site = readJson('content/site.json');
const retiredEmail = ['mail', 'bilalarikan.com'].join('@');
const legacy = load(readFileSync(path.join(root, 'author/bilal1993arikan/index.html'), 'utf8'));
const originalProfiles = [...new Set(legacy('.social-links a').map((_, link) => legacy(link).attr('href')).get())];
assert.deepEqual(site.social_profiles.map(profile => profile.url), originalProfiles);
assert.equal(site.email, 'bilal1993arikan@gmail.com');
assert.equal(feed.schema_version, 1);
assert.equal(feed.projects.length, archive.length);
assert.equal(new Set(feed.projects.map(p => p.slug)).size, archive.length);
const projectFields = ['slug', 'name', 'summary', 'url', 'source_url', 'tags', 'status', 'priority', 'date', 'icon_url', 'cover_url', 'sources', 'created_at', 'updated_at', 'content_html'];
for (const project of feed.projects) {
  assert.deepEqual(Object.keys(project).sort(), projectFields.toSorted());
  assert.equal(project.content_html, archive.find(item => item.slug === project.slug).content_html);
  assert.ok(project.cover_url.startsWith('https://'));
  assert.ok(project.source_url.startsWith(origin));
  for (const field of ['date', 'created_at', 'updated_at']) {
    if (project[field]) assert.ok(!Number.isNaN(Date.parse(project[field])), `${project.slug}: invalid ${field}`);
  }
}

const files = ['index.html', '404.html', 'drawings/index.html', ...archive.map(p => `${p.slug}/index.html`), ...Object.keys(pages).map(slug => `${slug}/index.html`)];
let checkedReferences = 0;
for (const file of files) {
  const html = readFileSync(path.join(root, file), 'utf8');
  assert.equal(html, readFileSync(path.join(root, 'dist', file), 'utf8'), `${file}: stale dist`);
  const $ = load(html);
  assert.ok(!html.includes(retiredEmail), `${file}: retired email address`);
  assert.equal($('.site-footer a[href="/terms-and-conditions/index.html"]').length, 1);
  assert.deepEqual($('.social-profiles a').map((_, link) => $(link).attr('href')).get(), originalProfiles);
  for (const link of $('a[href^="mailto:"]').toArray()) assert.equal($(link).attr('href'), `mailto:${site.email}`);
  const project = archive.find(project => file === `${project.slug}/index.html`);
  if (project) checkProjectContent($, project);
  assert.equal($('h1').length, 1, `${file}: exactly one h1 is required`);
  assert.equal($('html').attr('lang'), 'en');
  assert.equal($('meta[name="description"]').length, 1);
  assert.equal($('link[rel="canonical"]').length, 1);
  assert.equal($('script[src*="wp-"]').length, 0);
  assert.equal($('img:not([alt])').length, 0, `${file}: missing image description`);
  assert.equal($('meta[name="theme-color"]').attr('content'), '#141617');
  if (file === 'index.html') {
    assert.equal($('#work-heading, input[type="search"], [data-view], .list-view').length, 0);
    assert.equal($('#project-grid [data-project]').length, archive.length);
    assert.equal($('.work-section').attr('aria-label'), 'Projects');
  }
  if (file === 'contact-2/index.html') {
    const labels = $('.article-body tr').map((_, row) => $(row).find('td').first().text().trim()).get();
    assert.deepEqual(labels, ['', 'Mail-2', 'Phone', 'Whatsapp']);
    assert.ok(!$('.article-body').text().includes('708 226 3244'));
  }
  for (const element of $('[src], a[href], link[rel="stylesheet"], link[rel="icon"]').toArray()) {
    const value = $(element).attr('src') || $(element).attr('href');
    if (!value || /^(mailto:|tel:|#)/.test(value)) continue;
    const url = new URL(value, `${origin}/${file}`);
    if (url.origin !== origin) continue;
    const target = path.join(root, 'dist', decodeURIComponent(url.pathname));
    assert.ok(existsSync(target), `${file}: missing ${value}`);
    if (url.pathname.startsWith('/assets/') && /\.(css|js)$/.test(url.pathname)) {
      const hash = createHash('sha256').update(readFileSync(target)).digest('hex').slice(0, 12);
      assert.equal(url.searchParams.get('v'), hash, `${file}: stale asset version ${value}`);
    }
    if (statSync(target).isDirectory()) assert.ok(existsSync(path.join(target, 'index.html')), `${file}: missing directory index ${value}`);
    checkedReferences++;
  }
}
const malicious = cleanContent('<p onclick="bad()">Hello</p><script>bad()</script><img src="https://example.com/a.png" onerror="bad()"><a href="javascript:bad()">Bad</a><iframe src="https://evil.example/embed"></iframe>', 'test');
assert.ok(!/onclick|onerror|javascript:|<script|evil\.example/.test(malicious));
assert.equal(parseDate('9 Haziran 2026'), '2026-06-09');
assert.equal(parseDate('20 May\u0131s 2020'), '2020-05-20');
assert.equal(parseDate('unknown'), null);
console.log(`Verified ${archive.length} projects, ${files.length} pages and ${checkedReferences} local references. Export matches preserved content.`);
