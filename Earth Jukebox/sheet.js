// ================= SCROLLING SHEET MUSIC =================
// One strip under the map with a staff for every voice: drone, chords, high voice, lead and drums. Notes scroll from right to left
// past a fixed "now" line. In live mode the notes are the ones the app actually schedules (the voices call noteLog); in MuseScore mode they
// are the notes of the composition (score_notes.js). Loaded before app.js; it uses app.js's globals (A, T, playing, scoreOn ...) only at run time.
const EJP = () => !!(window.EJ && window.EJ.playing), EJA = () => (window.EJ ? window.EJ.A : null), EJT = () => (window.EJ ? window.EJ.T : null), EJS = () => !!(window.EJ && window.EJ.scoreOn()), EJ_INSTR = () => (window.EJ && window.EJ.INSTR) || {};   // app.js keeps its state private; it publishes these through window.EJ
const SHEET = { notes: [], ctx: null, clef: [], drumSlot: {}, key: '', lastText: '', lastTextAt: 0, hiddenByUser: false };
const SH = { ROW: 46, LEFT: 124, G: 4.4, PPS: 78, AHEAD: 0.3, COLORS: ['#e8765a', '#c79bf0', '#8fc1c1', '#7be860', '#ffd54a'], NAMES: ['Drone', 'Chords', 'High voice', 'Lead', 'Drums'] };
const SH_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];                       // semitones above D -> step of the D major scale (D E F# G A B C#)
const SH_PC = ['D', 'D', 'E', 'E', 'F sharp', 'G', 'G', 'A', 'A', 'B', 'B', 'C sharp'];
const shDia = m => { const x = Math.round(m) - 62, o = Math.floor(x / 12); return 7 * o + SH_STEP[x - 12 * o]; };   // 0 = D4
const SH_BOTTOM = { treble: shDia(64), bass: shDia(43) };                    // bottom line: E4 (treble), G2 (bass)
const shName = m => SH_PC[(((Math.round(m) - 62) % 12) + 12) % 12];

function noteLog(v, t, m, d, stroke, id) {                                    // called by the live voices as they schedule a note
  if (!EJP() || EJS()) return;
  if (EJA() && SHEET.ctx !== EJA().ctx) { SHEET.ctx = EJA().ctx; SHEET.notes = []; SHEET.clef = []; SHEET.drumSlot = {}; }      // a new audio clock: forget the old notes
  const N = SHEET.notes;
  if (v < 2) for (let i = N.length - 1; i >= Math.max(0, N.length - 40); i--) { const n = N[i]; if (n.v === v && n.m === m && n.t + n.d >= t - 0.06) { n.d = Math.max(n.d, t + d - n.t); return; } }   // sustained voices: one long note
  N.push({ v, t, d, m, s: stroke, id });
  if (N.length > 1500) N.splice(0, 600);
}

function shVoiceLabels() {
  const P = (EJT() && EJT().instruments) || null, score = EJS();
  if (score) return ['Cello', 'Strings', 'Harp', 'Clarinet', 'Drum kit'];
  if (!P) return SH.NAMES;
  const nm = o => String(o).replace(/^(a|an) /, '').replace(/^soft /, '');
  const hi = { timpani: 'Timpani', marimba: 'Marimba', vibes: 'Vibraphone', gong: 'Gong' }[P.strong] + ' / ' + { harp: 'Harp', celesta: 'Celesta', kalimba: 'Kalimba', glass: 'Glass bells' }[P.light];
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return [cap({ tanpura: 'tanpura', pedal: 'organ pedal', didgeridoo: 'didgeridoo' }[P.drone] || P.drone), cap({ strings: 'strings', choir: 'choir', brass: 'brass', organ: 'organ', low: 'low strings' }[P.pad] || P.pad), hi, cap(({ horn: 'French horn' })[P.lead] || P.lead), 'Regional drums'];
}

