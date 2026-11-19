import { MODULES } from '../data';
import { h } from './dom';
import { searchBox } from './search';

/** The converter menu: one group per area, one link per converter. */
export function converterNav(active: { moduleId: string; converterId: string }): HTMLElement {
  const groups = h('div', { class: 'nav-groups' });
  for (const m of MODULES) {
    groups.appendChild(
      h(
        'section',
        { class: 'nav-group' },
        h('h2', { class: 'nav-heading' }, m.title),
        h(
          'ul',
          null,
          m.converters.map((c) =>
            h(
              'li',
              null,
              h(
                'a',
                {
                  class: 'nav-link',
                  href: `#/m/${m.id}?c=${c.id}`,
                  'aria-current': m.id === active.moduleId && c.id === active.converterId ? 'page' : undefined,
                },
                c.title,
              ),
            ),
          ),
        ),
      ),
    );
  }

  const nav = h(
    'nav',
    { class: 'side-nav', id: 'side-nav', 'aria-label': 'Converters' },
    searchBox({ placeholder: 'Find a drug', onQuery: (has) => nav.classList.toggle('has-query', has) }),
    groups,
  );
  return nav;
}
