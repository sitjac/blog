'use strict';

(function() {
  if (window.__photoGalleryReady) return;
  window.__photoGalleryReady = true;

  const allCards = new WeakMap();
  let layoutFrame = 0;

  const visibleCards = gallery => getCards(gallery).filter(card => !card.hidden);

  const getCards = gallery => {
    if (!allCards.has(gallery)) {
      allCards.set(gallery, Array.from(gallery.querySelectorAll('.photo-card')));
    }
    return allCards.get(gallery);
  };

  const columnCount = gallery => {
    const maxColumns = window.matchMedia('(max-width: 767px)').matches ? 2 : 3;
    return Math.min(maxColumns, Math.max(1, visibleCards(gallery).length));
  };

  const cardHeight = (card, columnWidth) => {
    const image = card.querySelector('img');
    const width = columnWidth || card.getBoundingClientRect().width || image?.width || 1;
    const intrinsicWidth = Number(image?.getAttribute('width')) || image?.naturalWidth || width;
    const intrinsicHeight = Number(image?.getAttribute('height')) || image?.naturalHeight || width;

    return width * intrinsicHeight / intrinsicWidth;
  };

  const layoutGallery = gallery => {
    const cards = getCards(gallery);
    const activeCards = cards.filter(card => !card.hidden);
    const count = columnCount(gallery);
    const columns = Array.from({ length: count }, () => {
      const column = document.createElement('div');
      column.className = 'photo-masonry-column';
      return column;
    });
    const heights = columns.map(() => 0);

    gallery.textContent = '';
    columns.forEach(column => gallery.appendChild(column));
    const columnWidth = columns[0]?.getBoundingClientRect().width || gallery.getBoundingClientRect().width / count || 1;

    activeCards.forEach(card => {
      const shortest = heights.indexOf(Math.min(...heights));
      columns[shortest].appendChild(card);
      heights[shortest] += cardHeight(card, columnWidth);
    });

    cards.filter(card => card.hidden).forEach(card => gallery.appendChild(card));
  };

  const scheduleLayout = gallery => {
    if (!gallery) return;
    window.cancelAnimationFrame(layoutFrame);
    layoutFrame = window.requestAnimationFrame(() => layoutGallery(gallery));
  };

  const layoutAllGalleries = () => {
    document.querySelectorAll('.photo-gallery').forEach(layoutGallery);
  };

  const getViewer = () => {
    const viewer = document.querySelector('.photo-viewer');
    if (viewer && viewer.parentNode !== document.body) {
      document.body.appendChild(viewer);
    }
    return viewer;
  };

  const closeViewer = () => {
    const viewer = getViewer();
    if (!viewer) return;

    const image = viewer.querySelector('.photo-viewer-image');
    viewer.classList.remove('is-open');
    viewer.hidden = true;
    viewer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('photo-viewer-open');
    image && image.removeAttribute('src');
  };

  const openViewer = card => {
    const viewer = getViewer();
    const sourceImage = card.querySelector('img');
    if (!viewer || !sourceImage) return;

    const image = viewer.querySelector('.photo-viewer-image');
    const close = viewer.querySelector('.photo-viewer-close');
    if (!image) return;

    image.src = sourceImage.currentSrc || sourceImage.src;
    image.alt = sourceImage.alt || '';
    viewer.hidden = false;
    viewer.removeAttribute('aria-hidden');
    viewer.classList.add('is-open');
    document.body.classList.add('photo-viewer-open');
    close && close.focus();
  };

  document.addEventListener('click', event => {
    const filter = event.target.closest('.photo-filter');
    if (filter && filter.closest('.photo-page')) {
      const album = filter.dataset.album;
      const page = filter.closest('.photo-page');
      const gallery = page.querySelector('.photo-gallery');
      const filters = Array.from(page.querySelectorAll('.photo-filter'));
      const cards = gallery ? getCards(gallery) : Array.from(page.querySelectorAll('.photo-card'));

      filters.forEach(item => item.classList.toggle('is-active', item === filter));
      cards.forEach(card => {
        const visible = album === 'all' || card.dataset.album === album;
        card.hidden = !visible;
      });
      scheduleLayout(gallery);
      return;
    }

    if (event.target.closest('.photo-viewer-close')) {
      event.preventDefault();
      closeViewer();
      return;
    }

    const viewer = event.target.closest('.photo-viewer');
    if (viewer && event.target === viewer) {
      closeViewer();
      return;
    }

    const card = event.target.closest('.photo-card');
    if (!card || !card.closest('.photo-gallery')) return;

    event.preventDefault();
    event.stopPropagation();
    openViewer(card);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeViewer();
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.photo-gallery').forEach(scheduleLayout);
  });

  document.addEventListener('load', event => {
    const image = event.target;
    if (!image.matches?.('.photo-gallery img')) return;

    // Most photos ship with width/height metadata, so relayout on lazy-load only
    // when an image lacks intrinsic dimensions and the initial estimate was incomplete.
    if (image.hasAttribute('width') && image.hasAttribute('height')) return;

    scheduleLayout(image.closest('.photo-gallery'));
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', layoutAllGalleries, { once: true });
  } else {
    layoutAllGalleries();
  }
})();
