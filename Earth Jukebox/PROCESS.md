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

## MuseScore instrument sounds playing the data

The fixed MuseScore loops could not follow the data, so a third source was added. It keeps all of the data-driven note logic and swaps the sound-making: `tools/make-samples.ps1` has MuseScore render a row of single notes for each of 18 instruments (every 5 semitones across its useful range, one slot per note), and the app cuts the slots apart and re-pitches the nearest one by at most 2.5 semitones. The lead keeps its gamakas (a pitch curve on the sample), the chords and drone are looping sustained notes that change only when the chord does, and the mallet and plucked voices are short one-shots. Each instrument is loudness-normalised when loaded. The per-track balance was re-measured offline (A-weighted solo levels) and set in `TRIMS_S`; with all voices every track sits at about -21 dB with peaks about -4 dBFS, like the other sources. Checked: loads, plays through a sweep with sheet music, pause tears everything down, and switching back to live works, with no console errors. **Not heard.** Limits: drums are still synthesised; notes below an instrument's range are folded up an octave (so the lowest bassoon notes sound an octave higher than the sheet shows); looped sustained notes may have audible seams; 7.5 MB of sounds load on first use; and the sound font's licence is unchecked.

## Follow a current

The column sweep treats every column alike and spends pitch on latitude, which is only position. This prototype follows the data's own lines instead. The ocean frame is drawn as flow lines, so `tools/make-flow-field.ps1` measures their direction per 16-pixel tile (structure tensor of the brightness, turned a quarter turn), with their coherence, decoded temperature and coverage. `follow.js` traces a start point along those directions (bilinear field, inertia on the heading, stopping where coverage fades) and the sound travels with the point: pitch is the temperature, pan is the map position, scale is the region's, mood from warmth, sparkles at swirl and fronts. Checked in a browser: all five named starts trace plausible paths (for example the Gulf Stream north-east across the Atlantic, the Humboldt Current north then west across the Pacific), stopping and pausing tear the sound down, and the sweep on the same track still works. **Not heard**, and the paths were judged by eye against my own picture of the currents, not against any current data. Limits: the picture has no arrow, so direction is assumed (known for the named currents, east by default otherwise); the field is coarse; clicking a start in the middle of an eddy can circle; the temperature-to-mood threshold is a guess; and ocean level balance reuses the Year track's trims without measurement. The Ocean currents tab was hidden earlier as redundant with the Year track, and is visible again for this.

**Stop means silence.** Pause, the Follow stop button and the instrument-demo Stop now mute the output and destroy the audio graph at once, with no fade, so no drone or reverb tail is left. The sheet music also works in Follow mode, and long held notes (the drone) keep their line on the staff after their head scrolls off.

## El Niño layer

