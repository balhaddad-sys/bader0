import './styles.css';
import { mountApp } from './ui/app';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');
mountApp(root);

// Offline support: only over http(s) in production builds, and not in the
// single-file build that is meant to be opened straight from disk.
if (
  import.meta.env.PROD &&
  !__SINGLE_FILE__ &&
  'serviceWorker' in navigator &&
  (location.protocol === 'https:' || location.hostname === 'localhost')
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is a progressive enhancement */
    });
  });
}
