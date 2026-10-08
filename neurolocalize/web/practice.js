'use strict';
(function (root) {
  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Visit different anatomical regions before reusing a region. Within each
  // region, prefer the question skills least represented in the session so far.
  function sampleCases(pool, count, random = Math.random) {
    const groups = new Map();
    const seen = new Set();
    for (const c of shuffle(pool, random)) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (!groups.has(c.topicId)) groups.set(c.topicId, []);
      groups.get(c.topicId).push(c);
    }
    const chosen = [], skills = {};
    while (groups.size && chosen.length < count) {
      for (const topic of shuffle([...groups.keys()], random)) {
        if (chosen.length >= count) break;
        const group = groups.get(topic);
        const minCount = Math.min(...group.map(c => skills[c.taskType || 'Localize'] || 0));
        const index = group.findIndex(c => (skills[c.taskType || 'Localize'] || 0) === minCount);
        const [c] = group.splice(index, 1);
        chosen.push(c);
        const skill = c.taskType || 'Localize';
        skills[skill] = (skills[skill] || 0) + 1;
        if (!group.length) groups.delete(topic);
      }
    }
    return chosen.map(c => c.id);
  }

  function makeOptionOrders(ids, caseById, random = Math.random) {
    return Object.fromEntries(ids.map(id => [id, shuffle(caseById[id].options.map(o => o.id), random)]));
  }

  function restoreOptionOrders(ids, caseById, stored) {
    return Object.fromEntries(ids.map(id => {
      const valid = caseById[id].options.map(o => o.id), order = stored?.[id];
      const complete = Array.isArray(order) && order.length === valid.length &&
        new Set(order).size === valid.length && order.every(x => valid.includes(x));
      return [id, complete ? [...order] : valid];
    }));
  }

  const api = {shuffle, sampleCases, makeOptionOrders, restoreOptionOrders};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NL_PRACTICE = api;
})(typeof window === 'undefined' ? globalThis : window);
