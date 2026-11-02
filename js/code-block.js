// Enhance NexT code blocks with a slim header bar: language label on the
// left, the existing copy button pinned on the right. Runs after NexT's own
// registerCodeblock (which injects .copy-btn), so we listen on DOMContentLoaded
// with a small defer to guarantee ordering.
'use strict';


(function () {
  if (window.__codeBlockHeaderReady) return;
  window.__codeBlockHeaderReady = true;

  // Prettier display names for common languages; fall back to the raw class.
  const LANGUAGE_NAMES = {
    'c++': 'C++',
    'c#': 'C#',
    'objective-c': 'Objective-C',
    'shell': 'Shell',
    'bash': 'Bash',
    'sh': 'Shell',
    'zsh': 'Shell',
    'console': 'Console',
    'plaintext': 'Text',
    'plain': 'Text',
    'text': 'Text',
    'js': 'JavaScript',
    'javascript': 'JavaScript',
    'ts': 'TypeScript',
    'typescript': 'TypeScript',
    'py': 'Python',
    'python': 'Python',
    'rb': 'Ruby',
    'yml': 'YAML',
    'yaml': 'YAML',
    'md': 'Markdown',
    'markdown': 'Markdown',
    'html': 'HTML',
    'xml': 'XML',
    'css': 'CSS',
    'scss': 'SCSS',
    'styl': 'Stylus',
    'json': 'JSON',
    'java': 'Java',
    'go': 'Go',
    'rust': 'Rust',
    'sql': 'SQL',
    'diff': 'Diff',
    'makefile': 'Makefile',
    'cmake': 'CMake',
    'dockerfile': 'Dockerfile',
    'ini': 'INI',
    'toml': 'TOML',
    'lua': 'Lua',
    'kotlin': 'Kotlin',
    'swift': 'Swift'
  };

  function enhance(figure) {
    if (figure.querySelector('.code-header')) return;
    if (figure.querySelector('.mermaid')) return;

    const languageClass = Array.from(figure.classList).find(cls => cls !== 'highlight');
    const label = languageClass
      ? (LANGUAGE_NAMES[languageClass.toLowerCase()] || languageClass)
      : 'Code';

    const header = document.createElement('div');
    header.className = 'code-header';

    const lang = document.createElement('span');
    lang.className = 'code-header-lang';
    lang.textContent = label;
    header.appendChild(lang);

    // Move NexT's copy button (if already injected) into the header; if not
    // there yet, leave a slot and pick it up on a later pass.
    const copyBtn = figure.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.classList.add('code-header-copy');
      header.appendChild(copyBtn);
    }

    figure.insertBefore(header, figure.firstChild);
  }

  function enhanceAll() {
    document.querySelectorAll('figure.highlight').forEach(enhance);
  }

  function init() {
    // NexT injects .copy-btn on DOMContentLoaded too; defer one tick so our
    // header can adopt the button instead of racing it.
    enhanceAll();
    setTimeout(enhanceAll, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
