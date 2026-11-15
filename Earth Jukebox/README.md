# Earth Jukebox

**An interactive jukebox that turns NASA pictures of Earth's ocean and atmosphere into live music, with a spoken guide and a "hear the instruments" tutorial.**

Built for the NASA Space Apps Challenge 2026 challenge *The Earth Information Jukebox*. It is an independent project and is **not an official NASA product**.

**The jukebox.** Sea temperature, salinity and density each open a second wooden page first, where you choose between versions (the still map and the turning globe). El Niño 2026 (record D1) opens a second page too, with three versions (see below). The page opens on a wooden jukebox with a short summary and seven large red buttons (A1 to D1), one for each record. Pressing a button picks that record, and the home page swings open like double doors to show its page (picture, sound settings, sheet music and any extras). When a song ends, or when you press **Back to the jukebox**, the doors close and you choose another record. The *Return to the jukebox when a song ends* switch (in Display and narration) turns the automatic closing off. With reduced-motion settings the doors do not animate. Add `?nohome` to the address to skip the home page.

**Settings and switches.** Every record page has the same wooden jukebox look. The settings that apply to every record (sound source, harmonious mode, gamakas, regional scales and emotion, composed music underneath, sheet music, descriptions, spoken narration and its voice, returning to the jukebox after a song) are in the small **Settings** tab at the top right of the home and second pages. Settings that belong to one record stay on its page: Follow a current and the voice mute switches. Every setting is an old flick switch: up is on, down is off.

**Controls on a record's page.** The top bar has *Back to the jukebox*, the current record, an icon-only **Restart** button and **Play**. Under it, a thin strip holds the **Volume** and **Tour length** sliders. Two columns of square buttons sit either side of the map, the same number on each side, and each is a quick front for a setting that also lives in Settings: on the left **Skip Antarctic**, **Quiet music**, **Sheet music** and **Hear instruments** (plays each voice alone); on the right **Narration**, **Full intro** (long or short spoken introduction), **Captions** and **Skip intro** (only active while the intro plays). Captions needs Narration on and is greyed out without it. Harmony, Music bed, Gamakas and Regional scales stay in Settings only. On a phone the buttons move into rows under the map. Below the map are a thin *Where you are* strip, the five voices in one row of small cards, the sheet music, the note-trace export and the *Data and limits* panel.

Open `index.html` in a modern browser (developed and tested in a Chromium-based browser; Firefox and Safari are untested). There is nothing to install and no server is needed. Press **Play** to hear one sweep, or **Hear the instruments** to learn what each voice means.

---

## What it does

Each track takes a NASA visualization, reads the colours in it as data, and plays that data as music while the picture stays on screen.

| Track | Data | What the sweep does |
|---|---|---|
| **Lightning** (record C2) | NASA SVS 5011: lightning flashes seen from the International Space Station, March 2017 to July 2023 | Runs through time. Every flash is a drum strike: untuned drums chosen by part of the world and latitude, with timpani rolls in the strongest storms. Dates are assumed (the movie has no date labels). |
| **Year of the ocean** (inside record A1, Ocean currents, with the one-frame "follow a current" page; starts here) | NASA SVS 3912: ocean currents and sea surface temperature, 25 March 2007 to 3 March 2008 | Runs through time. You see the time-lapse and hear each hemisphere warm and cool as the seasons turn. |
| **Ocean currents** | NASA SVS 3912: one frame (19 June 2007) | Sweeps the globe west to east, **or** use *Follow a current* (below). |
| **Aerosols** | NASA SVS 5669: smoke, dust, sea salt and sulfate, 19 August 2025 | Sweeps the globe from west to east. |
| **Sea temperature**, **Salinity**, **Density** (three records, each with a second page to choose a version) | NASA SVS 3652 | **Still map:** the provided average ocean surface map; a beam sweeps from west to east. **Turning globe:** the provided movie of the Earth turning once in 60 seconds; the sound follows the line down the middle of the globe, in step with the video. Sea temperature also has **El Niño through the years** (see below). The still map is a long-term average, not one year. |
| **El Niño 2026** (record D1, a second page with three versions) | NASA SVS 5683, "Signs of El Niño in 2026": sea surface temperature *anomaly* (how much warmer or cooler than normal) over the tropical Pacific | **Through 2026:** runs through time, 29 January to 10 October 2026, as the warm water grows along the equator. **10 October 2026** and **the same week in 2025:** a beam sweeps the Pacific map from Indonesia to South America. See *El Niño 2026* below. |

How the picture becomes sound:

