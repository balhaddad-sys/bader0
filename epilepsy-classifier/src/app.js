/* Epilepsy Study: bootstraps the study views. No network calls; progress is stored locally only. */
(function () {
  'use strict';
  window.EpiStudy.mount();
  window.EpiViews.init({
    onsetMonths: () => null, shown: () => [],
    onView(v) { if (v === 'study') window.EpiStudy.show(); },
  });
})();
