import { load } from 'cheerio';
import { local } from './html.mjs';
import { imageDimensions } from './media.mjs';

export function projectContent(project) {
  const $ = load(project.content_html, null, false);
  const gallery = $('<div class="media-gallery" role="group" aria-label="Project images"></div>');
  const images = $('img').toArray();

  for (const element of images) {
    const image = $(element);
    image.attr(imageDimensions(image.attr('src')));
    let figure = image.closest('figure');
    // Keep original image links and credits attached to the image they describe.
    if (!figure.length || figure.find('img').length !== 1 || figure.find('iframe, video').length) {
      const link = image.closest('a');
      const media = link.length && link.find('img').length === 1 ? link : image;
      figure = $('<figure></figure>').append(media);
    }
    if (!image.closest('a').length) image.wrap($('<a></a>').attr('href', image.attr('src')));
    figure.addClass('gallery-item');
    gallery.append(figure);
  }

  // Legacy galleries have several wrapper levels; remove only those left empty.
  for (const element of $('div, figure, p').toArray().reverse()) {
    const wrapper = $(element);
    if (!wrapper.children().length && !wrapper.text().trim()) wrapper.remove();
  }
  gallery.attr('data-count', images.length);
  return local(`<div class="article-body">${$.root().html()}</div>${images.length ? $.html(gallery) : ''}`);
}