- **Left to right is time.** One sweep plays once and stops at the end. (In the Year track, the sweep runs through the year instead.)
- **Top to bottom is latitude, and latitude is pitch.** North is high, south is low. Notes are snapped to a scale, with the tonic always D. **The scale changes with the region the sweep is passing over**, and each region has a hopeful and a sad form (see *Scales and emotion* below). The Carnatic raga Mohanam is used for the open ocean and the Year track.
- **Each kind of data has its own voice.** There are five voices per track: a drone, chords, a "high" voice (a quiet roll where the data is strong, a plucked or struck melody where it is light), a lead melody with gamakas (Carnatic ornaments, with no vibrato), and drums. Every track has a different set of instruments (for example, a French horn leads the Year track, a flute leads Sea temperature and an oboe leads Salinity).
- **Drums are regional and follow the data.** Each region plays its own native drum (tabla, drum kit, darbuka, djembe, taiko, surdo and tamborim, bodhrán, daf, kendang, congas, clapsticks). The stronger the data under the sweep, the faster they play, in four musical steps only: crotchets, quavers, semiquavers and, rarely, demisemiquavers. A sudden jump in the data gets an accent. In the Year track, each latitude zone plays one drum instead.
- **Click or tap the picture** to hear a single spot, with a description.

The five voices are generated live in the browser with the Web Audio API. Underneath them sits a **composed music layer**: for each track, two 16-second loops written for this project in Mohanam (a "bed" of chords and bass, sometimes with a harp, and a melody). They were rendered with MuseScore 4 (its bundled MS Basic sound font) and are stored as `music_data.js`. The bed stays steady and the melody comes forward where the data is strong. Untick **Composed music underneath** to hear only the live voices. `tools/make-music.ps1` rebuilds them.

**Sound source: MuseScore instrument sounds playing the data.** The same live, data-driven notes as the default (regional scales, sad and urgent moods, gamakas, latitude as pitch), but the melodic and harmonic voices are real instrument recordings rendered with MuseScore 4 instead of synthesis: the lead (bassoon, clarinet, cello, flute, oboe or horn), the chords (strings, choir, brass or organ), the drone (cello, organ or tuba) and the high voice (timpani, marimba, vibraphone, harp, celesta, kalimba or glockenspiel). The regional drums and the gong are still synthesised, because MuseScore's sound font has no tabla, djembe and so on. Each instrument is a row of recorded notes (`samples_data.js`, 7.5 MB, rebuilt by `tools/make-samples.ps1`), re-pitched by at most 2.5 semitones, so the first Play loads them for a few seconds. Notes outside an instrument's recorded range are moved by octaves.

**Sound source: MuseScore composition (5 instruments).** An alternative to the live synthesis, chosen from the *Sound source* menu. One composition made for MuseScore (`music_scores/EarthJukebox_5voice.mscz`, editable) has five instruments that are the five voices: drone (cello), chords (strings), high voice (harp), lead (clarinet) and drums. The same five stems play for every track, and the data modulates them: each instrument is louder where its kind of data is stronger, the three upper voices open their tone with the data, and the drums follow the data strength. The live voices are off in this mode, and the spoken text and legend still describe the live instruments. `tools/make-score.ps1` rebuilds the score and `score_data.js`; to use your own edits, export five mp3 stems (one instrument each) named `drone`, `pad`, `high`, `lead`, `drums`, and run it with `-StemDir`.

## Harmonious mode (on by default)

The **Harmonious mode (fewer notes, chord-based)** box makes the live music calmer and keeps every pitched sound in agreement. Untick it for the busier original version.
- **One chord at a time.** The chord changes only at the start of a bar (two seconds). It is always a plain consonant triad (a root, a major or minor third, a perfect fifth) on a root that sits well with the tonic D, and any chord note that would clash with the drone (a semitone or tritone away) is left out. The scale and the mood also change only at the start of a bar.
- **Melody and sparkles land on the chord.** The lead and the high voice (plucks, mallets) are moved to the nearest chord note on strong beats; between beats the lead may pass through other scale notes unless they would clash with the chord or the drone. This loosens the link between pitch and latitude by a few semitones, but keeps the contour.
- **Fewer notes.** At most about one melody note per beat, plucks at least 0.4 s apart, drums no faster than quavers and without the filler strokes, fewer crackles.
- **The drone** uses an octave instead of a fifth when the scale has no perfect fifth (for example Locrian). The "urgent" figure uses the chord notes instead of a semitone clash; the heartbeat is unchanged.

