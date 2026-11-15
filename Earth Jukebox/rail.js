// A rail of square switch buttons beside the map. Each one is a front for a checkbox in Settings (the checkbox stays the single source of truth, so every
// existing handler, saved choice and screen-reader label keeps working). A rail button is a toggle button: its name is the visible label, its state is aria-pressed.
(() => {
  const $ = id => document.getElementById(id), rails = { L: $('toggleRail'), R: $('toggleRailR') }; if (!rails.L || !rails.R) return;
  const ITEMS = [   // [control id, icon, short label, longer tooltip, side]: left = sound and score, right = speech and captions. Harmony, Music bed, Gamakas and Regional scales stay in Settings only.
    ['skipAnt', '🐧', 'Skip Antarctic', 'Skip the Antarctic drone: leave the far south out of the deep hum', 'L'],
    ['quietRead', '🤫', 'Quiet music', 'Quiet the music while I read: the sound drops whenever new text appears (key M)', 'L'],
    ['showSheet', '🎼', 'Sheet music', 'Show the scrolling sheet music', 'L'],
    ['speak', '🗣️', 'Narration', 'Spoken narration: a voice describes the map, then the sweep plays once', 'R'],
    ['introLen', '📖', 'Full intro', 'Full spoken introduction: on gives the long version of the intro, off gives the short one', 'R'],
    ['captions', '💬', 'Captions', 'Captions: the words the narrator speaks also appear as text near the bottom of the map. Needs Narration on', 'R', 'speak']
  ];
  const btns = [];
  ITEMS.forEach(([id, icon, label, tip, side, needs]) => {
    const cb = $(id); if (!cb) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rail-btn'; b.title = tip; b.dataset.for = id;
    b.innerHTML = `<span class="ic" aria-hidden="true">${icon}</span><span class="lb">${label}</span><span class="st" aria-hidden="true"></span>`;
    b.addEventListener('click', () => { if (cb.disabled) return; if (cb.tagName === 'SELECT') { cb.value = cb.value === 'full' ? 'short' : 'full'; cb.dispatchEvent(new Event('change', { bubbles: true })); } else cb.click(); sync(); });
    b.dataset.needs = needs || ''; rails[side].appendChild(b); btns.push([b, cb]);
  });
  // the action buttons live in the rails too: Hear instruments last on the left, Skip intro last on the right (it is only enabled while the spoken intro plays)
  const skip = $('skip'); rails.L.appendChild($('demoAll')); rails.R.appendChild(skip);
  $('demoAll').classList.add('key-btn'); btns.forEach(([b, cb]) => { if (cb.id === 'speak') b.classList.add('key-btn'); });      // the two buttons that make the page understandable (Hear instruments, Narration) get a gold rim, so they stand out among the many
  const n = Math.max(rails.L.children.length, rails.R.children.length);      // same number of buttons on both sides: pad the shorter side with blank, disabled ones
  [rails.L, rails.R].forEach(side => { while (side.children.length < n) { const b = document.createElement('button'); b.type = 'button'; b.className = 'rail-btn rail-blank'; b.disabled = true; b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); side.appendChild(b); } });
  function sync() {
    if (skip) { skip.disabled = skip.hidden; skip.setAttribute('aria-hidden', String(skip.hidden)); skip.tabIndex = skip.hidden ? -1 : 0; }
    btns.forEach(([b, cb]) => {
      const on = cb.tagName === 'SELECT' ? cb.value === 'full' : !!cb.checked; if (b.getAttribute('aria-pressed') !== String(on)) { b.setAttribute('aria-pressed', String(on)); b.querySelector('.st').textContent = on ? 'ON' : 'OFF'; }
      const off = cb.disabled || (b.dataset.needs && !$(b.dataset.needs).checked); if (b.disabled !== off) b.disabled = off;      // a switch that depends on another one is greyed out while that one is off
    });
  }
  document.addEventListener('change', sync);
  setInterval(sync, 400);      // some switches are set from code without a change event (the M key, saved choices)
  sync();
})();
