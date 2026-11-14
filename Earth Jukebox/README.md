# Earth Jukebox

**An interactive jukebox that turns NASA pictures of Earth's ocean and atmosphere into live music, with a spoken guide and a "hear the instruments" tutorial.**

Built for the NASA Space Apps Challenge 2026 challenge *The Earth Information Jukebox*. It is an independent project and is **not an official NASA product**.

Open `index.html` in a modern browser (developed and tested in a Chromium-based browser; Firefox and Safari are untested). There is nothing to install and no server is needed. Press **Play** to hear one sweep, or **Hear the instruments** to learn what each voice means.

---

## What it does

Each track takes a NASA visualization, reads the colours in it as data, and plays that data as music while the picture stays on screen.

| Track | Data | What the sweep does |
|---|---|---|
| **Year of the ocean** (starts here) | NASA SVS 3912: ocean currents and sea surface temperature, 25 March 2007 to 3 March 2008 | Runs through time. You see the time-lapse and hear each hemisphere warm and cool as the seasons turn. |
| **Aerosols** | NASA SVS 5669: smoke, dust, sea salt and sulfate, 19 August 2025 | Sweeps the globe from west to east. |
| **Sea temperature**, **Salinity**, **Density** | NASA SVS 3652: average ocean surface maps | Sweeps the globe from west to east. |
| **Density (video)** | NASA SVS 3652: the Earth turning once in 60 seconds | Follows the line down the middle of the turning globe, in step with the video. |

How the picture becomes sound:

- **Left to right is time.** One sweep plays once and stops at the end. (In the Year track, the sweep runs through the year instead.)
- **Top to bottom is latitude, and latitude is pitch.** North is high, south is low. Notes are snapped to the Carnatic raga **Mohanam** with Sa = D (D E F♯ A B), so the result is always consonant.
- **Each kind of data has its own voice.** There are five voices per track: a drone, chords, a "high" voice (a quiet roll where the data is strong, a plucked or struck melody where it is light), a lead melody with gamakas (Carnatic ornaments, with no vibrato), and drums. Every track has a different set of instruments (for example, a French horn leads the Year track, a flute leads Sea temperature and an oboe leads Salinity).
- **Drums are regional and follow the data.** Each region plays its own native drum (tabla, drum kit, darbuka, djembe, taiko, surdo and tamborim, bodhrán, daf, kendang, congas, clapsticks). The stronger the data under the sweep, the faster they play, in four musical steps only: crotchets, quavers, semiquavers and, rarely, demisemiquavers. A sudden jump in the data gets an accent. In the Year track, each latitude zone plays one drum instead.
- **Click or tap the picture** to hear a single spot, with a description.

The five voices are generated live in the browser with the Web Audio API. Underneath them sits a **composed music layer**: for each track, two 16-second loops written for this project in Mohanam (a "bed" of chords and bass, sometimes with a harp, and a melody). They were rendered with MuseScore 4 (its bundled MS Basic sound font) and are stored as `music_data.js`. The bed stays steady and the melody comes forward where the data is strong. Untick **Composed music underneath** to hear only the live voices. `tools/make-music.ps1` rebuilds them.

**Sound source: MuseScore composition (5 instruments).** An alternative to the live synthesis, chosen from the *Sound source* menu. One composition made for MuseScore (`music_scores/EarthJukebox_5voice.mscz`, editable) has five instruments that are the five voices: drone (cello), chords (strings), high voice (harp), lead (clarinet) and drums. The same five stems play for every track, and the data modulates them: each instrument is louder where its kind of data is stronger, the three upper voices open their tone with the data, and the drums follow the data strength. The live voices are off in this mode, and the spoken text and legend still describe the live instruments. `tools/make-score.ps1` rebuilds the score and `score_data.js`; to use your own edits, export five mp3 stems (one instrument each) named `drone`, `pad`, `high`, `lead`, `drums`, and run it with `-StemDir`.