Asked whether the music conveys rising temperatures or El Niño, the honest answer was no: the Sea temperature track is one long-term average, and "sad" and "urgent" came from a within-picture ranking, not from warming. So two real time series were added as a layer (NASA SVS 4695 anomaly maps, NOAA's Niño 3.4 index; details in `README.md`). Choices: pitch encodes the anomaly (the value), not the latitude; the mood comes from the anomaly instead of the ranking; "Play the years" turns the index into a melody with one note per three months. Mistakes on the way: the movie's map geometry was first guessed from a screenshot that was scaled (so a ruler read the wrong spacing), and it made the decoded Niño box fit worse (r 0.40); a direct fit against NOAA's index (r 0.96) fixed the vertical offset, and the 2:1 layout and the horizontal shift (found by matching continents) held. Checked: the layer draws and lines up with the map by eye (the Niño box lies on the equator in the Pacific), the sweep plays glass and kalimba notes with moods that follow the anomaly, "Play the years" runs and stops cleanly, and nothing plays after Stop. **Not heard.** Limits: the grid is coarse, the colour-bar steps are 0.5 °C, the thresholds (+0.3 °C sad, +2.5 °C urgent for the sweep; +0.5 and +1.5 for the years) are my guesses, and the picture's anomalies are not on the same baseline as NOAA's index.

## Checks, robust urgency and the note trace

After reviewing the team's earlier RAM AVATAR project, three of its methods were reimplemented here (nothing was copied; it was its choice of methods, not its results, that transferred, because it analysed picture colour statistics rather than decoded values). (1) **EOF analysis and spectra** of the decoded El Niño maps and NOAA's index, as validation: mode 1 follows the index at r = +0.91 and sits in the eastern equatorial Pacific, and the index's strongest peak in the El Niño band is 3.6 years. (2) **A seasonal-cycle fit** of the Year track, by latitude band, whose hemispheres come out opposite (r = -0.95) and warmest in Aug to Sep (north) and Feb to Mar (south). (3) **Median-based rate of change** to define a "rapid onset" for the urgent mood in *Play the years*, replacing a bare threshold. It also reminded us to report **naive baselines**: that project's own regression lost to "repeat the last frame". We make no predictions, so none are claimed. The **note trace** (CSV and JSON) records each scheduled note with its source column, month or path step, the data under it, scale and mood, and the SHA-256 of the source files. Checked: the trace fills correctly in a sweep, the Year track, Follow a current and Play the years, with no console errors in the code, and the CSV export runs. Not checked: opening the exported files in a spreadsheet, and automated tests (there are still none). Limits: the checks test that the decode behaves like the real signal, not that its values are exact; the seasonal fit uses one partial year; and the trace says what was scheduled, not what was heard.

**Overlay re-done (14 Nov):** the first overlay drew frames of NASA's movie straight onto the map. It looked wrong: a bug (a code comment that swallowed the opacity and blend settings) left it fully opaque, hiding the temperature map; the timeline inset and title of the movie showed through; and an edge ruler left a seam. Stretching nearby strips over the covered parts made streaks, so that was dropped. It is now drawn from a finer decoded grid (3 degrees) with transparency, grey boxes for the covered areas, and the ruler gap filled from its neighbours. Checked by eye in a browser; the grid is coarse and blocky.

## Harmonious mode

The mix was judged too chaotic and clashing. The causes found: the chord changed with latitude every column, each region's scale and mood switched at any moment, the lead played up to a note per column at wildly changing pitches, the drums added fast filler strokes, the drone's fifth clashed with scales without one, and the urgent figure deliberately used a semitone. The fix is a bar-based harmonic frame (one consonant chord per two seconds, melody and sparkles snapped to it, scale and mood changes held to bar lines) and thinning (see `README.md`). Measured with the note trace on aerosols, sea temperature and density sweeps: melody notes clashing with a sounding chord or drone note fell from about 73% to 0 to 11%, melody notes fell by about 75%, and drum notes by about 55%. Limits: this counts pitch classes, it is not a listening test; the remaining clashes are the overlap at chord changes; the lead now plays rarely, which may sound sparse; and pitch follows latitude only loosely.

## The jukebox home page and doors

To feel like an old jukebox, a wooden home page (cabinet, rainbow tube, a cream summary card and seven large red buttons) now covers the app. The track tabs are hidden: the buttons choose the record. Choosing one swings the home page open as two doors (the doors are two cloned halves of the page animated with CSS 3D, so there is no duplicate interactive page), and when a song ends the doors close and a new record must be chosen. Accessibility choices: the hidden part is `inert` so keyboard and screen-reader users cannot reach it; focus moves to "Back to the jukebox" when the doors open and to the first record when they close; each change is announced; closing after a song can be switched off; reduced-motion users get no animation. Checked in a browser: open, back, reopen another record, automatic close, a phone-width view. Not checked: a full real song ending in each mode (the sweep, followed current and years hooks are in place), screen readers, and Safari or Firefox (the 3D swing).

## Versions of temperature, salinity and density

Salinity and temperature now have the same turning-globe version as density: the two movies from SVS 3652 are read by one generalised tool (`tools/analyse-video.html?kind=...`, colour bar and direction per kind) into `sst_video_grid.js` and `sss_video_grid.js`, and the track definition is built by one function. Sea temperature, salinity and density each open a second wooden page to choose between the still map and the globe; temperature has a third version, the El Niño page, so the plain still map is clean and the El Niño layer is not lost. Checked: both new videos play with the beam, scale and notes following; the second pages, back, and the clean still (no El Niño panel) work. Not checked: how well the new video grids agree with the flat maps (not measured, unlike density's 63%); level balance of the new tracks (they reuse the still tracks' trims); the "still image of this year's sea temperature" asked for could not be matched to any provided file, so the provided SVS 3652 average map is used.

## Wooden record pages, settings tab and flick switches

Every page now has the jukebox look: the data pages sit in a gold-trimmed walnut cabinet with brass and red buttons, and the general settings moved to a small Settings tab (top right) on the home and second pages, so a record's page only carries what belongs to that record. All checkboxes became old-style flick switches (a square antique-brass plate in a bevelled frame with a round collar, two screws and a toggle lever with a ball tip, modelled on a photo the user supplied; up is on and lit by a small amber pilot light, down is off), drawn as SVG background images so the native checkbox keeps its keyboard and screen-reader behaviour. Settings are the same elements moved to the panel, so they persist across records. A mistake on the way: a local variable named `tab` shadowed the new function of that name and stopped the doors from opening until it was renamed. Checked in a browser: the settings tab opens and closes (also with Escape), a switch changed there still applies on a record page (gamakas off gave no pitch curves), and phone width has no sideways scroll. Not checked: Firefox and Safari rendering of the SVG switches, screen-reader announcement of the switches, and every record page's look at every size.

## Hear Me

For blind and low-vision people, a **Hear Me** button on the home page (large, glowing, beside *How it works*) turns on a spoken summary of whatever page is showing and of each page they move to. It builds the text from the page itself (the record's own picture description, the control values, the voices, the settings and their states), so it stays correct when things change, and it is off until pressed and after every load, as asked. Choices: it pauses playback when it starts talking so the summary is not drowned by the music; it removes emoji and arrow symbols from speech; pressing the button again, the bottom-left bar or the H key repeats the screen; it does not replace a screen reader. Checked in a browser pane with the speech call intercepted (so the exact words were read, not heard): home, settings, a second page, a record page, repeat, H key, off. After a report that it said nothing, speech now starts straight from the button press, waits briefly after any cancel, watches for the first word, retries once with the default voice, shows a caption of the sentence being spoken, and shows the text on screen (and to a screen reader) if no speech starts; I could not reproduce silence in the browser pane (speech events fired), so the cause on the other machine is not confirmed. Not checked: a real voice here, a screen reader used together with it (they may both speak), or any blind user.

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
