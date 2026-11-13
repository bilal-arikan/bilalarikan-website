import { escape, local, icon, projectHref } from './html.mjs';
import { projectImage } from './media.mjs';

export function card(project, index = 0) {
  const image = projectImage(project);
  return `<article class="project-card" data-project data-category="${escape(project.category)}" data-search="${escape([project.name, project.summary, ...project.tags].join(' ').toLowerCase())}" data-date="${project.date || ''}" data-name="${escape(project.name)}" data-priority="${project.priority || 0}">
<a class="project-link" href="${projectHref(project)}"><div class="project-image" data-category="${escape(project.category)}"><img src="${escape(local(image.src))}" alt="${escape(project.name)}" loading="${index < 5 ? 'eager' : 'lazy'}" decoding="async" width="${image.width}" height="${image.height}"><span class="open-project" aria-hidden="true">${icon('arrow-up-right')}</span></div>
<div class="project-info"><div class="project-eyebrow"><span>${escape(project.category)}</span><span>${project.date?.slice(0, 4) || ''}</span></div><h3>${escape(project.name)}</h3></div></a></article>`;
}
