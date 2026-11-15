// Speech engines get a few words wrong in this app's text. Before anything is spoken, this respells them so the voice says them as intended. Only the spoken copy is
// changed: captions and on-screen text keep the normal spelling.
//   live      -> "lyve" (rhymes with five: "live music", "live synthesis"), never "liv" (to be alive)
//   A1, C2... -> "Ay one", "See two" (the record codes), not "ah-one" or "kh-too"
(() => {
  const LETTER = { A: 'Ay', B: 'Bee', C: 'See', D: 'Dee' }, DIGIT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const RULES = [
    [/\b([A-D])(\d)\b/g, (m, l, d) => `${LETTER[l]} ${DIGIT[+d]}`],
    [/\b(live)\b/gi, m => m[0] === 'L' ? 'Lyve' : 'lyve'],
    [/\bECCO2\b/g, 'Ecko two'],
    [/\bNOAA\b/g, 'Noh-uh'],
    [/\bSVS\b/g, 'S V S'],
    [/Niño/g, 'Neen-yo']
  ];
  window.EJ_PRON = text => RULES.reduce((t, [re, to]) => t.replace(re, to), String(text == null ? '' : text));
})();
