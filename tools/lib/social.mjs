import { escape, icon } from './html.mjs';

export function socialLinks(site) {
  return `<nav class="social-profiles" aria-label="Social profiles">${site.social_profiles.map(profile =>
    `<a href="${escape(profile.url)}" target="_blank" rel="noopener noreferrer" title="${escape(profile.name)}">${icon(profile.icon)}<span>${escape(profile.name)}</span></a>`
  ).join('')}</nav>`;
}
