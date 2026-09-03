'use strict';

(function() {
  if (window.__bookmarkFilterReady) return;
  window.__bookmarkFilterReady = true;

  const page = document.querySelector('.bookmark-page');
  if (!page) return;

  const filters = Array.from(page.querySelectorAll('.bookmark-filter'));
  const groups = Array.from(page.querySelectorAll('.bookmark-group'));
  const items = Array.from(page.querySelectorAll('.bookmark-item'));
  const search = page.querySelector('.bookmark-search input');
  const empty = page.querySelector('.bookmark-empty');
  const state = {
    group: 'all',
    query: ''
  };

  const normalize = value => (value || '').trim().toLowerCase();

  const itemMatches = item => {
    const groupMatches = state.group === 'all' || item.dataset.group === state.group;
    const queryMatches = !state.query || (item.dataset.search || '').includes(state.query);
    return groupMatches && queryMatches;
  };

  const render = () => {
    let visibleCount = 0;

    items.forEach(item => {
      const visible = itemMatches(item);
      item.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    groups.forEach(group => {
      const hasVisibleItem = Array.from(group.querySelectorAll('.bookmark-item')).some(item => !item.hidden);
      group.hidden = !hasVisibleItem;
    });

    filters.forEach(filter => {
      filter.classList.toggle('is-active', filter.dataset.group === state.group);
    });

    if (empty) empty.hidden = visibleCount > 0;
  };

  page.addEventListener('click', event => {
    const filter = event.target.closest('.bookmark-filter');
    if (!filter) return;

    state.group = filter.dataset.group || 'all';
    render();
  });

  if (search) {
    search.addEventListener('input', () => {
      state.query = normalize(search.value);
      render();
    });
  }

  render();
})();