Measured by counting (not by ear) over 13-second sweeps with the trace: the lead played about 75% fewer notes, the drums about 55% fewer, and the share of melody notes a semitone or tritone from a sounding chord or drone note fell from about 73% to 0 to 11% (the remainder are the first moments after a chord change, while the previous chord is still fading). It does not affect the fixed MuseScore pieces or the "composed music underneath" layer.

## Scales and emotion

The music follows the data in two ways: **where** (the scale) and **how bad** (the mood). The tonic stays D, and the "Regional scales and emotion" box turns this on (default) or off (Mohanam everywhere, as before). The scale follows the same region as the drums.

| Region (drum) | Hopeful form | Sad form |
|---|---|---|
| North America (drum kit) | Ionian (major) | Aeolian (natural minor) |
| Central and South America (congas, surdo) | Lydian, chords with major thirds | Lydian with a minor third, chords with minor thirds |
| Europe (bodhrán) | Mixolydian (a major Dorian) | Dorian |
| Africa (djembe) | Aeolian dominant (a major Aeolian) | Aeolian |
| Middle East and North Africa (darbuka) | Phrygian dominant (a major-third cousin of Locrian) | Locrian |
| India (tabla) | Mayamalavagowla | Hanumatodi (minor-third form) |
| East Asia (taiko) | Major pentatonic | Minor pentatonic |
| Southeast Asia (kendang) | Slendro-like pentatonic | Pelog-like |
| Russia and Central Asia (daf) | Dorian with a raised fourth | Hungarian minor |
| Australia and Oceania (clapsticks) | Lydian dominant | Blues |
| Open ocean, and the Year track | Mohanam | Hindolam |

The Locrian family, Slendro-like and Pelog-like scales are approximations chosen for sound; they are not authentic tunings. The mapping of regions to scales is the author's artistic choice, not a claim about the music of those places.

**Mood** comes from how strong the data is under the sweep (the same "data strength" the drums use, smoothed over a few columns):
- **Calm and hopeful:** light data. The hopeful form of the scale.
- **Troubled and sad:** strong data. The sad form of the scale, darker chords, and the lead sometimes adds a soft falling "sigh".
- **Urgent:** the strongest data, or a sharp rise into strong data. A heartbeat on every beat and a tense, repeating figure (the tonic against the note a semitone above) are added.

What "strong" means depends on the track (for example, lots of aerosol, or warm and swirling water), so it is a stand-in for "something is wrong", not a measure of harm. The text under the sheet music says the current scale and mood. The "MuseScore instrument sounds" source follows the data, the regions and the mood. The "MuseScore composition, 5 instruments" source and the "composed music underneath" layer are **fixed pieces in Mohanam** and do not follow the data or the regions.

## Follow a current (an alternative to the sweep)

On the Ocean currents track, a panel under the map lets you follow one current along the picture's own flow lines instead of sweeping every column. Choose a named current (Gulf Stream, Kuroshio, Agulhas, Antarctic Circumpolar, Humboldt), type a start longitude and latitude, or tick *Click the map to choose the start* and click. The line is traced on the map and a dot travels along it while the sound goes with it:

- **Pitch is the water temperature** under the dot (warmer is higher), with the lead playing every other step. The stereo position is where the dot is on the map.
- **The scale follows the region** the line passes through, as in the sweep. Water above about 22 °C turns the music sad, and above about 28 °C urgent.
- **Swirl and fronts:** tangled flow lines, and sudden temperature changes along the line, add soft sparkles.
- A status line says the position, temperature, scale and mood as it goes. The sheet music under the map shows the notes being played, as in the sweep. The trace stops where the flow lines fade out (land, or no decoded colour), at the map's edge, or after 40 seconds.

How it works and its limits: `tools/make-flow-field.ps1` measures the direction of the lines in each 16-pixel tile of the frame (`flow_field.js`). The tracing follows those directions. **A flow line has an orientation but no arrow**, so the picture alone cannot say which way the water flows. The named currents use their well-known direction; a start you choose heads east unless you tick *Reverse direction*. The path follows the drawn lines at 2.8-degree tile resolution, so it is a sketch of the current, not a measured track, and traces can wander across a basin. The temperature is decoded from line colour (see below).

## El Niño 2026 (record D1)

