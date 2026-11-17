import { APP_VERSION, DATA_VERSION, MODULES } from '../data';
import { clear, h, safeStorage } from './dom';
import { homePage, methodsPage, modulePage, notFound, referencesPage } from './pages';

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

export function mountApp(root: HTMLElement): void {
  applyTheme(safeStorage.get(THEME_KEY));

  const main = h('main', { id: 'main', tabindex: '-1' });
  const nav = h('nav', { class: 'nav', 'aria-label': 'Sections' });

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
      h(
        'a',
        { class: 'brand', href: '#/', 'aria-label': 'NeuroConvert home' },
        h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, 'Nc'),
        h('span', { class: 'brand-text' }, h('strong', null, 'NeuroConvert'), h('small', null, 'Evidence-based converters for neurology')),
      ),
      themeBtn,
    ),
    nav,
  );

  const banner = h(
    'div',
    { class: 'safety-banner', role: 'note' },
    h('strong', null, 'For clinicians. '),
    'Always check the dose against the drug’s label. ',
    h('a', { href: '#/methods' }, 'About these numbers'),
  );

  const footer = h(
    'footer',
    { class: 'site-footer' },
    h('p', null, h('a', { href: '#/methods' }, 'How reliable are these numbers?'), ' · ', h('a', { href: '#/references' }, 'References')),
    h('p', null, `NeuroConvert v${APP_VERSION} · data ${DATA_VERSION} · not a regulated medical device · nothing you type leaves your device`),
  );

  root.append(
    h('a', { class: 'skip-link', href: '#main', onClick: (e: Event) => { e.preventDefault(); main.focus(); } }, 'Skip to content'),
    header,
    banner,
    main,
    footer,
  );

  function renderNav(active: string): void {
    clear(nav);
    const items: [string, string, string][] = [
      ['', 'Home', '#/'],
      ...MODULES.map((m): [string, string, string] => [m.id, m.title, `#/m/${m.id}`]),
    ];
    for (const [key, label, href] of items) {
      nav.appendChild(h('a', { href, class: 'nav-link', 'aria-current': key === active ? 'page' : undefined }, label));
    }
  }

  function render(): void {
    const { path, query } = parseHash();
    let page: HTMLElement;
    let active = '';
    let title = 'NeuroConvert — evidence-based medication converters for neurology';

    if (path.length === 0) {
      page = homePage();
    } else if (path[0] === 'm' && path[1]) {
      active = path[1];
      page = modulePage(path[1], query, setHashParams);
      const m = MODULES.find((x) => x.id === path[1]);
      if (m) title = `${m.title} — NeuroConvert`;
    } else if (path[0] === 'methods') {
      active = 'methods';
      page = methodsPage();
      title = 'Methods & limitations — NeuroConvert';
    } else if (path[0] === 'references') {
      active = 'references';
      page = referencesPage();
      title = 'References — NeuroConvert';
    } else {
      page = notFound();
    }

    renderNav(active);
    clear(main);
    main.appendChild(page);
    document.title = title;
  }

  let lastPath = '';
  window.addEventListener('hashchange', () => {
    const { path } = parseHash();
    const key = path.join('/');
    render();
    // New page → top; same page with different params (deep link) → keep scroll.
    if (key !== lastPath) {
      window.scrollTo({ top: 0 });
      main.focus({ preventScroll: true });
    }
    lastPath = key;
  });
  lastPath = parseHash().path.join('/');
  render();

}
