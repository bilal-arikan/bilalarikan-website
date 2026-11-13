import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { origin } from './legacy.mjs';

const require = createRequire(import.meta.url);
const iconRoot = path.dirname(require.resolve('lucide-static/package.json'));
const icons = new Map();
export const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const local = value => value?.replaceAll(origin, '') || '';
export const projectHref = project => `/${project.slug}/index.html`;
export const prettyDate = date => date ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Date not recorded';

export function icon(name) {
  if (!icons.has(name)) icons.set(name, readFileSync(path.join(iconRoot, 'icons', `${name}.svg`), 'utf8').replace('<svg', '<svg aria-hidden="true" focusable="false"'));
  return icons.get(name);
}