function shScoreNotes(now, from, to) {                                       // composition notes that fall in [from, to] seconds (audio clock), looped every 32 s
  const S = window.SCORE_NOTES; if (!S) return [];
  const A_ = EJA(), t0 = (A_ && A_.score && A_.score.t0 != null) ? A_.score.t0 : 0, base = t0 + 0.075, loop = 32, out = [];
  const n0 = Math.floor((from - base) / loop) - 1, n1 = Math.floor((to - base) / loop) + 1;
  ['drone', 'pad', 'high', 'lead', 'drums'].forEach((key, v) => {
    for (let n = n0; n <= n1; n++) for (const [b, d, m] of S[key]) {
      if (d < 0.2) continue;                                                 // skip the tiny grace notes
      const t = base + n * loop + b * 0.5; if (t + d * 0.5 < from || t > to) continue;
      out.push({ v, t, d: d * 0.5, m, s: v === 4 ? m : null });
    }
  });
  return out;
}

function shClef(v, list) {
  if (v === 4) return 'perc';
  const ms = list.filter(n => n.v === v).map(n => n.m).sort((a, b) => a - b);
  let cur = SHEET.clef[v]; if (!ms.length) return cur || (v < 2 ? 'bass' : 'treble');
  const med = ms[ms.length >> 1];
  if (!cur) cur = med < 58 ? 'bass' : 'treble'; else if (cur === 'treble' && med < 53) cur = 'bass'; else if (cur === 'bass' && med > 62) cur = 'treble';
  return (SHEET.clef[v] = cur);
}

let shCanvas = null, shCtx = null, shW = 0, shDirty = true;
function shSetup() {
  shCanvas = document.getElementById('sheet'); if (!shCanvas) return false;
  const dpr = window.devicePixelRatio || 1, w = shCanvas.clientWidth || 800, h = SH.ROW * 5;
  if (shCanvas.width !== Math.round(w * dpr) || shCanvas.height !== Math.round(h * dpr)) { shCanvas.width = Math.round(w * dpr); shCanvas.height = Math.round(h * dpr); shDirty = true; }
  shW = w; shCtx = shCanvas.getContext('2d'); shCtx.setTransform(dpr, 0, 0, dpr, 0, 0); return true;
}

function shNote(c, x, y, n, bright, alpha, clefTop, clef) {
  const G = SH.G, col = SH.COLORS[n.v], dur = n.d;
  c.globalAlpha = alpha; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.4;
  if (n.v === 4) {                                                            // percussion: an x notehead
    c.beginPath(); c.moveTo(x - 3, y - 3); c.lineTo(x + 3, y + 3); c.moveTo(x + 3, y - 3); c.lineTo(x - 3, y + 3); c.stroke(); return;
  }
  const steps = (SH_BOTTOM[clef] === undefined) ? 0 : 0;                      // (ledger lines are drawn by the caller)
  const half = dur >= 1.0;
  if (dur > 0.6) { c.globalAlpha = alpha * 0.35; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 4, y); c.lineTo(x + dur * SH.PPS, y); c.stroke(); c.globalAlpha = alpha; c.lineWidth = 1.4; }
  c.save(); c.translate(x, y); c.rotate(-0.35); c.beginPath(); c.ellipse(0, 0, 4.2, 2.9, 0, 0, Math.PI * 2);
  if (half) c.stroke(); else c.fill(); c.restore();
  if (dur < 3.5) {                                                            // stem
    const up = y > clefTop + 2 * G; c.beginPath(); if (up) { c.moveTo(x + 3.8, y - 0.6); c.lineTo(x + 3.8, y - 3.4 * G); } else { c.moveTo(x - 3.8, y + 0.6); c.lineTo(x - 3.8, y + 3.4 * G); } c.stroke();
  }
  if (bright) { c.globalAlpha = 0.5; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.stroke(); }
}