## Accessibility features

- **Spoken guided tour** (off by default; tick "Spoken narration"). It describes the image, explains how to listen, plays the sweep once with no talking over it, and stops. There is a **short** (about 20 seconds) and a **full** version of the intro, and a Skip button.
- **Hear the instruments:** plays each voice alone with its label, so the mapping can be learned and checked. Each voice also has its own "Hear" button.
- **Full keyboard use:** arrow keys explore the picture, Enter replays a spot, Space plays or pauses, Home and End jump to the edges.
- **Text alternatives:** a full description of each picture, a live text readout of whatever you explore, and an optional description while playing.
- **Per-voice mute** and a volume slider; an option to skip the Antarctic drone.
- **Data and limits** panel under every track (see below).

**Not yet tested:** use with a screen reader (NVDA, VoiceOver), colour contrast, phones, Safari, and any study with blind or low-vision listeners. See *Limits*.

## Data sources and credits

All imagery is from the NASA Scientific Visualization Studio (SVS). Full creator credits are on each SVS page, which should be read before publishing. I did not verify the exact credit lines, so they are not copied here.

| Data | Source | Used for |
|---|---|---|
| Aerosols, 19 Aug 2025 20:00 UTC | NASA SVS 5669, <https://svs.gsfc.nasa.gov/5669/> | Aerosols track |
| Sea surface currents and temperature (ECCO2), 2,001 frames, 25 Mar 2007 to 3 Mar 2008 | NASA SVS 3912, <https://svs.gsfc.nasa.gov/3912/> (frame dates from NASA's `flat_ecco2_dates.txt`; temperature colour bar `sst_ecco2_cbar.png`) | Year of the ocean track |
| Sea surface temperature, salinity and density maps and movies (released 9 Oct 2009) | NASA SVS 3652, <https://svs.gsfc.nasa.gov/3652/> | Sea temperature, Salinity, Density, Density (video) |

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
- NASA's salinity and density colour bars are not evenly spaced, so "thirds" are thirds of the colour scale.
- The Density (video) track assumes the globe starts at 90° W and turns 6° a second (read off the frames by eye); the globe is tilted and shaded, so latitudes are approximate. Agreement with the flat density map is modest (about 63% of cells agree on ocean or land).
- The named hotspots and their stories use hand-drawn boxes and facts written during development. They need a citation check.
- The aerosol land and haze separation is by colour, so dense haze over land is partly missed.
- Region borders for the drums are approximate (cells are about 2° by 10°).
- **The mix was balanced by measurement, not by ear.** Each voice of each track was rendered offline and its A-weighted level set against the others, with a limiter to prevent clipping (see `PROCESS.md`). Nobody has yet judged it by listening, so please listen and report problems. Very low notes (the drone and the lowest bassoon notes) will be faint or inaudible on laptop speakers and small headphones.
- Not tested with screen readers, on phones, in Safari, or with blind or low-vision users.
- This is not a measurement tool and not a certified assistive device.

## Files

| Path | What it is |
|---|---|
| `index.html`, `app.js` | The whole application. |
| `music_data.js` | The composed music loops (12 mp3 files, base64), built by `tools/make-music.ps1` with MuseScore 4. The phrases were written by the AI assistant, not a human composer; the MS Basic sound font's licence has not been checked. |
| `*_grid.js` | Precomputed sound grids for each track (`year_grid.js`, `grid.js` for aerosols, `sst_grid.js`, `sss_grid.js`, `density_grid.js`, `video_grid.js`, `ocean_grid.js`). |
| `assets/` | Pictures, colour bars, the density video (`assets/video`) and 160 time-lapse frames (`assets/year`). |
| `tools/` | Scripts that rebuild the grids from the source images (see below). |
| `PROCESS.md` | Why each design choice was made, what went wrong and how it was fixed. |

## Rebuilding the data

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
