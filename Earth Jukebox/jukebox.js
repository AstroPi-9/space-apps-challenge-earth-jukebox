// ================= THE JUKEBOX: home page, second pages and doors =================
// A home page (wooden cabinet, one big red button for each record) covers the app. Some records (sea temperature, salinity, density) open a second
// "home-like" page where you choose between versions (still map, turning globe, El Nino). Choosing a version picks the track and the page swings open
// like double doors to show it. When the song ends (or the "Back to the jukebox" button is pressed) the doors close again and another record must be
// chosen. The app underneath is untouched: this only shows, hides and animates it. Open the page with ?nohome (or ?debug) to skip the home page.
(() => {
  const $ = id => document.getElementById(id), home = $('jukebox'), sub = $('jbSub'), app = document.querySelector('.wrap'); if (!home || !sub || !app) return;
  const skip = /[?&](nohome|debug|nostart)/.test(location.search), reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GROUPS = {
    sst: { code: 'B2', title: 'Sea temperature', icon: '🌡️', blurb: 'How warm is the surface of the ocean? Choose how to hear it.', items: [
      { track: 'sst', title: 'Still map', dsc: "NASA's sea surface temperature map, a long-term average. A beam sweeps from west to east." },
      { track: 'sstVideo', title: 'Turning globe', dsc: 'The same temperature field as a globe turning once in a minute. The sound follows the beam.' },
      { track: 'sstEl', title: 'El Niño through the years', dsc: "The map with NASA's monthly temperature anomaly and NOAA's El Niño index, 1982 to today." } ] },
    sss: { code: 'C1', title: 'Salinity', icon: '🧂', blurb: 'How salty is the surface of the ocean? Choose how to hear it.', items: [
      { track: 'sss', title: 'Still map', dsc: "NASA's sea surface salinity map, a long-term average. A beam sweeps from west to east." },
      { track: 'sssVideo', title: 'Turning globe', dsc: 'The same salinity field as a globe turning once in a minute. The sound follows the beam.' } ] },
    density: { code: 'C2', title: 'Density', icon: '⚖️', blurb: 'How heavy is the water at the surface? Choose how to hear it.', items: [
      { track: 'density', title: 'Still map', dsc: "NASA's sea surface density map, a long-term average. A beam sweeps from west to east." },
      { track: 'densityVideo', title: 'Turning globe', dsc: 'The same density field as a globe turning once in a minute. The sound follows the beam.' } ] },
  };
  const NAMES = {}; home.querySelectorAll('.rec[data-track]').forEach(b => { NAMES[b.dataset.track] = { code: b.dataset.code, name: b.querySelector('.ttl').textContent.replace(/^\S+\s/, '') }; });
  Object.values(GROUPS).forEach(g => g.items.forEach((it, i) => { NAMES[it.track] = { code: g.code, name: g.title + ', ' + it.title }; }));
  let state = 'home', view = 'home';                                         // state: 'home' | 'data' | 'busy'; view: which page is showing while not in 'data'
  const live = t => { const e = $('jbLive'); e.textContent = ''; setTimeout(() => { e.textContent = t; }, 60); };
  const lock = on => { document.body.style.overflow = on ? 'hidden' : ''; };
  const page = () => view === 'sub' ? sub : home;
  const setBtn = $('jbSetBtn'), setPanel = $('jbSettings');
  const pageChanged = () => window.dispatchEvent(new Event('ej-page'));
  function settings(open) { if (setBtn.hidden && open) return; const was = !setPanel.hidden; setPanel.hidden = !open; setBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (was !== open) pageChanged(); }
  function setTabVisible(on) { setBtn.hidden = !on; if (!on) settings(false); }                // the settings tab shows on the home and second pages only
  setBtn.addEventListener('click', () => { settings(setPanel.hidden); if (!setPanel.hidden) { const f = setPanel.querySelector('select,input,button'); if (f) f.focus({ preventScroll: true }); } });
  $('jbSetClose').addEventListener('click', () => { settings(false); setBtn.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !setPanel.hidden) { settings(false); setBtn.focus(); } });
  function show(s) {                                                         // s: 'home' | 'sub' | 'data'
    const data = s === 'data'; state = data ? 'data' : 'home'; if (!data) view = s;
    home.hidden = data || s !== 'home'; home.inert = home.hidden; sub.hidden = data || s !== 'sub'; sub.inert = sub.hidden;
    app.inert = !data; app.setAttribute('aria-hidden', data ? 'false' : 'true'); lock(!data); setTabVisible(!data);
  }
  function halves(open, source) {                                            // two copies of a page, each showing one half, for the swing
    const wrap = document.createElement('div'); wrap.className = 'jb-doors' + (open ? ' open notrans' : ''); wrap.setAttribute('aria-hidden', 'true');
    const st = source.scrollTop, inner = source.querySelector('.jb-inner');
    ['l', 'r'].forEach(side => {
      const half = document.createElement('div'), face = document.createElement('div'), copy = inner.cloneNode(true);
      half.className = 'jb-half ' + side; face.className = 'jb-face wood'; copy.removeAttribute('id'); copy.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      copy.querySelectorAll('button,a,input,select').forEach(e => { e.tabIndex = -1; }); copy.style.transform = `translateY(${-st}px)`;
      face.appendChild(copy); half.appendChild(face); wrap.appendChild(half);
    });
    document.body.appendChild(wrap); return wrap;
  }
  function stopEverything() {
    try { if (window.EJ_followStop) window.EJ_followStop(); } catch (e) {}
    try { window.EJ.follow.stopAll(); } catch (e) {}
  }
  function openRecord(id) {
    if (state !== 'home') return; state = 'busy'; const source = page();
    const tab = [...document.querySelectorAll('#tracks button')].find(b => b.dataset.track === id); if (tab) tab.click();
    window.scrollTo(0, 0); const info = NAMES[id] || { code: '', name: id };
    $('dataBarNow').innerHTML = `<span class="code" aria-hidden="true">${info.code}</span>Now playing: ${info.name}`;
    app.inert = false; app.setAttribute('aria-hidden', 'false');
    setTabVisible(false); const doors = reduce() ? null : halves(false, source); source.hidden = true; source.inert = true; lock(false);
    const done = () => { if (doors) doors.remove(); show('data'); $('backHome').focus({ preventScroll: true }); live(`The doors opened on ${info.name}. Press Play to hear it.`); window.dispatchEvent(new Event('resize')); pageChanged(); };
    if (!doors) { done(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.add('open'))); setTimeout(done, 1650);
  }
  function closeRecord(message) {
    if (state !== 'data') return; state = 'busy'; stopEverything();
    home.scrollTop = 0; $('jbPrompt').textContent = message || 'Press a red button to choose a record.';
    const doors = reduce() ? null : halves(true, home); lock(true);
    const done = () => { if (doors) doors.remove(); show('home'); window.scrollTo(0, 0); const first = home.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live((message || '') + ' The doors are closed. Choose a record.'); pageChanged(); };
    if (!doors) { done(); return; }
    void doors.offsetWidth; doors.classList.remove('notrans'); requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.remove('open'))); setTimeout(done, 1650);
  }

  // second pages: choose between versions of one record
  function buildSub(key) {
    const g = GROUPS[key], esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $('jbSubInner').innerHTML = `<div class="jb-cabinet">
      <div class="jb-top"><div class="jb-tube" aria-hidden="true"></div><p class="jb-title" role="heading" aria-level="1">${g.icon} ${esc(g.title)}</p><p class="jb-tag">Record ${g.code}</p></div>
      <section class="jb-card"><h2>Choose a version</h2><p>${esc(g.blurb)}</p></section>
      <div class="jb-records" role="group" aria-label="Versions">${g.items.map((it, i) => `<button class="rec" type="button" data-track="${it.track}" aria-label="${g.code}, version ${i + 1}. ${esc(it.title)}. ${esc(it.dsc)}"><span class="knob" aria-hidden="true">${i + 1}</span><span class="card"><span class="ttl">${esc(it.title)}</span><span class="dsc">${esc(it.dsc)}</span></span></button>`).join('')}</div>
      <div class="jb-foot"><span class="jb-prompt">Press a red button to choose a version.</span><button class="secondary" type="button" data-back="1">← All records</button></div>
    </div>`;
    $('jbSubInner').querySelectorAll('.rec').forEach(b => b.addEventListener('click', () => openRecord(b.dataset.track)));
    $('jbSubInner').querySelector('[data-back]').addEventListener('click', () => { show('home'); const f = home.querySelector('.rec[data-group="' + key + '"]') || home.querySelector('.rec'); if (f) f.focus({ preventScroll: true }); live('Back to all records.'); pageChanged(); });
  }
  function openGroup(key) {
    if (state !== 'home') return; buildSub(key); show('sub'); sub.scrollTop = 0; sub.classList.remove('jb-fade'); void sub.offsetWidth; sub.classList.add('jb-fade');
    const first = sub.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live(`${GROUPS[key].title}. Choose a version.`); pageChanged();
  }
  home.querySelectorAll('.rec').forEach(b => b.addEventListener('click', () => { if (b.dataset.group) openGroup(b.dataset.group); else openRecord(b.dataset.track); }));
  $('backHome').addEventListener('click', () => closeRecord('Press a red button to choose a record.'));
  $('jbHelp').addEventListener('click', () => { const h = $('helpBtn'); if (h) h.click(); });

  // when a song ends, the doors close after the last notes have rung out
  const box = $('autoClose'); try { box.checked = localStorage.getItem('ej_autoclose') !== '0'; } catch (e) {}
  box.addEventListener('change', () => { try { localStorage.setItem('ej_autoclose', box.checked ? '1' : '0'); } catch (e) {} });
  let timer = null;
  window.EJ_songEnded = kind => {
    if (!box.checked || state !== 'data') return; clearTimeout(timer);
    timer = setTimeout(() => { if (state === 'data' && !(window.EJ && (window.EJ.playing || window.EJ_following))) closeRecord('That was the last note. Choose another record.'); }, 3500);
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTimeout(timer); });

  if (skip) { home.hidden = true; home.inert = true; sub.hidden = true; sub.inert = true; app.inert = false; lock(false); state = 'data'; $('dataBarNow').textContent = 'Direct page (no jukebox home).'; setTabVisible(true); }
  else show('home');
})();
