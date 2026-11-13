(() => {
  if (!window.Masonry) return;
  document.querySelectorAll('.project-grid, .media-gallery').forEach(grid => {
    const itemSelector = grid.classList.contains('media-gallery') ? '.gallery-item' : '.project-card';
    let masonry;
    let frame;
    let previousWidth;

    function layout() {
      grid.classList.add('masonry-ready');
      const styles = getComputedStyle(grid);
      const columns = Number(styles.getPropertyValue('--columns'));
      const gutter = parseFloat(styles.getPropertyValue('--gutter'));
      const options = {
        itemSelector,
        columnWidth: (grid.clientWidth - (columns - 1) * gutter) / columns,
        gutter,
        percentPosition: true,
        transitionDuration: 0,
        resize: false,
        initLayout: false,
      };
      masonry ??= new window.Masonry(grid, options);
      masonry.option(options);
      masonry.reloadItems();
      // Filtered cards must not occupy a column until they become visible again.
      grid.querySelectorAll(`${itemSelector}[hidden]`).forEach(card => masonry.ignore(card));
      masonry.layout();
    }

    function schedule() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(layout);
    }
    new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width !== previousWidth) { previousWidth = width; schedule(); }
    }).observe(grid);
    grid.addEventListener('load', schedule, true);
    document.addEventListener('catalog:updated', schedule);
    document.fonts.ready.then(schedule);
    layout();
  });
})();
