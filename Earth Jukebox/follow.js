// ================= FOLLOW A CURRENT =================
// Instead of sweeping every column left to right, follow one of the data's own lines. The ocean picture is made of flow lines; flow_field.js holds
// their direction (per 16 px tile). A start point is traced along those lines, and the sound travels with it:
//   pitch = the water temperature under the point (warmer is higher), pan = where it is on the map, scale = the region it is passing through
//   (its sad form where the water is warm, urgent where it is very warm), tangled flow (swirl) and sudden temperature changes (fronts) add sparkles.
// A flow line has an orientation but no arrow, so the direction cannot be read from the picture. The named currents use their known direction;
// a clicked start heads east unless "Reverse direction" is ticked.
(() => {
  const F = window.FLOW_FIELD, $ = id => document.getElementById(id); if (!F || !$('followPanel')) return;
  const API = () => window.EJ && window.EJ.follow, cols = F.cols, rows = F.rows, STEP = 0.25, MAXPTS = 160;
  const PRESETS = [
    { name: 'Gulf Stream', lon: -80, lat: 26, hint: [1, -0.6] },
    { name: 'Kuroshio', lon: 125, lat: 22, hint: [1, -0.6] },
    { name: 'Agulhas Current', lon: 33, lat: -28, hint: [-0.4, 1] },
    { name: 'Antarctic Circumpolar Current', lon: 20, lat: -52, hint: [1, 0] },
    { name: 'Humboldt (Peru) Current', lon: -78, lat: -18, hint: [0, -1] },
  ];
  let path = null, run = null, hint = [1, 0], label = '';
  const onOcean = () => window.EJ && window.EJ.T && window.EJ.T.id === 'ocean';

  function samp(x, y) {                                   // bilinear read of the field at a position in tile units
    const fx = x - 0.5, fy = y - 0.5, i0 = Math.floor(fx), j0 = Math.floor(fy), ax = fx - i0, ay = fy - j0;
    let sx = 0, sy = 0, w = 0, ts = 0, tw = 0, cv = 0;
    for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const wt = (di ? ax : 1 - ax) * (dj ? ay : 1 - ay), i = ((i0 + di) % cols + cols) % cols, j = Math.max(0, Math.min(rows - 1, j0 + dj)), k = j * cols + i;
      const cov = F.cov[k] / 255, coh = F.coh[k] / 255, th = F.ori[k] / 255 * Math.PI, m = wt * cov;
      sx += m * coh * Math.cos(2 * th); sy += m * coh * Math.sin(2 * th); w += m; cv += wt * cov;
      if (F.temp[k] !== 255) { ts += m * F.temp[k] / 254 * 32; tw += m; }
    }
    return { th: 0.5 * Math.atan2(sy, sx), mag: w > 0 ? Math.hypot(sx, sy) / w : 0, cov: cv, temp: tw > 0 ? ts / tw : null };
  }
  function trace(lon, lat, dir, reverse) {
    let x = (lon + 180) / 360 * cols, y = (90 - lat) / 180 * rows, dx = dir[0], dy = dir[1], n0 = Math.hypot(dx, dy) || 1; dx /= n0; dy /= n0;
    if (reverse) { dx = -dx; dy = -dy; }
    const pts = []; let low = 0, stop = 'length', last = null;
    for (let n = 0; n < MAXPTS; n++) {
      const s = samp(x, y);
      if (s.cov < 0.1) { if (++low >= 3) { stop = 'no flow lines (land, or no decoded colour)'; break; } } else low = 0;
      let fx = Math.cos(s.th), fy = Math.sin(s.th); if (fx * dx + fy * dy < 0) { fx = -fx; fy = -fy; }
      const wgt = 0.4 + 0.6 * Math.min(1, s.mag * 1.6); let nx = fx * wgt + dx * (1 - wgt), ny = fy * wgt + dy * (1 - wgt); const nn = Math.hypot(nx, ny) || 1; dx = nx / nn; dy = ny / nn;
      if (s.temp !== null) last = s.temp;
      pts.push({ x, y, lon: x / cols * 360 - 180, lat: 90 - y / rows * 180, temp: s.temp !== null ? s.temp : last, mag: s.mag, cov: s.cov });
      x = ((x + dx * 0.6) % cols + cols) % cols; y += dy * 0.6;
      if (y < 0.5 || y > rows - 0.5) { stop = 'the edge of the map'; break; }
    }
    pts.forEach((p, i) => { if (p.temp === null || p.temp === undefined) p.temp = 15; });
    for (let i = 0; i < pts.length; i++) { let s = 0, k = 0; for (let d = -1; d <= 1; d++) { const q = pts[i + d]; if (q) { s += q.temp; k++; } } pts[i].t = s / k; }   // smoothed along the line
    return { pts, stop };
  }

  // ---- drawing ----
  const layer = $('followLayer'), tcol = t => { const h = 240 - 240 * Math.max(0, Math.min(1, t / 32)); return `hsl(${h},90%,58%)`; };
  function draw(idx) {
    if (!layer) return; const st = $('stage'), w = st.clientWidth, h = st.clientHeight, dpr = window.devicePixelRatio || 1;
    if (layer.width !== Math.round(w * dpr) || layer.height !== Math.round(h * dpr)) { layer.width = Math.round(w * dpr); layer.height = Math.round(h * dpr); }
    const c = layer.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
    if (!path || !onOcean()) return; const P = path.pts, X = p => p.x / cols * w, Y = p => p.y / rows * h;
    const seg = (a, b, col, lw, al) => { if (Math.abs(X(a) - X(b)) > w / 2) return; c.globalAlpha = al; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(X(a), Y(a)); c.lineTo(X(b), Y(b)); c.stroke(); };
    for (let i = 1; i < P.length; i++) { seg(P[i - 1], P[i], '#000', 5, 0.5); seg(P[i - 1], P[i], i <= idx ? tcol(P[i].t) : '#ffffff', i <= idx ? 3 : 2, i <= idx ? 1 : 0.55); }
    const s0 = P[0]; c.globalAlpha = 1; c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(X(s0), Y(s0), 5, 0, 7); c.fill(); c.stroke();      // the start
    if (idx >= 0 && idx < P.length) { const p = P[idx]; c.fillStyle = '#ffd54a'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(X(p), Y(p), 8, 0, 7); c.fill(); c.stroke(); }
  }

  // ---- sound ----
  const fmtLat = l => Math.abs(Math.round(l)) + '°' + (l < 0 ? 'S' : 'N'), fmtLon = l => Math.abs(Math.round(l)) + '°' + (l < 0 ? 'W' : 'E');
  function setStatus(t) { const e = $('followStatus'); if (e && e.textContent !== t) e.textContent = t; }
  function stop(msg) {
    if (run) { clearInterval(run.timer); cancelAnimationFrame(run.raf); clearTimeout(run.endT); const A = API(); run = null; window.EJ_following = false; A.hold(false); A.hardStop(); }        // at once: no fade-out, nothing left ringing
    $('fGo').textContent = '▶ Follow'; $('fGo').setAttribute('aria-pressed', 'false'); if (msg) setStatus(msg); draw(path ? path.pts.length : -1);
  }
  window.EJ_followStop = () => { if (run) stop(); };
  async function go() {
    if (run) { stop('Stopped.'); return; }
    const A = API(); if (!A || !onOcean()) return;
    A.pauseSweep(); const lon = +$('fLon').value, lat = +$('fLat').value;
    path = trace(lon, lat, hint, $('fRev').checked); const P = path.pts;
    if (P.length < 6) { draw(-1); setStatus(`There are no flow lines at ${fmtLat(lat)}, ${fmtLon(lon)}: it may be land, or the picture has no decoded colour there. Try another start.`); return; }
    window.EJ_following = true;     A.hold(true); await A.wake(); const ctx = window.EJ.A.ctx, t0 = ctx.currentTime + 0.3; let next = 0, lastText = -1;
    $('fGo').textContent = '⏹ Stop'; $('fGo').setAttribute('aria-pressed', 'true'); setStatus(`Following ${label || 'the current'} from ${fmtLat(lat)}, ${fmtLon(lon)}.`);
    const lightKind = A.lightKind();
    const sched = () => {
      const a = window.EJ.A; if (!a || a.ctx !== ctx) { stop(); return; }
      while (next < P.length && t0 + next * STEP < ctx.currentTime + 0.4) {
        const p = P[next], t = t0 + next * STEP, frac = p.t / 32, trb = p.t > 22.4, urg = p.t > 28 ? 0.8 : 0, sc = A.setScaleAt(p.lon, p.lat, trb, urg);
        const pan = Math.max(-0.8, Math.min(0.8, (p.x / cols - 0.5) * 1.6)), prev = P[Math.max(0, next - 3)], front = Math.abs(p.t - prev.t) > 2.5, swirl = p.mag < 0.35;
        const k = Math.min(3, Math.floor((90 - p.lat) / 180 * 4));
        A.drone(t, A.droneHz(), 0.1); A.pad(t, A.chordFor(k), 0.2, 900 + 1100 * Math.min(1, p.cov * 2));
        if (next % 2 === 0) A.lead(t, A.valueMidi(frac), 0.1 + 0.16 * Math.min(1, p.cov * 2), pan, swirl ? 0.9 : 1.2);
        if (front || (swirl && next % 2 === 1)) A.pluck(lightKind, t + 0.06, A.valueMidi(Math.min(1, frac + 0.12)) + 12, 0.07 + (front ? 0.05 : 0), pan);
        if (urg) A.urgentAt(t, STEP, t0);
        next++;
      }
    };
    run = { timer: setInterval(sched, 80), raf: 0, endT: 0 }; sched();
    const tick = () => {
      if (!run) return; const a = window.EJ.A; if (!a || a.ctx !== ctx) { stop(); return; }
      const idx = Math.floor((ctx.currentTime - t0) / STEP); draw(Math.max(-1, Math.min(P.length - 1, idx)));
      if (idx >= 0 && idx < P.length && idx !== lastText && idx % 4 === 0) { lastText = idx; const p = P[idx], sc = a ? window.EJ.follow.scale() : null;
        setStatus(`${label || 'Current'}: ${fmtLat(p.lat)}, ${fmtLon(p.lon)}. Water about ${Math.round(p.t)} °C. Scale: ${sc ? sc.name + ', for ' + sc.place : ''}. Mood: ${p.t > 28 ? 'urgent, very warm water' : p.t > 22.4 ? 'sad, warm water' : 'calm, cool or mild water'}.`); }
      if (idx >= P.length + 4) { const m = Math.round(Math.min(...P.map(q => q.t))) + ' to ' + Math.round(Math.max(...P.map(q => q.t))); stop(`The line ended at ${fmtLat(P[P.length - 1].lat)}, ${fmtLon(P[P.length - 1].lon)}, where it reached ${path.stop}. Along it the water ranged from about ${m} °C.`); return; }
      run.raf = requestAnimationFrame(tick);
    };
    run.raf = requestAnimationFrame(tick);
  }

  // ---- controls ----
  const box = $('followPresets');
  PRESETS.forEach(p => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary'; b.textContent = p.name;
    b.addEventListener('click', () => { $('fLon').value = p.lon; $('fLat').value = p.lat; $('fRev').checked = false; hint = p.hint; label = 'the ' + p.name; if (run) stop(); go(); });
    box.appendChild(b);
  });
  ['fLon', 'fLat'].forEach(id => $(id).addEventListener('change', () => { hint = [1, 0]; label = ''; }));
  $('fGo').addEventListener('click', go);
  $('stage').addEventListener('click', e => {           // with "Click the map to choose the start" ticked, a click starts a current instead of playing that spot
    if (!$('fPick').checked || !onOcean()) return; e.stopImmediatePropagation(); e.preventDefault();
    const r = $('stage').getBoundingClientRect(); $('fLon').value = Math.round(((e.clientX - r.left) / r.width) * 360 - 180); $('fLat').value = Math.round(90 - ((e.clientY - r.top) / r.height) * 180);
    hint = [1, 0]; label = ''; if (run) stop(); go();
  }, true);
  setInterval(() => { const on = onOcean(); if ($('followPanel').hidden === on) { $('followPanel').hidden = !on; if (!on) { if (run) stop(); path = null; draw(-1); } } }, 250);
  window.addEventListener('resize', () => draw(-1));
})();
