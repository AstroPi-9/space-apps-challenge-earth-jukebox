// ================= THE JUKEBOX: home page, second pages and doors =================
// A home page (wooden cabinet, one big red button for each record) covers the app. Some records (sea temperature, salinity, density) open a second
// "home-like" page where you choose between versions (still map, turning globe, El Nino). Choosing a version picks the track and the page swings open
// like double doors to show it. When the song ends (or the "Back" button is pressed) the doors close again and another record must be
// chosen. The app underneath is untouched: this only shows, hides and animates it. Open the page with ?nohome (or ?debug) to skip the home page.
(() => {
  const $ = id => document.getElementById(id), home = $('jukebox'), sub = $('jbSub'), app = document.querySelector('.wrap'); if (!home || !sub || !app) return;
  const skip = /[?&](nohome|debug|nostart)/.test(location.search), reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GROUPS = {
    ocean: { code: 'A1', title: 'Ocean currents', icon: '🌊', blurb: 'How does the water move? Choose a year of the ocean, or a single frame where you can follow a current.', items: [
      { track: 'year', title: 'Year of the ocean', dsc: 'A year of currents and temperature, March 2007 to March 2008. Hear the seasons turn.' },
      { track: 'ocean', title: 'One frame: follow a current', dsc: "One frame of NASA's ocean currents. Follow a current and hear its temperature." } ] },
    sst: { code: 'B1', title: 'Sea temperature', icon: '🌡️', blurb: 'How warm is the surface of the ocean? Choose how to hear it.', items: [
      { track: 'sst', title: 'Still map', dsc: "NASA's sea surface temperature map, a long-term average. A beam sweeps from west to east." },
      { track: 'sstVideo', title: 'Turning globe', dsc: 'The same temperature field as a globe turning once in a minute. The sound follows the beam.' },
      { track: 'elnino26', title: 'El Niño', dsc: 'The tropical Pacific in October 2025 and October 2026: how much warmer or cooler than normal the sea is. Switch between the two weeks on the page.' } ] },
    sss: { code: 'B2', title: 'Salinity', icon: '🧂', blurb: 'How salty is the surface of the ocean? Choose how to hear it.', items: [
      { track: 'sss', title: 'Still map', dsc: "NASA's sea surface salinity map, a long-term average. A beam sweeps from west to east." },
      { track: 'sssVideo', title: 'Turning globe', dsc: 'The same salinity field as a globe turning once in a minute. The sound follows the beam.' } ] },
    density: { code: 'C1', title: 'Density', icon: '⚖️', blurb: 'How heavy is the water at the surface? Choose how to hear it.', items: [
      { track: 'density', title: 'Still map', dsc: "NASA's sea surface density map, a long-term average. A beam sweeps from west to east." },
      { track: 'densityVideo', title: 'Turning globe', dsc: 'The same density field as a globe turning once in a minute. The sound follows the beam.' } ] },
    elnino: { code: 'D1', title: 'El Niño 2026', icon: '🔥', blurb: 'NASA pictures of the tropical Pacific in 2026, coloured by how much warmer or cooler than normal the sea surface is. Choose the map of 10 October 2026, the same week a year earlier, or the whole of 2026 so far.', items: [
      { track: 'elninoYear', title: 'Through 2026', dsc: 'From 29 January to 10 October 2026. Hear the warm water grow along the equator as a strong El Niño develops.' },
      { track: 'elnino26', title: '10 October 2026', dsc: 'A strong El Niño: a band of very warm water along the equator. A beam sweeps from west to east.' },
      { track: 'elnino25', title: 'The same week in 2025', dsc: 'A year earlier, with no El Niño: the equator is slightly cooler than normal. A beam sweeps from west to east.' } ] },
  };
  const NAMES = {}; home.querySelectorAll('.rec[data-track]').forEach(b => { NAMES[b.dataset.track] = { code: b.dataset.code, name: b.querySelector('.ttl').textContent.replace(/^\S+\s/, '') }; });
  Object.values(GROUPS).forEach(g => g.items.forEach((it, i) => { NAMES[it.track] = { code: g.code, name: g.title + ', ' + it.title }; }));
  NAMES.elnino25 = { code: 'B1', name: 'Sea temperature, El Niño, week of 10 October 2025' }; NAMES.elnino26 = { code: 'B1', name: 'Sea temperature, El Niño, week of 10 October 2026' };
  const weekBox = $('weekSwitch'), WEEKS = ['elnino25', 'elnino26'];
  function syncWeek(id) { weekBox.hidden = !WEEKS.includes(id); weekBox.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.week === id))); }
  weekBox.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.week; if (b.getAttribute('aria-pressed') === 'true' || state !== 'data') return; stopEverything();
    const tab = [...document.querySelectorAll('#tracks button')].find(t => t.dataset.track === id); if (tab) tab.click(); syncWeek(id);
    const info = NAMES[id]; $('dataBarNow').innerHTML = `<span class="code" aria-hidden="true">${info.code}</span>Now playing: ${info.name}`; document.title = 'Earth Jukebox – ' + info.name;
    live(`Switched to ${info.name}. Press Play to hear it.`); window.dispatchEvent(new Event('resize')); pageChanged();
  }));
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
    const sh = s === 'sub' && sub.querySelector('.jb-title');                // the tab title follows the page, so a screen reader announces where you are
    document.title = s === 'home' ? 'Earth Jukebox' : sh ? 'Earth Jukebox – ' + sh.textContent.replace(/^[^A-Za-z]+/, '').trim() : 'Earth Jukebox – ' + ((window.EJ && window.EJ.T && window.EJ.T.name) || 'record');
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
  let curGroup = null, returnKey = null, openedId = null;                    // curGroup: the second page last opened; returnKey: the second page this record was opened from (null when opened straight from the home page)
  function openRecord(id) {
    if (state !== 'home') return; state = 'busy'; const source = page(); returnKey = view === 'sub' ? curGroup : null; openedId = id;
    const tab = [...document.querySelectorAll('#tracks button')].find(b => b.dataset.track === id); if (tab) tab.click();
    syncWeek(id); window.scrollTo(0, 0); const info = NAMES[id] || { code: '', name: id };
    $('dataBarNow').innerHTML = `<span class="code" aria-hidden="true">${info.code}</span>Now playing: ${info.name}`;
    app.inert = false; app.setAttribute('aria-hidden', 'false');
    setTabVisible(false); const doors = reduce() ? null : halves(false, source); source.hidden = true; source.inert = true; lock(false);
    const done = () => { if (doors) doors.remove(); show('data'); $('backHome').focus({ preventScroll: true }); live(`The doors opened on ${info.name}. Press Play to hear it.`); window.dispatchEvent(new Event('resize')); pageChanged(); };
    if (!doors) { done(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.add('open'))); setTimeout(done, 1650);
  }
  function closeRecord(message, back) {                                      // back: the Back button was pressed, so return to the second page the record came from (if any), not the home page
    if (state !== 'data') return; state = 'busy'; stopEverything();
    const toSub = !!(back && returnKey && GROUPS[returnKey]), source = toSub ? sub : home;
    source.scrollTop = 0; if (!toSub) $('jbPrompt').textContent = message || 'Press a red button to choose a record.';
    const doors = reduce() ? null : halves(true, source); lock(true);
    const done = () => {
      if (doors) doors.remove(); window.scrollTo(0, 0);
      if (toSub) { show('sub'); const keep = WEEKS.includes(openedId) ? 'elnino26' : openedId, first = sub.querySelector('.rec[data-track="' + keep + '"]') || sub.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live(`The doors are closed. ${GROUPS[returnKey].title}. Choose a version.`); }
      else { show('home'); const first = home.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live((message || '') + ' The doors are closed. Choose a record.'); }
      pageChanged();
    };
    if (!doors) { done(); return; }
    void doors.offsetWidth; doors.classList.remove('notrans'); requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.remove('open'))); setTimeout(done, 1650);
  }

  // second pages: choose between versions of one record
  function buildSub(key) {
    const g = GROUPS[key], esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $('jbSubInner').innerHTML = `<div class="jb-cabinet">
      <div class="jb-top"><div class="jb-tube" aria-hidden="true"></div><p class="jb-title" role="heading" aria-level="1">${g.icon} ${esc(g.title)}</p><p class="jb-tag">Record ${g.code}</p></div>
      <section class="jb-card"><h2>Choose a version</h2><p>${esc(g.blurb)}</p></section>
      <div class="jb-records" role="group" aria-label="Versions">${g.items.map((it, i) => `<button class="rec${it.minor ? ' minor' : ''}" type="button" data-track="${it.track}" aria-label="${g.code}, version ${i + 1}. ${esc(it.title)}. ${esc(it.dsc)}"><span class="knob" aria-hidden="true">${i + 1}</span><span class="card"><span class="ttl">${esc(it.title)}</span><span class="dsc">${esc(it.dsc)}</span></span></button>`).join('')}</div>
      <div class="jb-foot"><span class="jb-prompt">Press a red button to choose a version.</span><button class="secondary" type="button" data-back="1">← All records</button></div>
    </div>`;
    $('jbSubInner').querySelectorAll('.rec').forEach(b => b.addEventListener('click', () => openRecord(b.dataset.track)));
    $('jbSubInner').querySelector('[data-back]').addEventListener('click', () => { show('home'); const f = home.querySelector('.rec[data-group="' + key + '"]') || home.querySelector('.rec'); if (f) f.focus({ preventScroll: true }); live('Back to all records.'); pageChanged(); });
  }
  function openGroup(key) {
    if (state !== 'home') return; curGroup = key; buildSub(key); show('sub'); sub.scrollTop = 0; sub.classList.remove('jb-fade'); void sub.offsetWidth; sub.classList.add('jb-fade');
    const first = sub.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live(`${GROUPS[key].title}. Choose a version.`); pageChanged();
  }
  home.querySelectorAll('.rec').forEach(b => b.addEventListener('click', () => { if (b.dataset.group) openGroup(b.dataset.group); else openRecord(b.dataset.track); }));
  $('backHome').addEventListener('click', () => closeRecord('Press a red button to choose a record.', true));
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

  // welcome pop-up: opens when the jukebox is first opened (unless "Do not show this again" was ticked)
  const wel = $('welcome'); let off = false; try { off = localStorage.getItem('ej_welcome_off') === '1'; } catch (e) {}
  if (wel && !skip && !off) {
    const closeWel = () => { try { if ($('welcomeSeen').checked) localStorage.setItem('ej_welcome_off', '1'); } catch (e) {} if (wel.open) wel.close(); };
    $('welcomeGo').addEventListener('click', closeWel); wel.addEventListener('cancel', () => { try { if ($('welcomeSeen').checked) localStorage.setItem('ej_welcome_off', '1'); } catch (e) {} });
    if (typeof wel.showModal === 'function') wel.showModal(); else wel.setAttribute('open', '');
    $('welcomeGo').focus();
  }
})();
