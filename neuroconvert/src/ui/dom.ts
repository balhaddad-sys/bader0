/**
 * Tiny, dependency-free DOM builder. Text is always inserted as text nodes
 * (never innerHTML), so no content can inject markup.
 */

export type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> | null | undefined;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Attrs,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = String(value);
      else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (key === 'dataset' && typeof value === 'object') {
        Object.assign(el.dataset, value as Record<string, string>);
      } else if (value === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(value));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function replaceChildren(el: Element, ...children: Child[]): void {
  clear(el);
  append(el, children);
}

let uid = 0;
export function nextId(prefix: string): string {
  uid += 1;
  return `${prefix}-${uid}`;
}

/** Safe external link. */
export function link(href: string, label: Child, cls = ''): HTMLAnchorElement {
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, label);
}

/* ------------------------------ toast ------------------------------ */

let toastTimer: number | undefined;
export function toast(message: string): void {
  let region = document.getElementById('toast');
  if (!region) {
    region = h('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(region);
  }
  region.textContent = message;
  region.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => region?.classList.remove('show'), 2200);
}

/** Copy text to the clipboard with a legacy fallback. */
export async function copyText(text: string, okMessage = 'Copied to clipboard'): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMessage);
    return;
  } catch {
    /* fall through to legacy path */
  }
  const ta = h('textarea', { 'aria-hidden': 'true', style: 'position:fixed;opacity:0;top:0;left:0' });
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    toast(okMessage);
  } catch {
    toast('Copy failed — select the text manually');
  } finally {
    ta.remove();
  }
}

/* ------------------------------ storage ------------------------------ */

/** localStorage that never throws (private windows, blocked storage, file://). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};