The sea temperature maps are long-term averages, so they cannot show an El Niño. This record uses NASA's 2026 pictures of the tropical Pacific (SVS 5683, "Signs of El Niño in 2026", visualization by Kel Elkins), which show the **anomaly**: how much warmer or cooler than normal the sea surface is (colour bar from minus 4 °C, blue, through pale cream, normal, to plus 4 °C, dark red). It has three versions:
- **Through 2026:** a sweep through time, 29 January to 10 October 2026 (121 frames of NASA's movie, blended into 160 moments). The picture changes with the sweep and the pitch is latitude, read across all longitudes in the picture, as in the Year of the ocean.
- **10 October 2026:** the map at the peak of the event. A band of very warm water, more than three degrees above normal, runs along the equator to the coast of Peru. A beam sweeps from west to east.
- **The same week in 2025:** a year earlier, when the equator was slightly cooler than normal. The mood of the music is ranked against both years together, so this one sounds calmer.

The four voices are cooler than normal, near normal, warmer than normal, and strong anomalies (more than 2 °C from normal either way). Two more sounds follow the deepest reds: where the water is **medium-dark red** (2.5 to 3.5 °C above normal) a low, dark **double bass chord** plays, and where it is **almost black-red** (3.5 °C and above) a **low timpani roll and rumble** plays. Both get louder the more black-red there is in the column, and on the two map versions they **die away over a few seconds** when the beam reaches the coast of Central and South America (the first column in the eastern Pacific where land fills the band from 15° S to 12° N, at about 80° W). The double bass is synthesised (the MuseScore sounds have no double bass) and plays through the chords voice, the rumble through the percussion voice, so their mute boxes and balance apply. Their gain curves were set by offline measurement; at the top of the red zone they reach the mix's compressor ceiling, so on the map the build is clearest in the first half of the red zone. The grids are built by `tools/make-elnino2026.py` from the NASA files (`elnino_grids.js`, `assets/elnino2026/`). The map has no coordinates, so its extent (about 105° E to 40° W, 30° N to 23° S) was **fitted** by matching its land to a public coastline; latitudes and longitudes are approximate.

**Check against NOAA** (`tools/validate-elnino2026.py`, results in `analysis/elnino2026_validation.json`): the Niño 3.4 box decoded from NASA's pictures follows NOAA's weekly Niño 3.4 index with correlation **+0.994** over 29 January to 10 October 2026 and +0.83 over the same dates in 2025 (+0.98 over both). On 10 October 2026 it decodes to +3.35 °C against NOAA's +3.2 °C. The decode runs about **0.4 °C warmer** than NOAA's index in 2026. That may be a different baseline and data product, or a timing difference of up to four weeks (shifting NOAA's series by 28 days fits better in 2026, but not in 2025), and a steadily rising series cannot tell these apart. The colour bar stops at 4 °C, so 38% of the Niño 3.4 box is read as exactly 4 in October 2026, and the warmest water is under-read. The small Niño 1+2 coastal box matches least well in 2026 (correlation +0.94, RMSE 0.64 °C). This tests that the decode behaves like the real thing, not that every value is exact.

## Earlier El Niño layer (SVS 4695, switched off)

*This earlier version, built on the SVS 4695 movie (1982 to 2017), is hidden: its map image did not look good enough. It was replaced by El Niño 2026 above. The code and data are still in the project. To bring it back, add `'sstEl'` to `TAB_ORDER` in `app.js`, restore its entry in the sea temperature group in `jukebox.js`, and add the `<script>` tags for `elnino_grid.js` and `elnino_fine.js` back to `index.html`.*

The sea temperature map is a long-term average, so it cannot show warming or El Niño. This add-on brings in two real time series so the music can respond to **change from normal** (an anomaly):

- **NASA SVS 4695**, monthly sea surface temperature anomaly maps, 1982 to 2017 (<https://svs.gsfc.nasa.gov/4695>).
- **NOAA PSL Niño 3.4 index**, monthly numbers from 1948 to the latest published month (<https://psl.noaa.gov/data/correlation/nina34.anom.data>; page: <https://psl.noaa.gov/data/timeseries/month/Nino34_CPC/>). In the copy used, the last published value is +2.30 °C for October 2026, in the El Niño range (NOAA uses +0.5 °C as its threshold).

Under the Sea temperature map, tick **Add the El Niño layer** and choose a month with the slider or one of the buttons (Dec 1982, Dec 1988, Dec 1997, Dec 2015, or the latest month).

- **See:** the anomaly map is laid over the temperature map (red is warmer than normal, blue cooler). The temperature map is faded to grey so the anomaly stands out; *Hide the temperature map under it* shows the anomaly alone, and *Layer strength* sets how strong it is.
- **Hear (the sweep):** press Play and the sweep also plays the anomaly under the beam. Warm anomalies are bright glass notes and cool ones are dull kalimba notes, with **pitch = the anomaly** (higher is warmer than normal). The mood is now set by the anomaly, not by the picture's ranking: sad where the water is warmer than normal, urgent where it is much warmer (about +2.5 °C and over), calm where it is near normal. The text under the sheet music says why.
- **Hear (the years):** *Play the years* plays the Niño 3.4 index from the chosen month onward, one note for each three months (like NOAA's three-month Oceanic Niño Index), while the anomaly maps animate. El Niño (index at or above +0.5) turns the music sad, strong El Niño (about +1.5 and over) urgent, and La Niña (at or below -0.5) drops the pitch. There is a short chime when a phase begins. After 2017 there is no map, only the index.

How it was made and its limits:
- **Decoding:** NASA's movie was read month by month with `tools/analyse-nino.html`, turning each colour into an anomaly using NASA's colour bar (steps of 0.5 °C) and summing onto the app's 160 by 18 grid (`elnino_grid.js`). The picture's Niño 3.4 box follows NOAA's index closely (correlation 0.96 over 432 months), but its values run a few tenths of a degree larger in size, probably because the two use different baselines; I have not checked. **Do not compare the two sets of numbers directly.** The geometry (the movie's time axis and where the map sits in the frame) was fitted, not documented; it was checked against NOAA's index, not against the original data.
- **Coarse:** the sound uses rows of 10-degree latitude bands. The map you see is drawn from a finer 3-degree grid (`elnino_fine.js`, decoded from the same movie, 4 MB), smoothed when scaled up, so it looks blocky up close. Water close to normal, and land, are left clear so the temperature map shows through (it turns grey while the layer is on). The lower-left corner and title of NASA's movie are covered by their own timeline, so those places have no data and are marked with **grey boxes**. The movie file itself is no longer loaded by the page.
- **Raw numbers:** the NOAA table is used as published. The pages describing the index disagree on its version (ERSST v4, v5 or v6) and base period; check before quoting a value.
- **What it does not do:** the temperature map under it is a fixed average, so the layer shows a chosen month, not a trend, and it says nothing about the effects of El Niño on weather. Nothing here has been listened to by anyone yet.

## Note trace (export)

Under the controls, **Export note trace (CSV)** and **(JSON, with sources and method)** save a record of every note played in the last run: a sweep, a followed current, or *Play the years*, with the live synthesis or the MuseScore instrument sounds. Each row has the time, voice, instrument, MIDI pitch and note name, duration, and where the note came from:
- **Sweep:** column number, longitude (or date for the Year track, or video time), the column's four data-channel totals, how strong the column is compared with the rest (0 to 1), the source picture, and for lead notes an estimate of the latitude the pitch stands for. With the El Niño layer on, also the month and the anomaly under the beam.
- **Follow a current:** path step, longitude, latitude, temperature and flow-line coherence.
- **Play the years:** the month, the three-month index, how fast it is changing compared with its usual change, and whether it is a rapid onset.
- **All modes:** the scale, its region, the mood (calm, sad or urgent) and the urgency.

The JSON also lists the **SHA-256 fingerprint of every source file named in the rows** (`source_hashes.js`, rebuilt by `tools/hash-sources.ps1`), how the values were decoded, the checks that were run, and the limits. A note stands for the whole column, step or month it was scheduled for, not for one pixel; the trace records what was scheduled to play, not a measurement of the audio; and the fixed MuseScore stems source has no notes to trace. The idea comes from the team's earlier RAM AVATAR project (this is a separate implementation).

## Checks and validation

The numbers are decoded from rendered pictures, so these checks test that the decode behaves like the real thing. They do not show that every value is exact. The scripts need only Python with numpy and write their results to `analysis/`.

| Check | Script | Result |
|---|---|---|
| **EOF (principal component) analysis** of the 432 decoded monthly anomaly maps | `tools/validate-elnino.py` | Mode 1 explains 15.7% of the variance, follows NOAA's Niño 3.4 index with correlation **+0.91**, and peaks in the eastern equatorial Pacific (about 5° S, 120° W). The decoded Niño 3.4 box correlates 0.96. |
| **Spectrum** of NOAA's index, 1948 to 2026 | same | Strongest peak in the El Niño band at **3.6 years**; 61% of the variance is in the 2 to 8 year band. |
| **Seasonal cycle** of the decoded Year-track temperature, by latitude band | `tools/seasonal-cycle.py` | Warmest in late Aug to early Sep at 60 to 30 N and in late Feb to early Mar at 30 to 60 S; amplitude about 4.5 to 4.8 °C at 30 to 50 degrees and under 1 °C in the tropics; the two hemispheres correlate **-0.95**. One partial year, so it checks behaviour, not accuracy. |
| **Robust rate of change** of the index (differences scaled by the median absolute deviation) | `elnino.js`, `tools/validate-elnino.py` | Used for the "rapid onset" part of the urgent mood in *Play the years*. Descriptive, not a forecast. |
| **Naive baselines** | `tools/validate-elnino.py` | Predicting next month's index by repeating this month gives an average error of 0.18 °C, against 0.65 °C for the long-term mean. The app makes no predictions; any future one must beat these. |
| **Comparison with NOAA's weekly Niño indices** (El Niño 2026) | `tools/validate-elnino2026.py` | The Niño 3.4 box decoded from NASA's 2026 pictures follows NOAA's weekly index with correlation **+0.994** (2026) and +0.83 (2025); the decode runs about 0.4 °C warmer in 2026, and is clipped at +4 °C. See *El Niño 2026*. |

These methods were chosen after reviewing the team's earlier project RAM AVATAR, which also showed why baselines matter: in its run on the 2,001 ocean frames, both models predicting next-frame brightness (best error 0.00198) did worse than simply repeating the current frame (0.00143). Our code is written independently and no code was copied. The same results are in each track's *Data and limits* panel.

## Accessibility features

- **Hear Me** (for blind and low-vision people): a large glowing **Hear Me** button on the home page, next to *How it works*. It is off until pressed. Once on, it speaks a summary of what is on the screen: the home page and its six records, a second page and its versions, the settings panel (each setting and whether it is on or off), or a record's page (the picture described in words, the controls and their values, the voices, and any extra panels such as Follow a current or the El Niño layer). It reads each new page as you move, and a small bar at the bottom left (or the **H** key) hears the screen again or turns Hear Me off. Playback is paused when it starts to talk. It uses the browser's speech voice chosen in Settings and is off again whenever the page is loaded. It is a summary, not a replacement for a screen reader, and has not been tested with blind users.
- **Spoken guided tour** (off by default; tick "Spoken narration"). It describes the image, explains how to listen, plays the sweep once with no talking over it, and stops. There is a **short** (about 20 seconds) and a **full** version of the intro, and a Skip button.
- **Hear the instruments:** plays each voice alone with its label, so the mapping can be learned and checked. Each voice also has its own "Hear" button.
- **Captions:** with *Spoken narration* on, the words the narrator speaks also appear as subtitles just above the bottom edge of the picture (a switch in Settings and a button beside the map; off by default).
- **Quiet the music while I read:** when new text appears, the sound drops to about a tenth of its volume for a few seconds so a screen reader can be heard. Press **M** to switch it on or off. **Hear Me** turns it on, and turns the sheet music off, while it is running, and puts both back afterwards.
- **A live description under the map.** *Where you are* shows the date or longitude, updated at every step, and beside it a description of what is under the beam (the kind of data, the part of the world, the latitude, a value such as a temperature, and landmark stories as the beam nears them). It looks about three seconds ahead so the words arrive with the beam, changes every few seconds, and never repeats a line. Dragging the time slider updates it at once.
- **Page and map names for screen readers:** the browser tab title follows the page (home, version page, or record), and the map's spoken name carries the current record's name.
- **Scrolling sheet music:** under the map, one staff for every voice (drone, chords, high voice, lead, drums) scrolls past a fixed line, in the key of D major (Mohanam uses D, E, F♯, A, B). The notes are the ones the app is actually playing (or, in MuseScore mode, the composition's notes, fainter when their data is quiet). Rhythm is shown by note shape and position, not full engraving. A words-only line under it says what is sounding now. It can be hidden with *Show sheet music*.
- **Gamakas on or off.** The *Gamakas* box turns the melody's pitch ornaments (shakes, slides and touches borrowed from Carnatic music) on or off; off gives steady notes. There is no vibrato oscillator in either case.
- **Full keyboard use:** arrow keys explore the picture, Enter replays a spot, Space plays or pauses, Home and End jump to the edges.
- **Text alternatives:** a full description of each picture, a live text readout of whatever you explore, and an optional description while playing.
- **Per-voice mute** and a volume slider; an option to skip the Antarctic drone.
- **Data and limits** panel under every track (see below).

**Checked in a browser pane (by the author, not by blind users):** every record opens and plays without script errors, the map answers the arrow keys, text contrast measured high on the main text, and the page has no sideways scrolling at 375 pixels wide. **Not yet tested:** use with a screen reader (NVDA, JAWS, VoiceOver), Firefox, Safari, a real phone, whether the Hear Me voice is clear on other devices, and any study with blind or low-vision listeners. See *Limits*.

## Data sources and credits

All imagery is from the NASA Scientific Visualization Studio (SVS). Full creator credits are on each SVS page, which should be read before publishing. I did not verify the exact credit lines, so they are not copied here.

| Data | Source | Used for |
|---|---|---|
| Aerosols, 19 Aug 2025 20:00 UTC | NASA SVS 5669, <https://svs.gsfc.nasa.gov/5669/> | Aerosols track |
| Sea surface currents and temperature (ECCO2), 2,001 frames, 25 Mar 2007 to 3 Mar 2008 | NASA SVS 3912, <https://svs.gsfc.nasa.gov/3912/> (frame dates from NASA's `flat_ecco2_dates.txt`; temperature colour bar `sst_ecco2_cbar.png`) | Year of the ocean track |
| Lightning events detected from the ISS, 2017 to 2023 | NASA SVS 5011, <https://svs.gsfc.nasa.gov/5011/> (visualizer Michala Garrison; Greg Shirah, Kel Elkins, Alex Kekesi; NASA SVS). Raw movie kept out of the repo; frames and counts made by `tools/analyse-lightning.html` | Lightning track |
| Sea surface temperature, salinity and density maps and movies (released 9 Oct 2009) | NASA SVS 3652, <https://svs.gsfc.nasa.gov/3652/> | Sea temperature, Salinity, Density, Density (video) |
| Sea surface temperature anomaly, tropical Pacific, 29 Jan to 10 Oct 2026 and the same dates in 2025 (visualization by Kel Elkins; the SVS page lists the data products, and I did not check NASA's baseline) | NASA SVS 5683, <https://svs.gsfc.nasa.gov/5683/> | El Niño 2026 (three versions). NOAA CPC weekly Niño indices (<https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for>, a public NOAA product) are used only for the check, in `analysis/` |

The ECCO2 model is described on the SVS page as the MIT general circulation model combining satellite and in-situ ocean data. The frames used here are the rendered visualization, **not** the raw model arrays.

Each track's page section **Data and limits** gives its source, date, what the colours mean, how the values were decoded and its caveats.

### How values are read from the pictures

- **Colour bars:** For the temperature, salinity and density maps, every ocean pixel is matched to its nearest colour on NASA's own colour bar. Land photo pixels do not match and drop out. Values are grouped into thirds of the colour bar (low, middle, high), and a fourth channel measures how sharply the value changes ("fronts").
- **Ocean currents frames:** Line colour is temperature (0 to 32 °C) and is decoded by hue against NASA's colour bar (within 4/255, saturation at least 64/255, brightness at least 20/255). This follows the calibration method in the team's earlier analysis of the frames. The flow-line **geometry** is read from the direction of the lines in 32-pixel tiles (parallel lines mean a steady current, tangled lines mean swirl).
- **Aerosols:** Pixels are sorted into the four aerosol types by hue, saturation and brightness, following NASA's colour key.
- **Video:** Each frame is read along a strip down the middle of the globe (`tools/analyse-video.html`).
- **Everything** is summed onto a grid of 160 columns by 18 latitude bands, which is what the sound uses.

## Limits (please read)

- These are **estimates decoded from rendered pictures**, not the underlying numeric data. The temperature decoding was checked against the colour bar (round trip about 0.05 °C), not against the ECCO2 model. About a third of the pixels in the currents frames carry a usable colour.
- The **sound mapping is an artistic translation**. Pitch, instruments, scale and drums do not measure anything in the ocean or atmosphere.
- The Year track covers **one year**. It shows the seasons, not a climate trend.
- **El Niño 2026** is decoded from NASA's pictures, not numbers: the map extent is a fit, the colour bar stops at ±4 °C, the anomaly baseline is NASA's (the decode runs about 0.4 °C warmer than NOAA's Niño 3.4 index in 2026), and "Through 2026" reads every longitude together. Its stories need a citation check. See *El Niño 2026*.
- NASA's salinity and density colour bars are not evenly spaced, so "thirds" are thirds of the colour scale.
- The turning-globe versions (temperature, salinity and density) assume the globe starts at 90° W and turns 6° a second (read off the frames by eye); the globe is tilted and shaded, so latitudes are approximate. Agreement with the flat density map is modest (about 63% of cells agree on ocean or land).
- The named hotspots and their stories use hand-drawn boxes and facts written during development. They need a citation check.
- The aerosol land and haze separation is by colour, so dense haze over land is partly missed.
- Region borders for the drums are approximate (cells are about 2° by 10°).
- **The mix was balanced by measurement, not by ear.** Each voice of each track was rendered offline and its A-weighted level set against the others, with a limiter to prevent clipping (see `PROCESS.md`). Nobody has yet judged it by listening, so please listen and report problems. Very low notes (the drone and the lowest bassoon notes) will be faint or inaudible on laptop speakers and small headphones.
- Not tested with screen readers, on a real phone, in Firefox or Safari, or with blind or low-vision users.
- This is not a measurement tool and not a certified assistive device.

## Files

| Path | What it is |
|---|---|
| `index.html`, `app.js` | The whole application. |
| `rail.js`, `hearme.js`, `jukebox.js` | The buttons beside the map, the Hear Me reader, and the jukebox home pages. |
| `music_data.js` | The composed music loops (12 mp3 files, base64), built by `tools/make-music.ps1` with MuseScore 4. The phrases were written by the AI assistant, not a human composer; the MS Basic sound font's licence has not been checked. |
| `samples_data.js` | Loaded only when needed (like `music_data.js` and `score_data.js`, so the first page load stays small). The MuseScore instrument sounds (18 instruments, base64 mp3), built by `tools/make-samples.ps1`. The sound font's licence has not been checked. |
| `sheet.js`, `score_notes.js`, `score_data.js` | The scrolling sheet music; the notes of the MuseScore composition; the composition's five audio stems. |
| `elnino_grids.js`, `assets/elnino2026/` | The El Niño 2026 grids (four of them: the two maps and the two timelines, the 2025 timeline used only to set the mood), the map extent, and NASA's pictures used (two maps, 61 movie frames, the colour bar). Built by `tools/make-elnino2026.py`. |
| `*_grid.js` | Precomputed sound grids for each track (`year_grid.js`, `grid.js` for aerosols, `sst_grid.js`, `sss_grid.js`, `density_grid.js`, `video_grid.js`, `ocean_grid.js`). |
| `assets/` | Pictures, colour bars, the density video (`assets/video`) and 160 time-lapse frames (`assets/year`). |
| `tools/` | Scripts that rebuild the grids from the source images (see below). |
| `PROCESS.md` | Why each design choice was made, what went wrong and how it was fixed. |

## Rebuilding the data

El Niño 2026 is built with Python (numpy, scipy, Pillow, ffmpeg) from three files downloaded from <https://svs.gsfc.nasa.gov/5683/> into one folder `SRC` (named in the script's header): `python tools/make-elnino2026.py SRC`, and checked with `python tools/validate-elnino2026.py SRC`. The scripts below are for the other records.

The grids are already included, so you only need these if you change the source images. They are Windows PowerShell scripts.

```powershell
# aerosols (reads assets\aerosols.png)
powershell -ExecutionPolicy Bypass -File tools\make-grid.ps1
# temperature, salinity, density maps (read the SVS 3652 files from a folder named "salinity and density" next to this one)
powershell -ExecutionPolicy Bypass -File tools\make-scalar-grids.ps1
# single ocean frame (reads assets\ocean.jpg and assets\ocean_cbar.png)
powershell -ExecutionPolicy Bypass -File tools\make-ocean-grid.ps1
# year of the ocean (reads the 2,001 SVS 3912 frames; default folder E:\Time- light\data)
powershell -ExecutionPolicy Bypass -File tools\make-year-grid.ps1 -DataDir "E:\Time- light\data"
```

The video analysis runs in the browser and needs a local server, because a page cannot read the pixels of a video opened straight from a file:

```powershell
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
# then open http://localhost:8765/tools/analyse-video.html?run=1
```

## Licence

The **code** is offered under the MIT Licence (see `LICENSE`). **The team must confirm this choice before submission.** The NASA imagery in `assets/` is NASA's; check the usage terms and credit lines on each SVS page above before redistributing it.

## How this was made, and AI disclosure

This project was developed with the help of an AI coding assistant, **Claude Code (Anthropic)**. The assistant wrote most of the code, the audio synthesis, the decoding scripts, the on-screen text, the narration and these documents, working from the author's requests and decisions. All of it should be reviewed by a human. Facts in the narration and the hotspot stories need to be checked against sources.

**Earlier work:** the team also has a separate earlier project on the same theme, a Python desktop application called RAM AVATAR (not part of this repository). No code from it is included here. This project used the team's earlier analysis of the 2,001 ocean frames (the colour-bar calibration method and the seasonal temperature figures used in the Year track's stories) as a reference. The idea of tracing each note back to the part of the picture that produced it is credited to that project and is not yet built here.

Please keep personal information out of any public copy of this repository.
