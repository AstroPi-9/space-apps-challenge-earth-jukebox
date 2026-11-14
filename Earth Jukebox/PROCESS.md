# Process: why the Earth Jukebox is built the way it is

This document records the design choices, the reasons for them, the mistakes that were found and fixed, and what has and has not been tested. It was written with an AI coding assistant (Claude Code), which also helped make the choices; see the AI disclosure in `README.md`.

## The brief and the approach

The challenge asks for an "Earth Jukebox": NASA Earth Information Center style visual frames paired with dynamic, explainable sonification, with accessibility as a core theme and a balance between data and musicality.

The approach was:

1. **Read the picture as data, then play the data**, instead of trying to "play the pixels". A raw pixel-to-sound mapping is noise; reading the colour bar first gives a meaningful value per place.
2. **Generate everything live in the browser** (Web Audio). No recordings, so nothing is fixed and any new grid can be played.
3. **Keep the picture and a text description always available**, so the sound is never the only way in.

## Design choices and reasons

| Choice | Reason |
|---|---|
| Left to right is time; the sweep plays once and stops | A sweep gives a clear start and end, which is easier to follow than a loop, and it matches how a map is read. It also avoids the confusion of a sound that never ends. |
| Pitch is latitude (north high) | It is the most intuitive axis, and keeping it constant across tracks means the listener learns it once. |
| One scale: the Carnatic raga Mohanam, Sa = D | A five-note scale never produces clashing notes, so any data pattern sounds consonant. The author's own tradition gave the choice a purpose beyond convenience. |
| Gamakas instead of vibrato | Gamakas (shakes, slides, touches) are the Carnatic way of ornamenting notes. They are shaped pitch curves per scale degree, and there is no vibrato oscillator anywhere. |
| A different instrument set for each data type | Tracks should sound different, not just look different. Year: French horn, strings, tanpura-like hum, marimba and kalimba. Aerosols: clarinet, strings, tanpura, gong and kalimba. Sea temperature: flute, brass, didgeridoo-like drone, vibraphone and celesta. Salinity: oboe, organ, tanpura, marimba and glass bells. Density: bassoon, low strings, pedal tone, timpani and harp. |
| The "high" voice is a quiet roll where the data is strong and a melody where it is light | An earlier version used a rushing noise wash, which was annoying. A tuned timpani roll or marimba roll in strong areas and a harp or kalimba melody in light areas is pleasant, pitched and quiet. |
| Regional drums, faster where the data is stronger, in four steps only | It adds rhythm and a sense of place. Restricting the speed to crotchets, quavers, semiquavers and (rarely) demisemiquavers keeps it musical. Rank-based thresholds are used because the real values bunch together. |
| A fixed 120 bpm pulse | All speeds stay locked to one grid, so changes of speed sound intentional. |
| Precomputed grids of 160 by 18 | Small enough to ship, fast enough to play live, and the pictures can be analysed once instead of in the browser. It also lets the app work opened straight from a folder. |
| Decode values from NASA's colour bar | It makes the values quantitative (for example a temperature) and removes guesswork. Land photo pixels drop out because they do not match the bar. |
| Spoken guided tour: describe, then explain, then play once and stop | An earlier version narrated during the sweep, and the speech drifted away from the music. Doing the talking before the sweep keeps both clear. It is off by default and has a short and a full version. |
| "Hear the instruments" | The mapping is the hardest thing to understand. Playing each voice alone with its label teaches it, and it makes each sound testable. |
| A **Data and limits** panel for each track | Explainability: where the data came from, how it was decoded, and what not to conclude. |
| Pause tears the audio down completely | Leftover scheduled notes used to play after pausing (see below). |

## Mix tuning

The author cannot hear the result while building it, so the balance was set by measurement:

1. Each track was rendered offline (20 seconds sampled across the whole sweep, through the real audio chain), once with all voices and once with each voice alone.
2. Levels were measured **A-weighted**, because plain levels mislead: very low notes carry a lot of energy but are barely audible on ordinary speakers.
3. The first measurement showed the lead melody 15 to 25 dB louder than the drone, chords and high voice, so most supporting voices were effectively inaudible.
4. Each track was given its own balance (the `TRIMS` table in `app.js`) aiming for, in A-weighted dB: lead about -22, drums about -27, chords about -29, high voice about -31 and drone about -34. Boosts of the drone are capped, because lifting a 70 Hz tone a long way costs headroom and adds little audible level.
5. A limiter was added to the output so drum peaks cannot clip, and the master level was raised to use the headroom.
6. The final check: with all voices, the A-weighted level of every track is within about 2 dB of the others (about -21 to -23 dB) and the peaks are between about -3 and -5 dBFS. Supporting voices now sit about 5 to 10 dB under the melody.

This makes the mix measurably balanced and consistent; it does not make it pleasant. A listening pass is still needed.

## Composed music layer

The live synthesis is precise but sounds synthetic, so real-instrument loops were added underneath.

