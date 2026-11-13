(() => {
  const grid = document.querySelector('#project-grid');
  if (!grid) return;
  const cards = [...grid.querySelectorAll('[data-project]')];
  const sort = document.querySelector('#sort');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const parameters = new URLSearchParams(location.search);
  let category = parameters.get('category') || '';
  if (!filters.some(button => button.dataset.filter === category)) category = '';
  const initialSort = parameters.get('sort');
  if ([...sort.options].some(option => option.value === initialSort)) sort.value = initialSort;

  function update() {
    const sorted = [...cards].sort((a, b) => {
      if (sort.value === 'name') return a.dataset.name.localeCompare(b.dataset.name, 'en');
      const dates = b.dataset.date.localeCompare(a.dataset.date);
      const tie = a.dataset.name.localeCompare(b.dataset.name, 'en');
      if (sort.value === 'oldest') return -dates || tie;
      if (sort.value === 'newest') return dates || tie;
      return Number(b.dataset.priority) - Number(a.dataset.priority) || dates || tie;
    });
    let count = 0;
    for (const card of sorted) {
      card.hidden = Boolean(category && card.dataset.category !== category);
      if (!card.hidden) count++;
      grid.append(card);
    }
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    document.dispatchEvent(new Event('catalog:updated'));
    document.querySelector('#empty-state').hidden = count !== 0;
    document.querySelector('#result-status').textContent = `${count} ${count === 1 ? 'project' : 'projects'}${category ? ` in ${category}` : ''}`;
    const next = new URLSearchParams();
    if (category) next.set('category', category);
    if (sort.value !== 'featured') next.set('sort', sort.value);
    if (location.protocol !== 'file:') history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}${location.hash}`);
  }
  sort.addEventListener('change', update);
  filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.filter; update(); }));
  document.querySelector('#reset-filters').addEventListener('click', () => { category = ''; sort.value = 'featured'; update(); filters[0].focus(); });
  update();
})();
