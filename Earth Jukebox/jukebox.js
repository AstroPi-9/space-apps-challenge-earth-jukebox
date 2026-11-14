// ================= THE JUKEBOX: home page and doors =================
// A home page (wooden cabinet, one big red button for each record) covers the app. Pressing a button picks the track and the home page swings open
// like double doors to show that record's page. When the song ends (or the "Back to the jukebox" button is pressed) the doors close again and another
// record must be chosen. The app underneath is untouched: this only shows, hides and animates it. Open the page with ?nohome (or ?debug) to skip the home page.
(() => {
  const $ = id => document.getElementById(id), home = $('jukebox'), app = document.querySelector('.wrap'); if (!home || !app) return;
  const skip = /[?&](nohome|debug|nostart)/.test(location.search), reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NAMES = {}; home.querySelectorAll('.rec').forEach(b => { NAMES[b.dataset.track] = { code: b.dataset.code, name: b.querySelector('.ttl').textContent.replace(/^\S+\s/, '') }; });
  let state = 'home';                                                       // 'home' | 'data' | 'busy'
  const live = t => { const e = $('jbLive'); e.textContent = ''; setTimeout(() => { e.textContent = t; }, 60); };
  const prompt = t => { $('jbPrompt').textContent = t; };
  const lock = on => { document.body.style.overflow = on ? 'hidden' : ''; };
  function show(s) {
    state = s; const homeOn = s === 'home';
    home.hidden = !homeOn; home.inert = !homeOn; app.inert = homeOn; app.setAttribute('aria-hidden', homeOn ? 'true' : 'false'); lock(homeOn);
  }
  function halves(open) {                                                   // two copies of the home page, each showing one half, for the swing
    const wrap = document.createElement('div'); wrap.className = 'jb-doors' + (open ? ' open notrans' : ''); wrap.setAttribute('aria-hidden', 'true');
    const st = home.scrollTop;
    ['l', 'r'].forEach(side => {
      const half = document.createElement('div'), face = document.createElement('div'), copy = $('jbInner').cloneNode(true);
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
    if (state !== 'home') return; state = 'busy';
    const tab = [...document.querySelectorAll('#tracks button')].find(b => b.dataset.track === id); if (tab) tab.click();
    window.scrollTo(0, 0); const info = NAMES[id] || { code: '', name: id };
    $('dataBarNow').innerHTML = `<span class="code" aria-hidden="true">${info.code}</span>Now playing: ${info.name}`;
    app.inert = false; app.setAttribute('aria-hidden', 'false');
    const doors = reduce() ? null : halves(false); home.hidden = true; home.inert = true; lock(false);
    const done = () => { if (doors) doors.remove(); show('data'); $('backHome').focus({ preventScroll: true }); live(`The doors opened on ${info.name}. Press Play to hear it.`); window.dispatchEvent(new Event('resize')); };
    if (!doors) { done(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.add('open'))); setTimeout(done, 1650);
  }
  function closeRecord(message) {
    if (state !== 'data') return; state = 'busy'; stopEverything();
    home.scrollTop = 0; prompt(message || 'Press a red button to choose a record.');
    const doors = reduce() ? null : halves(true); lock(true);
    const done = () => { if (doors) doors.remove(); show('home'); window.scrollTo(0, 0); const first = home.querySelector('.rec'); if (first) first.focus({ preventScroll: true }); live((message || '') + ' The doors are closed. Choose a record.'); };
    if (!doors) { done(); return; }
    void doors.offsetWidth; doors.classList.remove('notrans'); requestAnimationFrame(() => requestAnimationFrame(() => doors.classList.remove('open'))); setTimeout(done, 1650);
  }
  home.querySelectorAll('.rec').forEach(b => b.addEventListener('click', () => openRecord(b.dataset.track)));
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

  if (skip) { home.hidden = true; home.inert = true; app.inert = false; lock(false); state = 'data'; $('dataBarNow').textContent = 'Direct page (no jukebox home).'; }
  else show('home');
})();
