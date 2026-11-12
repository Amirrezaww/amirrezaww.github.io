/* Trace viewer over the three committed rows of rag_evaluation_results.csv. */
const box = document.querySelector('[data-traces]');
if (box) {
  const tabs = box.querySelector('.trace-tabs');
  const spans = box.querySelector('.spans');
  const list = box.querySelector('.retrieved');
  const answer = box.querySelector('.answer');
  const verdicts = box.querySelector('.verdicts');
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LEAK = /^(Based on [^.:\n]*(?:provided|news)[^.:\n]*[.:]|I now have the additional information[^.\n]*\.)/;

  fetch('../data/rag-traces.json').then((r) => r.json()).then((rows) => {
    const max = Math.max(...rows.map((r) => r.total_ms));
    const show = (i) => {
      const r = rows[i];
      [...tabs.children].forEach((b, j) => { b.setAttribute('aria-selected', String(i === j)); b.tabIndex = i === j ? 0 : -1; });
      const other = r.total_ms - r.retrieval_ms - r.generation_ms;
      const seg = [
        ['Retrieval', 0, r.retrieval_ms, ''],
        ['Generation', r.retrieval_ms, r.generation_ms, 'gen'],
        ['Other', r.retrieval_ms + r.generation_ms, other, ''],
      ];
      spans.innerHTML = seg.map(([n, start, d, c]) => `<div class="span ${c}"><span>${n}</span><span class="t"><i style="left:${(start / max) * 100}%;width:${(d / max) * 100}%"></i></span><b>${d.toLocaleString('en-GB')} ms</b></div>`).join('')
        + `<div class="span"><span><b style="font-weight:500">Total</b></span><span></span><b style="font-weight:500">${r.total_ms.toLocaleString('en-GB')} ms</b></div>`;
      list.innerHTML = r.retrieved_questions.map((q, k) => `<li><span>${esc(q)}</span><span>${esc(r.contexts[k])}</span></li>`).join('');
      const m = r.response.match(LEAK);
      const body = m ? `<span class="leak">${esc(m[0])}</span>${esc(r.response.slice(m[0].length))}` : esc(r.response);
      answer.innerHTML = `<p><b style="font-weight:500">Answer.</b> ${body.replace(/\n+/g, ' ')}</p>`;
      const yn = (v) => (v ? 'yes' : 'no');
      verdicts.innerHTML = `<span>Ground truth: <b style="font-weight:500">${esc(r.truth)}</b></span><span>Accurate: ${yn(r.accuracy)}</span><span>Relevant context: ${yn(r.relevance)}</span><span>Judged faithful: ${yn(r.faithfulness)}</span>`;
    };
    tabs.innerHTML = rows.map((r, i) => `<button type="button" role="tab" aria-selected="${i === 0}">${esc(r.query)}</button>`).join('');
    [...tabs.children].forEach((b, i) => {
      b.addEventListener('click', () => show(i));
      b.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const n = (i + (e.key === 'ArrowRight' ? 1 : rows.length - 1)) % rows.length;
        tabs.children[n].focus(); show(n);
      });
    });
    show(2);
  }).catch(() => { spans.textContent = 'The traces could not be loaded here.'; });
}
