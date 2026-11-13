import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { root, origin } from './lib/legacy.mjs';
import { homePage, projectPage, contentPage, notFoundPage, escape, shell } from './lib/render.mjs';

const readJson = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
const site = readJson('content/site.json');
const pages = readJson('content/pages.json');
const projects = readJson('content/projects.json').map(project => {
  const category = site.category_overrides[project.slug] || project.category;
  const featuredIndex = site.featured.indexOf(project.slug);
  return { ...project, category, tags: [category, ...project.tags.filter(tag => tag !== project.category)], priority: featuredIndex < 0 ? null : site.featured.length - featuredIndex };
});
const slugs = projects.map(p => p.slug);
if (new Set(slugs).size !== slugs.length) throw new Error('Duplicate project slugs');
for (const project of projects) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)) throw new Error(`Invalid slug: ${project.slug}`);
  if (!site.categories.includes(project.category)) throw new Error(`Invalid category: ${project.slug}`);
  if (!project.name || !project.cover_url || !project.content_html) throw new Error(`Incomplete project: ${project.slug}`);
}
projects.sort((a, b) => (b.priority || 0) - (a.priority || 0) || (b.date || '').localeCompare(a.date || '') || a.name.localeCompare(b.name));
const write = (file, content) => { const dest = path.join(root, file); mkdirSync(path.dirname(dest), { recursive: true }); writeFileSync(dest, content.replace(/[\t ]+$/gm, '')); };
mkdirSync(path.join(root, 'assets/vendor'), { recursive: true });
cpSync(path.join(root, 'wp-content/themes/gridzone/js/masonry.pkgd.min.js'), path.join(root, 'assets/vendor/masonry.pkgd.min.js'));
write('index.html', homePage(projects, site));
for (const project of projects) write(`${project.slug}/index.html`, projectPage(project, site));
for (const [slug, page] of Object.entries(pages)) write(`${slug}/index.html`, contentPage(slug, page, site));
write('404.html', notFoundPage(site));
const drawingsUrl = '/index.html?category=3D%20%26%20Worlds';
write('drawings/index.html', shell({ title: `Drawings | ${site.name}`, description: 'Drawings and worlds by Bilal Arikan.', site, canonical: '/drawings/', body: `<section class="page-width text-page"><h1>Drawings &amp; worlds</h1><a class="button" href="${drawingsUrl}">Explore drawings and worlds</a></section>`, extraHead: `<meta http-equiv="refresh" content="0;url=${drawingsUrl}">` }));
const canonical = projects.map(({ category, links, ...project }) => project);
write('api.json', `${JSON.stringify({ schema_version: 1, source: 'bilalarikan', site_url: origin, projects: canonical }, null, 2)}\n`);
const urls = ['/', ...projects.map(p => `/${p.slug}/`), ...Object.keys(pages).map(slug => `/${slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${origin}${escape(url)}</loc></url>`).join('')}</urlset>\n`);

// Only the generated directory is cleaned; the source and original archives stay in place.
const dist = path.resolve(root, 'dist');
if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') throw new Error('Unsafe output path');
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });
const allowedFiles = ['index.html', '404.html', 'api.json', 'sitemap.xml', 'robots.txt', 'CNAME', '.nojekyll'];
const excluded = new Set(['.git', '.cache', 'node_modules', 'dist', 'tools', 'content', 'deploy', 'tests', 'artifacts', 'docs', 'src']);
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (excluded.has(entry.name) || entry.name.startsWith('.') && entry.name !== '.nojekyll') continue;
  if (entry.isDirectory() || allowedFiles.includes(entry.name)) cpSync(path.join(root, entry.name), path.join(dist, entry.name), { recursive: true });
}
// Catch migration mistakes before a local or Pages deployment.
for (const project of projects) {
  const $ = load(project.content_html, null, false);
  const urls = [project.cover_url, ...$('img').map((_, el) => $(el).attr('src')).get()];
  for (const url of urls) {
    if (!url?.startsWith(origin)) continue;
    if (!existsSync(path.join(root, decodeURIComponent(new URL(url).pathname)))) throw new Error(`Missing image in ${project.slug}: ${url}`);
  }
}
console.log(`Built ${projects.length} projects, ${Object.keys(pages).length} pages, api.json and dist/.`);
