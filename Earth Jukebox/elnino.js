// ================= EL NIÑO LAYER (an add-on for the Sea temperature track) =================
// Data: NASA SVS 4695 (monthly sea surface temperature ANOMALY maps, 1982 to 2017: the difference from normal, decoded from the movie by
// tools/analyse-nino.html into elnino_grid.js) and NOAA's Niño 3.4 index (monthly numbers, 1982 to the latest published month, nino34_index.js).
//   See:  the anomaly map is laid over the temperature map (red = warmer than normal, blue = cooler), for the month chosen on the slider.
//   Hear: (1) when you press Play, the sweep also plays the anomaly under the beam: warm anomalies as bright glass notes, cool ones as dull
//         kalimba notes, with PITCH = THE ANOMALY (higher = warmer than normal); the music turns sad where the anomaly is warm and urgent
//         where it is very warm. This replaces the picture-ranking mood, which could not tell "warm" from "warmer than normal".
//         (2) "Play the years" plays the Niño 3.4 index through time (one note per three months, so it follows NOAA's 3-month ONI idea)
//         while the anomaly maps animate. El Niño (index at or above +0.5) turns the music sad, and strong El Niño urgent.
(() => {
  const E = window.ELNINO, IDX = window.NINO34, $ = id => document.getElementById(id); if (!E || !IDX || !$('elPanel')) return;
  const API = () => window.EJ && window.EJ.follow, COLS = E.cols, ROWS = E.rows, MONTHS = E.months, OFF = (E.start - IDX.start) * 12;
  let lastIdx = IDX.values.length - 1; while (lastIdx > 0 && IDX.values[lastIdx] === null) lastIdx--;
  const MAXM = lastIdx - OFF, SPM = 0.17685, MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = m => `${MN[m % 12]} ${E.start + Math.floor(m / 12)}`, idxAt = m => (OFF + m >= 0 && OFF + m < IDX.values.length) ? IDX.values[OFF + m] : null;
  const sgn = v => (v >= 0 ? '+' : '') + v.toFixed(1), state = v => v === null ? 'not published yet' : v >= 0.5 ? 'El Niño range (at or above +0.5)' : v <= -0.5 ? 'La Niña range (at or below -0.5)' : 'near normal';
  let D = null, month = 191, on = false, run = null, cache = {};
  const data = () => { if (!D) { const b = atob(E.b64); D = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) D[i] = b.charCodeAt(i); } return D; };
  const anom = (m, r, c) => { const v = data()[(m * ROWS + r) * COLS + c]; return v === 255 ? null : (v - 100) / 10; };
  const onSST = () => window.EJ && window.EJ.T && window.EJ.T.id === 'sst';

  // ---- numbers for the sweep: the anomaly under one column of the beam ----
  function colStats(c) {
    if (month >= MONTHS) return null; const key = month + ':' + c; if (cache[key] !== undefined) return cache[key];
    let n = 0, sum = 0, max = -9, min = 9, rMax = -1, rMin = -1;
    for (let r = 1; r <= 15; r++) { const a = anom(month, r, c); if (a === null) continue; n++; sum += a; if (a > max) { max = a; rMax = r; } if (a < min) { min = a; rMin = r; } }
    return (cache[key] = n < 2 ? null : { mean: sum / n, max, min, rMax, rMin });
  }
  window.EJ_elnino = {
    active: () => on && onSST() && month < MONTHS,
    trace(c) { const s = colStats(c); return { el_layer_month: label(month), el_anomaly_mean_c: s ? +s.mean.toFixed(2) : null, el_anomaly_max_c: s ? +s.max.toFixed(1) : null, el_anomaly_min_c: s ? +s.min.toFixed(1) : null, el_source: 'assets/elnino/nino34.webm via elnino_grid.js' }; },
    mood(c) {                                          // replaces the ranking-based mood while the layer is on
      const s = colStats(c); if (!s) return null;
      const trb = s.mean > 0.3 || s.max >= 1.5, urg = s.max >= 2.5 ? Math.min(1, (s.max - 2) / 2) : 0;
      return { trb, urg, text: urg > 0.3 ? `urgent, because the water is much warmer than normal (up to ${sgn(s.max)} °C)` : trb ? `sad, because the water is warmer than normal (up to ${sgn(s.max)} °C)` : s.min <= -1.5 ? `calm but cool, because the water is cooler than normal (down to ${sgn(s.min)} °C)` : 'calm, because the water is close to normal' };
    },
    fx(c, t, step) {                                   // glass notes for warm anomalies, kalimba for cool ones; pitch = the anomaly
      const s = colStats(c), A = API(); if (!s || !A) return;
      const mid = a => A.valueMidi(Math.max(0, Math.min(1, 0.5 + a / 6)));
      if (s.max >= 0.75 && c % 2 === 0) A.pluck('glass', t, mid(s.max) + 12, 0.05 + 0.025 * Math.min(3, s.max), 0.2);
      if (s.min <= -0.75 && c % 2 === 1) A.pluck('kalimba', t, mid(s.min), 0.05 + 0.02 * Math.min(3, -s.min), -0.2);
    },
  };

  // ---- the overlay ----
  const layer = $('elLayer'), vid = $('elVid'), MASK = [[0, 0.70, 0.435, 1.0], [0, 0, 0.36, 0.075]];      // NASA's timeline inset and title, in fractions of the map
  const SHIFT_X = (((-180 - E.shift * 2.25) + 180) % 360 + 360) % 360 / 360;                              // where the movie's left edge falls on our -180..180 map
  const tint = a => a === null ? null : a >= 0 ? `rgba(${Math.round(255 - 40 * Math.min(1, a / 4))},${Math.round(210 - 190 * Math.min(1, a / 4))},${Math.round(190 - 170 * Math.min(1, a / 4))},0.9)` : `rgba(${Math.round(190 + 70 * Math.max(-1, a / 4))},${Math.round(215 + 40 * Math.max(-1, a / 4) - 60 * Math.min(1, -a / 4))},${Math.round(240 - 30 * Math.min(1, -a / 4))},0.9)`;
  function draw() {
    if (!layer) return; const st = $('stage'), w = st.clientWidth, h = st.clientHeight, dpr = window.devicePixelRatio || 1;
    if (layer.width !== Math.round(w * dpr) || layer.height !== Math.round(h * dpr)) { layer.width = Math.round(w * dpr); layer.height = Math.round(h * dpr); }
    const c = layer.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    layer.style.display = (on && onSST() && month < MONTHS) ? 'block' : 'none'; if (layer.style.display === 'none') { const m0 = $('map'); if (m0) m0.style.filter = ''; return; }
    const solo = $('elSolo').checked; const mapEl = $('map'); if (mapEl) mapEl.style.filter = solo ? '' : 'grayscale(0.85)';      // fade the temperature map to grey so the anomaly colours stand out layer.style.opacity = $('elOpacity').value / 100; layer.style.mixBlendMode = solo ? 'normal' : 'multiply';
    if (vid && vid.readyState >= 2) {
      for (const ox of [SHIFT_X * w, SHIFT_X * w - w]) {
        const vw = vid.videoWidth, vh = vid.videoHeight, sy = vh * 10 / 1080, sh = vh * 960 / 1080;       // the 2:1 map fills video rows 10 to 970 of 1080
        c.drawImage(vid, 0, sy, vw, sh, ox, 0, w, h);
        c.drawImage(vid, 0.92 * vw, sy, 0.035 * vw, sh, ox + 0.955 * w, 0, 0.035 * w, h);                   // cover the latitude ruler at the right edge with the strip next to it
        MASK.forEach(([x0, y0, x1, y1]) => { if (solo) { c.fillStyle = '#cfd4d9'; c.fillRect(ox + x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h); } else c.clearRect(ox + x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h); });     // NASA's own inset and labels cover these parts: no anomaly data there
      }
    } else {                                                                                                          // movie not ready: draw the decoded grid instead (coarse)
      const cw = w / COLS, ch = h / ROWS;
      for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) { const col = tint(anom(month, r, cc)); if (col) { c.fillStyle = col; c.fillRect(cc * cw, r * ch, cw + 0.5, ch + 0.5); } }
    }
  }
  const monthTime = m => Math.min((vid && vid.duration ? vid.duration : 77) - 0.05, (m + 0.5) * SPM);
  function setMonth(m, quiet) {
    month = Math.max(0, Math.min(MAXM, Math.round(m))); cache = {}; $('elMonth').value = month;
    const v = idxAt(month); $('elMonthOut').textContent = label(month);
    if (!quiet) $('elStatus').textContent = `${label(month)}: Niño 3.4 index ${v === null ? 'not published yet' : sgn(v) + ' °C, ' + state(v)}.` + (month >= MONTHS ? ' NASA\'s anomaly movie ends in 2017, so there is no map for this month: only the index is available (use "Play the years").' : '');
    if (month < MONTHS && vid && vid.readyState >= 1 && !run) { vid.currentTime = monthTime(month); }
    draw();
  }
  if (vid) { vid.addEventListener('seeked', draw); vid.addEventListener('loadeddata', draw); }

  // ---- play the years ----
  function stopYears(msg) {
    if (!run) return; const A = API(); clearInterval(run.timer); cancelAnimationFrame(run.raf); run = null; window.EJ_following = false; if (vid) vid.pause();
    A.hold(false); A.hardStop(); $('elYears').textContent = '▶ Play the years'; $('elYears').setAttribute('aria-pressed', 'false'); if (msg) $('elStatus').textContent = msg; draw();
  }
  const prevStop = window.EJ_followStop; window.EJ_followStop = () => { if (prevStop) prevStop(); stopYears(); };
  async function years() {
    if (run) { stopYears('Stopped.'); return; }
    const A = API(); if (!A || !onSST()) return; if (prevStop) prevStop(); A.pauseSweep();
    const startM = month >= MAXM - 3 ? 0 : month, q0 = Math.floor(startM / 3), nQ = Math.floor((MAXM - q0 * 3) / 3) + 1, QS = 0.25, MS = QS / 3;
    window.EJ_following = true; A.hold(true); await A.wake(); const ctx = window.EJ.A.ctx, t0 = ctx.currentTime + 0.3; let next = 0, prevState = 0, lastQ = -1, prevM = null, persist = 0; const qinfo = {};
    $('elYears').textContent = '⏹ Stop'; $('elYears').setAttribute('aria-pressed', 'true'); on = true; $('elOn').checked = true;
    const q3 = q => { let s = 0, n = 0; for (let k = 0; k < 3; k++) { const v = idxAt(q * 3 + k); if (v !== null) { s += v; n++; } } return n ? s / n : null; };
    const qMad = (() => {                                // the usual quarter-to-quarter change of the index: median absolute deviation (x 1.4826) of the changes in three-month means, whole record
      const qs = []; for (let i = 0; i + 2 < IDX.values.length; i += 3) { const a = IDX.values.slice(i, i + 3); if (a.every(v => v !== null)) qs.push((a[0] + a[1] + a[2]) / 3); }
      const d = qs.slice(1).map((v, i) => v - qs[i]).sort((x, y) => x - y), med = d[d.length >> 1], dev = d.map(v => Math.abs(v - med)).sort((x, y) => x - y);
      return Math.max(0.05, 1.4826 * dev[dev.length >> 1]);
    })();
    const sched = () => {
      const a = window.EJ.A; if (!a || a.ctx !== ctx) { stopYears(); return; }
      while (next < nQ && t0 + next * QS < ctx.currentTime + 0.4) {
        const q = q0 + next, t = t0 + next * QS, m = q3(q); if (m === null) { next = nQ; break; }
        const zq = prevM === null ? 0 : (m - prevM) / qMad; persist = zq >= 0.75 ? persist + 1 : 0; prevM = m;      // how fast the index is changing, in units of its usual change
        const rapid = (m >= 0.5 && persist >= 2 && zq >= 1) ? Math.min(1, 0.45 + 0.2 * zq) : 0;                     // a sustained, fast rise into the El Niño range is urgent even before the index is very high
        const trb = m >= 0.5, urg = Math.max(m >= 1.5 ? Math.min(1, (m - 1) / 1.5) : 0, rapid), st = m >= 0.5 ? 1 : m <= -0.5 ? -1 : 0; qinfo[q] = { z: zq, rapid: rapid > 0 }; A.setScaleAt(-145, 0, trb, urg);
        window.EJ_traceExtra = { kind: 'years', month: label(q * 3 + 1), nino34_three_month_mean_c: +m.toFixed(2), change_vs_usual_quarterly_change: +zq.toFixed(1), rapid_onset: rapid > 0, source: 'nino34_index.js (NOAA PSL nina34.anom.data)' };
        A.drone(t, A.droneHz(), 0.1); A.pad(t, A.chordFor(m >= 1.5 ? 3 : m >= 0.5 ? 2 : m <= -0.5 ? 1 : 0), 0.2, 800 + 900 * Math.max(0, Math.min(1, 0.5 + m / 4)));
        A.lead(t, A.valueMidi(Math.max(0, Math.min(1, 0.5 + m / 6))), 0.17, 0, 0.6);
        if (st !== prevState && next > 0) { if (st === 1 && prevState !== 1) { A.pluck('glass', t + 0.05, A.valueMidi(0.9) + 12, 0.1, 0); A.pluck('glass', t + 0.2, A.valueMidi(1) + 12, 0.1, 0); } else if (st === -1) A.pluck('kalimba', t + 0.05, A.valueMidi(0.2), 0.1, 0); }
        prevState = st; if (urg) A.urgentAt(t, QS, t0); window.EJ_traceExtra = null; next++;
      }
    };
    run = { timer: setInterval(sched, 80), raf: 0 }; sched();
    const tick = () => {
      if (!run) return; const a = window.EJ.A; if (!a || a.ctx !== ctx) { stopYears(); return; }
      const el = ctx.currentTime - t0, m = Math.max(q0 * 3, Math.min(MAXM, Math.floor(q0 * 3 + el / MS)));
      if (m !== month) { month = m; cache = {}; $('elMonth').value = m; $('elMonthOut').textContent = label(m); }
      if (month < MONTHS && vid) { const want = monthTime(month); if (vid.paused || Math.abs(vid.currentTime - want) > 0.6) { vid.currentTime = want; vid.playbackRate = SPM / MS; if (vid.paused) vid.play().catch(() => {}); } }
      else if (vid && !vid.paused) vid.pause();
      draw(); const q = Math.floor(month / 3);
      if (q !== lastQ) { lastQ = q; const v = q3(q); $('elStatus').textContent = v === null ? '' : `${label(month)}: Niño 3.4 index ${sgn(v)} °C (three-month mean), ${state(v)}.` + (qinfo[q] && qinfo[q].z >= 1 ? ` Rising ${qinfo[q].z.toFixed(1)} times faster than its usual quarter-to-quarter change${qinfo[q].rapid ? ': a rapid onset' : ''}.` : '') + (month >= MONTHS ? ' No map after 2017: index only.' : ''); }
      if (el > nQ * QS + 1.2) { const vs = [0, 1, 2].map(k => idxAt(MAXM - k)).filter(v => v !== null); stopYears(`That is the whole record, to ${label(MAXM)}. The latest index values are ${vs.map(sgn).join(', ')} °C (the newest first).`); return; }
      run.raf = requestAnimationFrame(tick);
    };
    run.raf = requestAnimationFrame(tick);
  }

  // ---- controls ----
  $('elMonth').max = MAXM; $('elMonth').addEventListener('input', e => { if (run) stopYears(); setMonth(+e.target.value); });
  $('elOn').addEventListener('change', e => { on = e.target.checked; if (!on && run) stopYears(); draw(); if (on) setMonth(month); });
  $('elOpacity').addEventListener('input', draw); $('elSolo').addEventListener('change', draw); $('elYears').addEventListener('click', years);
  [['Dec 1982: strong El Niño', 11], ['Dec 1988: La Niña', 83], ['Dec 1997: strongest El Niño', 191], ['Dec 2015: El Niño', 407], ['Latest month (index only)', MAXM]].forEach(([name, m]) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = name; b.addEventListener('click', () => { if (run) stopYears(); $('elOn').checked = true; on = true; setMonth(m); });
    $('elPresets').appendChild(b);
  });
  setInterval(() => { const vis = onSST(); if ($('elPanel').hidden === vis) { $('elPanel').hidden = !vis; if (!vis) { if (run) stopYears(); draw(); } else draw(); } }, 250);
  window.addEventListener('resize', draw); setMonth(month, true);
})();
