import { Baseline } from './models.js';

const box = document.querySelector('[data-baseline]');
if (box) {
  const ta = box.querySelector('textarea');
  const bars = box.querySelector('.bars');
  const drivers = box.querySelector('.drivers');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let expert = 'negative';

  fetch('../data/finsentinel-baseline.json').then((r) => r.json()).then((spec) => {
    const model = new Baseline(spec);
    const run = () => {
      const text = ta.value.trim();
      if (!text) { bars.innerHTML = ''; drivers.textContent = ''; return; }
      const r = model.predict(text);
      bars.innerHTML = ['negative', 'neutral', 'positive'].map((c) => {
        const p = r.probs[c];
        return `<div class="bar ${c === r.label ? 'top' : ''}"><span>${c}</span><span class="t"><i style="width:${(p * 100).toFixed(1)}%"></i></span><b>${(p * 100).toFixed(0)}%</b></div>`;
      }).join('');
      const push = r.drivers.filter((d) => d.weight > 0).slice(0, 6);
      const words = push.map((d) => `<span class="pos">${esc(d.term)}</span>`).join('');
      const verdict = expert ? (expert === r.label ? `Experts said ${expert}; the baseline agrees.` : `Experts said <b style="font-weight:500">${expert}</b>; the baseline says ${r.label}.`) : `The baseline says ${r.label}.`;
      drivers.innerHTML = `${verdict} ${push.length ? `Terms pushing it there: ${words}` : 'Few of these words are in its vocabulary.'}`;
    };
    box.querySelectorAll('.chips button').forEach((b) => b.addEventListener('click', () => {
      ta.value = b.textContent; expert = b.dataset.label; run(); ta.focus();
    }));
    ta.addEventListener('input', () => { expert = ''; run(); });
    run();
  }).catch(() => { bars.textContent = 'The baseline could not be loaded here.'; });
}
