'use strict';

(function() {
  if (window.__photoGalleryReady) return;
  window.__photoGalleryReady = true;

  const allCards = new WeakMap();
  let layoutFrame = 0;

  const getCards = gallery => {
    if (!allCards.has(gallery)) {
      allCards.set(gallery, Array.from(gallery.querySelectorAll('.photo-card')));
    }
    return allCards.get(gallery);
  };

  // Target row height for the justified layout. Rows are allowed to deviate
  // from this value so that every photo keeps its original aspect ratio.
  const targetRowHeight = () =>
    window.matchMedia('(max-width: 767px)').matches ? 180 : 280;

  const rowGap = () =>
    window.matchMedia('(max-width: 767px)').matches ? 8 : 12;

  const aspectRatio = card => {
    const image = card.querySelector('img');
    const intrinsicWidth = Number(image?.getAttribute('width')) || image?.naturalWidth || 3;
    const intrinsicHeight = Number(image?.getAttribute('height')) || image?.naturalHeight || 2;
    return intrinsicWidth / intrinsicHeight;
  };

  // Greedy justified layout: fill each row with as many photos as needed so
  // that, when scaled to a common height, their widths add up to the container
  // width. The last row is left-aligned at the target height instead of being
  // stretched, which is how Flickr and Google Photos handle it.
  const layoutGallery = gallery => {
    const cards = getCards(gallery);
    const activeCards = cards.filter(card => !card.hidden);
    const containerWidth = gallery.getBoundingClientRect().width;
    if (!containerWidth) return;

    const gap = rowGap();
    const target = targetRowHeight();
    const rows = [];
    let row = [];
    let rowAspectSum = 0;

    activeCards.forEach(card => {
      const ratio = aspectRatio(card);
      row.push({ card, ratio });
      rowAspectSum += ratio;

      // Width the row would occupy if every photo were `target` px tall.
      const projectedWidth = rowAspectSum * target + (row.length - 1) * gap;
      if (projectedWidth >= containerWidth) {
        rows.push({ items: row, aspectSum: rowAspectSum });
        row = [];
        rowAspectSum = 0;
      }
    });
    if (row.length) rows.push({ items: row, aspectSum: rowAspectSum, last: true });

    gallery.textContent = '';
    rows.forEach(({ items, aspectSum, last }) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'photo-justified-row';

      // Solve for the row height that makes the photos fill the container.
      const availableWidth = containerWidth - (items.length - 1) * gap;
      const height = last ? target : availableWidth / aspectSum;

      items.forEach(({ card, ratio }) => {
        const width = Math.floor(height * ratio);
        card.style.width = width + 'px';
        card.style.height = Math.floor(height) + 'px';
        rowEl.appendChild(card);
      });
      gallery.appendChild(rowEl);
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
