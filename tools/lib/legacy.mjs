import { existsSync } from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import sanitizeHtml from 'sanitize-html';

export const origin = 'https://www.bilalarikan.com';
export const root = path.resolve(import.meta.dirname, '../..');

export function absoluteUrl(value, slug = '') {
  if (!value || value.startsWith('data:')) return null;
  const url = new URL(value, `${origin}/${slug ? `${slug}/` : ''}`);
  if (['www.bilalarikan.com', 'bilalarikan.com', '128.199.36.238'].includes(url.hostname)) {
    url.protocol = 'https:';
    url.host = 'www.bilalarikan.com';
    const candidate = decodeURIComponent(url.pathname).replace(/\.(png|jpe?g)$/i, '.webp');
    if (existsSync(path.join(root, candidate))) url.pathname = candidate;
    if (url.pathname.includes('/uploads/') && !existsSync(path.join(root, decodeURIComponent(url.pathname)))) return null;
    url.search = '';
  }
  return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : null;
}

export function cleanContent(markup, slug) {
  const $ = load(markup, null, false);
  $('script, style, .clear, .fg-loader, .fg-image-overlay, .fg-caption').remove();
  $('img').each((_, element) => {
    const img = $(element);
    const galleryHref = img.closest('a.fg-thumb').attr('href');
    const src = absoluteUrl(galleryHref || img.attr('src'), slug);
    if (!src) { img.remove(); return; }
    img.attr('src', src).attr('alt', img.attr('alt') || slug.replaceAll('-', ' '));
    img.removeAttr('srcset sizes style width height').attr('loading', 'lazy');
  });
  $('a').each((_, element) => {
    const link = $(element);
    const href = absoluteUrl(link.attr('href'), slug);
    if (href) link.attr('href', href); else link.removeAttr('href');
  });
  $('iframe').each((_, element) => {
    const frame = $(element);
    const src = absoluteUrl(frame.attr('src'), slug);
    if (src) frame.attr('src', src).attr('title', `${slug.replaceAll('-', ' ')} video`).attr('loading', 'lazy');
  });
  return sanitizeHtml($.html(), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'iframe'],
    allowedAttributes: {
      a: ['href', 'title'], img: ['src', 'alt', 'loading'],
      iframe: ['src', 'title', 'allow', 'allowfullscreen', 'loading'],
      td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'],
    },
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    allowedSchemes: ['https', 'http', 'mailto'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }) },
  }).trim();
}

const months = ['Ocak', '\u015eubat', 'Mart', 'Nisan', 'May\u0131s', 'Haziran', 'Temmuz', 'A\u011fustos', 'Eyl\u00fcl', 'Ekim', 'Kas\u0131m', 'Aral\u0131k'];
export function parseDate(text) {
  const [day, month, year] = text.trim().split(/\s+/);
  const index = months.indexOf(month);
  if (index < 0 || !year) return null;
  return `${year}-${String(index + 1).padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function inferCategory(slug, tags) {
  if (/^(ar-|mandarin-ar)/.test(slug)) return 'AR & XR';
  if (tags.some(tag => /GameDevelopment/.test(tag)) && !/asset|mechanic|barracuda/.test(slug)) return 'Games';
  if (/mountains|valley|mushroom-town|apocalypse/.test(slug)) return '3D & Worlds';
  if (/asset|mechanic|unity|nearest|barracuda/.test(slug)) return 'Unity & Assets';
  return 'Software & Tools';
}