function sheetDraw() {
  if (!shSetup()) return; const c = shCtx, G = SH.G, W = shW, left = SH.LEFT, nowX = left + (W - left) * 0.7;
  const wrap = document.getElementById('sheetWrap'); if (wrap && wrap.hidden) return;
  const A = EJA(), live = !!A, score = EJS();
  if (live && SHEET.ctx !== A.ctx) { SHEET.ctx = A.ctx; SHEET.notes = []; SHEET.clef = []; SHEET.drumSlot = {}; }
  const now = live ? A.ctx.currentTime : 0, pps = SH.PPS, tFrom = now - nowX / pps - 1, tTo = now + (W - nowX) / pps + 1;
  const list = score ? shScoreNotes(now, tFrom, tTo) : SHEET.notes.filter(n => n.t + n.d >= tFrom && n.t <= tTo);
  const labels = shVoiceLabels(), playingNow = EJP();
  c.clearRect(0, 0, W, SH.ROW * 5);
  for (let v = 0; v < 5; v++) {
    const top = v * SH.ROW, y0 = top + (SH.ROW - 4 * G) / 2, yB = y0 + 4 * G, clef = score ? (v < 2 ? 'bass' : v === 4 ? 'perc' : 'treble') : shClef(v, list);
    c.save(); c.beginPath(); c.rect(0, top, W, SH.ROW); c.clip();
    c.globalAlpha = 1; c.fillStyle = v % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.0)'; c.fillRect(0, top, W, SH.ROW);
    c.strokeStyle = '#46576b'; c.lineWidth = 1; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(left - 34, y0 + i * G + 0.5); c.lineTo(W, y0 + i * G + 0.5); c.stroke(); }
    c.fillStyle = SH.COLORS[v]; c.globalAlpha = 1; c.fillRect(0, top + 3, 4, SH.ROW - 6);                       // voice colour tag
    c.fillStyle = '#d6dfe8'; c.font = '600 11.5px system-ui, Segoe UI, sans-serif'; c.textBaseline = 'top'; c.fillText(SH.NAMES[v], 10, top + 5);
    c.fillStyle = '#a9b6c4'; c.font = '10.5px system-ui, Segoe UI, sans-serif'; c.fillText(labels[v].length > 15 ? labels[v].slice(0, 14) + '…' : labels[v], 10, top + 20);
    if (clef !== 'perc') {                                                    // clef and key signature (D major: F sharp, C sharp)
      c.fillStyle = '#d6dfe8'; c.textBaseline = 'alphabetic'; c.font = (clef === 'treble' ? '26px' : '22px') + ' "Segoe UI Symbol", "Noto Music", "Apple Symbols", serif';
      c.fillText(clef === 'treble' ? '𝄞' : '𝄢', left - 31, clef === 'treble' ? yB + 4 : y0 + 3.5 * G);
      c.font = '13px "Segoe UI Symbol", serif'; const fy = clef === 'treble' ? yB - 8 * G / 2 : yB - 6 * G / 2, cy = clef === 'treble' ? yB - 5 * G / 2 : yB - 3 * G / 2;
      c.fillText('♯', left - 12, fy + 4); c.fillText('♯', left - 4, cy + 4);
    } else { c.fillStyle = '#d6dfe8'; c.fillRect(left - 24, y0 + 1.5 * G, 3, G); c.fillRect(left - 17, y0 + 1.5 * G, 3, G); }
    c.restore();
  }
  c.save(); c.beginPath(); c.rect(left, 0, W - left, SH.ROW * 5); c.clip();
  if (score) { const base = (live && A.score && A.score.t0 != null ? A.score.t0 : 0) + 0.075; c.strokeStyle = 'rgba(169,182,196,0.25)'; c.lineWidth = 1;      // bar lines every four beats
    for (let tt = Math.ceil((tFrom - base) / 2) * 2 + base; tt < tTo; tt += 2) { const x = nowX + (tt - now) * pps; c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, SH.ROW * 5); c.stroke(); } }
  list.sort((a, b) => a.t - b.t);
  for (const n of list) {
    const x = nowX + (n.t - now) * pps; if (x < left - 10 || x > W + 10) continue;
    const v = n.v, top = v * SH.ROW, y0 = top + (SH.ROW - 4 * G) / 2, yB = y0 + 4 * G, clef = score ? (v < 2 ? 'bass' : v === 4 ? 'perc' : 'treble') : shClef(v, list);
    let y;
    if (clef === 'perc') {
      let slot; if (score) slot = { 36: 1, 38: 3, 37: 5, 42: 8 }[n.m] || 4; else { const k = (n.id || '') + n.s; slot = SHEET.drumSlot[k]; if (slot === undefined) { slot = SHEET.drumSlot[k] = [1, 6, 3, 8, 4, 7, 2, 5][Object.keys(SHEET.drumSlot).length % 8]; } }
      y = yB - slot * G / 2;
    } else y = yB - (shDia(n.m) - SH_BOTTOM[clef]) * G / 2;
    if (y < top + 2 || y > top + SH.ROW - 2) continue;                        // out of the row: skip rather than spill into the next staff
    const sounding = now >= n.t - 0.02 && now <= n.t + n.d;
    let alpha = n.t + n.d < now ? 0.5 : 0.95;
    if (score && live && A.score && A.score.parts && A.score.parts[v]) alpha *= 0.3 + 0.7 * (A.score.parts[v].lvl || 0);   // quieter data = fainter notes
    c.save(); c.beginPath(); c.rect(left, top, W - left, SH.ROW); c.clip();
    if (clef !== 'perc') { c.strokeStyle = '#46576b'; c.globalAlpha = alpha; c.lineWidth = 1; for (let ly = y0 - G; ly >= y - 1; ly -= G) { c.beginPath(); c.moveTo(x - 7, Math.round(ly) + 0.5); c.lineTo(x + 7, Math.round(ly) + 0.5); c.stroke(); } for (let ly = yB + G; ly <= y + 1; ly += G) { c.beginPath(); c.moveTo(x - 7, Math.round(ly) + 0.5); c.lineTo(x + 7, Math.round(ly) + 0.5); c.stroke(); } }
    shNote(c, x, y, n, sounding, alpha, y0, clef); c.restore();
  }
  c.restore();
  c.globalAlpha = 1; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.shadowColor = 'rgba(255,255,255,0.7)'; c.shadowBlur = 8; c.beginPath(); c.moveTo(nowX, 0); c.lineTo(nowX, SH.ROW * 5); c.stroke(); c.shadowBlur = 0;
  if (playingNow && performance.now() - SHEET.lastTextAt > 3000) shText(list, now, labels);
}

