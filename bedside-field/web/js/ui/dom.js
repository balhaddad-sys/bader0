// DOM helpers and the shared screen chrome: screens, toast, and the overlay panel used for every prompt.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

/** Shows one screen (<section class="screen">) and hides the others. */
export function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  window.scrollTo(0, 0);
}

let toastTimer;
export function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

/** Fills and shows the overlay panel on the test stage; returns the card element. */
export function showPanel(html, { bottom = false, compact = false } = {}) {
  const p = $('#panel');
  $('#panel-card').classList.toggle('compact', compact);
  $('#panel-card').innerHTML = html;
  p.classList.toggle('bottom', bottom);
  p.classList.add('show');
  return $('#panel-card');
}

export const hidePanel = () => $('#panel').classList.remove('show');

/**
 * Shows a panel and resolves with the value of the button that was pressed.
 * `choices` maps a button selector inside the card to the value it resolves with (missing buttons are skipped).
 * `onShow(card)` can wire extra live content; it may return a cleanup function, run when a choice is made.
 */
export function askPanel(html, choices, { bottom = false, compact = false, onShow = null } = {}) {
  return new Promise((resolve) => {
    const card = showPanel(html, { bottom, compact });
    const cleanup = onShow?.(card);
    for (const [sel, value] of Object.entries(choices)) {
      const b = $(sel, card);
      if (b) b.onclick = () => { if (typeof cleanup === 'function') cleanup(); resolve(value); };
    }
  });
}
