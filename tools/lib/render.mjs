import { origin } from './legacy.mjs';
import { escape, local, icon, prettyDate } from './html.mjs';
import { card } from './card.mjs';
import { assetUrl, stylesheets } from './assets.mjs';
import { projectContent } from './article-gallery.mjs';
import { socialLinks } from './social.mjs';
export { escape, local, icon, prettyDate } from './html.mjs';

export function shell({ title, description, body, site, active = 'work', canonical = '/', image = site.portrait, extraHead = '' }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${origin}${canonical}"><meta property="og:type" content="website">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${origin}${canonical}"><meta property="og:image" content="${escape(image?.startsWith('http') ? image : origin + image)}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#141617">
<link rel="icon" href="/wp-content/uploads/2020/05/BA-tamam-4_capraz.webp">${stylesheets()}
<link rel="alternate" type="application/json" title="Project portfolio" href="/api.json">${extraHead}
</head><body><a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="header-inner"><a class="wordmark" href="/index.html" aria-label="Bilal Arikan home">ba<span class="brand-dot">.</span></a>
<nav aria-label="Main navigation"><a ${active === 'work' ? 'aria-current="page"' : ''} href="/index.html">Work</a><a ${active === 'about' ? 'aria-current="page"' : ''} href="/portfolio/index.html">About</a><a ${active === 'contact' ? 'aria-current="page"' : ''} href="/contact-2/index.html">Contact</a></nav>
<a class="header-github" href="${site.github}" aria-label="GitHub profile" target="_blank" rel="noopener noreferrer">${icon('code-xml')}<span>GitHub</span>${icon('arrow-up-right')}</a></div></header>
<main id="main">${body}</main>
<footer class="site-footer"><div><a class="footer-name" href="/index.html">${escape(site.name)}</a><p>Always curious. Always building.</p></div>${socialLinks(site)}<div class="footer-bottom"><div class="footer-links"><a href="mailto:${site.email}">Email ${icon('arrow-up-right')}</a><a href="/privacy-policy/index.html">Privacy</a><a href="/terms-and-conditions/index.html">Terms</a></div><p class="copyright">&copy; ${new Date().getFullYear()} ${escape(site.name)}</p></div></footer>
<script src="${assetUrl('catalog.js')}" defer></script><script src="${assetUrl('vendor/masonry.pkgd.min.js')}" defer></script><script src="${assetUrl('masonry.js')}" defer></script></body></html>`;
}

export function homePage(projects, site) {
  const filters = ['All projects', ...site.categories];
  const body = `<section class="intro page-width" aria-labelledby="identity"><div class="identity"><div><p class="eyebrow">INDEPENDENT DEVELOPER / PROJECT ARCHIVE</p><h1 id="identity">${escape(site.name)}<span class="brand-dot">.</span></h1><p class="role">Software, games &amp; visual experiments.</p></div><div class="intro-signoff"><a href="/portfolio/index.html" class="portrait-link" aria-label="About Bilal Arikan"><img src="${site.portrait}" width="80" height="80" alt="Bilal Arikan" class="portrait"></a><a class="text-link" href="mailto:${site.email}">Let's talk ${icon('arrow-up-right')}</a></div></div></section>
<section class="work-section page-width" aria-label="Projects"><div class="catalog-tools">
<div class="category-filters" role="group" aria-label="Filter by category">${filters.map((category, i) => `<button type="button" data-filter="${i ? escape(category) : ''}" aria-pressed="${!i}">${escape(category)}<span>${i ? projects.filter(p => p.category === category).length : projects.length}</span></button>`).join('')}</div>
<div class="sort-control"><label class="sort-label" for="sort">Sort:</label><select id="sort" aria-label="Sort projects"><option value="featured">Featured first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A to Z</option></select></div></div>
<p class="result-status" aria-live="polite" id="result-status">${projects.length} projects</p>
<div class="project-grid" id="project-grid">${projects.map(card).join('')}</div>
<div class="empty-state" id="empty-state" hidden><h3>No projects found</h3><button type="button" id="reset-filters" class="button">All projects ${icon('rotate-ccw')}</button></div>
</section><section class="contact-band"><div class="page-width"><div><p class="eyebrow">HAVE SOMETHING IN MIND?</p><h2>Let's make it happen.</h2></div><a class="button button-dark" href="mailto:${site.email}">Get in touch ${icon('arrow-up-right')}</a></div></section>`;
  return shell({ title: `${site.name} | Software, Games & Experiments`, description: site.description, site, body });
}

