// ================= NOTE TRACE =================
// Every note the live voices play during a sweep, a followed current or "Play the years" is recorded with where it came from, so a listener (or a reviewer)
// can check any sound against the data: which column, longitude, date or month, the data values under it, the scale and mood, and the SHA-256 fingerprint of
// the source file. Export it as CSV (for a spreadsheet) or JSON (with the method and limits). The idea of hash-linked note traces comes from the team's earlier
// RAM AVATAR project; this is a separate implementation.
// Limits: a note stands for the whole column (or step, or month) it was scheduled for, not for one pixel; the latitude estimate exists only for lead notes;
// the MuseScore-stems source plays fixed pieces, so it has no notes to trace; and the trace records what was scheduled to play, not a measurement of the audio.
const TRACE = { rows: [], ctx: null, t0: null, max: 40000 };
const TR_VOICES = ['drone', 'chords', 'high voice', 'lead', 'drums'];
const TR_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const trNote = m => TR_NAMES[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);

function traceAdd(v, t, m, d, stroke, id) {                                  // called from noteLog for every scheduled note
  const E = window.EJ; if (!E || !E.A) return;
  if (TRACE.ctx !== E.A.ctx) { TRACE.ctx = E.A.ctx; TRACE.rows = []; TRACE.t0 = null; }
  if (TRACE.rows.length >= TRACE.max) return;
  if (TRACE.t0 === null || t < TRACE.t0) TRACE.t0 = t;
  const P = E.T && E.T.instruments || {}, c = E.traceContext();
  const instrument = v === 0 ? P.drone : v === 1 ? P.pad : v === 2 ? (stroke || P.strong) : v === 3 ? P.lead : E.sourceName(id);
  const row = Object.assign({ index: TRACE.rows.length, time_s: t, voice: TR_VOICES[v], instrument: instrument || '', midi: v === 4 ? '' : Math.round(m), note: v === 4 ? '' : trNote(m), duration_s: +d.toFixed(3), drum_stroke: v === 4 ? (stroke || '') : '' }, c);
  if (v === 3 && row.kind === 'sweep column') row.lead_latitude_estimate_deg = E.latFromLead(Math.round(m));      // only where pitch stands for latitude
  TRACE.rows.push(row);
}

function traceRows() {                                                        // time relative to the first note, rounded
  return TRACE.rows.map(r => Object.assign({}, r, { time_s: +(r.time_s - TRACE.t0).toFixed(3) }));
}
function traceFlat(o) { const f = {}; for (const [k, v] of Object.entries(o)) f[k] = Array.isArray(v) ? v.join(' ') : v; return f; }
function traceDownload(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function traceMeta(rows) {
  const E = window.EJ, H = window.SOURCE_HASHES || {}, used = {};
  const FILE = /[\w\/.\-]+\.(?:jpg|png|webm|mp4|js)/g;                       // every file named in the rows, with its fingerprint
  rows.forEach(r => { [r.source, r.el_source].forEach(s => { (String(s || '').match(FILE) || []).forEach(k => { if (H[k]) used[k] = H[k]; }); }); });
  const info = E.dataInfo();
  return {
    schema: 'earth-jukebox-note-trace-1', generated_utc: new Date().toISOString(), track: E.T.id, note_count: rows.length,
    settings: E.settings(),
    meaning: 'Each row is a note scheduled to play. time_s is seconds from the first note. A note stands for the whole sweep column (or followed-path step, or month) it was scheduled for, not for one pixel. data_channels are the column totals of the track\'s four data channels in the order given in settings.channel_names; data_strength_rank (0 to 1) is how strong the column is compared with the rest of the track. Pitch is latitude for the lead in a sweep (lead_latitude_estimate_deg); in Follow a current and the El Niño layer, pitch is the temperature or anomaly.',
    source_files_sha256: used,
    how_values_were_decoded: info ? { source: info.source, url: info.url, date: info.date, colour: info.colour, decode: info.decode, checks: info.checks || [] } : null,
    limits: [E.commonLimit].concat(info ? info.caveats : []).concat(['The trace records what was scheduled to play, not a measurement of the audio.', 'The MuseScore composition (stems) source plays fixed pieces and has no notes to trace.']),
    rows,
  };
}
function traceExport(kind) {
  const rows = traceRows(), st = document.getElementById('traceStatus');
  if (!rows.length) { st.textContent = 'There is no trace yet. Play a sweep, follow a current, or play the years with the live synthesis or MuseScore instrument sounds, then export.'; return; }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'), id = window.EJ.T.id;
  if (kind === 'json') traceDownload(`earth-jukebox-trace-${id}-${stamp}.json`, JSON.stringify(traceMeta(rows), null, 1), 'application/json');
  else {
    const flat = rows.map(traceFlat), cols = []; flat.forEach(r => Object.keys(r).forEach(k => { if (!cols.includes(k)) cols.push(k); }));
    const q = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    traceDownload(`earth-jukebox-trace-${id}-${stamp}.csv`, cols.join(',') + '\n' + flat.map(r => cols.map(k => q(r[k])).join(',')).join('\n') + '\n', 'text/csv');
  }
  st.textContent = `Exported ${rows.length} notes. The JSON file also lists the source files with their SHA-256 fingerprints, how the values were decoded and the limits.`;
}
window.addEventListener('DOMContentLoaded', () => {
  const csv = document.getElementById('traceCsv'), js = document.getElementById('traceJson'); if (!csv || !js) return;
  csv.addEventListener('click', () => traceExport('csv')); js.addEventListener('click', () => traceExport('json'));
  setInterval(() => { const n = TRACE.rows.length, st = document.getElementById('traceStatus'); if (n && !st.dataset.busy) { const t = `Note trace: ${n} notes recorded from the last run.`; if (!st.textContent.startsWith('Exported')) st.textContent = t; } }, 1500);
});
