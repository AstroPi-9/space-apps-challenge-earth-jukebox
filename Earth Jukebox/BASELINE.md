# Baseline: 15 Nov 2026 (submission day)

The current baseline. The 14 Nov baseline is kept below for comparison.

- **Git tag:** `baseline-2026-11-15`, on the commit "Welcome pop-up, and Hear instruments waits for each description". Compare with `git diff baseline-2026-11-14 baseline-2026-11-15`.
- **Size:** app folder about 87 MB; app.js 1,820 lines.

## Changed since the 14 Nov baseline
Switches rail beside the map and a slimmer layout; Susan as the default voice; captions on the picture and a live "Where you are" strip that describes what is under the beam; Stop demo cuts the voice; map keyboard role and quieter live regions; "Quiet the music while I read"; Lightning record with sector lights on the map; Hear Me; the El Nino option hidden for now; a welcome pop-up on opening (with "Do not show this again"); and "Hear instruments" now waits until each description has been read aloud before playing that sound.

## Verified at this point
The welcome pop-up opens and closes with no console errors (built-in browser). The instrument demo order (speak, then sound, then next) was checked with a simulated voice only.

## Not verified at this point
Everything in the 14 Nov "Not verified" list still stands, and in addition: the instrument demo has not been tried with a real browser voice, and the 30-second pitch video (`../earth-jukebox-30s.mp4`, made from screenshots) is not part of the repository.

---

# Baseline: 14 Nov 2026 (evening, the day before the submission deadline)

This marks the project as it stood after the interface redesign and the knowledge graph. It is the point to compare against or return to.

- **Git tag:** `baseline-2026-11-14` (on the commit after `73db355`, which added `KNOWLEDGE_GRAPH.md`). Restore a copy with `git checkout baseline-2026-11-14`, or list changes since with `git diff baseline-2026-11-14`.
- **Repository:** public, https://github.com/AstroPi-9/space-apps-challenge-earth-jukebox (`main`).
- **Size:** app folder about 63 MB (assets about 31 MB including 160 Year frames and the El Nino movie); JavaScript total about 21.9 MB, of which audio and data files are the bulk (samples 7.5, fixed loops 4.7, stems 3.6, El Nino fine grid 4.0, coarse grid 1.6). Code: app.js 1,616 lines, plus sheet.js, follow.js, elnino.js, trace.js.

## What is in it
Seven tracks at the baseline (Year of the ocean, Ocean currents, Aerosols, Sea temperature, Salinity, Density, Density video); later versions have ten (see KNOWLEDGE_GRAPH.md); live synthesis with regional scales, sad and urgent moods, harmonious mode and an optional gamaka switch; MuseScore instrument sounds and a fixed 5-instrument composition as alternative sources; scrolling sheet music; Follow a current; the El Nino layer with Play the years; note trace export; spoken guide and instrument demo; validation scripts and results in `analysis/`; the redesigned interface.

## Verified at this point (by me, in a browser pane)
- All scripts parse and the page loads without errors in code; play, pause, stop (instant silence), follow, years and trace export all ran.
- Mix balance measured offline (about -21 to -23 dB A-weighted, peaks about -4 dBFS); harmony measured by counting clashing notes.
- Validation: EOF r = +0.91 and Nino box r = 0.96 against NOAA's index; seasonal cycle and baselines in `analysis/`.

## Not verified at this point
No listening test of the finished mix; no screen-reader, Firefox, Safari or real-phone test; no automated tests; narration facts and hotspot stories unchecked; NASA credit lines not added; EIC-frame status unconfirmed; licence (MIT) and MuseScore sound font licence unconfirmed; RAM AVATAR rights unconfirmed. See section 12 of `KNOWLEDGE_GRAPH.md`.
