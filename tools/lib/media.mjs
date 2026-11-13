import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import probe from 'probe-image-size/sync.js';
import { root, origin } from './legacy.mjs';

const cache = new Map();
const dimensions = new Map();

export function imageDimensions(src) {
  const url = new URL(src, origin);
  if (url.origin !== origin) return {};
  const pathname = decodeURIComponent(url.pathname);
  if (!dimensions.has(pathname)) {
    const size = probe(readFileSync(path.join(root, pathname)));
    if (!size?.width || !size.height) throw new Error(`Missing image dimensions: ${pathname}`);
    dimensions.set(pathname, { width: size.width, height: size.height });
  }
  return dimensions.get(pathname);
}

export function projectImage(project) {
  if (cache.has(project.slug)) return cache.get(project.slug);
  const original = decodeURIComponent(new URL(project.cover_url).pathname);
  const full = original.replace(/-card(?=-\d+x\d+\.)/, '').replace(/-\d+x\d+(?=\.[a-z]+$)/, '');
  const localPath = existsSync(path.join(root, full)) ? full : original;
  const image = { src: `${origin}${localPath}`, ...imageDimensions(localPath) };
  cache.set(project.slug, image);
  return image;
}
