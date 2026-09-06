/* global NexT */
/**
 * Manual post TOC (sidebar table of contents).
 *
 * Replaces NexT's scroll-position-driven TOC expansion with an explicit,
 * click-driven tree:
 *
 * - On load only the top-level headings (first TOC level) are shown.
 * - Clicking a heading that has sub-headings expands / collapses its whole
 *   sub-tree ("show all sub-headings").
 * - Clicking any heading smooth-scrolls to that heading in the article body.
 * - If the target heading is wrapped in a collapsed <details> fold in the
 *   article, the fold is opened automatically first so the landing position
 *   actually shows the heading (fixes TOC/body mismatch caused by folded
 *   content).
 * - Scroll highlight only follows headings that are actually visible in the
 *   article (headings hidden inside a closed <details> are skipped), and is
 *   refreshed whenever a fold is opened/closed.
 */
(function() {
  'use strict';

  var TOC_SEL = '.post-toc:not(.placeholder-toc)';
  var OPEN_CLASS = 'toc-open';
  var PARENT_CLASS = 'has-child';

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function getToc() {
    return $(TOC_SEL);
  }

  function idFromHash(hash) {
    if (!hash || hash.charAt(0) !== '#') return null;
    try {
      return decodeURI(hash).slice(1);
    } catch (e) {
      return hash.slice(1);
    }
  }

  function targetOf(link) {
    var id = idFromHash(link.getAttribute('href'));
    return id ? document.getElementById(id) : null;
  }

  // An element inside a collapsed <details> has no rendered boxes.
  function isHeadingRendered(heading) {
    return !!heading && heading.getClientRects().length > 0;
  }

  // Open every ancestor <details> fold that currently hides the heading.
  function revealAncestorDetails(el) {
    var changed = false;
    var node = el.parentElement;
    while (node && node !== document.documentElement) {
      if (node.tagName === 'DETAILS' && !node.open) {
        node.open = true;
        changed = true;
      }
      node = node.parentElement;
    }
    return changed;
  }

  function hasChildren(li) {
    return li.querySelector(':scope > .nav-child');
  }

  // Recursively expand/collapse the whole sub-tree of `li`.
  function setSubtree(li, open) {
    var stack = [li];
    while (stack.length) {
      var item = stack.pop();
      if (!hasChildren(item)) {
        item.classList.remove(OPEN_CLASS);
        continue;
      }
      item.classList.toggle(OPEN_CLASS, open);
      $$(':scope > .nav-child > .nav-item', item).forEach(function(child) {
        stack.push(child);
      });
    }
    syncNavHeight();
  }

  function collapseAll() {
    $$('.nav-item', getToc()).forEach(function(li) {
      li.classList.remove(OPEN_CLASS);
    });
  }

  // NexT uses --height on the toc <ol class="nav"> when animating the
  // Overview <-> TOC sidebar panel switch, so keep it in sync with the
  // actually expanded content.
  function syncNavHeight() {
    var nav = $('.nav', getToc());
    if (nav) nav.style.setProperty('--height', nav.scrollHeight + 'px');
  }

  function smoothScrollTo(top, done) {
    if (window.anime) {
      window.anime({
        targets : document.scrollingElement,
        duration: 500,
        easing  : 'linear',
        scrollTop: top,
        complete: done
      });
    } else {
      var scroller = document.scrollingElement || document.documentElement;
      if ('scrollBehavior' in document.documentElement.style) {
        scroller.scrollTo({ top: top, behavior: 'smooth' });
      } else {
        scroller.scrollTop = top;
      }
      if (done) done();
    }
  }

  function jumpTo(link) {
    var target = targetOf(link);
    if (!target) return;
    revealAncestorDetails(target);
    // Wait one frame so the (possibly just opened) <details> content is laid
    // out before measuring the heading position.
    requestAnimationFrame(function() {
      var top = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
      smoothScrollTo(top, function() {
        if (window.history && history.pushState) {
          history.pushState(null, document.title, link.href);
        }
        updateScrollSpy();
      });
    });
  }

  /* ------------------------- scroll highlight ------------------------- */

  function clearActive() {
    $$('.nav-item.active, .nav-item.active-current', getToc()).forEach(function(li) {
      li.classList.remove('active', 'active-current');
    });
  }

  // Highlight the TOC entry of the heading currently being read. Only headings
  // that are rendered right now (not hidden behind a closed <details>) count,
  // which keeps the highlight in sync with what is actually visible.
  function updateScrollSpy() {
    var toc = getToc();
    var nav = $('.nav', toc);
    if (!nav) return;
    var links = $$('.nav-item > .nav-link', nav);
    var visible = [];
    links.forEach(function(link, index) {
      var target = targetOf(link);
      if (!isHeadingRendered(target)) return;
      var top = target.getBoundingClientRect().top;
      visible.push({ index: index, top: top });
    });
    if (!visible.length) {
      clearActive();
      return;
    }
    var pick = -1;
    for (var i = 0; i < visible.length; i++) {
      if (visible[i].top > 10) {
        pick = i;
        break;
      }
    }
    if (pick === -1) {
      pick = visible.length - 1;
    } else if (pick > 0) {
      pick -= 1;
    }

    clearActive();
    var current = links[visible[pick].index];
    if (!current) return;
    var li = current.closest('.nav-item');
    if (!li) return;
    li.classList.add('active', 'active-current');
    // Keep ancestor entries tinted as "inside this section".
    var p = li.parentElement;
    while (p && p !== nav && p !== toc) {
      if (p.classList && p.classList.contains('nav-item')) {
        p.classList.add('active');
      }
      p = p.parentElement;
    }
    centerTocItem(li);
  }

  // Keep the highlighted TOC item visible inside the scrolling sidebar.
  function centerTocItem(li) {
    if (li.getClientRects().length === 0 || !window.anime) return;
    var tocElement = $('.sidebar-panel-container') || $('.sidebar');
    if (!tocElement) return;
    window.anime({
      targets : tocElement,
      duration: 200,
      easing  : 'linear',
      scrollTop: tocElement.scrollTop - (tocElement.offsetHeight / 2) + li.getBoundingClientRect().top - tocElement.getBoundingClientRect().top
    });
  }

  /* ------------------------------ events ------------------------------ */

  // Capture-phase click so we fully take over NexT's per-link TOC handlers
  // (registered in bubble phase) regardless of load order.
  document.addEventListener('click', function(event) {
    var link = event.target.closest('a.nav-link');
    if (!link) return;
    if (!link.closest(TOC_SEL)) return;
    event.preventDefault();
    event.stopPropagation();
    var li = link.closest('.nav-item');
    if (li && hasChildren(li)) {
      setSubtree(li, !li.classList.contains(OPEN_CLASS));
    }
    jumpTo(link);
  }, true);

  // Re-evaluate the highlight when a <details> fold in the article is
  // opened/closed (heading visibility changed).
  document.addEventListener('toggle', function(event) {
    if (event.target && event.target.tagName === 'DETAILS') {
      updateScrollSpy();
    }
  }, true);

  /* ----------------------------- bootstrap ---------------------------- */

  function init() {
    var toc = getToc();
    if (!toc) return;

    collapseAll();
    $$('.nav-item', toc).forEach(function(li) {
      li.classList.toggle(PARENT_CLASS, !!hasChildren(li));
    });
    syncNavHeight();

    // Let our scrollspy drive the highlight instead of NexT's, which counts
    // headings hidden inside closed <details> (their offset is 0) and can
    // therefore light up the wrong entry.
    if (window.NexT && NexT.utils && typeof NexT.utils.updateActiveNav === 'function') {
      NexT.utils.updateActiveNav = updateScrollSpy;
    }

    updateScrollSpy();

    // Deep links pointing into a closed fold: open it so the target exists.
    if (location.hash) {
      var target = document.getElementById(idFromHash(location.hash));
      if (target && !isHeadingRendered(target) && revealAncestorDetails(target)) {
        requestAnimationFrame(function() {
          var top = target.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
          window.scrollTo(0, top);
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