- `tools/make-music.ps1` writes a small MIDI file per stem (original eight-bar phrases in Mohanam, Sa = D, at the app's fixed 120 bpm, so a loop is exactly 16 s), renders each with MuseScore 4's command line, and packs the mp3 files into `music_data.js` so the app still works from a folder.
- Each track has a **bed** (chords every two bars, a bass note, sometimes a harp arpeggio) and a **melody** in the track's own instrument, with a short grace note on the longer notes as a nod to gamakas. The chords only use notes of the scale.
- At load time each stem is normalised to the same loudness, so the result does not depend on what MuseScore rendered. While playing, the bed swells a little and the melody comes forward where the data is strong.
- Checked: all 12 files decode, loop without a click (the 0.075 s of silence the mp3 encoder adds is skipped), start with the sweep and are destroyed on pause. **Not checked by ear.** Whether the loops fit with the live voices, and whether they make the mix too busy, is untested.

## MuseScore composition as the sound source

The author's intent was for a MuseScore score to supply the voices themselves, not sit under the live ones. So there is a second, optional source (the default is unchanged). One 16-bar score in Mohanam (Sa = D, 120 bpm) has five instruments, one per voice. Each is rendered to its own stem, and the app loops all five and sets each stem's loudness from the same data reading the voice meters show (drums from the data-strength rank); the three upper voices also get a brighter tone as their data grows. Checked: it loads and plays, the stems follow the data, pause ends it, and switching back to live restores the original behaviour. **Not checked by ear.** Limits: the same composition is used for every track, so tracks differ only by what the data does to it; the narration and legend still name the live instruments.

## Scrolling sheet music

The sound was hard to trace back to its source, so every voice now has a staff in a strip under the map. Live voices report each note as they schedule it (so the strip shows what is really sounding), and MuseScore mode draws the composition's notes. Choices: staff notation with clefs and a D major key signature (the scale's notes all fit it); note shape (filled, hollow, with a sustain line) for length instead of full engraving; the drums on a five-line percussion staff with x noteheads, one position per stroke; a words-only line for people who cannot see the strip (the canvas itself is hidden from screen readers). Checked in a browser pane in both modes (live and MuseScore) with no errors. Not checked: readability on small phones, a screen reader reading the words line, and whether non-musicians find it clearer or more cluttered. In live mode a clef can change mid-sweep if a voice's range moves, and long drones and held notes look dense.

## Regional scales and emotion

A fair criticism: the composed loops are the same whatever the data, so on their own they cannot "correspond to the data", and one scale for the whole world says nothing about place or feeling. So the live, data-driven voices were extended:

- **Scale by region:** every drum region has a hopeful and a sad scale (table in `README.md`), the tonic stays D, and the scale changes as the sweep passes from region to region. Pitch choice (lead, chords, mallet and plucked voices, timpani) now uses the current scale instead of a fixed list. Chords are built from the scale; Latin America gets chords with major thirds, or minor thirds when the mood is sad. Gamakas now use each scale's own neighbouring-note gaps. Clicking a spot plays in the scale of that spot.
- **Mood from the data:** the same data-strength rank that drives the drums is smoothed over five columns. Above 0.6 the mood is sad (with hysteresis, back to hopeful below 0.5), and above about 0.8, or on a sharp rise into strong data, it is urgent.
- **What changes in sad and urgent music:** the sad scale form, darker chord tone and an occasional falling sigh in the lead; for urgency, a heartbeat on each beat and a repeating figure of the tonic against a semitone above. The strip of sheet music now shows accidentals when the scale leaves D major.
- **Limits:** the mapping of places to scales is an artistic choice, some scales are approximations, and "strong data" stands in for "something is wrong" in every track. Half the columns are above the median by construction, so the rank-based mood is relative within a track, not absolute. The fixed MuseScore pieces do not follow any of this. Checked in a browser (the scale and mood change through an aerosol sweep and there are no console errors); not heard, and the choice of thresholds and effects is untested by listeners.

## Mistakes found and fixed

- **The ocean colours were misread as current speed.** The first Ocean currents track treated blue to red as slow to fast. NASA's documentation (and the team's earlier analysis) says the colour is **sea surface temperature** and the lines show the currents. The track was rebuilt: temperature decoded from the colour bar, and "swirl" measured from the geometry of the flow lines. Every claim about "fast currents" was removed. That track is now hidden, because the Year track covers the same data and adds time.
- **Audio kept playing after pause.** First, only the sounds were faded. Then the audio clock was suspended, but notes already scheduled came back on resume. Finally the whole audio graph is destroyed on pause, which cannot leave anything behind.
- **Narration did not play.** It was off by default and reset on reload; a test stub had been left in a preview page. It now defaults to off by design, remembers the setting, and shows a clear message if the browser cannot speak.
- **A noisy "whoosh" voice** was replaced by pitched instruments (above).
- **The video track's longitude** could not be measured automatically (matching land and ocean profiles was too noisy), so a steady 6° a second from 90° W is assumed, and this is stated as a limit.

## How it was checked

- The sound code was run for every column of every track, and for clicks across each grid, with no errors.
- The instrument demo, the short and full spoken intros, the track order, the start screen, the Data and limits panel and the per-voice Hear buttons were exercised in a browser.
- The temperature decoding gives physically sensible values (about 29 °C at the equator, about 1 °C near the poles), and the Year track shows the expected seasons, with the northern and southern mid-latitudes out of phase.
- Playback, pause and the end of the sweep were tested in a browser pane.

## What has NOT been checked

- **Nobody has listened to the finished mix with fresh ears.** The balance was set by measurement (see Mix tuning), but whether five voices at once is too much, and whether it is pleasant, are untested. A listening pass is the most important remaining task.
- Screen reader use, colour contrast, phone layout, Safari and Firefox behaviour of speech and audio.
- Any test with blind or low-vision listeners.
- The facts in the narration and hotspot stories against sources.
- Whether the SVS visualizations count as Earth Information Center frames for the challenge.
- Longer or more varied data (the Year track samples 160 of 2,001 frames and covers one year).

## Ideas not built yet

- Let the user drop in their own picture and colour bar.
- Show which part of the picture produced each note (traceability), an idea borrowed from the team's earlier project.
- Export each track as an audio file, for a recorded demo and for people who cannot run it live.
- A "simple mode" with fewer voices.
- A multi-year view once more of the dataset is added.
