import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { absoluteUrl, cleanContent, origin, root, parseDate, inferCategory } from './lib/legacy.mjs';

const output = path.join(root, 'content/projects.json');
if (existsSync(output)) throw new Error('The content archive already exists. Import will not overwrite it.');
const home = load(readFileSync(path.join(root, 'index.html'), 'utf8'));
const projects = [];
home('.masonry-item').each((_, element) => {
  const card = home(element);
  const link = card.find('.entry-title a').attr('href');
  if (!link) return;
  const slug = new URL(link, origin).pathname.split('/').filter(Boolean)[0];
  const $ = load(readFileSync(path.join(root, slug, 'index.html'), 'utf8'));
  const entry = $('.entry-content .entry').first();
  const content = cleanContent(entry.html() || '', slug);
  const body = load(content, null, false);
  const tags = [...new Set($('.entry-header .entry-category a').map((_, el) => $(el).text().trim()).get())].filter(tag => tag !== 'Uncategorized');
  const category = inferCategory(slug, tags);
  const paragraphs = body('p').map((_, el) => body(el).text().replace(/\s+/g, ' ').trim()).get();
  const summary = paragraphs.find(text => text.length > 30 && !/^https?:\/\//.test(text)) || null;
  const links = [...new Set(body('a[href]').map((_, el) => body(el).attr('href')).get())];
  const external = links.filter(url => !url.startsWith(origin) && !/\.(webp|png|jpg|jpeg)(\?|$)/i.test(url));
  const date = parseDate($('.entry-header .entry-date').text());
  projects.push({
    slug, name: $('.entry-title').first().text().trim(), summary,
    url: external[0] || null, source_url: `${origin}/${slug}/`,
    tags: [...new Set([category, ...tags])], category, status: null,
    priority: null, date, icon_url: null,
    cover_url: absoluteUrl(card.find('.entry-thumbnail img').attr('src')) || body('img').first().attr('src') || null,
    sources: ['bilalarikan'], created_at: null, updated_at: null,
    content_html: content, links: external,
  });
});
if (projects.length < 20) throw new Error(`Unexpected import size: ${projects.length}`);
if (new Set(projects.map(p => p.slug)).size !== projects.length) throw new Error('Duplicate project slugs');
mkdirSync(path.dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(projects, null, 2)}\n`);
const pages = {};
for (const slug of ['portfolio', 'contact-2', 'privacy-policy', 'terms-and-conditions', 'donate', 'asset-store']) {
  const $ = load(readFileSync(path.join(root, slug, 'index.html'), 'utf8'));
  pages[slug] = { title: $('.entry-title').first().text().trim(), content_html: cleanContent($('.entry-content .entry').first().html() || '', slug) };
}
writeFileSync(path.join(root, 'content/pages.json'), `${JSON.stringify(pages, null, 2)}\n`);
console.log(JSON.stringify(projects.map(({slug, category, date, cover_url}) => ({slug, category, date, cover_url})), null, 2));
console.log(`Imported ${projects.length} projects and ${Object.keys(pages).length} pages.`);