function shText(list, now, labels) {                                          // a words-only version of what the strip shows, for people who cannot see it
  SHEET.lastTextAt = performance.now();
  const parts = [];
  for (let v = 0; v < 5; v++) {
    const cur = list.filter(n => n.v === v && now >= n.t - 0.05 && now <= n.t + n.d + 0.1);
    if (!cur.length) continue;
    if (v === 4) parts.push(`${SH.NAMES[v]}: ${labels[4] === 'Regional drums' && cur[0].id && EJ_INSTR()[cur[0].id] ? EJ_INSTR()[cur[0].id].name : labels[4]}`);
    else { const names = [...new Set(cur.map(n => shName(n.m)))]; parts.push(`${SH.NAMES[v]} (${labels[v]}): ${names.join(', ')}`); }
  }
  const txt = parts.length ? 'Playing now. ' + parts.join('. ') + '.' : 'Playing now: rests.';
  const el = document.getElementById('sheetNow'); if (el && txt !== SHEET.lastText) { SHEET.lastText = txt; el.textContent = txt; }
}

function sheetLoop() {
  const wrap = document.getElementById('sheetWrap');
  if (wrap && !wrap.hidden) {
    const key = (EJT() ? EJT().id : '') + '|' + EJS() + '|' + (document.getElementById('sheet') ? document.getElementById('sheet').clientWidth : 0);
    if (key !== SHEET.key) { SHEET.key = key; SHEET.clef = []; shDirty = true; }
    if (EJP() || shDirty) { sheetDraw(); shDirty = false; }
  }
  requestAnimationFrame(sheetLoop);
}
window.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('showSheet'), wrap = document.getElementById('sheetWrap'); if (!box || !wrap) return;
  let on = true; try { on = localStorage.getItem('ej_sheet') !== '0'; } catch (e) {}
  box.checked = on; wrap.hidden = !on;
  box.addEventListener('change', () => { wrap.hidden = !box.checked; shDirty = true; try { localStorage.setItem('ej_sheet', box.checked ? '1' : '0'); } catch (e) {} });
  window.addEventListener('resize', () => { shDirty = true; });
  requestAnimationFrame(sheetLoop);
});
