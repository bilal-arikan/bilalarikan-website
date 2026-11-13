import { expect } from '@playwright/test';

export async function assertMasonryLayout(page, columns) {
  const count = await page.locator('#project-grid [data-project]:visible').count();
  await expect.poll(() => page.locator('#project-grid').evaluate(grid => {
    const container = grid.getBoundingClientRect();
    const boxes = [...grid.querySelectorAll('[data-project]:not([hidden])')].map(card => card.getBoundingClientRect());
    const overlap = boxes.some((a, index) => boxes.slice(index + 1).some(b =>
      a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1));
    const panelsContained = [...grid.querySelectorAll('[data-project]:not([hidden])')].every(card => {
      const image = card.querySelector('.project-image').getBoundingClientRect();
      const panel = card.querySelector('.project-info').getBoundingClientRect();
      const arrow = card.querySelector('.open-project').getBoundingClientRect();
      const contents = [...card.querySelectorAll('.project-info h3, .project-eyebrow span')];
      const panelPlacement = card.dataset.name === 'YoutubeGlance'
        ? Math.abs(panel.top - image.bottom) <= 1 && Math.abs(panel.bottom - card.getBoundingClientRect().bottom) <= 1
        : panel.top >= image.top && Math.abs(panel.bottom - image.bottom) <= 1;
      return panel.left >= image.left - 1 && panel.right <= image.right + 1 &&
        panelPlacement && arrow.bottom <= panel.top &&
        contents.every(element => {
          const box = element.getBoundingClientRect();
          return box.left >= panel.left && box.right <= panel.right && box.top >= panel.top && box.bottom <= panel.bottom;
        });
    });
    return {
      columns: new Set(boxes.map(box => Math.round(box.left))).size,
      overlap,
      panelsContained,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      contained: boxes.every(box => box.left >= container.left - 1 && box.right <= container.right + 1 && box.bottom <= container.bottom + 1),
    };
  })).toEqual({ columns: Math.min(columns, count), overlap: false, panelsContained: true, overflow: false, contained: true });
}

export async function assertGalleryLayout(page, columns) {
  const gallery = page.locator('.media-gallery');
  if (!await gallery.count()) return;
  const count = await gallery.locator('.gallery-item').count();
  await expect.poll(() => gallery.evaluate(grid => {
    const container = grid.getBoundingClientRect();
    const boxes = [...grid.querySelectorAll('.gallery-item')].map(item => item.getBoundingClientRect());
    return {
      columns: new Set(boxes.map(box => Math.round(box.left))).size,
      overlap: boxes.some((a, index) => boxes.slice(index + 1).some(b => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1)),
      contained: boxes.every(box => box.left >= container.left - 1 && box.right <= container.right + 1 && box.bottom <= container.bottom + 1),
    };
  })).toEqual({ columns: Math.min(columns, count), overlap: false, contained: true });
}
