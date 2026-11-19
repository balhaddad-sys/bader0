import { APP_VERSION, DATA_VERSION, MODULES } from '../data';
import { clear, h, safeStorage } from './dom';
import { converterNav } from './nav';
import { activeConverterId, homePage, methodsPage, modulePage, notFound, referencesPage } from './pages';

const THEME_KEY = 'neuroconvert.theme';

/* ------------------------------ routing ------------------------------ */

interface Route {
  path: string[];
  query: URLSearchParams;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart = ''] = raw.split('?');
  return {
    path: pathPart.split('/').filter(Boolean),
    query: new URLSearchParams(queryPart),
  };
}

/** Update the query part of the current hash without triggering a re-render. */
function setHashParams(params: Record<string, string | undefined>): void {
  const { path } = parseHash();
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, v);
  const next = `#/${path.join('/')}${q.toString() ? `?${q.toString()}` : ''}`;
  if (next !== window.location.hash) window.history.replaceState(null, '', next);
}

/* ------------------------------ theme ------------------------------ */

function applyTheme(theme: string | null): void {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
}

function currentIsDark(): boolean {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/* ------------------------------ layout ------------------------------ */

type View = 'home' | 'workspace' | 'prose';

export function mountApp(root: HTMLElement): void {
  applyTheme(safeStorage.get(THEME_KEY));

  const main = h('main', { id: 'main', tabindex: '-1' });
  const sidebar = h('aside', { class: 'sidebar' });
  const shell = h('div', { class: 'shell' }, sidebar, main);

  const setNavOpen = (open: boolean) => {
    document.body.classList.toggle('nav-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  };

  const menuBtn = h(
    'button',
    { type: 'button', class: 'btn menu-btn no-print', 'aria-controls': 'side-nav', 'aria-expanded': 'false', onClick: () => setNavOpen(!document.body.classList.contains('nav-open')) },
    h('span', { 'aria-hidden': 'true' }, '☰'),
    'Converters',
  );

  const themeBtn = h('button', {
    type: 'button',
    class: 'btn ghost theme-btn no-print',
    'aria-label': 'Toggle dark mode',
    onClick: () => {
      const next = currentIsDark() ? 'light' : 'dark';
      applyTheme(next);
      safeStorage.set(THEME_KEY, next);
      themeBtn.textContent = next === 'dark' ? '☀' : '☾';
    },
  });
  themeBtn.textContent = currentIsDark() ? '☀' : '☾';

  const header = h(
    'header',
    { class: 'site-header' },
    h(
      'div',
      { class: 'header-inner' },
      menuBtn,
      h(
        'a',
        { class: 'brand', href: '#/', 'aria-label': 'NeuroConvert home' },
        h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'Nc'),
        h('span', { class: 'brand-text' }, h('strong', null, 'NeuroConvert'), h('small', null, 'Medication converters for neurology')),
      ),
      themeBtn,
    ),
  );

  const banner = h(
    'div',
    { class: 'safety-banner', role: 'note' },
    h('strong', null, 'For clinicians. '),
    'Check every dose against the current label. ',
    h('a', { class: 'banner-link', href: '#/methods' }, 'How reliable are these numbers?'),
  );

  const footer = h(
    'footer',
    { class: 'site-footer' },
    h('p', null, h('a', { href: '#/methods' }, 'Reliability and limits'), ' · ', h('a', { href: '#/references' }, 'References')),
    h('p', null, `NeuroConvert v${APP_VERSION} · data ${DATA_VERSION} · not a regulated medical device · nothing you type leaves your device`),
  );

  const backdrop = h('div', { class: 'backdrop', onClick: () => setNavOpen(false) });

  root.append(
    h('a', { class: 'skip-link', href: '#main', onClick: (e: Event) => { e.preventDefault(); main.focus(); } }, 'Skip to content'),
    header,
    banner,
    shell,
    backdrop,
    footer,
  );

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      setNavOpen(false);
      menuBtn.focus();
    }
  });

  function render(): void {
    const { path, query } = parseHash();
    let page: HTMLElement;
    let view: View = 'prose';
    let title = 'NeuroConvert — evidence-based medication converters for neurology';
    clear(sidebar);

    if (path.length === 0) {
      view = 'home';
      page = homePage();
    } else if (path[0] === 'm' && path[1]) {
      const m = MODULES.find((x) => x.id === path[1]);
      if (m) {
        view = 'workspace';
        const converterId = activeConverterId(m.id, query);
        page = modulePage(m.id, query, setHashParams);
        sidebar.appendChild(converterNav({ moduleId: m.id, converterId }));
        const conv = m.converters.find((c) => c.id === converterId);
        title = `${conv?.title ?? m.title} · ${m.title} — NeuroConvert`;
      } else {
        page = notFound();
      }
    } else if (path[0] === 'methods') {
      page = methodsPage();
      title = 'Reliability and limits — NeuroConvert';
    } else if (path[0] === 'references') {
      page = referencesPage();
      title = 'References — NeuroConvert';
    } else {
      page = notFound();
    }

    shell.dataset.view = view;
    document.body.dataset.view = view;
    setNavOpen(false);
    clear(main);
    main.appendChild(page);
    document.title = title;
  }

  // A new page, or a different converter within a module, starts at the top.
  // Typing into a calculator updates the address without a hashchange, so it never scrolls.
  const placeKey = (): string => {
    const { path, query } = parseHash();
    return `${path.join('/')}|${path[0] === 'm' ? (query.get('c') ?? '') : ''}`;
  };
  let lastKey = placeKey();
  window.addEventListener('hashchange', () => {
    const key = placeKey();
    render();
    if (key !== lastKey) {
      window.scrollTo({ top: 0 });
      main.focus({ preventScroll: true });
    }
    lastKey = key;
  });
  render();
}
