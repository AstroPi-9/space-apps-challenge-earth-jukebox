// ================= HEAR ME: a spoken summary of what is on the screen, for blind and low-vision people =================
// Off until the "Hear Me" button on the home page is pressed. Once on, it reads out the current page (the home page, a second page, the settings panel, or a
// record's page with its picture description, controls, voices and any extra panels), and reads the new page each time you move. While it is on, a small
// bar at the bottom left lets you hear the screen again (or press H) and turn Hear Me off. It uses the browser's speech voice (the one chosen in Settings).
// It does not change anything else, and it is off again each time the page is loaded.
(() => {
  const $ = id => document.getElementById(id), SS = window.speechSynthesis, btn = $('hearMe'), bar = $('hearBar'); if (!btn || !bar) return;
  const ok = !!(SS && window.SpeechSynthesisUtterance);
  let on = false, timer = null;
  const clean = s => String(s || '').replace(/[\u{1F000}-\u{1FAFF}←-⇿⌀-⏿■-➿️]/gu, '').replace(/\s+/g, ' ').trim();      // no emoji or arrow symbols in speech
  const stateOf = el => el.checked ? 'on' : 'off';
  const toggleText = root => [...root.querySelectorAll('.toggle')].map(l => { const t = l.querySelector('.t'), i = l.querySelector('input'); return t && i ? `${clean(t.textContent)}: ${stateOf(i)}` : ''; }).filter(Boolean);
  const selectText = root => [...root.querySelectorAll('select')].map(s => { const lab = s.closest('label'), name = lab ? clean(lab.querySelector('span') ? lab.querySelector('span').textContent : lab.textContent) : (s.getAttribute('aria-label') || ''); return `${name}: ${clean(s.options[s.selectedIndex] ? s.options[s.selectedIndex].textContent : '')}`; });

  function kind() {
    if (!$('jbSettings').hidden) return 'settings';
    if (!$('jukebox').hidden) return 'home';
    if (!$('jbSub').hidden) return 'sub';
    return 'data';
  }
  function homeParts() {
    const p = [`Earth Jukebox home page. ${clean($('jukebox').querySelector('.jb-card p').textContent)}`];
    const recs = [...$('jukebox').querySelectorAll('.rec')].map(b => clean(b.getAttribute('aria-label') || b.textContent));
    p.push(`There are ${recs.length} large red buttons, one for each record.`); recs.forEach(r => p.push(r));
    p.push('At the top right there is a Settings tab for settings that apply to every record. At the bottom there are the Hear Me and How it works buttons. Press a red button to choose a record, and the doors will open.');
    return p;
  }
  function subParts() {
    const root = $('jbSub'), title = clean(root.querySelector('.jb-title').textContent), tag = clean(root.querySelector('.jb-tag').textContent);
    const p = [`${title}, ${tag}. ${clean(root.querySelector('.jb-card p').textContent)}`];
    [...root.querySelectorAll('.rec')].forEach(b => p.push(clean(b.getAttribute('aria-label'))));
    p.push('There is also a button to go back to all records.');
    return p;
  }
  function settingsParts() {
    const root = $('jbSettings'), p = ['Settings panel. These apply to every record.'];
    [...root.querySelectorAll('.ctl-card')].forEach(c => { const h = c.querySelector('h3'); p.push(`${h ? clean(h.textContent) + '. ' : ''}${selectText(c).concat(toggleText(c)).join('. ')}.`); });
    p.push('Each setting is a flick switch: up is on and down is off. Press Escape or the Close button to close this panel.');
    return p;
  }
  function dataParts() {
    const E = window.EJ, T = E && E.T, p = [];
    p.push(clean($('dataBarNow').textContent).replace(/^([A-D]\d)\s*Now playing:/, 'Record $1. Now showing:') + '.');
    p.push(clean($('trackIntro').textContent));
    if (T && T.alt) p.push('The picture: ' + clean(T.alt));
    p.push(`The main buttons are: ${clean($('play').textContent)}, Restart, and Hear the instruments, which plays each voice on its own. The volume is ${$('vol').value} out of 100, and the tour length is ${$('dur').value} seconds.${E && E.playing ? ' Music is playing now.' : ' Nothing is playing yet.'}`);
    if (T && T.species) p.push('The voices: ' + T.species.map(s => `${clean(s.name)}, ${clean(s.sound)}`).join('. ') + '.');
    if (!$('followPanel').hidden) p.push('This record also has Follow a current: press one of the named currents, such as the Gulf Stream, or type a longitude and latitude and press Follow. The sound then travels along that current, and its pitch is the water temperature.');
    if (!$('elPanel').hidden) p.push(`This record also has an El Niño layer. Choose a month, currently ${clean($('elMonthOut').textContent)}, with the slider or a preset such as December 1997, and press Play, or press Play the years to hear the Niño 3.4 index from 1982 to the latest month.`);
    p.push(`A scrolling sheet music strip shows every note that plays. ${clean($('readout').textContent)}`);
    p.push('Press Space to play or pause. Click the map or use the arrow keys to hear a single spot. Press Back to the jukebox to choose another record, and H to hear this screen again.');
    return p;
  }
  function parts() { const k = kind(); return k === 'home' ? homeParts() : k === 'sub' ? subParts() : k === 'settings' ? settingsParts() : dataParts(); }

  // ---- speaking, with checks: speech engines fail quietly, so we watch for the first word starting, retry once with the default voice, and otherwise say so ----
  let gen = 0;
  const caption = t => { const c = $('hearCaption'); if (c) c.textContent = t || ''; };
  function failure(why) {
    caption('');
    const m = `Hear Me could not start speaking (${why}). Check that the sound is not muted, or choose another voice in Settings. The text of this screen is being shown below instead, so a screen reader can read it.`;
    const f = $('hearFallback'); if (f) { f.hidden = false; f.textContent = m + ' ' + lastText; }
  }
  let lastText = '';
  function speakList(list, useVoice, my) {
    SS.resume(); const voices = SS.getVoices(), chosen = useVoice ? voices.find(x => $('voice') && x.name === $('voice').value) : null; let started = false;
    list.forEach((t, i) => {
      const u = new SpeechSynthesisUtterance(t); if (chosen) { u.voice = chosen; u.lang = chosen.lang; } else u.lang = 'en'; u.rate = 1;
      u.onstart = () => { if (my !== gen) return; started = true; caption(t); };
      u.onerror = e => { if (my !== gen || e.error === 'canceled' || e.error === 'interrupted') return; started = false; if (useVoice) { gen++; speakList(list, false, gen); } else failure(e.error || 'error'); };
      if (i === list.length - 1) u.onend = () => { if (my === gen) caption(''); };
      SS.speak(u);
    });
    setTimeout(() => { if (my !== gen || started) return; if (useVoice) { SS.cancel(); gen++; setTimeout(() => speakList(list, false, gen), 150); } else failure('nothing was spoken after 4 seconds'); }, useVoice ? 3500 : 4000);
  }
  function speakAll(list, now) {
    if (!ok) return; gen++; const my = gen; lastText = list.join(' '); const f = $('hearFallback'); if (f) f.hidden = true;
    const go = () => speakList(list, true, my);
    if (SS.speaking || SS.pending) { SS.cancel(); setTimeout(() => { if (my === gen) go(); }, 160); } else go();       // a short pause after cancel: some browsers drop speech spoken straight after it
  }
  function hear(extra, now) {
    if (!on) return; try { if (window.EJ && window.EJ.playing && kind() === 'data') window.EJ.follow.pauseSweep(); } catch (e) {}
    clearTimeout(timer); const list = (extra ? [extra] : []).concat(parts());
    if (now) speakAll(list); else timer = setTimeout(() => speakAll(list), 350);                  // from a button press, speak at once (browsers want speech to start from the press)
  }
  function setOn(v) {
    on = v; btn.classList.toggle('on', on); btn.innerHTML = on ? '<span aria-hidden="true">🔊</span> Hear Me is on' : '<span aria-hidden="true">🔊</span> Hear Me'; bar.hidden = !on;
    if (on) { if (!ok) { on = false; bar.hidden = true; $('jbLive').textContent = 'Sorry, this browser cannot speak. Please use a screen reader instead.'; return; } hear('Hear Me is on. I will describe each screen as you move around. Press H to hear a screen again.', true); }
    else { clearTimeout(timer); gen++; caption(''); const f = $('hearFallback'); if (f) f.hidden = true; if (ok) { SS.cancel(); const u = new SpeechSynthesisUtterance('Hear Me is off.'); SS.speak(u); } }
  }
  btn.addEventListener('click', () => { if (!on) setOn(true); else hear(null, true); });             // first press turns it on; pressing again reads the screen once more
  $('hearAgain').addEventListener('click', () => hear(null, true));
  $('hearOff').addEventListener('click', () => setOn(false));
  document.addEventListener('keydown', e => {
    if (!on || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'h' && e.key !== 'H')) return; const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'checkbox' && t.type !== 'range') return;
    e.preventDefault(); hear(null, true);
  });
  window.addEventListener('ej-page', () => hear());                                          // the page changed: describe the new one
  $('play').addEventListener('click', () => { if (on && SS) { gen++; SS.cancel(); caption(''); } });                   // do not talk over the music
  window.addEventListener('pagehide', () => { if (SS) SS.cancel(); });
})();
