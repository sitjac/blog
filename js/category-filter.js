'use strict';

(function() {
  if (window.__categoryFilterReady) return;
  window.__categoryFilterReady = true;

  const page = document.querySelector('.category-all-page');
  if (!page) return;

  const filters = Array.from(page.querySelectorAll('.category-filter'));
  const posts = Array.from(page.querySelectorAll('.category-post-card'));
  const years = Array.from(page.querySelectorAll('.category-year'));
  const empty = page.querySelector('.category-empty');
  const pagination = document.querySelector('.category-pagination');
  const pageSize = Math.max(parseInt(page.dataset.pageSize || '10', 10), 1);
  const state = {
    category: 'all',
    page: 1
  };

  const postItems = posts.map(post => ({
    element: post,
    year: post.dataset.year || '',
    categories: new Set((post.dataset.categories || '').trim().split(/\s+/).filter(Boolean))
  }));
  const yearItems = years.map(year => ({
    element: year,
    year: year.dataset.year || ''
  }));
  const postsByCategory = new Map([['all', postItems]]);

  postItems.forEach(post => {
    post.categories.forEach(category => {
      if (!postsByCategory.has(category)) postsByCategory.set(category, []);
      postsByCategory.get(category).push(post);
    });
  });

  let visiblePosts = new Set(postItems.filter(post => !post.element.hidden).map(post => post.element));
  let visibleYears = new Set(yearItems.filter(year => !year.element.hidden).map(year => year.element));
  let paginationState = pagination && !pagination.hidden
    ? `1/${Math.max(Math.ceil(postItems.length / pageSize), 1)}`
    : '';

  const setHidden = (element, hidden) => {
    if (element.hidden !== hidden) element.hidden = hidden;
  };

  const setVisibleElements = (currentElements, nextElements) => {
    currentElements.forEach(element => {
      if (!nextElements.has(element)) setHidden(element, true);
    });
    nextElements.forEach(element => {
      if (!currentElements.has(element)) setHidden(element, false);
    });
    return nextElements;
  };

  const paginationItem = (label, pageNumber, className, disabled) => {
    const tag = disabled ? 'span' : 'a';
    const attrs = disabled ? '' : ` href="#" data-page="${pageNumber}"`;
    return `<${tag} class="${className}"${attrs}>${label}</${tag}>`;
  };

  const renderPagination = totalPages => {
    if (!pagination) return;

    if (totalPages <= 1) {
      if (!pagination.hidden) pagination.hidden = true;
      if (pagination.innerHTML) pagination.innerHTML = '';
      paginationState = `${state.page}/${totalPages}`;
      return;
    }

    const nextPaginationState = `${state.page}/${totalPages}`;
    if (paginationState === nextPaginationState) {
      if (pagination.hidden) pagination.hidden = false;
      return;
    }

    const items = [];
    items.push(paginationItem('<i class="fa fa-angle-left" aria-label="Previous page"></i>', state.page - 1, 'extend prev', state.page === 1));

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
      if (
        pageNumber === 1 ||
        pageNumber === totalPages ||
        Math.abs(pageNumber - state.page) <= 1
      ) {
        items.push(paginationItem(String(pageNumber), pageNumber, `page-number${pageNumber === state.page ? ' current' : ''}`, pageNumber === state.page));
      } else if (items[items.length - 1] !== '<span class="space">&hellip;</span>') {
        items.push('<span class="space">&hellip;</span>');
      }
    }

    items.push(paginationItem('<i class="fa fa-angle-right" aria-label="Next page"></i>', state.page + 1, 'extend next', state.page === totalPages));
    pagination.innerHTML = items.join('');
    if (pagination.hidden) pagination.hidden = false;
    paginationState = nextPaginationState;
  };

  const render = () => {
    const matchingPosts = postsByCategory.get(state.category) || [];
    const totalPages = Math.max(Math.ceil(matchingPosts.length / pageSize), 1);

    state.page = Math.min(Math.max(state.page, 1), totalPages);
    const start = (state.page - 1) * pageSize;
    const end = start + pageSize;
    const nextVisiblePosts = new Set();
    const nextVisibleYears = new Set();

    matchingPosts.slice(start, end).forEach(post => {
      nextVisiblePosts.add(post.element);
      nextVisibleYears.add(post.year);
    });

    visiblePosts = setVisibleElements(visiblePosts, nextVisiblePosts);
    visibleYears = setVisibleElements(
      visibleYears,
      new Set(yearItems.filter(year => nextVisibleYears.has(year.year)).map(year => year.element))
    );

    filters.forEach(filter => {
      const active = filter.dataset.category === state.category;
      if (filter.classList.contains('is-active') !== active) {
        filter.classList.toggle('is-active', active);
      }
    });

    if (empty) setHidden(empty, matchingPosts.length > 0);
    renderPagination(totalPages);
  };

  document.addEventListener('click', event => {
    const filter = event.target.closest('.category-filter');
    if (filter && filter.closest('.category-all-page')) {
      const nextCategory = filter.dataset.category || 'all';
      if (state.category === nextCategory) return;

      state.category = nextCategory;
      state.page = 1;
      render();
      return;
    }

    const pageLink = event.target.closest('.category-pagination [data-page]');
    if (pageLink) {
      event.preventDefault();
      const nextPage = parseInt(pageLink.dataset.page, 10);
      if (Number.isNaN(nextPage) || nextPage === state.page) return;

      state.page = nextPage;
      render();
      window.requestAnimationFrame(() => {
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  });

  render();
})();
