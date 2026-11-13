import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { origin } from './legacy.mjs';

export function checkProjectContent(page, project) {
  const source = load(project.content_html, null, false);
  const sources = ($, selector, attribute) => $(selector).map((_, element) => new URL($(element).attr(attribute), origin).href).get();
  const images = sources(source, 'img', 'src');
  assert.equal(page('.related').length, 0, `${project.slug}: related projects must be absent`);
  assert.equal(page('.article-body img').length, 0, `${project.slug}: images must be in the gallery`);
  assert.equal(page('.media-gallery').length, images.length ? 1 : 0);
  assert.equal(page('.gallery-item').length, images.length);
  assert.deepEqual(sources(page, '.media-gallery img', 'src'), images, `${project.slug}: image order and URLs changed`);
  assert.deepEqual(sources(page, '.article-body iframe', 'src'), sources(source, 'iframe', 'src'), `${project.slug}: videos changed`);
  const captions = ($, selector) => $(selector).map((_, element) => $(element).text().replace(/\s+/g, ' ').trim()).get();
  assert.deepEqual(captions(page, '.gallery-item figcaption'), captions(source, 'figcaption'), `${project.slug}: credits changed`);
  const links = sources(page, '.detail a', 'href');
  for (const link of sources(source, 'a', 'href')) assert.ok(links.includes(link), `${project.slug}: missing original link`);
  for (const image of page('.media-gallery img').toArray()) {
    assert.ok(Number(page(image).attr('width')) > 0 && Number(page(image).attr('height')) > 0, `${project.slug}: missing image dimensions`);
  }
}
