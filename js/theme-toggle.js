(function () {
  'use strict';

  var STORAGE_KEY = 'blog-theme';
  var root = document.documentElement;

  function getStoredTheme() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      if (value === 'light' || value === 'dark') return value;
    } catch (e) {}
    return null;
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#282828' : '#222222');
    updateButtons(theme);
  }

  function updateButtons(theme) {
    var buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach(function (btn) {
      var icon = btn.querySelector('i');
      var label = theme === 'dark' ? '切换到白天模式' : '切换到黑夜模式';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      if (icon) icon.className = theme === 'dark' ? 'fa fa-sun fa-fw' : 'fa fa-moon fa-fw';
    });
  }

  function toggle(event) {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';

    // Circular reveal from the click point, via the View Transitions API.
    // Fall back to an instant switch when unsupported or when the user
    // prefers reduced motion.
    var canTransition = typeof document.startViewTransition === 'function'
      && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    if (!canTransition) {
      storeTheme(next);
      applyTheme(next);
      return;
    }

    var x = event && typeof event.clientX === 'number' ? event.clientX : window.innerWidth - 40;
    var y = event && typeof event.clientY === 'number' ? event.clientY : 40;
    var endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var transition = document.startViewTransition(function () {
      storeTheme(next);
      applyTheme(next);
    });

    transition.ready.then(function () {
      var clipPath = [
        'circle(0px at ' + x + 'px ' + y + 'px)',
        'circle(' + endRadius + 'px at ' + x + 'px ' + y + 'px)'
      ];
      document.documentElement.animate(
        { clipPath: next === 'dark' ? clipPath.slice().reverse() : clipPath },
        {
          duration: 400,
          easing: 'ease-out',
          fill: 'forwards',
          pseudoElement: next === 'dark'
            ? '::view-transition-old(root)'
            : '::view-transition-new(root)'
        }
      );
    }).catch(function () {});
  }

  function injectButton() {
    if (document.querySelector('.theme-toggle')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.innerHTML = '<i class="fa fa-moon fa-fw"></i>';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
    updateButtons(currentTheme());
  }

  function watchSystem() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function (e) {
      if (getStoredTheme()) return;
      applyTheme(e.matches ? 'dark' : 'light');
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(handler);
    }
  }

  function init() {
    applyTheme(currentTheme());
    injectButton();
    watchSystem();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