export function projectPage(project, site) {
  const body = `<div class="page-width detail"><a class="back-link" href="/index.html">${icon('arrow-left')} All projects</a>
<header class="detail-header"><p class="eyebrow">${escape(project.category)} <span>/</span> ${project.date?.slice(0, 4) || 'PROJECT'}</p><h1>${escape(project.name)}</h1>${project.summary ? `<p class="detail-summary">${escape(project.summary)}</p>` : ''}
<div class="detail-meta"><span>${icon('calendar-days')} ${prettyDate(project.date)}</span>${project.tags.filter(t => t !== project.category).map(tag => `<span>${escape(tag)}</span>`).join('')}</div>
<div class="project-actions">${project.links.slice(0, 4).map((url, index) => `<a class="button ${index ? 'button-light' : 'button-dark'}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${linkLabel(url)} ${icon('arrow-up-right')}</a>`).join('')}</div></header>
${projectContent(project)}</div>`;
  const structured = { '@context': 'https://schema.org', '@type': 'CreativeWork', name: project.name, description: project.summary || undefined, url: project.source_url, image: project.cover_url, datePublished: project.date || undefined, creator: { '@type': 'Person', name: site.name } };
  return shell({ title: `${project.name} | ${site.name}`, description: project.summary || `${project.name}, a ${project.category.toLowerCase()} project by ${site.name}.`, site, body, canonical: `/${project.slug}/`, image: project.cover_url, extraHead: `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<', '\\u003c')}</script>` });
}

function linkLabel(url) {
  const host = new URL(url).hostname;
  if (host === 'chromewebstore.google.com') return 'Chrome Web Store';
  if (host.includes('github.com')) return 'View source';
  if (host.includes('youtube') || host.includes('youtu.be')) return 'Watch video';
  if (host.includes('play.google')) return 'Google Play';
  if (host.includes('apps.apple')) return 'App Store';
  if (host.includes('assetstore.unity')) return 'Unity Asset Store';
  if (host.includes('store.steampowered')) return 'Steam';
  return 'Visit project';
}

export function contentPage(slug, page, site) {
  const isAbout = slug === 'portfolio';
  const isContact = slug === 'contact-2';
  const title = isAbout ? 'About me' : page.title;
  const intro = isAbout ? `<div class="about-intro"><img class="about-portrait" src="${site.portrait}" width="220" height="220" alt="Bilal Arikan"><div><h2>${escape(site.name)}</h2><p>${escape(site.role)}</p><p>Curiosity has always been my starting point. I build software, make games, and explore what happens when different technologies come together.</p></div></div><h2 class="archive-heading">Background <span class="muted small">From the original portfolio</span></h2>` : isContact ? `<p class="page-lead">Have a project, an idea, or a question? Get in touch.</p><a class="contact-email" href="mailto:${site.email}"><span>${site.email}</span>${icon('arrow-up-right')}</a>` : '';
  const body = `<section class="page-width text-page"><a class="back-link" href="/index.html">${icon('arrow-left')} All projects</a><p class="eyebrow">${isAbout ? 'THE PERSON BEHIND THE PROJECTS' : 'BILAL ARIKAN'}</p><h1>${escape(title)}</h1>${intro}<div class="article-body ${isAbout ? 'about-archive' : ''}">${local(page.content_html)}</div></section>`;
  return shell({ title: `${title} | ${site.name}`, description: `${title} - ${site.name}`, site, body, canonical: `/${slug}/`, active: isAbout ? 'about' : isContact ? 'contact' : '' });
}

export function notFoundPage(site) {
  return shell({ title: `Page not found | ${site.name}`, description: 'This page could not be found.', site, canonical: '/404.html', body: `<section class="page-width not-found"><p class="eyebrow">404</p><h1>This page took a detour.</h1><p>The project archive is a good place to start again.</p><a class="button button-dark" href="/index.html">${icon('arrow-left')} Back to projects</a></section>` });
}
