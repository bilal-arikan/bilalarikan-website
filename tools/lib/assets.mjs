import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { root } from './legacy.mjs';

const versions = new Map();

export function assetUrl(name) {
  if (!versions.has(name)) {
    const content = readFileSync(path.join(root, 'assets', name));
    versions.set(name, createHash('sha256').update(content).digest('hex').slice(0, 12));
  }
  return `/assets/${name}?v=${versions.get(name)}`;
}

export function stylesheets() {
  return ['layout.css', 'projects.css', 'article.css', 'masonry.css', 'article-gallery.css', 'site.css']
    .map(name => `<link rel="stylesheet" href="${assetUrl(name)}">`).join('');
}
