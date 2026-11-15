(() => {
'use strict';
const $ = id => document.getElementById(id);
const stage = $('stage'), playhead = $('playhead'), cursorEl = $('cursor');

// ================= TRACK DEFINITIONS =================
// Every track has 4 voices. Voice k is wired to audio bus k:
//   bus0 = drone/tabla, bus1 = pad, bus2 = timpani rolls and harp, bus3 = bells
// Shared sound design for the scalar ocean maps (temperature, salinity, density): low third = drone, middle = chords, high third = timpani roll or harp, fronts = bassoon.
const SCALAR = {
  schedule(c, t, step, tot, cen, v) {
    const chord = chordFor(Math.min(3, Math.floor(cen[1] / v.rows * 4)));
    pad(t, chord, Math.min(0.45, tot[1] * 0.1), 500 + Math.min(1, tot[1] / 4) * 1300);
    texture(c, t, step, Math.min(1, tot[2] / 3.5), cen[2], v.rows);
    drone(t, this.droneHz, Math.min(0.22, tot[0] * 0.06));
    dataBeat(c, t, step);
    bellsFrom(this, c, t, step, 3, 0.35);
  },
  explore(c, r, v) {
    const t = A.ctx.currentTime + 0.02, x = [0, 1, 2, 3].map(k => v.val(c, r, k));
    drumPhrase(t, c, r);
    if (x[0] > .12) { drone(t, this.droneHz, .15 * x[0]); setTimeout(() => A && drone(A.ctx.currentTime, this.droneHz, 0), 1200); }
    if (x[1] > .12) padNote(t, lowMidi(this, r, v), .06 + .12 * x[1], 1.6);
    if (x[2] > .12) texNote(t, x[2], r, v.rows);
    if (x[3] > .12) { lead(t, bellMidi(this, r, v), .1 + .25 * x[3], 0); lead(t + .14, bellMidi(this, r, v, 2), .06 + .15 * x[3], 0); }
  },
};

const TRACKS = [
  {
    id: 'aerosols', name: 'Aerosols', emoji: '🌫️', grid: window.AEROSOL_GRID, image: 'assets/aerosols.png',
    intro: 'Hear a NASA aerosol map of Earth (August 19, 2025). A playhead sweeps the globe from west to east and turns what it finds into music: smoke, dust, sea salt and sulfate each get their own instrument.',
    alt: 'Global map of atmospheric aerosols. A thick purple plume of Saharan dust stretches from Africa across the Atlantic. Orange smoke from fires covers central Africa. Green sulfate haze lies over East Asia and North America. Grey-blue sea salt swirls fill the southern oceans.',
    species: [
      { name: 'Black carbon', color: '#e8765a', sound: 'A deep drone and fire-like crackles', what: 'smoke from fires' },
      { name: 'Dust',         color: '#c79bf0', sound: 'Warm sustained chords', what: 'desert dust' },
      { name: 'Sea salt',     color: '#8fc1c1', sound: 'A quiet timpani roll where it is strong, a harp where it is light', what: 'sea spray' },
      { name: 'Sulfate',      color: '#58e03a', sound: 'Singing bassoon notes with gamakas', what: 'industrial and volcanic haze' },
      { name: 'Percussion', color: '#b0b6bd', sound: "Each region's native drum. The more aerosol under the sweep, the faster it plays", what: 'data rhythm' },
    ],
    load: x => x[0] + x[1] + x[2] + x[3],                // data strength = total aerosol
    speech: {
      open: ["Welcome to the Earth Jukebox. This map shows aerosols, tiny particles floating in the atmosphere, across the whole world on August nineteenth, twenty twenty-five.", "Colour shows the type of particle. Lilac is desert dust, bright green is sulfate haze, grey-blue is sea salt, and orange is smoke from fires.", "First, here is what is happening in the image, from west to east."],
      listen: ["Now, how to listen. The sweep will travel from west to east, so the sound moves across the map from the Pacific, over the Americas, the Atlantic, Africa and Asia.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong.", "Green sulfate haze is played by a bassoon. The more haze, the busier the playing.", "Lilac dust is a warm, sustained chord. The thicker the dust, the louder it gets.", "Sea salt is a quiet timpani roll where it is strong, and a harp where it is light. Smoke from fires is a low hum with crackling.", "The drums follow the amount of aerosol. Each region plays its own drum, for example the tabla for India, the djembe for Africa, and the drum kit for North America. The more aerosol there is, the faster the drums play, and where there is very little, they fall silent.", "The sweep will now play once, from west to east, and then stop."],
    },
    hotspots: [
      { name: 'the Saharan dust plume crossing the Atlantic', lon: [-63, 69], lat: [12, 35], k: 1, say: -63, story: 'Dust from the Sahara travels across the Atlantic, and carries nutrients that help feed the Amazon rainforest.' },
      { name: 'smoke from fires in central and southern Africa', lon: [8, 36], lat: [-23, 0], k: 0, say: 8, story: 'In August, farmland and savanna burn across southern Africa, sending smoke over the continent and out over the Atlantic.' },
      { name: 'sulfate haze over East Asia and the North Pacific', lon: [105, 180], lat: [30, 70], k: 3, say: 105, story: 'Sulfate haze comes mainly from burning fossil fuels and from industry, and it worsens air quality for millions of people.' },
      { name: 'swirling sea salt over the Southern Ocean', lon: [-180, 180], lat: [-68, -35], k: 2, say: -120, story: 'Strong winds across the Southern Ocean whip up sea spray, filling the air with sea salt.' },
      { name: 'a tropical storm off the US East Coast', lon: [-78, -62], lat: [20, 32], k: 2, say: -78, story: 'This spiral of sea spray marks a tropical storm, its winds lifting salt from the ocean surface.' },
      { name: 'sulfate haze over eastern North America', lon: [-95, -65], lat: [30, 50], k: 3, say: -95, story: 'Sulfate haze here rises mostly from power plants and industry.' },
    ],
    quiet: 'almost no aerosol here, so it is quiet.',
    bellRoot: 26, lowRoot: 50, chords: [[50, 54, 57], [52, 57, 59], [57, 62, 66], [54, 59, 64]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/aerosols_cbar.png" alt="Colour key: black carbon is orange-red, dust is lilac, sea salt is grey-teal, sulfate is bright green.">',
    how: [
      ['Left → right (longitude)', 'Time. One sweep of the globe is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Notes snap to a scale that changes with the region the sweep is over (the tonic is always D). Where the data is strong the scale turns to its sad form: for example Ionian becomes Aeolian over North America, and Mayamalavagowla becomes Hanumatodi over India.'],
      ['Brightness of a colour', 'Loudness and note density.'],
      ['Sulfate (green)', 'Bassoon notes, each ornamented with a gamaka (shake, slide or touch).'],
      ['Dust (lilac)', 'Warm sustained chords. The chord changes with latitude.'],
      ['Sea salt (grey-teal)', 'A quiet timpani roll, tuned to the latitude, where there is a lot of sea salt, and a harp where there is a little.'],
      ['Black carbon (orange)', 'A Sa-Pa drone and fire-like crackles.'],
      ['Percussion (data rhythm)', 'A different native drum for each region where the data is: tabla (India), drum kit (USA and Canada), darbuka (Middle East and North Africa), djembe (sub-Saharan Africa), taiko (East Asia), surdo and tamborim (South America), bodhrán (Europe), daf (Russia and Central Asia), kendang (Southeast Asia), congas (Central America and the Caribbean) and clapsticks (Australia). Strength here is the total amount of aerosol. The stronger the data under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, a sudden jump in the data (the edge of a plume or a current) gets an accent, and between beats each drum plays light filler strokes.'],
      ['Ocean with little aerosol', 'Silence. Quiet is data too.'],
    ],
    schedule(c, t, step, tot, cen, v) {
      const chord = chordFor(Math.min(3, Math.floor(cen[1] / v.rows * 4)));
      pad(t, chord, Math.min(0.5, tot[1] * 0.12), 500 + Math.min(1, tot[1] / 4) * 1500);
      texture(c, t, step, Math.min(1, tot[2] / 6), cen[2], v.rows);
      drone(t, this.droneHz, Math.min(0.2, tot[0] * 0.07));
      dataBeat(c, t, step);
      const nClick = Math.min(6, Math.floor(tot[0] * 2));
      for (let i = 0; i < nClick; i++) crackle(t + Math.random() * step, 0.12 + Math.random() * 0.1);
      bellsFrom(this, c, t, step, 3, 0.3);
    },
    explore(c, r, v) {
      const t = A.ctx.currentTime + 0.02, x = [0, 1, 2, 3].map(k => v.val(c, r, k));
      if (x[3] > .12) { lead(t, bellMidi(this, r, v), .1 + .25 * x[3], 0); lead(t + .16, bellMidi(this, r, v, 2), .06 + .15 * x[3], 0); }
      if (x[1] > .12) padNote(t, lowMidi(this, r, v), .06 + .12 * x[1], 1.6);
      if (x[2] > .12) texNote(t, x[2], r, v.rows);
      drumPhrase(t, c, r);
      if (x[0] > .12) { for (let i = 0; i < 4; i++) crackle(t + .1 + Math.random() * .4, .15); }
    },
  },
  // NASA SVS 3912 (ECCO2): the flow lines are the CURRENTS and their COLOUR is sea-surface temperature (0 to 32 C, see the colour bar). The frame is 19 June 2007.
  Object.assign({
    id: 'ocean', name: 'Ocean currents', emoji: '🌊', grid: window.OCEAN_GRID, image: 'assets/ocean.jpg',
    intro: 'One frame of the NASA ocean currents (19 June 2007). The lines are the currents and their colour is the water temperature. Press play to sweep across the world, or use "Follow a current" under the map to pick a current and hear the water temperature as the sound travels along its flow lines.',
    alt: 'Global map of the ocean surface drawn as thousands of glowing flow lines on a dark background, with grey continents. The lines follow the currents, and their colour shows sea surface temperature: blue is near freezing, green is mild, yellow and orange are warm, and red is about thirty degrees Celsius. The warmest red water fills the tropical western Pacific and the Indian Ocean, with warm ribbons along the Gulf Stream and the Kuroshio off Japan. Cold blue water circles Antarctica. Swirling eddies show up as tangled coils and rings, for example in the south Atlantic off southern Africa.',
    species: [
      { name: 'Cold water',        color: '#5b8dff', sound: '', what: 'cold water' },
      { name: 'Mild water',        color: '#58d27a', sound: '', what: 'mild water' },
      { name: 'Warm water',        color: '#ff7a3d', sound: '', what: 'warm water' },
      { name: 'Swirling currents', color: '#f0e46a', sound: '', what: 'tangled, swirling flow' },
      { name: 'Percussion', color: '#b0b6bd', sound: "Each region's native drum. The warmer and more swirling the water under the sweep, the faster it plays", what: 'data rhythm' },
    ],
    load: x => 0.5 * x[1] + x[2] + x[3],                 // data strength = warm water and swirling flow count most
    describeValue: t => { const d = Math.round( 32 * t); return `Surface temperature about ${d} ${Math.abs(d) === 1 ? "degree" : "degrees"} Celsius.`; },
    speech: {
      open: ["Welcome to the Earth Jukebox. This map shows the ocean surface across the whole world on June nineteenth, two thousand and seven, from NASA's ECCO2 model. Each glowing line follows the flow of the water, so the lines are the currents.", "Colour shows sea surface temperature. Blue is cold, near zero degrees Celsius, then green, yellow, orange, and red, which is about thirty-two degrees.", "First, here is what is happening in the image, from west to east."],
      listen: ["Now, how to listen. The sweep will travel from west to east, so the sound moves across the map from the Pacific, over the Americas, the Atlantic, Africa and Asia.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong.", "The drums follow how warm and swirling the water is. Each region plays its own drum, for example the tabla for India, the djembe for Africa, and the drum kit for North America. The more heat and swirl under the sweep, the faster the drums play, and over cold, calm water they fall silent.", "The sweep will now play once, from west to east, and then stop."],
    },
    hotspots: [
      { name: 'near-freezing Arctic waters', lon: [-180, 180], lat: [70, 90], k: 0, say: -150, story: 'The Arctic is close to freezing, and much of its surface is covered by sea ice, so there is little to see here.' },
      { name: 'the Gulf Stream, a warm current leaving the Caribbean', lon: [-82, -40], lat: [25, 42], k: 2, say: -82, story: 'The Gulf Stream shows up as a ribbon of warm orange and yellow flow lines running north from the Caribbean, carrying tropical heat toward Europe.' },
      { name: 'the cold Southern Ocean around Antarctica', lon: [-180, 180], lat: [-65, -45], k: 0, say: -60, story: 'Around Antarctica the water is cold, and the currents circle the continent as the Antarctic Circumpolar Current, the largest current in the ocean.' },
      { name: 'the Agulhas current off southern Africa', lon: [15, 40], lat: [-41, -29], k: 2, say: 15, story: 'The Agulhas current runs down the east coast of Africa as a warm ribbon, then sheds swirling rings of warm water into the Atlantic. Some show up here as bright circles.' },
      { name: 'the Kuroshio off Japan', lon: [120, 160], lat: [20, 40], k: 2, say: 120, story: "The Kuroshio is a warm current flowing north past Japan, the Pacific's counterpart to the Gulf Stream." },
      { name: 'the warm tropical Pacific', lon: [125, 180], lat: [-8, 12], k: 2, say: 125, story: 'The tropical Pacific holds the warmest water in the picture, and the currents along the equator shift with El Niño and La Niña, which help shape weather around the world.' },
    ],
    quiet: 'no decoded flow lines here (land, ice or dark water).',
    bellRoot: 26, lowRoot: 50, chords: [[50, 57, 62], [52, 57, 64], [54, 59, 62], [45, 50, 54]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/ocean_cbar.png" alt="Colour key: sea surface temperature from 0 degrees Celsius (blue) through green and yellow to 32 degrees (red).">',
    how: [
      ['Left → right (longitude)', 'Time. One sweep of the globe is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'],
      ['Blue (cold water)', ''],
      ['Green and yellow (mild water)', ''],
      ['Orange and red (warm water)', ''],
      ['Tangled, swirling flow lines', ''],
      ['Percussion (data rhythm)', 'A different native drum for each region where the data is. The warmer and more swirling the water under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, and a sudden jump in the data gets an accent.'],
      ['Land, ice and dark water', 'Silence, because there are no decoded flow lines.'],
    ],
  }, SCALAR),
  // ---- Year of the ocean: the same NASA SVS 3912 / ECCO2 frames, but the sweep runs through TIME (25 March 2007 to 3 March 2008) instead of across longitude.
  //      Each step is one frame; the pitch is still latitude, and every latitude band is read across all longitudes. ----
  Object.assign({
    id: 'year', name: 'Year of the ocean', emoji: '📅', grid: window.YEAR_GRID, image: 'assets/year/f000.jpg', timeAxis: true, startLon: 0,
    frames: Array.from({ length: 160 }, (_, c) => 'assets/year/f' + String(c).padStart(3, '0') + '.jpg'),
    lonFn: c => c,                                                            // "longitude" here is just the time step, so the hotspot boxes below are time ranges
    regionFn: lat => lat >= 30 ? 'taiko' : lat <= -30 ? 'samba' : 'conga',     // no longitude on this axis, so each latitude zone plays its own drum
    headFn: (c, r) => `${dateLabel(T.grid.dates[c])}, ${fmtLat(latOf(r))} (all longitudes)`,
    intro: '',
    alt: 'A time-lapse of the global ocean surface through one year, from March 2007 to March 2008. Thousands of glowing flow lines follow the currents on a dark background with grey continents, and their colour shows sea surface temperature: blue is cold, green mild, yellow and orange warm, red about thirty degrees Celsius. Over the year, warm water spreads north across the northern mid-latitudes in summer and retreats in winter, while the southern mid-latitudes do the opposite. The tropics stay warm all year.',
    species: [
      { name: 'Cold water',        color: '#5b8dff', sound: '', what: 'cold water' },
      { name: 'Mild water',        color: '#58d27a', sound: '', what: 'mild water' },
      { name: 'Warm water',        color: '#ff7a3d', sound: '', what: 'warm water' },
      { name: 'Swirling currents', color: '#f0e46a', sound: '', what: 'tangled, swirling flow' },
      { name: 'Percussion', color: '#b0b6bd', sound: 'One drum for each latitude zone. The warmer and more swirling the water, the faster it plays', what: 'data rhythm' },
    ],
    load: x => 0.5 * x[1] + x[2] + x[3],
    describeValue: t => { const d = Math.round(32 * t); return `Surface temperature about ${d} ${Math.abs(d) === 1 ? 'degree' : 'degrees'} Celsius.`; },
    speech: {
      open: ["Welcome to the Earth Jukebox. This is a year of the ocean, from March two thousand and seven to March two thousand and eight, from NASA's ECCO2 model. Each glowing line follows the flow of the water, and the colour shows sea surface temperature.", "Blue is cold, near zero degrees Celsius, then green, yellow, orange, and red, which is about thirty-two degrees.", "First, here is what changes through the year."],
      listen: ["Now, how to listen. This time the sweep travels through time, not across the map. The whole year plays from March to March, and at every moment you hear all of the longitudes at once.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong. So you can hear each hemisphere warm and cool as the seasons turn.", "Northern water plays the taiko, the tropics play congas, and southern water plays the surdo. The warmer and more swirling the water, the faster the drums play.", "The year will now play once, and then stop."],
    },
    hotspots: [
      { name: 'the cold northern mid-latitudes in spring', lon: [0, 10], lat: [30, 60], k: 1, say: 0, story: 'In March the northern mid-latitudes are close to their coldest, with surface water at only about ten degrees.' },
      { name: 'the southern winter', lon: [64, 76], lat: [-60, -30], k: 0, say: 70, story: 'By late August it is winter in the south, and the southern mid-latitudes reach their coldest, at about eight degrees.' },
      { name: 'the tropics, which barely change', lon: [80, 100], lat: [-30, 30], k: 2, say: 84, story: 'The tropics hardly change at all through the year. They stay close to twenty-six or twenty-seven degrees.' },
      { name: 'the northern summer peak', lon: [72, 82], lat: [30, 60], k: 2, say: 76, story: 'By early September the northern mid-latitudes have warmed to about nineteen degrees, around nine degrees warmer than in spring.' },
      { name: 'the southern summer peak', lon: [144, 156], lat: [-60, -30], k: 1, say: 148, story: 'By February it is summer in the south, and the southern mid-latitudes reach their warmest, at about twelve and a half degrees, while the north cools again.' },
    ],
    quiet: 'no decoded flow lines at this latitude.',
    bellRoot: 50, lowRoot: 50, chords: [[50, 54, 57], [52, 57, 59], [57, 62, 66], [54, 59, 64]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/ocean_cbar.png" alt="Colour key: sea surface temperature from 0 degrees Celsius (blue) through green and yellow to 32 degrees (red).">',
    how: [
      ['Left → right (time)', 'Time. The sweep runs through one year, March 2007 to March 2008, so the season changes as it plays.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Every latitude band is read across all longitudes. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'],
      ['Blue (cold water)', ''],
      ['Green and yellow (mild water)', ''],
      ['Orange and red (warm water)', ''],
      ['Tangled, swirling flow lines', ''],
      ['Percussion (data rhythm)', 'One drum for each latitude zone: taiko in the north, congas in the tropics and surdo with tamborim in the south. The warmer and more swirling the water, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, and a sudden jump in the data gets an accent.'],
      ['No decoded flow lines', 'Silence.'],
    ],
  }, SCALAR),

  // ---- Scalar ocean maps from NASA SVS 3652 (sea surface temperature, salinity, density). Channels: 0 low third, 1 middle third, 2 high third of the colour scale, 3 fronts.
  Object.assign({
    id: 'sst', name: 'Sea temperature', emoji: '🌡️', grid: window.SST_GRID, image: 'assets/sst.jpg',
    intro: 'Hear the average temperature of the ocean surface (NASA SVS 3652). A playhead sweeps from west to east. Cold water hums low, mild water forms chords, warm water adds quiet timpani and harp, and sharp temperature fronts are played by a bassoon.',
    alt: 'Global map of average sea surface temperature, with the land shown as a satellite photo. Colour runs from dark blue (near freezing) through cyan and yellow to red (about thirty degrees Celsius). A broad band of red warm water runs around the tropics, strongest in the western Pacific and Indian Ocean. Yellow warm tongues extend along the east coasts of the continents. Dark blue cold water surrounds Antarctica and fills the far North Atlantic and Arctic.',
    species: [
      { name: 'Cold water',   color: '#5b8dff', sound: 'Deep humming drone', what: 'cold water' },
      { name: 'Mild water',   color: '#4fd0b0', sound: 'Warm, gliding chords', what: 'mild water' },
      { name: 'Warm water',   color: '#ff8a3d', sound: 'A quiet timpani roll where it is strong, a harp where it is light', what: 'warm water' },
      { name: 'Fronts',       color: '#f0e46a', sound: 'Singing bassoon notes with gamakas', what: 'a sharp temperature change' },
      { name: 'Percussion',   color: '#b0b6bd', sound: "Each region's native drum. The warmer and more varied the water under the sweep, the faster it plays", what: 'data rhythm' },
    ],
    load: x => 0.5 * x[1] + x[2] + x[3],
    describeValue: t => { const d = Math.round(-2 +  32 * t); return `Surface temperature about ${d} ${Math.abs(d) === 1 ? "degree" : "degrees"} Celsius.`; },
    quiet: 'no ocean data here (land or ice).',
    bellRoot: 26, lowRoot: 50, chords: [[50, 54, 57], [52, 57, 59], [57, 62, 66], [54, 59, 64]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/sst_cbar.png" alt="Colour key: sea surface temperature from minus two degrees Celsius (dark blue) through cyan and yellow to thirty degrees (red).">',
    hotspots: [
      { name: 'the cold waters of the Southern Ocean', lon: [-180, 180], lat: [-65, -50], k: 0, say: -150, story: 'Water around Antarctica sits near freezing, and it is some of the coldest surface water on Earth.' },
      { name: 'near-freezing Arctic waters', lon: [-180, 180], lat: [70, 90], k: 0, say: -120, story: 'In the Arctic, the surface water stays close to the freezing point of seawater, about minus two degrees Celsius.' },
      { name: 'the cool upwelling off Peru and Chile', lon: [-85, -70], lat: [-40, -5], k: 1, say: -85, story: 'Off Peru and Chile, cold water from the deep rises to the surface in a process called upwelling, which feeds some of the richest fishing grounds in the world.' },
      { name: 'the warm Gulf Stream along the US East Coast', lon: [-80, -45], lat: [30, 45], k: 2, say: -80, story: 'The Gulf Stream carries warm tropical water north, and shows up here as a warm tongue along the American coast.' },
      { name: 'the Red Sea', lon: [32, 44], lat: [12, 28], k: 2, say: 32, story: 'The Red Sea is one of the warmest seas on Earth.' },
      { name: 'the Indo-Pacific warm pool', lon: [90, 180], lat: [-15, 10], k: 2, say: 90, story: 'The Indo-Pacific warm pool is the largest body of very warm water on Earth, with surface temperatures above twenty-eight degrees Celsius, and it helps drive weather across the tropics.' },
    ],
    speech: {
      open: ["Welcome to the Earth Jukebox. This map shows the average temperature of the ocean surface across the whole world.", "Colour shows the temperature. Dark blue is near freezing, then cyan, yellow, and red, which is about thirty degrees Celsius.", "First, here is what is happening in the image, from west to east."],
      listen: ["Now, how to listen. The sweep will travel from west to east, so the sound moves across the map from the Pacific, over the Americas, the Atlantic, Africa and Asia.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong.", "Cold water is a deep hum. Mild water makes gliding chords. Warm water adds a quiet timpani roll where it is strongest, and a harp where it is lighter.", "Sharp changes in temperature, which scientists call fronts, are played by a bassoon. The sharper the change, the busier the playing.", "The drums follow how warm and varied the water is. Each region plays its own drum, for example the tabla for India, the djembe for Africa, and the drum kit for North America. The more heat and change under the sweep, the faster the drums play, and over cold, even water they fall silent.", "The sweep will now play once, from west to east, and then stop."],
    },
    how: [
      ['Left → right (longitude)', 'Time. One sweep of the globe is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'],
      ['Dark blue (cold water)', 'A deep Sa-Pa drone.'],
      ['Cyan and green (mild water)', 'Gliding chords. The chord changes with latitude.'],
      ['Yellow and red (warm water)', 'A quiet timpani roll, tuned to the latitude, where the values are high, and a harp where they are lower.'],
      ['Sharp temperature fronts', 'Bassoon notes with gamakas. The sharper the change, the busier the playing.'],
      ['Percussion (data rhythm)', 'A different native drum for each region where the data is. The warmer and more varied the water under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, and a sudden jump in the data gets an accent.'],
      ['Land and ice', 'Silence, because there is no ocean data.'],
    ],
  }, SCALAR),
  Object.assign({
    id: 'sss', name: 'Salinity', emoji: '🧂', grid: window.SSS_GRID, image: 'assets/sss.jpg',
    intro: 'Hear how salty the ocean surface is (NASA SVS 3652). A playhead sweeps from west to east. Fresher water hums low, average water forms chords, salty water adds quiet timpani and harp, and sharp salinity fronts are played by a bassoon.',
    alt: 'Global map of average sea surface salinity, with the land shown as a satellite photo. Colour runs from dark teal (fresher water) to pale cyan and white (the saltiest water). The subtropical Atlantic, the Mediterranean and the Red Sea are the palest and saltiest. Fresher dark water lies near the equator in the Pacific, around the mouths of big rivers such as the Amazon, and in the Arctic.',
    species: [
      { name: 'Fresher water', color: '#2f8f9c', sound: 'Deep humming drone', what: 'fresher water' },
      { name: 'Average salinity', color: '#6fcfd2', sound: 'Warm, gliding chords', what: 'average salinity' },
      { name: 'Salty water',  color: '#dff7f5', sound: 'A quiet timpani roll where it is strong, a harp where it is light', what: 'salty water' },
      { name: 'Fronts',       color: '#f0e46a', sound: 'Singing bassoon notes with gamakas', what: 'a sharp salinity change' },
      { name: 'Percussion',   color: '#b0b6bd', sound: "Each region's native drum. The saltier and more varied the water under the sweep, the faster it plays", what: 'data rhythm' },
    ],
    load: x => 0.5 * x[1] + x[2] + x[3],
    describeValue: t => t < 0.33 ? 'The water here is fresher than average.' : t < 0.66 ? 'The water here has average salinity.' : 'The water here is saltier than average.',
    quiet: 'no ocean data here (land or ice).',
    bellRoot: 26, lowRoot: 50, chords: [[50, 57, 62], [52, 57, 64], [54, 59, 62], [45, 50, 54]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/sss_cbar.png" alt="Colour key: sea surface salinity from about five practical salinity units (dark teal) to forty (white).">',
    hotspots: [
      { name: 'the Arctic Ocean, freshened by rivers and melting ice', lon: [-180, 180], lat: [70, 90], k: 0, say: -150, story: 'The Arctic Ocean is fresher than most seas, because rivers flow into it and sea ice melts.' },
      { name: 'the rainy belt of the equatorial Pacific', lon: [-180, -90], lat: [2, 12], k: 0, say: -130, story: 'Near the equator in the Pacific, heavy rain keeps the surface water fresher.' },
      { name: 'the Amazon River plume', lon: [-55, -40], lat: [-2, 8], k: 0, say: -55, story: 'Fresh water from the Amazon River spreads far out into the Atlantic, making the surface less salty.' },
      { name: 'the salty subtropical Atlantic', lon: [-60, -20], lat: [15, 35], k: 2, say: -50, story: 'The subtropical Atlantic is the saltiest part of the open ocean, because strong evaporation there is not balanced by rain.' },
      { name: 'the Mediterranean Sea', lon: [-5, 36], lat: [30, 45], k: 2, say: -5, story: 'The Mediterranean loses so much water to evaporation that it is among the saltiest seas.' },
      { name: 'the Red Sea', lon: [32, 44], lat: [12, 28], k: 2, say: 32, story: 'The Red Sea is hot, dry, and receives almost no river water, so it is very salty.' },
      { name: 'the Bay of Bengal', lon: [80, 95], lat: [5, 22], k: 0, say: 80, story: 'Big rivers and monsoon rains pour fresh water into the Bay of Bengal.' },
    ],
    speech: {
      open: ["Welcome to the Earth Jukebox. This map shows how salty the ocean surface is, across the whole world.", "Colour shows salinity. Dark teal is fresher water, and pale cyan and white are the saltiest.", "First, here is what is happening in the image, from west to east."],
      listen: ["Now, how to listen. The sweep will travel from west to east, so the sound moves across the map from the Pacific, over the Americas, the Atlantic, Africa and Asia.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong.", "Fresher water is a deep hum. Water of average salinity makes gliding chords. Salty water adds a quiet timpani roll where it is strongest, and a harp where it is lighter.", "Sharp changes in salinity, which scientists call fronts, are played by a bassoon. The sharper the change, the busier the playing.", "The drums follow how salty and varied the water is. Each region plays its own drum, for example the tabla for India, the djembe for Africa, and the drum kit for North America. The more salt and change under the sweep, the faster the drums play, and over fresh, even water they fall silent.", "The sweep will now play once, from west to east, and then stop."],
    },
    how: [
      ['Left → right (longitude)', 'Time. One sweep of the globe is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'],
      ['Dark teal (fresher water)', 'A deep Sa-Pa drone.'],
      ['Mid teal (average salinity)', 'Gliding chords. The chord changes with latitude.'],
      ['Pale cyan and white (salty water)', 'A quiet timpani roll, tuned to the latitude, where the values are high, and a harp where they are lower.'],
      ['Sharp salinity fronts', 'Bassoon notes with gamakas. The sharper the change, the busier the playing.'],
      ['Percussion (data rhythm)', 'A different native drum for each region where the data is. The saltier and more varied the water under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, and a sudden jump in the data gets an accent.'],
      ['Land and ice', 'Silence, because there is no ocean data.'],
    ],
  }, SCALAR),
  Object.assign({
    id: 'density', name: 'Density', emoji: '⚖️', grid: window.DENSITY_GRID, image: 'assets/density.jpg',
    intro: 'Hear how dense the ocean surface water is (NASA SVS 3652). A playhead sweeps from west to east. Dense, heavy water hums low, medium water forms chords, light water adds quiet timpani and harp, and sharp density fronts are played by a bassoon.',
    alt: 'Global map of average sea surface density, with the land shown as a satellite photo. Colour runs from pale blue (light water) to dark navy and black (the densest water). The densest water is in the far North Atlantic, the Mediterranean and around Antarctica. The lightest water is in the warm tropics.',
    species: [
      { name: 'Dense water',  color: '#6f8fe8', sound: 'Deep humming drone', what: 'dense water' },
      { name: 'Medium density', color: '#3fa0f5', sound: 'Warm, gliding chords', what: 'medium-density water' },
      { name: 'Light water',  color: '#cfe8ff', sound: 'A quiet timpani roll where it is strong, a harp where it is light', what: 'light water' },
      { name: 'Fronts',       color: '#f0e46a', sound: 'Singing bassoon notes with gamakas', what: 'a sharp density change' },
      { name: 'Percussion',   color: '#b0b6bd', sound: "Each region's native drum. The denser and more varied the water under the sweep, the faster it plays", what: 'data rhythm' },
    ],
    load: x => x[0] + 0.5 * x[1] + x[3],               // dense water (channel 0, inverted scale) and fronts count as the strongest data
    describeValue: t => t < 0.33 ? 'The water here is among the densest in the ocean.' : t < 0.66 ? 'The water here has medium density.' : 'The water here is light.',
    quiet: 'no ocean data here (land or ice).',
    bellRoot: 26, lowRoot: 50, chords: [[50, 54, 57], [45, 50, 54], [52, 57, 59], [54, 59, 64]], droneHz: 73.42,
    legend: '<img class="legend" src="assets/ssd_cbar.png" alt="Colour key: sea surface density from 1002 kilograms per cubic metre (pale blue) to 1028 (black).">',
    hotspots: [
      { name: 'the dense, cold waters of the Southern Ocean', lon: [-180, 180], lat: [-65, -45], k: 0, say: -150, story: 'Around Antarctica, very cold water becomes dense and sinks, forming the deep bottom water that spreads through the oceans of the world.' },
      { name: 'the light, warm waters of the tropics', lon: [-180, 180], lat: [-15, 15], k: 2, say: -110, story: 'Warm tropical water is light, so it floats near the surface.' },
      { name: 'the dense North Atlantic', lon: [-50, 10], lat: [55, 75], k: 0, say: -50, story: 'In the North Atlantic, cold, salty water becomes dense and sinks, helping to drive the deep ocean circulation that carries heat around the planet.' },
      { name: 'the Mediterranean Sea', lon: [-5, 36], lat: [30, 45], k: 0, say: -5, story: 'The Mediterranean is salty and cool, so its water is dense, and it flows out through the Strait of Gibraltar into the deep Atlantic.' },
    ],
    speech: {
      open: ["Welcome to the Earth Jukebox. This map shows how dense the ocean surface water is, across the whole world. Density depends on both temperature and salt: cold, salty water is heavy, and warm, fresh water is light.", "Colour shows density. Pale blue is the lightest water, and dark navy and black are the densest.", "First, here is what is happening in the image, from west to east."],
      listen: ["Now, how to listen. The sweep will travel from west to east, so the sound moves across the map from the Pacific, over the Americas, the Atlantic, Africa and Asia.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with each region, from a hopeful form to a sad form where the data is strong.", "Dense, heavy water is a deep hum. Medium-density water makes gliding chords. Light water adds a quiet timpani roll where it is strongest, and a harp where it is lighter.", "Sharp changes in density, which scientists call fronts, are played by a bassoon. The sharper the change, the busier the playing.", "The drums follow how dense and varied the water is. Each region plays its own drum, for example the tabla for India, the djembe for Africa, and the drum kit for North America. The more dense water and change under the sweep, the faster the drums play, and over light, even water they fall silent.", "The sweep will now play once, from west to east, and then stop."],
    },
    how: [
      ['Left → right (longitude)', 'Time. One sweep of the globe is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North is high, south is low. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'],
      ['Navy and black (dense water)', 'A deep Sa-Pa drone.'],
      ['Mid blue (medium density)', 'Gliding chords. The chord changes with latitude.'],
      ['Pale blue (light water)', 'A quiet timpani roll, tuned to the latitude, where the values are high, and a harp where they are lower.'],
      ['Sharp density fronts', 'Bassoon notes with gamakas. The sharper the change, the busier the playing.'],
      ['Percussion (data rhythm)', 'A different native drum for each region where the data is. The denser and more varied the water under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers (120 bpm pulse). Quiet data means silent drums, and a sudden jump in the data gets an accent.'],
      ['Land and ice', 'Silence, because there is no ocean data.'],
    ],
  }, SCALAR),
];

// ---- Density as a video: the rotating-globe movie from SVS 3652. The sweep is the strip down the middle of the globe, read frame by frame (tools/analyse-video.html).
if (window.DENSITY_VIDEO_GRID) TRACKS.push(Object.assign({}, TRACKS.find(t => t.id === 'density'), {
  species: TRACKS.find(t => t.id === 'density').species.map(s => ({ ...s })),
  id: 'densityVideo', name: 'Density (video)', emoji: '🎞️', grid: window.DENSITY_VIDEO_GRID, video: 'assets/video/density.webm', image: null, fixedDur: 60, startLon: -90,
  lonFn: c => { const g = window.DENSITY_VIDEO_GRID, l = g.lon0 + g.rate * (c + 0.5) * g.dur / g.cols; return ((l + 180) % 360 + 360) % 360 - 180; },
  intro: 'Watch the Earth turn once in a minute, coloured by the density of the ocean surface (NASA SVS 3652), and hear the strip of ocean running down the middle of the globe. The video and the sound stay in step.',
  alt: 'A video of the Earth turning once, seen from space, with the ocean coloured by surface density: pale blue for light water, deep navy for the densest water, and the land shown as a satellite photo. The globe starts facing the Americas, then turns eastward through the Atlantic, Africa, Asia and the Pacific, and comes back to the Americas.',
  speech: {
    open: ["Welcome to the Earth Jukebox. This is a video of the Earth turning once, about every minute, with the ocean coloured by the average density of its surface. Density depends on both temperature and salt: cold, salty water is heavy, and warm, fresh water is light.", "Pale blue is the lightest water, and dark navy and black are the densest. The land is shown as a satellite photo.", "First, here is what you will see as the globe turns, starting over the Americas."],
    listen: ["Now, how to listen. The beam is the line running down the middle of the globe. As the Earth turns, the sound follows whatever passes through that line, so it travels from the Americas eastward through the Atlantic, Africa, Asia and the Pacific.", ...TRACKS.find(t => t.id === 'density').speech.listen.slice(1, -1), "The video will now play once, as the globe turns a full circle, and then stop."],
  },
  how: [['Video time', 'The globe turns once in 60 seconds. The sound follows the strip of ocean running down the middle of the globe, so it travels from the Americas eastward and around again.'], ...TRACKS.find(t => t.id === 'density').how.slice(1).map(r => r[0].startsWith('Top') ? ['Top → bottom (latitude)', 'Pitch. North is high, south is low. This is approximate, because the globe is tilted. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'] : r)],
}));


// ---- Temperature and salinity as turning-globe videos too (the same SVS 3652 movies, read the same way as the density one), and a separate El Nino page. ----
function globeVideoTrack(baseId, id, name, gridName, file, noun, colourLine, altColours) {
  const g = window[gridName], base = TRACKS.find(t => t.id === baseId); if (!g || !base) return;
  TRACKS.push(Object.assign({}, base, {
    species: base.species.map(s => ({ ...s })),
    id, name, emoji: '🎞️', grid: g, video: 'assets/video/' + file + '.webm', image: null, fixedDur: 60, startLon: -90,
    lonFn: c => { const l = g.lon0 + g.rate * (c + 0.5) * g.dur / g.cols; return ((l + 180) % 360 + 360) % 360 - 180; },
    intro: `Watch the Earth turn once in a minute, coloured by the ${noun} of the ocean surface (NASA SVS 3652), and hear the strip of ocean running down the middle of the globe. The video and the sound stay in step.`,
    alt: `A video of the Earth turning once, seen from space, with the ocean coloured by surface ${noun}: ${altColours}, and the land shown as a satellite photo. The globe starts facing the Americas, then turns eastward through the Atlantic, Africa, Asia and the Pacific, and comes back to the Americas.`,
    speech: {
      open: [`Welcome to the Earth Jukebox. This is a video of the Earth turning once, about every minute, with the ocean coloured by the average ${noun} of its surface.`, colourLine, "First, here is what you will see as the globe turns, starting over the Americas."],
      listen: ["Now, how to listen. The beam is the line running down the middle of the globe. As the Earth turns, the sound follows whatever passes through that line, so it travels from the Americas eastward through the Atlantic, Africa, Asia and the Pacific.", ...base.speech.listen.slice(1, -1), "The video will now play once, as the globe turns a full circle, and then stop."],
    },
    how: [['Video time', 'The globe turns once in 60 seconds. The sound follows the strip of ocean running down the middle of the globe, so it travels from the Americas eastward and around again.'], ...base.how.slice(1).map(r => r[0].startsWith('Top') ? ['Top → bottom (latitude)', 'Pitch. North is high, south is low. This is approximate, because the globe is tilted. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'] : r)],
  }));
}
globeVideoTrack('sst', 'sstVideo', 'Sea temperature (turning globe)', 'SST_VIDEO_GRID', 'sst', 'temperature', 'Dark blue is near freezing, then cyan, green and yellow, and red is the warmest water. The land is shown as a satellite photo.', 'dark blue for near-freezing water, through cyan and yellow, to red for the warmest water');
globeVideoTrack('sss', 'sssVideo', 'Salinity (turning globe)', 'SSS_VIDEO_GRID', 'sss', 'salinity', 'Dark teal is the freshest water, then green and yellow, and white is the saltiest. The land is shown as a satellite photo.', 'dark teal for the freshest water, through green and yellow, to white for the saltiest water');
{ const sst = TRACKS.find(t => t.id === 'sst'); TRACKS.push(Object.assign({}, sst, { species: sst.species.map(s => ({ ...s })), id: 'sstEl', name: 'Sea temperature and El Niño', emoji: '🌡️' })); }   // the same map and sound, with the El Nino layer panel (elnino.js)

// ---- El Niño 2026 (NASA SVS 5683, "Signs of El Niño in 2026"): sea surface temperature ANOMALY (how much warmer or cooler than normal) over the tropical Pacific.
//      Three records: the map of 10 October 2026, the same week of 2025, and a sweep through time from 29 January to 10 October 2026. The grids come from elnino_grids.js
//      (tools/make-elnino2026.py). The map shows only part of the world, so the tracks give their own latitude and longitude (latFn, lonFn). The mood is ranked against both years (rankWith). ----
if (window.ELNINO26_GRID && window.ELNINO25_GRID && window.ELNINO_YEAR_GRID && window.ELNINO_YEAR25_GRID && window.ELNINO_EXTENT) {
  const X = window.ELNINO_EXTENT, wrap = l => ((l + 180) % 360 + 360) % 360 - 180;
  const elSchedule = function (c, t, step, tot, cen, v) { if (deepOff !== 'only') SCALAR.schedule.call(this, c, t, step, tot, cen, v); elDeep(c, t, step); };   // the usual voices, then the two deep reds
  const anLoad = x => 0.15 * x[1] + x[2] + 1.5 * x[3];                      // data strength: warm and strongly abnormal water, not near-normal water
  const loadsOf = g => { const v = mkView(g), out = []; for (let c = 0; c < v.cols; c++) { let s = 0; for (let r = 0; r < v.rows - 2; r++) s += anLoad([0, 1, 2, 3].map(k => v.val(c, r, k))); out.push(s / (v.rows - 2)); } return out; };
  const aNames = ['Cooler than normal', 'Near normal', 'Warmer than normal', 'Strong anomalies'];
  const aSpecies = base => base.species.map((s, i) => ({ ...s, name: aNames[i] || s.name, what: ['cooler-than-normal water', 'near-normal water', 'warmer-than-normal water', 'a strong anomaly'][i] || s.what }));
  const aDescribe = t => { const a = Math.round(-4 + 8 * t); return a === 0 ? 'The surface here is close to its normal temperature.' : `The surface here is about ${Math.abs(a)} ${Math.abs(a) === 1 ? 'degree' : 'degrees'} Celsius ${a > 0 ? 'warmer' : 'cooler'} than normal (the colour bar stops at four).`; };
  const aLegend = '<img class="legend" src="assets/elnino2026/ssta_cbar.png" alt="Colour key: sea surface temperature anomaly from minus four degrees Celsius (dark blue, cooler than normal) through pale cream at zero (normal) to plus four degrees (dark red, warmer than normal).">';
  const aHow = (first, second, perc) => [first, second, ['Blue (cooler than normal)', ''], ['Pale cream (near normal)', ''], ['Orange and red (warmer than normal)', ''], ['Strong anomalies (two degrees or more, warm or cool)', ''], ['Percussion (data rhythm)', perc], ['Land', 'Silence, because there is no ocean data.']];
  const percMap = 'A native drum for each region where the data is. The warmer and more abnormal the water under the sweep, the faster the drums: crotchets, then quavers, semiquavers, and rarely demisemiquavers. Near-normal water means quiet drums, and a sudden jump gets an accent.';
  const stillBase = TRACKS.find(t => t.id === 'sst'), listenGeneric = ["Now, how to listen. The sweep will travel from west to east across the tropical Pacific, from Indonesia and New Guinea to the coast of South America.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with the region and its mood.", "That is the whole picture.", "Press Play to start the sweep."];
  const still = (id, name, image, grid, other, introHead, alt, open, hotspots) => Object.assign({}, stillBase, {
    species: aSpecies(stillBase), id, name, emoji: '🔥', grid, image, startLon: X.lon_from, lonFn: c => wrap(X.lon_from + (c + 0.5) / grid.cols * (X.lon_to - X.lon_from)),
    latFn: r => X.lat_north - (r + 0.5) * (X.lat_north - X.lat_south) / grid.rows, rankWith: () => loadsOf(other), schedule: elSchedule, load: anLoad, describeValue: aDescribe,
    intro: introHead, alt, hotspots, quiet: 'no ocean data here (land).', legend: aLegend, how: aHow(['Left → right (longitude)', 'Time. One sweep of the tropical Pacific, from Indonesia to South America, is one piece.'],
      ['Top → bottom (latitude)', 'Pitch. North (about 30 degrees) is high, south (about 23 degrees) is low. Notes snap to a scale that changes with the region the sweep is over, in its hopeful or sad form (the tonic is always D).'], percMap),
    speech: { open, listen: listenGeneric },
  });
  TRACKS.push(still('elnino26', 'El Niño, 10 October 2026', 'assets/elnino2026/oct2026.jpg', window.ELNINO26_GRID, window.ELNINO25_GRID,
    'Hear the tropical Pacific on 10 October 2026, as NASA saw it (SVS 5683): how much warmer or cooler than normal the sea surface was. A playhead sweeps from west to east.',
    'A map of the tropical Pacific Ocean on 10 October 2026, from Indonesia and New Guinea on the left to the coast of South America on the right, with the land in grey. The colour shows how much warmer or cooler than normal the sea surface is: blue is cooler, pale cream is normal, and orange to dark red is warmer. A broad band of very dark red, more than three degrees warmer than normal, runs along the equator from the middle of the Pacific to the coast of Peru and Ecuador. That is the sign of a strong El Niño. Cooler blue water lies around Indonesia and New Guinea and in a wide area south of the equator.',
    ["Welcome to the Earth Jukebox. This map shows the tropical Pacific Ocean on October tenth, two thousand and twenty-six, from NASA.", "Colour shows how much warmer or cooler than normal the sea surface is. Blue is cooler, pale cream is normal, and orange to dark red is warmer.", "First, here is what you will see, and then you will hear it."],
    [{ name: 'the warm tongue along the equator', lon: [-175, -85], lat: [-6, 6], k: 2, say: -175, story: 'A broad band of water more than three degrees warmer than normal runs along the equator. This warm tongue is the sign of El Niño. In this picture it is about as warm as the colour bar can show.' },
     { name: 'the Niño 3.4 region', lon: [-170, -120], lat: [-5, 5], k: 3, say: -170, story: 'This box, from 170 West to 120 West along the equator, is the region NOAA uses for its Niño 3.4 index. In this picture its average is about three degrees above normal, and NOAA reports a similar value for the same week.' },
     { name: 'the coast of Peru and Ecuador', lon: [-90, -78], lat: [-15, 2], k: 3, say: -90, story: 'Off Peru and Ecuador the water is at least four degrees warmer than normal in places, and the colour bar stops at four. Fishing communities there gave El Niño its name, because the warm water used to arrive around Christmas.' },
     { name: 'Indonesia and New Guinea', lon: [120, 160], lat: [-12, 8], k: 0, say: 140, story: 'Around Indonesia and New Guinea the water is cooler than normal while the eastern Pacific is very warm: the two ends of one see-saw.' }]));
  TRACKS.push(still('elnino25', 'The same week in 2025', 'assets/elnino2026/oct2025.jpg', window.ELNINO25_GRID, window.ELNINO26_GRID,
    'Hear the tropical Pacific on 10 October 2025, a year before the El Niño, as NASA saw it (SVS 5683). A playhead sweeps from west to east.',
    'A map of the tropical Pacific Ocean on 10 October 2025, from Indonesia and New Guinea on the left to the coast of South America on the right, with the land in grey. The colour shows how much warmer or cooler than normal the sea surface is: blue is cooler, pale cream is normal, and orange is warmer. Along the equator the water is patchy and a little cooler than normal, the pattern that leans towards La Niña, with a few warm spots near the coast of South America. There is no band of dark red.',
    ["Welcome to the Earth Jukebox. This map shows the tropical Pacific Ocean on October tenth, two thousand and twenty-five, a year before the El Niño, from NASA.", "Colour shows how much warmer or cooler than normal the sea surface is. Blue is cooler, pale cream is normal, and orange to dark red is warmer.", "First, here is what you will see, and then you will hear it."],
    [{ name: 'the equator in 2025', lon: [-175, -90], lat: [-6, 6], k: 0, say: -175, story: 'Along the equator the water is a little cooler than normal, in patches. This is the opposite of the warm tongue seen a year later.' },
     { name: 'the Niño 3.4 region', lon: [-170, -120], lat: [-5, 5], k: 0, say: -170, story: 'In this picture the average of the Niño 3.4 box is slightly below normal, a few tenths of a degree. NOAA reported a similar value, about minus 0.3, for the same week.' },
     { name: 'the coast of Peru', lon: [-90, -78], lat: [-15, 2], k: 2, say: -90, story: 'A few warm patches sit near the coast of Peru and Ecuador, but there is no wide band of warm water.' }]));
  const yr = TRACKS.find(t => t.id === 'year');
  TRACKS.push(Object.assign({}, yr, {
    species: aSpecies(yr), id: 'elninoYear', name: 'El Niño through 2026', emoji: '🔥', grid: window.ELNINO_YEAR_GRID, image: 'assets/elnino2026/t000.jpg', timeAxis: true, startLon: 0,
    frames: Array.from({ length: 160 }, (_, c) => 'assets/elnino2026/t' + String(Math.round(c * 60 / 159)).padStart(3, '0') + '.jpg'),
    lonFn: c => c, latFn: r => X.lat_north - (r + 0.5) * (X.lat_north - X.lat_south) / window.ELNINO_YEAR_GRID.rows, rankWith: () => loadsOf(window.ELNINO_YEAR25_GRID), schedule: elSchedule,
    regionFn: lat => lat >= 15 ? 'taiko' : lat <= -10 ? 'samba' : 'conga', load: anLoad, describeValue: aDescribe,
    headFn: (c, r) => `${dateLabel(T.grid.dates[c])}, ${fmtLat(latOf(r))} (all longitudes in the picture)`,
    intro: '', alt: 'A time-lapse of the tropical Pacific Ocean from 29 January to 10 October 2026, with Indonesia and New Guinea on the left and the coast of South America on the right, and the land in grey. The colour shows how much warmer or cooler than normal the sea surface is: blue is cooler, pale cream is normal, and orange to dark red is warmer. In January the Pacific is close to normal. Through the months a band of warm water grows along the equator from the east, and by October it is a broad band of very dark red, more than three degrees warmer than normal, reaching from the middle of the Pacific to the coast of Peru and Ecuador.',
    hotspots: [
      { name: 'late January', lon: [0, 12], lat: [-90, 90], k: 1, say: 2, story: 'In late January the equator of the Pacific is close to its normal temperature.' },
      { name: 'early April', lon: [36, 46], lat: [-90, 90], k: 2, say: 40, story: 'By early April the equator is starting to warm. In this picture the Niño 3.4 region is still under one degree above normal.' },
      { name: 'June', lon: [76, 86], lat: [-90, 90], k: 2, say: 80, story: 'By early June the warm band along the equator is clearly stronger: the Niño 3.4 region is between one and two degrees above normal.' },
      { name: 'August', lon: [115, 125], lat: [-90, 90], k: 3, say: 119, story: 'By early August the Niño 3.4 region is between two and a half and three degrees above normal, firmly in El Niño territory.' },
      { name: 'the strong El Niño of October', lon: [150, 159], lat: [-90, 90], k: 3, say: 152, story: 'By 10 October the warm band spans the equatorial Pacific and reaches the South American coast. NOAA reports the Niño 3.4 region at about three degrees above normal for that week.' }],
    speech: { open: ["Welcome to the Earth Jukebox. This record is the tropical Pacific Ocean from January twenty-ninth to October tenth, two thousand and twenty-six, from NASA, as a strong El Niño develops.", "Colour shows how much warmer or cooler than normal the sea surface is. Blue is cooler, pale cream is normal, and orange to dark red is warmer.", "First, here is what you will see, and then you will hear it."],
      listen: ["Now, how to listen. This time the sweep travels through time, not across the map. The whole of 2026 so far plays from January to October, and at every moment you hear all of the longitudes in the picture at once.", "Pitch tells you the latitude. Higher notes are further north, lower notes further south, all taken from a musical scale that changes with the region and its mood.", "That is the whole picture.", "Press Play to start the sweep."] },
    how: aHow(['Left → right (time)', 'Time. The sweep runs from 29 January to 10 October 2026, so the warm water grows as it plays.'], ['Top → bottom (latitude)', 'Pitch. North (about 30 degrees) is high, south (about 23 degrees) is low. Every latitude band is read across all longitudes in the picture.'], 'One drum for each latitude zone: taiko in the north, congas in the tropics and surdo with tamborim in the south. The warmer and more abnormal the water, the faster the drums.'),
  }));
}


// ---- Lightning (NASA SVS 5011): events, not a field. All untuned percussion, with timpani rolls where the storms are strongest. ----
const LSECT = [{ k: 0, bus: 0 }, { k: 1, bus: 1 }, { k: 3, bus: 3 }, { k: 4, bus: 4 }];      // data channel and audio bus of the four parts of the world
function lightningDrum(k, lat) {                       // which untuned drum a sector plays at this latitude
  if (k === 0) return lat > 25 ? 'kit' : lat < -25 ? 'samba' : 'conga';
  if (k === 1) return lat > 35 ? 'bodhran' : lat > 15 ? 'darbuka' : 'djembe';
  if (k === 3) return lat > 40 ? 'daf' : 'tabla';
  return lat > 25 ? 'taiko' : lat < -10 ? 'clapsticks' : 'kendang';
}
const LCOL = { 0: '#ff8a65', 1: '#d7aaff', 3: '#7dff5a', 4: '#e6ebf0', 2: '#8fe0e0' }, LB = { 0: [2.78, 38.89], 1: [41.67, 20.83], 3: [62.5, 15.28], 4: [77.78, 22.22], 2: [0, 100] };
function lit(k, r, d, t) {                              // show a strike on the map: a bar in its part of the world, at its latitude, lit at the moment it is heard
  const L = $('lightLayer'); if (!L || !A.ctx) return; const ms = Math.max(0, (t - A.ctx.currentTime) * 1000);
  setTimeout(() => {
    if (T.id !== 'lightning') return; const e = document.createElement('i'), b = LB[k], h = 100 / V.rows; e.className = 'lh';
    e.style.cssText = `left:${b[0]}%;width:${b[1]}%;top:${r * h}%;height:${h}%;background:${LCOL[k]};box-shadow:0 0 6px 0 ${LCOL[k]}`; if (k === 2) { e.style.height = '3px'; e.style.top = ((r + .5) * h) + '%'; }
    L.appendChild(e); setTimeout(() => e.remove(), 520);
  }, ms);
}
function rng32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
if (window.LIGHTNING_GRID) TRACKS.push({
  id: 'lightning', name: 'Lightning', emoji: '⚡', grid: window.LIGHTNING_GRID, image: 'assets/lightning/f000.jpg', timeAxis: true, startLon: 0, percussionOnly: true,
  frames: Array.from({ length: 160 }, (_, c) => 'assets/lightning/f' + String(c).padStart(3, '0') + '.jpg'),
  lonFn: c => c, regionFn: () => 'conga',
  headFn: (c, r) => `${dateLabel(T.grid.dates[c])}, ${fmtLat(latOf(r))} (all longitudes in the sector)`,
  intro: 'Hear lightning flashes detected from the International Space Station between March 2017 and July 2023 (NASA SVS 5011). Time runs from left to right across about six years, and every flash is a drum strike: untuned drums from each part of the world, with timpani rolls where the storms are strongest. The picture shows the flashes as yellow dots, and coloured bars light up the part of the world and the latitude of each drum you hear.',
  alt: 'A flat map of the world on a dark background with grey continents. Thousands of yellow dots mark lightning flashes seen from the International Space Station, between about 55 degrees north and 55 degrees south. They crowd over central Africa, the Americas, and South and Southeast Asia, and they swing north and south with the seasons. The picture changes through the frames, from March 2017 to July 2023.',
  species: [
    { name: 'Americas', color: '#e8765a', sound: 'Untuned drums: congas, surdo and tamborim in the tropics and south, the drum kit in the north', what: 'lightning over the Americas' },
    { name: 'Africa and Europe', color: '#c79bf0', sound: 'Untuned drums: djembe in Africa, darbuka over the Mediterranean, bodhrán in the north', what: 'lightning over Africa, Europe and the Middle East' },
    { name: 'Storm timpani', color: '#8fc1c1', sound: 'Quiet timpani rolls, only where the storms are strongest', what: 'the strongest storms' },
    { name: 'South and Central Asia', color: '#58e03a', sound: 'Untuned drums: tabla, and the daf in the far north', what: 'lightning over South and Central Asia' },
    { name: 'East Asia and Oceania', color: '#b0b6bd', sound: 'Untuned drums: taiko in the north, kendang in the tropics, clapsticks in the south', what: 'lightning over East Asia and Oceania' },
  ],
  load: x => x[2],
  speech: {
    open: ["Welcome to the Earth Jukebox. This record is lightning, flashes detected from the International Space Station from March two thousand and seventeen to July two thousand and twenty-three.", "On the map, every yellow dot is a flash. They crowd over central Africa, the Americas and South and Southeast Asia, and they swing north and south with the seasons.", "First, here is what changes through the years."],
    listen: ["Now, how to listen. This time the sweep travels through time, not across the map. About six years play from left to right, and at every moment you hear all the flashes of the world at once.", "Every flash is a drum strike. The part of the world chooses the family of drums, for example congas for the tropical Americas, djembe for Africa, tabla for South Asia and taiko for East Asia, and the latitude chooses which drum of the family. All of them are untuned.", "More flashes means more strikes, and where the storms are strongest, timpani roll as well.", "The years will now play once, and then stop."],
  },
  hotspots: [],
  quiet: 'no lightning detected here at this time (the space station sees only between about 55 degrees north and south).',
  bellRoot: 50, lowRoot: 50, chords: [[50, 54, 57], [52, 57, 59], [57, 62, 66], [54, 59, 64]], droneHz: 73.42,
  legend: '<p class="sub">Yellow dots are lightning flashes seen from the space station. More dots in a place means more flashes there.</p>',
  how: [
    ['Left → right (time)', 'Time. The sweep runs through about six years, March 2017 to July 2023, so the seasons and years go by as it plays.'],
    ['Where the flashes are', 'Each flash is a drum strike. The part of the world chooses the family of drums, and the latitude chooses which drum of the family. They are all untuned.'],
    ['How many flashes', 'More flashes under the beam means more strikes, and louder ones. Quiet times are almost silent.'],
    ['Strongest storms', 'Where the lightning is strongest, timpani roll as well, tuned to the scale of the moment.'],
    ['No flashes', 'Silence. The space station sees only between about 55 degrees north and south.'],
  ],
  schedule(c, t, step, tot, cen, v) {
    const rnd = rng32(c * 7919 + 17), cells = []; let sum = 0;
    for (const S of LSECT) for (let r = 0; r < v.rows; r++) { const d = v.val(c, r, S.k); if (d >= 0.04) { cells.push([S, r, d]); sum += d; } }
    if (!cells.length) return;
    const rank = colRank(c), n = Math.round((2 + 14 * rank) * (harmOn() ? 0.65 : 1)), slots = Math.max(2, Math.round(step / 0.0625));
    for (let i = 0; i < n; i++) {                                              // each strike lands in a cell chosen by its share of the flashes, at a random moment in this step
      let x = rnd() * sum, ch = cells[cells.length - 1]; for (const cell of cells) { x -= cell[2]; if (x <= 0) { ch = cell; break; } }
      const [S, r, d] = ch, id = lightningDrum(S.k, latOf(r)), st = INSTR[id].pat.filter(Boolean);
      const tt = t + Math.floor(rnd() * slots) * step / slots; hit(id, st[Math.floor(rnd() * st.length)], tt, 0.15 + 0.32 * d, S.bus); lit(S.k, r, d, tt);
    }
    if (rank >= 0.72 && c % 2 === 0) { strongPlay(c, t, step, rank, cen[2], v.rows); lit(2, Math.min(v.rows - 1, Math.round(cen[2])), rank, t); }       // some timpani, where the storms are strongest
  },
  explore(c, r, v) {
    const t = A.ctx.currentTime + 0.02;
    LSECT.forEach(S => { const d = v.val(c, r, S.k); if (d > 0.08) { const id = lightningDrum(S.k, latOf(r)), st = INSTR[id].pat.filter(Boolean); for (let i = 0; i < 3; i++) hit(id, st[i % st.length], t + i * 0.13, 0.2 + 0.3 * d, S.bus); lit(S.k, r, d, t); } });
    if (v.val(c, r, 2) > 0.6) strongPlay(c, t, 0.5, v.val(c, r, 2), r, v.rows);
  },
});

// ================= INSTRUMENT PALETTES =================
// Every kind of data gets its own set of instruments, so the tracks sound different as well as look different:
//   drone (voice 0), pad (voice 1, chords), high (voice 2: strong / light instrument), lead (voice 3: melody with gamakas).
const PADS = {
  strings: { name: 'warm string chords', type: 'sawtooth', spread: 7, lpMul: 1, g: 1 },
  choir:   { name: 'soft choir-like chords', type: 'sawtooth', spread: 5, lpMul: 0.8, q: 1, g: 1.15, fm: [[800, 7, 3], [1200, 6, 3]] },
  brass:   { name: 'warm brass chords', type: 'sawtooth', spread: 3, lpMul: 1.7, q: 1.2, g: 0.7 },
  organ:   { name: 'organ chords', h: n => [1, 0.8, 0.6, 0.45, 0, 0.3, 0, 0.2][n - 1] || 0, spread: 2, lpMul: 2.2, g: 0.65 },
  low:     { name: 'low, dark string chords', type: 'sawtooth', spread: 9, lpMul: 0.55, g: 1.1 },
};
const DRONES = {
  tanpura:    { name: 'a soft tanpura-like hum on Sa and Pa', t1: 'sine', t2: 'triangle', ratio: 1.5, lp: 3000, g: 1 },
  pedal:      { name: 'a deep organ-pedal tone with its octave', t1: 'triangle', t2: 'sine', ratio: 2, lp: 800, g: 1.2 },
  didgeridoo: { name: 'a buzzing didgeridoo-like drone', t1: 'sawtooth', t2: 'sawtooth', ratio: 1.007, lp: 380, q: 3, g: 0.45 },
};
const STRONG_NAME = { timpani: 'a quiet timpani roll', marimba: 'a soft marimba roll', vibes: 'a gentle vibraphone trill', gong: 'a slow, quiet gong swell' };
const LIGHT_NAME = { harp: 'a harp arpeggio', celesta: 'a celesta sparkle', kalimba: 'a kalimba melody', glass: 'a few glass bell notes' };
const LEAD_NAME = { bassoon: 'a bassoon', clarinet: 'a clarinet', cello: 'a cello', flute: 'a flute', oboe: 'an oboe', horn: 'a French horn' };
const PALETTE = {
  aerosols:      { lead: 'clarinet', pad: 'strings', drone: 'tanpura',    strong: 'gong',    light: 'kalimba' },
  ocean:         { lead: 'cello',    pad: 'choir',   drone: 'pedal',      strong: 'marimba', light: 'harp' },
  sst:           { lead: 'flute',    pad: 'brass',   drone: 'didgeridoo', strong: 'vibes',   light: 'celesta' },
  sss:           { lead: 'oboe',     pad: 'organ',   drone: 'tanpura',    strong: 'marimba', light: 'glass' },
  density:       { lead: 'bassoon',  pad: 'low',     drone: 'pedal',      strong: 'timpani', light: 'harp' },
  densityVideo:  { lead: 'bassoon',  pad: 'low',     drone: 'pedal',      strong: 'timpani', light: 'harp' },
  year:          { lead: 'horn',     pad: 'strings', drone: 'tanpura',    strong: 'marimba', light: 'kalimba' },
};
// what each voice stands for in each track (used to write the on-screen and spoken explanations), and which row of the "how" table describes it
const PALETTE_TEXT = {
  aerosols: { names: ['Smoke from fires', 'Lilac dust', 'Sea salt', 'Green sulfate haze'], how: [6, 4, 5, 3], extra0: ' and fire-like crackles' },
  ocean:    { names: ['Cold water', 'Mild water', 'Warm water', 'Swirling, tangled currents'], how: [2, 3, 4, 5] },
  sst:      { names: ['Cold water', 'Mild water', 'Warm water', 'Sharp temperature fronts'], how: [2, 3, 4, 5] },
  sss:      { names: ['Fresher water', 'Water of average salinity', 'Salty water', 'Sharp salinity fronts'], how: [2, 3, 4, 5] },
  density:  { names: ['Dense, heavy water', 'Medium-density water', 'Light water', 'Sharp density fronts'], how: [2, 3, 4, 5] },
  densityVideo: { names: ['Dense, heavy water', 'Medium-density water', 'Light water', 'Sharp density fronts'], how: [2, 3, 4, 5] },
  year:     { names: ['Cold water', 'Mild water', 'Warm water', 'Swirling, tangled currents'], how: [2, 3, 4, 5] },
};
PALETTE.lightning = { lead: 'bassoon', pad: 'low', drone: 'pedal', strong: 'timpani', light: 'harp' };
PALETTE.elnino26 = PALETTE.elnino25 = PALETTE.elninoYear = { lead: 'cello', pad: 'brass', drone: 'pedal', strong: 'timpani', light: 'celesta' };   // El Niño 2026: a cello leads the strong anomalies, brass chords and timpani rolls as the water warms
PALETTE_TEXT.elnino26 = PALETTE_TEXT.elnino25 = PALETTE_TEXT.elninoYear = { names: ['Cooler than normal', 'Near normal', 'Warmer than normal', 'Strong anomalies'], how: [2, 3, 4, 5] };
PALETTE.sstVideo = PALETTE.sstEl = PALETTE.sst; PALETTE.sssVideo = PALETTE.sss; PALETTE_TEXT.sstVideo = PALETTE_TEXT.sstEl = PALETTE_TEXT.sst; PALETTE_TEXT.sssVideo = PALETTE_TEXT.sss;
Object.keys(PALETTE).forEach(id => { const tr = TRACKS.find(t => t.id === id); if (tr) tr.instruments = PALETTE[id]; });
// Per-track voice balance [drone, chords, high, lead, drums], set from offline renders (A-weighted levels, see PROCESS.md). Multipliers on the global TRIM.
const TRIMS = { ocean: [4.64, 1.55, 1.33, 1.86, 1.9], year: [4.64, 1.55, 1.33, 1.86, 1.9], aerosols: [5.0, 4.58, 4.74, 0.44, 3.58], sst: [2.86, 2.17, 0.75, 0.43, 3.64], sss: [5.0, 5.73, 1.38, 0.58, 4.27], density: [1.46, 1.34, 1.05, 1.5, 3.82], densityVideo: [2.39, 1.18, 1.1, 3.39, 5.13] };
TRIMS.lightning = [3.2, 3.2, 2.2, 3.2, 1.9];
TRIMS.elnino26 = [1.76, 1.57, 1.31, 0.3, 3.52]; TRIMS.elnino25 = [2.67, 1.33, 1.16, 0.43, 4.1]; TRIMS.elninoYear = [0.84, 1.04, 1.46, 0.29, 1.53];   // measured offline for the cello / brass / pedal / timpani / celesta palette (A-weighted, see PROCESS.md)
TRIMS.sstVideo = TRIMS.sstEl = TRIMS.sst; TRIMS.sssVideo = TRIMS.sss;
Object.keys(TRIMS).forEach(id => { const tr = TRACKS.find(t => t.id === id); if (tr) tr.trim = TRIMS[id]; });
// The same balance for the MuseScore instrument sounds (source "samples"): each voice re-measured offline and scaled to the same A-weighted targets (see PROCESS.md).
const TRIMS_S = { ocean: [1.34, 0.30, 0.93, 1.64, 1.9], year: [1.34, 0.30, 0.93, 1.64, 1.9], aerosols: [2.6, 1.66, 2.12, 1.12, 3.58], sst: [2.35, 0.27, 0.31, 0.87, 3.64], sss: [1.33, 0.99, 0.68, 0.79, 4.27], density: [0.44, 0.27, 1.14, 1.34, 3.82], densityVideo: [0.74, 0.24, 1.68, 2.79, 5.13] };
TRIMS_S.lightning = TRIMS.lightning;
TRIMS_S.elnino26 = [0.31, 0.2, 0.52, 1.14, 3.35]; TRIMS_S.elnino25 = [0.35, 0.16, 0.52, 1.62, 4.2]; TRIMS_S.elninoYear = [0.19, 0.13, 0.51, 0.79, 1.47];
TRIMS_S.sstVideo = TRIMS_S.sstEl = TRIMS_S.sst; TRIMS_S.sssVideo = TRIMS_S.sss;
Object.keys(TRIMS_S).forEach(id => { const tr = TRACKS.find(t => t.id === id); if (tr) tr.trimS = TRIMS_S[id]; });
const INTRO_HEAD = {
  aerosols: 'Hear a NASA aerosol map of Earth (August 19, 2025). A playhead sweeps the globe from west to east and turns what it finds into music.',
  ocean: "Hear the ocean surface on 19 June 2007, from NASA's ECCO2 model (SVS 3912). The flow lines are the currents and their colour is the temperature. A playhead sweeps from west to east.",
  sst: 'Hear the average temperature of the ocean surface (NASA SVS 3652). A playhead sweeps from west to east.',
  sss: 'Hear how salty the ocean surface is (NASA SVS 3652). A playhead sweeps from west to east.',
  density: 'Hear how dense the ocean surface water is (NASA SVS 3652). A playhead sweeps from west to east.',
  year: 'Hear a year of the ocean, March 2007 to March 2008 (NASA SVS 3912, from the ECCO2 model). The flow lines are the currents and their colour is the temperature. The sweep runs through time, and the pitch is latitude.',
  densityVideo: 'Watch the Earth turn once in a minute, coloured by the density of the ocean surface (NASA SVS 3652), and hear the strip of ocean running down the middle of the globe. The video and the sound stay in step.',
};
INTRO_HEAD.sstEl = 'Hear the average temperature of the ocean surface (NASA SVS 3652), with an El Niño layer: how much warmer or cooler than normal it was in a chosen month. A playhead sweeps from west to east.';
INTRO_HEAD.elnino26 = 'Hear the tropical Pacific on 10 October 2026, as NASA saw it (SVS 5683): how much warmer or cooler than normal the sea surface was. A playhead sweeps from west to east.';
INTRO_HEAD.elnino25 = 'Hear the tropical Pacific on 10 October 2025, a year before the El Niño, as NASA saw it (SVS 5683). A playhead sweeps from west to east.';
INTRO_HEAD.elninoYear = 'Hear the tropical Pacific from 29 January to 10 October 2026 as a strong El Niño develops (NASA SVS 5683). The sweep runs through time, and the pitch is latitude.';
INTRO_HEAD.sstVideo = 'Watch the Earth turn once in a minute, coloured by the temperature of the ocean surface (NASA SVS 3652), and hear the strip of ocean running down the middle of the globe. The video and the sound stay in step.';
INTRO_HEAD.sssVideo = 'Watch the Earth turn once in a minute, coloured by the salinity of the ocean surface (NASA SVS 3652), and hear the strip of ocean running down the middle of the globe. The video and the sound stay in step.';
function applyPaletteText(tr) {                       // rewrite the instrument wording of a track from its palette, so the text always matches the sound
  const P = tr.instruments, X = PALETTE_TEXT[tr.id]; if (!P || !X) return;
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const d = DRONES[P.drone].name, p = PADS[P.pad].name, hs = `${STRONG_NAME[P.strong]} where it is strong and ${LIGHT_NAME[P.light]} where it is light`, l = LEAD_NAME[P.lead];
  const plural = /fronts|eddies|currents|anomalies/i.test(X.names[3]), ex = X.extra0 || '';
  tr.species[0].sound = cap1(d) + ex; tr.species[1].sound = cap1(p) + ' that change with latitude'; tr.species[2].sound = cap1(hs); tr.species[3].sound = `Singing ${l.replace(/^an? /, '')} notes with gamakas`;
  const rowText = [cap1(d) + ex + '.', cap1(p) + ', changing with latitude.', cap1(hs) + ', tuned to the latitude.', `Notes on ${l} with gamakas. The stronger the signal, the busier the playing.`];
  X.how.forEach((idx, k) => { if (tr.how[idx]) tr.how[idx] = [tr.how[idx][0], rowText[k]]; });
  const s = [`${X.names[0]} is ${d}${ex}.`, `${X.names[1]} makes ${p}.`, `${X.names[2]} adds ${hs}.`, `${X.names[3]} ${plural ? 'are' : 'is'} played by ${l}.`];
  const ls = tr.speech.listen; tr.speech.listen = [ls[0], ls[1], ...s.slice(0, 3), s[3] + ' The stronger the signal, the busier the playing.', ls[ls.length - 2], ls[ls.length - 1]];
  tr.intro = INTRO_HEAD[tr.id] + ' ' + s.join(' ');
}
function applyPalette() {                             // set the continuous voices (pad and drone) to this track's instruments
  if (!A || !T.instruments) return;
  const P = T.instruments, pk = PADS[P.pad], dk = DRONES[P.drone];
  A.padOscs.forEach((o, i) => { if (pk.h) o.setPeriodicWave(getWave('pad-' + P.pad, pk.h, A.ctx)); else o.type = pk.type; o.detune.value = (i - 1) * pk.spread; });
  A.padLP.Q.value = pk.q || 0.7; A.padMul = pk.lpMul; A.padScale = pk.g;
  [A.pf1, A.pf2].forEach((f, i) => { const fm = (pk.fm || [])[i]; f.frequency.value = fm ? fm[0] : 1000; f.Q.value = fm ? fm[2] : 1; f.gain.value = fm ? fm[1] : 0; });
  A.d1.type = dk.t1; A.d2.type = dk.t2; A.droneLP.frequency.value = dk.lp; A.droneLP.Q.value = dk.q || 0.7; A.droneRatio = dk.ratio; A.droneScale = dk.g;
}
TRACKS.forEach(applyPaletteText);
// El Niño 2026: the two deep reds (see elDeep) are described here, after the palette wording is written, so the screen, the speech and Hear Me all mention them.
['elnino26', 'elnino25', 'elninoYear'].forEach(id => {
  const tr = TRACKS.find(t => t.id === id); if (!tr) return;
  const map = id !== 'elninoYear', bass = 'Where the water is medium-dark red (2.5 to 3.5 degrees above normal), a low, dark double bass chord plays', rum = 'where it is almost black-red (3.5 degrees and above), a low timpani roll and rumble play. Both get louder the more black-red there is' + (map ? ', and they die away at the coast of Central and South America' : '');
  tr.species[1].sound += '. ' + bass;
  tr.species[4].sound += '. ' + rum.charAt(0).toUpperCase() + rum.slice(1);
  if (tr.how[3]) tr.how[3][1] += ' ' + bass + '.';
  if (tr.how[6]) tr.how[6][1] += ' ' + rum.charAt(0).toUpperCase() + rum.slice(1) + '.';
  tr.speech.listen.splice(tr.speech.listen.length - 2, 0, bass + '.', rum.charAt(0).toUpperCase() + rum.slice(1) + '.');
  tr.intro += ' ' + bass + ', and ' + rum + '.';
});

// ================= STATE / VIEW =================
let T = TRACKS[0], V = null;                       // current track and its grid view
const mkView = g => ({ cols: g.cols, rows: g.rows, mean: (c, r) => g.mean ? g.mean[r * g.cols + c] / 255 : 0, cov: (c, r) => g.cov ? g.cov[r * g.cols + c] / 255 : 1, val: (c, r, k) => k === 4 ? g.land[r * g.cols + c] / 255 : g.data[((r * g.cols + c) * 4) + k] / 255 });
const HELP0 = $('help').textContent;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateLabel = iso => { const d = new Date(iso.replace('Z', ':00Z')); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const lonOf = c => T.lonFn ? T.lonFn(c) : -180 + (c + 0.5) / V.cols * 360;
const latOf = r => T.latFn ? T.latFn(r) : 90 - (r + 0.5) / V.rows * 180;       // a track that shows only part of the world (El Niño 2026) gives its own latitude rows
const fmtLon = l => Math.abs(Math.round(l)) + '°' + (l < 0 ? 'W' : 'E');
const fmtLat = l => Math.abs(Math.round(l)) + '°' + (l < 0 ? 'S' : 'N');
const word = v => v > .66 ? 'strong' : v > .33 ? 'moderate' : 'faint';
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const MOHANAM = [0, 2, 4, 7, 9];                 // Sa Ri2 Ga3 Pa Dha2 (Sa = D)

// ================= REGIONAL SCALES AND EMOTION =================
// The tonic stays D everywhere, but the scale changes with the region the sweep is passing over, and each region has a hopeful ("calm")
// and a troubled ("sad") form. Which form plays depends on the data: where the data is strong (lots of smoke, warm water ...) the music
// turns to the troubled form, and where it is strongest and rising it becomes urgent (a heartbeat and a tense, repeating figure).
// Keys are the drum-region ids (regionAt), so scales and drums always change together. 'ocean' is used for the Year track and the open sea.
const SCALES = {
  kit:        { place: 'North America',                     calm: ['Ionian (major)', [0, 2, 4, 5, 7, 9, 11]],               sad: ['Aeolian (natural minor)', [0, 2, 3, 5, 7, 8, 10]] },
  conga:      { place: 'Central America and the Caribbean', calm: ['Lydian', [0, 2, 4, 6, 7, 9, 11]],                       sad: ['Lydian with a minor third', [0, 2, 3, 6, 7, 9, 11]], thirds: true },
  samba:      { place: 'South America',                     calm: ['Lydian', [0, 2, 4, 6, 7, 9, 11]],                       sad: ['Lydian with a minor third', [0, 2, 3, 6, 7, 9, 11]], thirds: true },
  bodhran:    { place: 'Europe',                            calm: ['Mixolydian (a major Dorian)', [0, 2, 4, 5, 7, 9, 10]],  sad: ['Dorian', [0, 2, 3, 5, 7, 9, 10]] },
  djembe:     { place: 'Africa',                            calm: ['Aeolian dominant (a major Aeolian)', [0, 2, 4, 5, 7, 8, 10]], sad: ['Aeolian', [0, 2, 3, 5, 7, 8, 10]] },
  darbuka:    { place: 'the Middle East and North Africa',  calm: ['Phrygian dominant (a major-third Locrian)', [0, 1, 4, 5, 7, 8, 10]], sad: ['Locrian', [0, 1, 3, 5, 6, 8, 10]] },
  tabla:      { place: 'India',                             calm: ['Mayamalavagowla', [0, 1, 4, 5, 7, 8, 11]],              sad: ['Hanumatodi (the minor-third form)', [0, 1, 3, 5, 7, 8, 10]] },
  taiko:      { place: 'East Asia',                         calm: ['Major pentatonic', [0, 2, 4, 7, 9]],                    sad: ['Minor pentatonic', [0, 3, 5, 7, 10]] },
  kendang:    { place: 'Southeast Asia',                    calm: ['Slendro-like pentatonic', [0, 2, 5, 7, 9]],             sad: ['Pelog-like', [0, 1, 3, 7, 8]] },
  daf:        { place: 'Russia and Central Asia',           calm: ['Dorian with a raised fourth', [0, 2, 3, 6, 7, 9, 10]],  sad: ['Hungarian minor', [0, 2, 3, 6, 7, 8, 11]] },
  clapsticks: { place: 'Australia and Oceania',             calm: ['Lydian dominant', [0, 2, 4, 6, 7, 9, 10]],              sad: ['Blues', [0, 3, 5, 6, 7, 10]] },
  ocean:      { place: 'the open ocean',                    calm: ['Mohanam', MOHANAM],                                     sad: ['Hindolam (the Carnatic minor pentatonic)', [0, 3, 5, 8, 10]] },
};
const FIXED_SCALE = { deg: MOHANAM, name: 'Mohanam', place: '', reg: 'ocean', thirds: false, trb: false };
const mod = (a, n) => ((a % n) + n) % n;
let SCALE = FIXED_SCALE;                                  // the scale of the column being scheduled (set by setScaleFor)
const EMO = { troubled: false, urgent: 0, concern: 0 };
const regionsOn = () => !$('emo') || $('emo').checked;
const scNote = (root, i) => { const d = SCALE.deg, n = d.length; return root + 12 * Math.floor(i / n) + d[mod(i, n)]; };   // the i-th note of the current scale above the root
const scSpan = base => Math.round(base * SCALE.deg.length / 5);       // a span written for a 5-note scale, stretched to cover the same octaves in this one
const bellMidi = (T, r, v, up = 0) => { const L = T.instruments && LEADS[T.instruments.lead], root = L ? L.root : T.bellRoot, span = L ? L.span : 13; const i = Math.round((v.rows - 1 - r) / (v.rows - 1) * scSpan(span)) + up; return scNote(root, i); };
const lowMidi = (T, r, v) => { const i = Math.round((v.rows - 1 - r) / (v.rows - 1) * scSpan(9)); return scNote(T.lowRoot, i); };
// ================= HARMONY (the "Harmonious mode" box) =================
// Fewer notes, and every pitched voice agrees with one chord at a time. The chord changes only at the start of a bar (two seconds), it is always a plain
// consonant triad (a root, a major or minor third, and a perfect fifth) built on a root that sits well with the tonic D, and the lead and high voices
// land on that chord's notes (the lead may pass through other scale notes between beats, unless they would clash). The scale and the mood also change
// only at the start of a bar, the drone drops its fifth for an octave when the scale has no perfect fifth, and the drums, melody and sparkles are thinned.
const harmOn = () => !$('harm') || $('harm').checked;
let curBar = -1, barChord = null, heldBarFor = -2, heldReg = null, heldTrb = false, lastLeadT = -9, lastPluckT = -9;
function holdFor(reg, trb) {                               // scale and mood: new values only count from the start of the next bar
  if (!harmOn() || curBar < 0) return [reg, trb];
  if (heldBarFor !== curBar) { heldBarFor = curBar; heldReg = reg; heldTrb = trb; }
  return [heldReg, heldTrb];
}
const dist12 = (a, b) => { const d = (((a - b) % 12) + 12) % 12; return Math.min(d, 12 - d); };
const dronePcs = () => { const r = A ? droneRatio() : 1.5; return (r > 1.4 && r < 1.6) ? [2, 9] : [2]; };         // the drone sounds D, and A too if it has a fifth
function harmChord(k) {                                    // a consonant triad for latitude band k: I, V, IV or vi-ish, whichever the scale has and the drone allows
  const has = pc => SCALE.deg.includes(((pc % 12) + 12) % 12), prefs = [[0], [7, 5, 0], [5, 7, 0], [9, 8, 10, 3, 4, 0]][Math.max(0, Math.min(3, k))];
  const drone = dronePcs(), safe = pc => drone.every(d => { const x = dist12(pc, d); return x !== 1 && x !== 6; });     // not a semitone or a tritone from the drone
  const rootPc = prefs.find(p => has(p) && safe(p + 2)) || 0, maj = has(rootPc + 4), min = has(rootPc + 3);
  const third = (maj && min) ? (SCALE.trb ? 3 : 4) : maj ? 4 : min ? 3 : (SCALE.trb ? 3 : 4), R = 50 + (rootPc > 6 ? rootPc - 12 : rootPc);
  const keep = [R], extra = [R + third, R + 7].filter(n => safe(n));                                   // a chord note that would clash with the drone is left out
  const notes = keep.concat(extra); while (notes.length < 3) notes.push(R + 12 * notes.length);      // fill with octaves of the root, so there are always three
  const all = [...new Set(notes.map(n => ((n % 12) + 12) % 12))];
  return { notes: notes.slice(0, 3), all, safe: all.filter(safe), drone };
}
function chordSnap(m, onlyIfClash) {                       // land a note on a chord tone (or, with onlyIfClash, only move it if it would clash)
  if (!harmOn() || !barChord || curBar < 0) return m;
  const mr = Math.round(m), pc = ((mr % 12) + 12) % 12, B = barChord;
  const clashes = p => B.all.concat(B.drone).some(q => { const x = dist12(p, q); return x === 1 || x === 6; });
  if (onlyIfClash) { if (!clashes(pc)) return m; } else if (B.safe.includes(pc)) return m;
  const pool = B.safe.length ? B.safe : B.all; let best = mr, bd = 99;
  for (let d = -6; d <= 6; d++) if (pool.includes((((mr + d) % 12) + 12) % 12) && Math.abs(d) < bd) { bd = Math.abs(d); best = mr + d; }
  return best;
}
const droneRatio = () => (harmOn() && A.droneRatio > 1.4 && A.droneRatio < 1.6 && !SCALE.deg.includes(7)) ? 2 : A.droneRatio;      // a fifth only if the scale has one
function chordFor(k) {
  if (harmOn()) {
    const key = SCALE.name + (SCALE.trb ? "s" : "c");
    if (curBar < 0 || !barChord || barChord.bar !== curBar || barChord.key !== key) barChord = Object.assign({ bar: curBar, key }, harmChord(k));
    return barChord.notes;
  }                                    // the pad chord for latitude band k (0..3), built on the current scale
  const n = SCALE.deg.length, j = [0, 1, Math.round(n * 0.6), Math.round(n * 0.4)][k], R = scNote(50, j);
  if (SCALE.thirds) return [R, R + (SCALE.trb ? 3 : 4), R + 7];                 // Latin America: chords of major thirds, or minor thirds when troubled
  return n >= 7 ? [R, scNote(50, j + 2), scNote(50, j + 4)] : [R, scNote(50, j + 2), scNote(50, j + 3)];
}
const colMoodOverride = c => (window.EJ_elnino && window.EJ_elnino.active() && window.EJ_elnino.mood(c)) || null;
function setScaleFor(c, r) {                              // choose the scale and mood for column c (and, when clicking, the region of row r)
  if (!regionsOn() || !V.emo) { SCALE = FIXED_SCALE; EMO.troubled = false; EMO.urgent = 0; EMO.concern = 0; return SCALE; }
  const e = V.emo, reg0 = (r != null && !T.timeAxis && V.reg && V.reg[r * V.cols + c]) || e.reg[c];
  const ov = colMoodOverride(c), trb0 = ov ? ov.trb : !!e.tro[c], held = (r != null) ? [reg0, trb0] : holdFor(reg0, trb0), reg = held[0], trb = held[1], def = SCALES[reg] || SCALES.ocean, pick = trb ? def.sad : def.calm;     // the El Nino layer, when on, decides the mood from the anomaly
  SCALE = { deg: pick[1], name: pick[0], place: def.place, reg, thirds: !!def.thirds, trb };
  EMO.troubled = trb; EMO.urgent = ov ? ov.urg : e.urg[c]; EMO.concern = e.con[c];
  return SCALE;
}
function computeEmotion() {                               // per column: how troubled the data is, whether it is urgent, and which region's scale applies
  const n = V.cols, con = new Float32Array(n), urg = new Float32Array(n), tro = [], reg = [], raw = [];
  for (let c = 0; c < n; c++) raw.push(colRank(c));
  for (let c = 0; c < n; c++) { let s = 0, k = 0; for (let d = -2; d <= 2; d++) { const x = raw[c + d]; if (x !== undefined) { s += x; k++; } } con[c] = s / k; }
  let tr = false;
  for (let c = 0; c < n; c++) {
    if (!tr && con[c] >= 0.6) tr = true; else if (tr && con[c] < 0.5) tr = false; tro.push(tr);            // some hysteresis, so the mood does not flicker
    const jump = c > 0 && colLoad[c] - colLoad[c - 1] > accentThr;
    urg[c] = Math.max(Math.max(0, (con[c] - 0.8) / 0.2), tr && jump ? 0.55 : 0);
  }
  let prev = 'ocean';
  for (let c = 0; c < n; c++) {
    if (T.timeAxis) { reg.push('ocean'); continue; }
    const w = {}; let best = null, bw = 0;
    for (let d = -2; d <= 2; d++) { if (c + d < 0 || c + d >= n) continue; const id = speedOf(c + d) ? dominantRegion(c + d) : null; if (id) { w[id] = (w[id] || 0) + 1; if (w[id] > bw) { bw = w[id]; best = id; } } }
    prev = best || prev; reg.push(prev);
  }
  V.emo = { con, urg, tro, reg };
}

// ================= AUDIO ENGINE =================
// Per-voice level trim: timpani and harp (bus 2) a little under the rest, land percussion (bus 4) much louder.
const TRIM = [1, 1, 0.8, 1, 2.4];
const busGain = k => TRIM[k] * ((T && T.trim) ? ((sampleOn() && T.trimS) ? T.trimS[k] : T.trim[k]) : 1);    // T.trimS: the balance used with the MuseScore instrument sounds
let A = null;
const meters = [];
function initAudio(ctxIn) {
  if (A) return A;
  const ctx = ctxIn || new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain(); master.gain.value = $('vol').value / 100 * 0.95;
  const comp = ctx.createDynamicsCompressor();
  const dry = ctx.createGain(), wet = ctx.createGain(); wet.gain.value = 0.35;
  const verb = ctx.createConvolver();
  const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
  verb.buffer = ir;
  const mix = ctx.createGain();
  mix.connect(dry); mix.connect(verb); verb.connect(wet);
  const gate = ctx.createGain(); gate.gain.value = 1;          // hard mute switch, separate from the volume slider
  const limiter = ctx.createDynamicsCompressor(); limiter.threshold.value = -9; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.003; limiter.release.value = 0.15;   // catches drum peaks so nothing clips
  dry.connect(comp); wet.connect(comp); comp.connect(limiter); limiter.connect(gate); gate.connect(master); master.connect(ctx.destination);
  const live = ctx.createGain(); live.gain.value = 1; live.connect(mix);          // all live voices pass through here; the MuseScore-composition source turns it down while it plays
  const bus = [0, 1, 2, 3, 4].map(k => { const g = ctx.createGain(); g.gain.value = meters[k] && !meters[k].cb.checked ? 0 : busGain(k); g.connect(live); return g; });
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  const padGain = ctx.createGain(); padGain.gain.value = 0;
  const padLP = ctx.createBiquadFilter(); padLP.type = 'lowpass'; padLP.frequency.value = 900;
  const pf1 = ctx.createBiquadFilter(), pf2 = ctx.createBiquadFilter(); pf1.type = pf2.type = 'peaking'; pf1.gain.value = pf2.gain.value = 0;   // vowel-like formants, used by the choir pad
  padLP.connect(pf1); pf1.connect(pf2); pf2.connect(padGain); padGain.connect(bus[1]);
  const padOscs = [0, 1, 2].map(i => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 146.8; o.detune.value = (i - 1) * 7;
    const g = ctx.createGain(); g.gain.value = 0.12; o.connect(g); g.connect(padLP); o.start(); return o;
  });
  const saltSrc = ctx.createBufferSource(); saltSrc.buffer = nb; saltSrc.loop = true;
  const saltBP = ctx.createBiquadFilter(); saltBP.type = 'bandpass'; saltBP.frequency.value = 700; saltBP.Q.value = 0.7;
  const saltGain = ctx.createGain(); saltGain.gain.value = 0;
  const swell = ctx.createOscillator(), swellAmt = ctx.createGain(); swell.frequency.value = 0.13; swellAmt.gain.value = 250;
  swell.connect(swellAmt); swellAmt.connect(saltBP.frequency); swell.start();
  saltSrc.connect(saltBP); saltBP.connect(saltGain); saltGain.connect(bus[2]); saltSrc.start();
  const d1 = ctx.createOscillator(); d1.type = 'sine'; d1.frequency.value = 73.42;
  const d2 = ctx.createOscillator(); d2.type = 'triangle'; d2.frequency.value = 73.9;
  const droneGain = ctx.createGain(); droneGain.gain.value = 0;
  const droneLP = ctx.createBiquadFilter(); droneLP.type = 'lowpass'; droneLP.frequency.value = 3000;
  d1.connect(droneLP); d2.connect(droneLP); droneLP.connect(droneGain); droneGain.connect(bus[0]); d1.start(); d2.start();

  A = { ctx, master, gate, mix, live, music: null, score: null, bus, nb, padGain, padOscs, padLP, pf1, pf2, saltGain, saltBP, droneGain, droneLP, d1, d2, padMul: 1, padScale: 1, droneRatio: 1.5, droneScale: 1 };
  applyPalette();
  return A;
}
// continuous-voice setters
function pad(t, chord, gain, lp) {
  if (gain > 0.001) chord.slice(0, 3).forEach(m => noteLog(1, t, m, 0.5));          // sheet music
  if (sampleOn() && SM.buf) { padSample(t, chord, gain, lp); return; }
  A.padOscs.forEach((o, i) => o.frequency.setTargetAtTime(mtof(chord[i]), t, 0.4));
  A.padGain.gain.setTargetAtTime(gain * A.padScale, t, 0.35); A.padLP.frequency.setTargetAtTime(lp * A.padMul * (EMO.troubled ? 0.7 : 1), t, 0.3);
}
// ---- The "high" voice (bus 2). Where the data is strong it plays a quiet rolled/struck instrument, where it is light a plucked or struck melody.
//      Which instruments those are depends on the track: strong = timpani | marimba | vibes | gong, light = harp | celesta | kalimba | glass. ----
const TIMP = [38, 40, 42, 45, 47, 50, 52, 54, 57];   // Mohanam notes (Sa = D) inside the timpani's range, D2 to A3
const MARIM = [50, 52, 54, 57, 59, 62, 64, 66, 69];  // D3 to A4
let timpFreq = null;                                  // where the drum is currently tuned, so the pitch glides from one column to the next
const latIdx = (row, rows, top) => Math.round((rows - 1 - row) / (rows - 1) * scSpan(top));          // north = high note
function timpStrike(t, f, from, gain) {               // one soft mallet stroke on a tuned drum head
  if (sampleOn() && SM.buf) { samplePlay('timpani', 69 + 12 * Math.log2(f / 440), t, 0.3, gain * 1.6, A.bus[2], { rel: 0.25, att: 0.004 }); return; }
  const { ctx, bus, nb } = A, g = ctx.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  [[1, 1, 0.7], [1.5, 0.45, 0.45], [2, 0.3, 0.3], [2.44, 0.14, 0.2]].forEach(([m, a, d]) => {    // timpani partials are not quite harmonic
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(from * m, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.09);
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.02);
  });
  const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain();          // the muffled thud of the mallet
  lp.type = 'lowpass'; lp.frequency.value = 450; ng.gain.setValueAtTime(gain * 0.5, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  s.buffer = nb; s.connect(lp); lp.connect(ng); ng.connect(g); s.start(t, Math.random() * 1.5, 0.06);
  g.connect(bus[2]);
}
function barStrike(t, f, gain, ring, trem) {          // a struck wooden or metal bar: marimba (short, woody) or vibraphone (long, with a slow tremolo)
  if (sampleOn() && SM.buf) { samplePlay(trem ? 'vibes' : 'marimba', 69 + 12 * Math.log2(f / 440), t, trem ? Math.min(ring, 0.9) : 0.35, gain * 1.6, A.bus[2], { rel: trem ? 0.4 : 0.2, att: 0.003 }); return; }
  const { ctx, bus, nb } = A, g = ctx.createGain();
  g.gain.setValueAtTime(gain * (trem ? 0.6 + 0.4 * Math.sin(2 * Math.PI * 5.5 * t) ** 2 : 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + ring);
  (trem ? [[1, 1, 1], [4, 0.25, 0.5], [10, 0.08, 0.15]] : [[1, 1, 1], [4, 0.35, 0.18], [10, 0.1, 0.06]]).forEach(([m, a, d]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f * m;
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + ring * d + 0.03); o.connect(og); og.connect(g); o.start(t); o.stop(t + ring * d + 0.06);
  });
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain();          // the mallet tap
  bp.type = 'bandpass'; bp.frequency.value = trem ? 2500 : 1500; bp.Q.value = 1.5; ng.gain.setValueAtTime(gain * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  s.buffer = nb; s.connect(bp); bp.connect(ng); ng.connect(g); s.start(t, Math.random() * 1.5, 0.04);
  g.connect(bus[2]);
}
function gongSwell(t, f, gain, long) {                // a quiet tam-tam: inharmonic partials that swell in slowly and fade
  const { ctx, bus } = A, g = ctx.createGain(), d = long ? 3.2 : 1.8;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.5); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  [[1, 1], [1.47, 0.6], [2.09, 0.4], [2.57, 0.25], [3.1, 0.15]].forEach(([m, a]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f * m; og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.05);
  });
  g.connect(bus[2]);
}
const PLUCK = {                                       // partial = [multiple, strength, seconds]
  harp:    { parts: [[1, 1, 1.9], [2, 0.5, 1.2], [3, 0.28, 0.8], [4, 0.16, 0.5], [5, 0.08, 0.35]], reg: 62, click: 0.15 },
  celesta: { parts: [[1, 1, 1.5], [3, 0.45, 0.8], [4, 0.3, 0.55], [6, 0.2, 0.3]], reg: 74, click: 0.05 },
  kalimba: { parts: [[1, 1, 0.9], [5.4, 0.35, 0.3], [9.5, 0.12, 0.15]], reg: 62, click: 0.25 },
  glass:   { parts: [[1, 1, 2.4], [2.7, 0.45, 1.1], [5.2, 0.18, 0.5]], reg: 74, click: 0 },
};
function pluck(kind, t, midi, gain, pan) {            // a plucked or struck tine, string or glass bell
  if (harmOn()) { if (playing && t < lastPluckT + 0.4) return; lastPluckT = t; midi = chordSnap(midi); }
  noteLog(2, t, midi, 0.5, kind);                     // sheet music and note trace
  if (sampleOn() && SM.buf) { const pn = A.ctx.createStereoPanner ? A.ctx.createStereoPanner() : null; if (pn) { pn.pan.value = pan; pn.connect(A.bus[2]); } samplePlay(kind, midi, t, 0.8, gain * 1.5, pn || A.bus[2], { rel: 0.5, att: 0.004 }); return; }
  const { ctx, bus, nb } = A, K = PLUCK[kind], f = mtof(midi), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.003);
  K.parts.forEach(([m, a, d]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = f * m;
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.02);
  });
  if (K.click) {
    const s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), ng = ctx.createGain();      // the tiny click of the finger or thumb
    hp.type = 'highpass'; hp.frequency.value = 3000; ng.gain.setValueAtTime(gain * K.click, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    s.buffer = nb; s.connect(hp); hp.connect(ng); ng.connect(g); s.start(t, Math.random() * 1.5, 0.03);
  }
  if (p) { p.pan.value = pan; g.connect(p); p.connect(bus[2]); } else g.connect(bus[2]);
}
const pluckMidi = (kind, i) => scNote(PLUCK[kind].reg, i);
function lightArp(c, t, step, level, cenRow, rows) {  // a gentle rising arpeggio in the scale, every other column
  if (c % 2) return;
  const kind = T.instruments.light, n = level < 0.2 ? 1 : level < 0.32 ? 2 : 3, base = latIdx(cenRow, rows, 9);
  for (let k = 0; k < n; k++) pluck(kind, t + k * step * 0.6 / n, pluckMidi(kind, Math.min(scSpan(11), base + k * 2)), 0.03 + 0.06 * level, (cenRow / (rows - 1) - 0.5) * 0.8);
}
function strongPlay(c, t, step, level, cenRow, rows) {
  const kind = T.instruments.strong;
  if (kind !== 'gong' || c % 3 === 0) noteLog(2, t, chordSnap(kind === 'marimba' ? scNote(50, latIdx(cenRow, rows, 8)) : kind === 'vibes' ? pluckMidi('harp', latIdx(cenRow, rows, 8)) : kind === 'gong' ? scNote(38, latIdx(cenRow, rows, 8)) + 12 : scNote(38, latIdx(cenRow, rows, 8))), step, kind);   // sheet music and note trace
  if (kind === 'timpani') {                           // quiet roll, tuned to the latitude and gliding between columns
    const f = mtof(chordSnap(scNote(38, latIdx(cenRow, rows, 8)))), n = Math.max(2, Math.round(step / 0.075)), from0 = timpFreq || f;
    for (let i = 0; i < n; i++) timpStrike(t + i * step / n, f, i === 0 ? from0 : f, (0.05 + 0.07 * level) * (0.85 + Math.random() * 0.3));
    timpFreq = f;
  } else if (kind === 'marimba') {                    // a soft mallet roll
    const f = mtof(chordSnap(scNote(50, latIdx(cenRow, rows, 8)))), n = Math.max(2, Math.round(step / 0.06));
    for (let i = 0; i < n; i++) barStrike(t + i * step / n, f, (0.05 + 0.08 * level) * (0.85 + Math.random() * 0.3), 0.5, false);
  } else if (kind === 'vibes') {                      // a gentle trill between two neighbouring scale notes
    const i0 = latIdx(cenRow, rows, 8), fa = mtof(chordSnap(pluckMidi('harp', i0))), fb = mtof(chordSnap(pluckMidi('harp', i0 + 2))), n = Math.max(2, Math.round(step / 0.11));
    for (let i = 0; i < n; i++) barStrike(t + i * step / n, i % 2 ? fb : fa, (0.04 + 0.07 * level) * (0.85 + Math.random() * 0.3), 1.4, true);
  } else if (c % 3 === 0) gongSwell(t, mtof(scNote(38, latIdx(cenRow, rows, 8)) + 12), 0.04 + 0.06 * level, true);   // gong: a slow swell every few columns
}
function texture(c, t, step, level, cenRow, rows) {   // level 0..1: lots of data = the track's "strong" instrument, a little = its "light" one
  if (level < 0.06) return;
  if (level > 0.45) strongPlay(c, t, step, level, cenRow, rows); else lightArp(c, t, step, level, cenRow, rows);
}
function texNote(t, level, r, rows) {                 // click-to-explore: a short phrase on the track's strong or light instrument
  const P = T.instruments;
  if (level > 0.45) {
    const g = 0.05 + 0.07 * level;
    if (P.strong === 'timpani') { const f = mtof(scNote(38, latIdx(r, rows, 8))); for (let i = 0; i < 6; i++) timpStrike(t + i * 0.075, f, f, g); }
    else if (P.strong === 'marimba') { const f = mtof(scNote(50, latIdx(r, rows, 8))); for (let i = 0; i < 6; i++) barStrike(t + i * 0.06, f, g, 0.5, false); }
    else if (P.strong === 'vibes') { const i0 = latIdx(r, rows, 8); for (let i = 0; i < 4; i++) barStrike(t + i * 0.11, mtof(pluckMidi('harp', i0 + (i % 2))), g, 1.4, true); }
    else gongSwell(t, mtof(scNote(38, latIdx(r, rows, 8)) + 12), g, false);
  } else {
    const b = latIdx(r, rows, 9);
    pluck(P.light, t, pluckMidi(P.light, b), 0.05 + 0.1 * level, 0); pluck(P.light, t + 0.18, pluckMidi(P.light, Math.min(scSpan(11), b + 2)), 0.04 + 0.08 * level, 0);
  }
}
function drone(t, hz, gain) {
  if (gain > 0.001) { const m = Math.round(69 + 12 * Math.log2(hz / 440)); noteLog(0, t, m, 0.6); noteLog(0, t, m + Math.round(12 * Math.log2(droneRatio())), 0.6); }   // sheet music
  if (sampleOn() && SM.buf) { droneSample(t, hz, gain); return; }
  A.d1.frequency.setTargetAtTime(hz, t, 0.2); A.d2.frequency.setTargetAtTime(hz * droneRatio(), t, 0.2); A.droneGain.gain.setTargetAtTime(gain * 0.4 * A.droneScale, t, 0.4); }
// one-shots
// ---- Bassoon with Carnatic gamakas (no vibrato LFO: all pitch movement is a shaped ornament) ----
// semitone gap to the neighbouring Mohanam note below / above, by scale degree [Sa Ri Ga Pa Dha]
const GAP_BELOW = [3, 2, 2, 3, 2], GAP_ABOVE = [2, 2, 3, 2, 3];
const GAMAKA = ['jaru', 'nokku', 'kampita', 'jaru', 'kampita'];    // default ornament per degree
const smooth = u => u * u * (3 - 2 * u);
function gamakaCurve(type, below, above, dur) {
  const N = 128, cents = new Float32Array(N); let gd;
  if (type === 'kampita') {                          // shake: oscillate down toward the note below and back
    gd = Math.min(dur - 0.15, 0.95); const amp = below * 100 * 0.85, hz = 5.2;
    for (let i = 0; i < N; i++) { const u = i / (N - 1), env = Math.pow(Math.sin(Math.PI * u), 0.6); cents[i] = -amp * env * (0.5 - 0.5 * Math.cos(2 * Math.PI * hz * u * gd)); }
  } else if (type === 'jaru') {                      // slide: glide up into the note from the one below
    gd = 0.24; const amp = below * 100 * 0.95;
    for (let i = 0; i < N; i++) { const u = i / (N - 1); cents[i] = -amp * (1 - smooth(u)); }
  } else {                                           // nokku / spuritam: quick touch of the note above, then settle
    gd = 0.32; const amp = above * 100 * 0.8;
    for (let i = 0; i < N; i++) { const u = i / (N - 1); cents[i] = amp * Math.pow(Math.sin(Math.PI * u), 2); }
  }
  return { cents, gd };
}
// ---- The lead voice (bus 3): one melodic instrument per track, always with Carnatic gamakas and never with vibrato.
//      h = harmonic recipe, att/tc/rel = breath or bow envelope, lp = [start, end] filter, fm = body resonances [Hz, Q, dB], nz = [Hz, Q, start level, sustain level]
const LEADS = {
  bassoon:  { root: 26, span: 13, h: n => 1 / Math.pow(n, 0.85), att: 0.06, tc: 0.15, rel: 0.1, lp: f => [Math.min(Math.max(f * 8, 900), 1800), Math.min(Math.max(f * 10, 1200), 2300)], fm: [[480, 1.4, 5], [1100, 1.2, 3]], nz: [1400, 0.8, 0.2, 0.04] },
  clarinet: { root: 62, span: 11, h: n => n % 2 ? 1 / n : 0.04 / n, att: 0.035, tc: 0.12, rel: 0.09, lp: f => [Math.min(f * 5, 2400), Math.min(f * 7, 3200)], fm: [[1500, 0.9, 3]], nz: [2200, 0.8, 0.3, 0.05] },
  cello:    { root: 50, span: 13, h: n => 1 / n, pair: [-4, 4], att: 0.08, tc: 0.3, rel: 0.12, lp: f => [Math.min(f * 3, 2200), Math.min(f * 7, 3600)], fm: [[220, 1.2, 4], [520, 1.2, 3], [1050, 1.2, 3]], nz: [2600, 1, 0.25, 0.02] },
  flute:    { root: 62, span: 11, h: n => n === 1 ? 1 : n === 2 ? 0.22 : n === 3 ? 0.07 : n < 6 ? 0.02 : 0, att: 0.07, tc: 0.2, rel: 0.12, lp: () => [4200, 5200], fm: [[2600, 0.8, 2]], nz: [4500, 0.7, 0.3, 0.14] },
  oboe:     { root: 62, span: 10, h: n => n < 8 ? 1 / Math.sqrt(n) : 0.35 / n, att: 0.04, tc: 0.12, rel: 0.1, lp: f => [Math.min(f * 9, 3800), Math.min(f * 12, 4200)], fm: [[1300, 2, 8], [2800, 1.5, 4]], nz: [3000, 1, 0.1, 0.03] },
  horn:     { root: 50, span: 11, h: n => 1 / Math.pow(n, 1.3), att: 0.09, tc: 0.2, rel: 0.15, lp: f => [Math.min(f * 4, 1600), Math.min(f * 6, 2200)], fm: [[400, 1, 4], [1000, 1, 3]], nz: [800, 1, 0.1, 0.03] },
};
const waveCache = {};
function getWave(name, h, ctx) {
  if (waveCache[name]) return waveCache[name];
  const N = 30, real = new Float32Array(N), imag = new Float32Array(N); for (let n = 1; n < N; n++) imag[n] = h(n);
  return (waveCache[name] = ctx.createPeriodicWave(real, imag));
}
function lead(t, midi, gain, pan, durIn) {
  if (harmOn()) {
    if (playing && !lead.sighing && t < lastLeadT + 0.5) return;                       // thinner: about one melody note per beat at most
    if (!lead.sighing) lastLeadT = t;
    midi = Math.round(t / CROTCHET) % 2 === 0 ? chordSnap(midi) : chordSnap(midi, true);   // strong beats on chord tones; other notes only pass through if they would not clash
  }
  noteLog(3, t, midi, durIn || 1.4);                  // sheet music
  const { ctx, bus, nb } = A, name = T.instruments.lead, L = LEADS[name], f = mtof(midi), dur = durIn || 1.4;
  const dg = SCALE.deg, nd = dg.length, di = Math.max(0, dg.indexOf(mod(midi - 62, 12)));       // position of this note in the current scale
  const below = Math.max(1, dg[di] - (di ? dg[di - 1] : dg[nd - 1] - 12)), above = Math.max(1, (di < nd - 1 ? dg[di + 1] : dg[0] + 12) - dg[di]);   // semitone gaps to the neighbouring scale notes, for the gamaka
  const type = ($('gam') && !$('gam').checked) ? 'plain' : di === 0 ? (Math.random() < 0.3 ? 'jaru' : 'plain') : GAMAKA[di % 5];      // the "Gamakas" box off = steady notes, no ornament
  if (sampleOn() && SM.buf) {                              // MuseScore instrument sound, with the same gamaka, played by the same data-driven notes
    const so = { loop: true, att: 0.05, rel: 0.14 }; if (type !== 'plain') { const gc = gamakaCurve(type, below, above, dur); so.cents = gc.cents; so.gd = gc.gd; }
    const pn = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (pn) { pn.pan.value = pan; pn.connect(bus[3]); }
    samplePlay(name, midi, t, dur, gain * 1.1, pn || bus[3], so);
    if (EMO.troubled && regionsOn() && !lead.sighing && dur > 1.0 && Math.random() < 0.45) { lead.sighing = true; lead(t + dur * 0.5, midi - below, gain * 0.5, pan, 0.8); lead.sighing = false; }
    return;
  }
  const out = ctx.createGain();                      // breath or bow envelope: attack, steady air, release
  out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(gain * 1.5, t + L.att);
  out.gain.setTargetAtTime(gain * 1.1, t + L.att, L.tc); out.gain.setTargetAtTime(0, t + dur - 0.25, L.rel);
  const [l0, l1] = L.lp(f), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(l0, t); lp.frequency.linearRampToValueAtTime(l1, t + 0.12);
  let tail = lp;
  L.fm.forEach(([fr, q, db]) => { const b = ctx.createBiquadFilter(); b.type = 'peaking'; b.frequency.value = fr; b.Q.value = q; b.gain.value = db; tail.connect(b); tail = b; });
  tail.connect(out);
  const stopAt = t + dur + 0.1, cs = ctx.createConstantSource(); cs.offset.value = 0;           // carries the gamaka (cents); there is no vibrato oscillator
  if (type !== 'plain') { const { cents, gd } = gamakaCurve(type, below, above, dur); cs.offset.setValueCurveAtTime(cents, t, gd); }
  const wave = getWave(name, L.h, ctx);
  (L.pair || [0]).forEach(dt => { const o = ctx.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = f; o.detune.value = dt; cs.connect(o.detune); o.connect(lp); o.start(t); o.stop(stopAt); });
  cs.start(t); cs.stop(stopAt);
  const n = ctx.createBufferSource(), nbp = ctx.createBiquadFilter(), ng = ctx.createGain();     // breath or bow noise: a chiff at the start, a little throughout
  nbp.type = 'bandpass'; nbp.frequency.value = L.nz[0]; nbp.Q.value = L.nz[1];
  ng.gain.setValueAtTime(gain * L.nz[2], t); ng.gain.exponentialRampToValueAtTime(gain * L.nz[3], t + 0.12); ng.gain.setValueAtTime(gain * L.nz[3], t + dur - 0.25); ng.gain.linearRampToValueAtTime(0, t + dur);
  n.buffer = nb; n.loop = true; n.connect(nbp); nbp.connect(ng); ng.connect(out); n.start(t, Math.random()); n.stop(stopAt);
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = pan; out.connect(p); p.connect(bus[3]); } else out.connect(bus[3]);
  if (EMO.troubled && regionsOn() && !lead.sighing && dur > 1.0 && Math.random() < 0.45) {       // sadness: a soft falling sigh, one scale step below, in the middle of the note
    lead.sighing = true; lead(t + dur * 0.5, midi - below, gain * 0.5, pan, 0.8); lead.sighing = false;
  }
}
// ================= WORLD PERCUSSION =================
// Each landmass plays its own native drum(s). Strokes are tiny synth recipes:
//   ['t', startHz, endHz, seconds, amp]            = pitched skin/body (sine with a pitch drop)
//   ['n', centreHz, Q, seconds, amp, filterType]    = noise (slaps, snares, hats, jingles, wood clicks)
const STROKES = {
  tabla: {   // Sa = D: bayan ~D2, dayan ~D4, ring on Pa
    dha: [['t', 66, 78, .55, 1], ['t', 132, 156, .5, .45], ['t', 293.7, 293.7, .3, .6], ['n', 1800, 1.5, .03, .5]],
    na:  [['t', 293.7, 293.7, .2, .55], ['t', 587.3, 587.3, .12, .2], ['n', 1800, 1.5, .03, .5]],
    ge:  [['t', 66, 78, .55, 1.1], ['t', 132, 156, .5, .5], ['n', 900, 1, .03, .3]],
    tin: [['t', 440, 440, .5, .45], ['t', 880, 880, .3, .15], ['n', 2200, 2, .02, .4]],
  },
  kit: {
    kick:  [['t', 160, 45, .35, 1.3], ['n', 3000, 1, .01, .3]],
    snare: [['t', 200, 170, .15, .6], ['n', 2200, .7, .2, .8], ['n', 6000, .5, .12, .3, 'highpass']],
    hat:   [['n', 9000, .6, .05, .45, 'highpass']],
    ohat:  [['n', 8000, .6, .25, .4, 'highpass']],
  },
  darbuka: {
    doum: [['t', 130, 95, .35, 1.1], ['t', 260, 190, .2, .3], ['n', 600, 1, .03, .3]],
    tek:  [['t', 900, 700, .06, .5], ['n', 3500, 2, .04, .7]],
    ka:   [['t', 750, 600, .05, .35], ['n', 2800, 2, .03, .45]],
  },
  djembe: {
    bass: [['t', 110, 80, .5, 1.2], ['n', 200, 1, .08, .2]],
    tone: [['t', 230, 200, .22, .8], ['n', 900, 1.2, .06, .3]],
    slap: [['t', 500, 400, .1, .4], ['n', 2400, 1.5, .06, .9]],
  },
  taiko: {
    don: [['t', 85, 50, .8, 1.4], ['t', 170, 100, .5, .4], ['n', 400, 1, .06, .5]],
    ka:  [['n', 1500, 1.5, .04, .8], ['t', 800, 600, .05, .3]],
  },
  samba: {
    surdo:  [['t', 75, 60, .6, 1.3]],
    surdoM: [['t', 90, 80, .15, .8]],
    tam:    [['n', 2500, 3, .05, .8], ['t', 1300, 1100, .04, .3]],
    shaker: [['n', 7000, .6, .04, .5, 'highpass']],
  },
  bodhran: {
    dn: [['t', 125, 110, .3, 1.1], ['n', 700, 1, .08, .35]],
    up: [['t', 190, 170, .15, .6], ['n', 1200, 1, .05, .3]],
  },
  daf: {
    boom:   [['t', 100, 85, .45, 1.1], ['n', 500, 1, .05, .3]],
    tak:    [['n', 2800, 2, .03, .6], ['t', 600, 500, .04, .3]],
    jingle: [['n', 6500, 4, .25, .5]],
  },
  kendang: {
    tung: [['t', 150, 120, .3, 1], ['n', 700, 1, .04, .3]],
    dang: [['t', 320, 280, .2, .8], ['n', 1500, 1.2, .04, .5]],
    tak:  [['n', 2500, 2, .03, .7]],
  },
  conga: {
    tumba: [['t', 220, 200, .4, 1], ['n', 800, 1, .05, .3]],
    open:  [['t', 330, 300, .35, .9]],
    slap:  [['t', 520, 450, .1, .5], ['n', 2600, 1.5, .05, .8]],
  },
  clapsticks: {
    click:  [['t', 1100, 1000, .05, .7], ['n', 3000, 2, .03, .8]],
    click2: [['t', 1500, 1400, .04, .6], ['n', 4000, 2, .03, .7]],
  },
};
// instrument = name, where it comes from, an 8-beat cycle (null = rest) and a light filler stroke for the in-between notes
const INSTR = {
  tabla:      { name: 'Tabla',        where: 'India and South Asia',          kit: 'tabla',      filler: 'na',     pat: ['dha', 'na', 'na', 'ge', 'dha', 'na', 'tin', 'na'] },
  kit:        { name: 'Drum kit',     where: 'the USA and Canada',            kit: 'kit',        filler: 'hat',    pat: ['kick', 'hat', 'snare', 'hat', 'kick', 'kick', 'snare', 'ohat'] },
  darbuka:    { name: 'Darbuka',      where: 'the Middle East and North Africa', kit: 'darbuka', filler: 'ka',     pat: ['doum', 'tek', 'tek', 'doum', 'doum', 'tek', null, 'tek'] },
  djembe:     { name: 'Djembe',       where: 'sub-Saharan Africa',            kit: 'djembe',     filler: 'tone',   pat: ['bass', 'tone', 'tone', 'slap', 'bass', null, 'tone', 'slap'] },
  taiko:      { name: 'Taiko',        where: 'East Asia',                     kit: 'taiko',      filler: 'ka',     pat: ['don', null, 'don', 'ka', 'don', 'don', 'ka', null] },
  samba:      { name: 'Surdo and tamborim', where: 'South America',           kit: 'samba',      filler: 'shaker', pat: ['surdoM', 'tam', 'surdo', 'tam', 'surdoM', 'tam', 'surdo', 'shaker'] },
  bodhran:    { name: 'Bodhrán',      where: 'Europe',                        kit: 'bodhran',    filler: 'up',     pat: ['dn', 'up', 'up', 'dn', 'up', 'up', 'dn', 'up'] },
  daf:        { name: 'Daf',          where: 'Russia and Central Asia',       kit: 'daf',        filler: 'tak',    pat: ['boom', 'tak', 'tak', 'boom', 'jingle', 'tak', 'boom', 'tak'] },
  kendang:    { name: 'Kendang',      where: 'Southeast Asia',                kit: 'kendang',    filler: 'tak',    pat: ['tung', 'dang', 'tak', 'dang', 'tung', 'tak', 'dang', 'tak'] },
  conga:      { name: 'Congas',       where: 'Central America and the Caribbean', kit: 'conga',  filler: 'slap',   pat: ['open', 'slap', 'tumba', 'tumba', 'open', 'slap', 'tumba', 'tumba'] },
  clapsticks: { name: 'Clapsticks',   where: 'Australia and Oceania',         kit: 'clapsticks', filler: 'click2', pat: ['click', 'click2', null, 'click', 'click2', null, 'click', null] },
};
// Rough region boxes [instrument, lat0, lat1, lon0, lon1]; first match wins. Cells are ~2 x 10 degrees, so borders are approximate.
const REGIONS = [
  ['clapsticks', -50, -10, 110, 180],
  ['kendang',    -11, 20, 95, 150],
  ['tabla',       5, 35, 60, 93],
  ['taiko',      20, 52, 93, 150],
  ['darbuka',    15, 42, 25, 62],
  ['darbuka',    25, 42, -15, 25],
  ['djembe',    -36, 25, -20, 52],
  ['bodhran',    36, 72, -25, 42],
  ['daf',        35, 85, 42, 180],
  ['conga',       0, 20, -120, -60],
  ['samba',     -56, 0, -85, -30],
  ['kit',        15, 85, -170, -12],
];
function regionAt(lon, lat) {
  for (const [id, la0, la1, lo0, lo1] of REGIONS) if (lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1) return id;
  let best = 'tabla', bd = 1e9;                      // open ocean: use the nearest region's drum
  for (const [id, la0, la1, lo0, lo1] of REGIONS) { const d = boxDist(lon, lat, la0, la1, lo0, lo1); if (d < bd) { bd = d; best = id; } }
  return best;
}
function boxDist(lon, lat, la0, la1, lo0, lo1) {
  const dLat = lat < la0 ? la0 - lat : lat > la1 ? lat - la1 : 0; let dLon = 0;
  if (lon < lo0 || lon > lo1) { const a = Math.abs(lon - lo0), b = Math.abs(lon - lo1); dLon = Math.min(a, 360 - a, b, 360 - b); }
  return Math.hypot(dLat, dLon * Math.cos(lat * Math.PI / 180));
}
function computeRegions() {
  V.reg = []; for (let r = 0; r < V.rows; r++) for (let c = 0; c < V.cols; c++) V.reg.push(T.regionFn ? T.regionFn(latOf(r)) : regionAt(lonOf(c), latOf(r)));
}
function strike(t, g, comps, busIdx) {
  const { ctx, bus, nb } = A, out = bus[busIdx === undefined ? 4 : busIdx];
  comps.forEach(cp => {
    if (cp[0] === 't') {
      const [, f0, f1, dur, amp] = cp, o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(dur, 0.15));
      og.gain.setValueAtTime(g * amp, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(og); og.connect(out); o.start(t); o.stop(t + dur + 0.02);
    } else {
      const [, fr, q, dur, amp, type] = cp, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), og = ctx.createGain();
      f.type = type || 'bandpass'; f.frequency.value = fr; f.Q.value = q;
      og.gain.setValueAtTime(g * amp, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.buffer = nb; s.connect(f); f.connect(og); og.connect(out); s.start(t, Math.random() * 1.5, dur + 0.02);
    }
  });
}
function hit(id, stroke, t, g, busIdx) { noteLog(4, t, 0, 0.12, stroke, id); const I = INSTR[id]; if (I && stroke) strike(t, g, STROKES[I.kit][stroke], busIdx); }
// ---- El Niño 2026: the two deep reds ----
// Medium-dark red water (2.5 to 3.5 degrees above normal) plays a low, dark double bass chord, and almost black-red water (3.5 degrees and above) plays a low timpani
// roll with a rumble under it. Both get louder the more black-red there is in the column. On the map records both die away, over a few seconds, when the beam reaches the coast of Central and
// South America. The two bands are counted per cell in the grids (`deep`, from tools/make-elnino2026.py). The bass chord goes through the chords voice and the rumble through
// the percussion voice, so their mute boxes and volume balance apply. Both are synthesised: the MuseScore sounds in this app have no double bass.
function bassNote(t, m, dur, gain) {                  // one bowed double bass note: two slightly detuned saws and a triangle, rounded off by a low-pass, with a breath of bow noise
  const { ctx, bus, nb } = A, f = mtof(m), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 0.9;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.22); g.gain.setValueAtTime(gain, t + dur); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.45);
  [[1, 'sawtooth', 0.5, -5], [1, 'sawtooth', 0.5, 5], [2, 'triangle', 0.3, 0], [3, 'sine', 0.1, 0]].forEach(([mul, type, a, det]) => {
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * mul; o.detune.value = det; og.gain.value = a;
    o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 0.5);
  });
  const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); bp.type = 'bandpass'; bp.frequency.value = 260; bp.Q.value = 0.7; ng.gain.value = 0.05;
  s.buffer = nb; s.connect(bp); bp.connect(ng); ng.connect(lp); s.start(t, Math.random() * 1.2, 0.8);
  lp.connect(g); g.connect(bus[1]);
}
function rumbleHit(t, f, gain) {                      // one dark stroke on a big, low timpani
  const { ctx, bus, nb } = A, g = ctx.createGain();
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  [[1, 1, 0.85], [1.5, 0.5, 0.6], [2, 0.42, 0.45], [2.44, 0.2, 0.3]].forEach(([m, a, d]) => {       // not quite harmonic, with the upper partials that carry the note on small speakers
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(f * m * 1.06, t); o.frequency.exponentialRampToValueAtTime(f * m, t + 0.1);
    og.gain.setValueAtTime(a, t); og.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(og); og.connect(g); o.start(t); o.stop(t + d + 0.02);
  });
  const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), ng = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 320;
  ng.gain.setValueAtTime(gain * 0.6, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05); s.buffer = nb; s.connect(lp); lp.connect(ng); ng.connect(g); s.start(t, Math.random() * 1.5, 0.07);
  g.connect(bus[4]);
}
function rumbleBed(t, dur, gain) {                    // a low rumble of filtered noise under the roll, swelling and fading with the column
  const { ctx, bus, nb } = A, s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 130; lp.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.3);
  s.buffer = nb; s.loop = true; s.connect(lp); lp.connect(g); g.connect(bus[4]); s.start(t, Math.random() * 1.2); s.stop(t + dur * 1.35);
}
function deepData() {                                 // per column: how much medium-dark red and black-red there is (0 to 1, against the strongest column of the pair of years), and where to stop
  const g = T.grid; if (!g.deep || !g.deepRef) return null; if (T._deep && T._deep.g === g) return T._deep;
  const n = g.cols, rows = g.rows, mid = new Float32Array(n), blk = new Float32Array(n);
  for (let c = 0; c < n; c++) for (let r = 0; r < rows; r++) { mid[c] += g.deep[(r * n + c) * 2] / 255 / rows; blk[c] += g.deep[(r * n + c) * 2 + 1] / 255 / rows; }
  const sm = (a, ref) => Float32Array.from(a, (_, c) => { let s = 0, k = 0; for (let d = -2; d <= 2; d++) { const x = a[c + d]; if (x !== undefined) { s += x; k++; } } return Math.min(1, s / k / ref); });
  let stop = Infinity;
  if (!T.timeAxis) {                                  // the coast of Central and South America: the first column in the eastern Pacific where land fills the band from 15 S to 12 N
    const rs = []; for (let r = 0; r < rows; r++) { const la = latOf(r); if (la <= 12 && la >= -15) rs.push(r); }
    for (let c = 0; c < n; c++) { const lo = lonOf(c); if (lo < -125 || lo > -60) continue; if (rs.reduce((s, r) => s + g.land[r * n + c] / 255, 0) / rs.length >= 0.3) { stop = c; break; } }
  }
  return (T._deep = { g, mid: sm(mid, g.deepRef[0]), blk: sm(blk, g.deepRef[1]), stop });
}
let deepNext = 0;
let deepOff = false;                                  // debug only (?debug): true switches the two deep reds off, 'only' plays only them, to measure what they add
function elDeep(c, t, step) {
  const D = deepOff === true ? null : deepData(); if (!D) return;
  const cb = Math.min(c, D.stop - 1), fade = c < D.stop ? 1 : Math.exp(-(c - D.stop + 1) * step / 1.4);     // past the coast the last level dies away over a few seconds (about 1.4 s per e-fold), not an abrupt stop
  if (fade < 0.04) return;
  const mid = D.mid[cb] * fade, blk = D.blk[cb] * fade;
  if (t + 4 < deepNext) deepNext = t;                                                              // the sweep was restarted
  if ((mid > 0.04 || blk > 0.02) && t >= deepNext - 0.02) {                                         // the double bass chord, bowed again about every second
    const L = Math.min(1, 0.2 * Math.sqrt(mid) + Math.pow(blk, 0.85)), ch = chordFor(0), r0 = ch[0] % 12, fi = [6, 7, 8].includes(((ch[2] - ch[0]) % 12 + 12) % 12) ? ((ch[2] - ch[0]) % 12 + 12) % 12 : 7;
    const ti = ((ch[1] - ch[0]) % 12 + 12) % 12, root = 36 + ((r0 - 36 % 12 + 12) % 12), top = root + 12 + (ti === 3 || ti === 4 ? ti : 3), notes = [root, root + fi, top > 58 ? top - 12 : top];
    deepNext = t + 1.0; notes.forEach(m => { noteLog(1, t, m, 1.2); bassNote(t, m, 1.2, 0.008 + 0.13 * L * L); });
  }
  if (blk > 0.03) {                                                                                 // the low timpani roll and its rumble
    const n = Math.max(3, Math.round(step / 0.07)), f = mtof(38), lv = Math.pow(blk, 0.7);
    noteLog(2, t, 38, step, 'low timpani rumble');
    for (let i = 0; i < n; i++) rumbleHit(t + i * step / n, f, (0.075 * lv * lv * lv) * (0.7 + 0.5 * i / n) * (0.85 + Math.random() * 0.3));
    rumbleBed(t, step, 0.12 * lv * lv * lv);
  }
}

// Data-driven rhythm. The stronger the data in the sweep beam, the faster the drums play, in four musical steps only:
//   crotchets (1 per beat) -> quavers (2) -> semiquavers (4) -> demisemiquavers (8, rare).
// A fixed pulse of 120 bpm (crotchet = 0.5 s) keeps every subdivision locked to the same grid.
// "Data strength" = the track's own load measure (T.load): total aerosol for the aerosol track, current activity for the ocean track.
const CROTCHET = 0.5, SPEED_NAMES = { 1: 'crotchets', 2: 'quavers', 4: 'semiquavers', 8: 'demisemiquavers' };
let gridOrigin = 0, colLoad = [], loadSorted = [], accentThr = 1;
function computeDrumModel() {
  V.load = new Float32Array(V.cols * V.rows); colLoad = [];
  for (let c = 0; c < V.cols; c++) {
    let s = 0;
    for (let r = 0; r < V.rows; r++) { const x = T.load([0, 1, 2, 3].map(k => V.val(c, r, k))); V.load[r * V.cols + c] = x; if (r < V.rows - 2) s += x; }   // ignore the 2 Antarctic rows
    colLoad.push(s / (V.rows - 2));
  }
  loadSorted = colLoad.concat(T.rankWith ? T.rankWith() : []).sort((a, b) => a - b);     // El Niño 2026: ranked against the other year too, so a normal year sounds calmer than a strong El Niño
  const jumps = colLoad.map((x, c) => Math.max(0, x - colLoad[(c + V.cols - 1) % V.cols])).filter(x => x > 0).sort((a, b) => a - b);
  accentThr = jumps.length ? jumps[Math.floor(jumps.length * 0.85)] : 1;     // the biggest 15% of upward jumps get an accent
}
function colRank(c) { let lo = 0, hi = loadSorted.length; const v = colLoad[c]; while (lo < hi) { const m = (lo + hi) >> 1; if (loadSorted[m] < v) lo = m + 1; else hi = m; } return lo / loadSorted.length; }
function speedOf(c) {                                // null = quiet data, so silent drums
  const r0 = colRank(c); if (r0 < 0.15) return null;
  const rank = (r0 - 0.15) / 0.85, div = rank > 0.94 ? 8 : rank < 0.4 ? 1 : rank < 0.75 ? 2 : 4;
  return { div, rank, name: SPEED_NAMES[div] };
}
function dominantRegion(c) {                         // the drum of the region holding most of the data in this column
  const w = {}; let best = null, bw = 0;
  for (let r = 0; r < V.rows - 2; r++) { const x = V.load[r * V.cols + c]; if (x < 0.02) continue; const id = V.reg[r * V.cols + c]; w[id] = (w[id] || 0) + x; if (w[id] > bw) { bw = w[id]; best = id; } }
  return best;
}
function dataBeat(c, t, step) {
  const sp = speedOf(c); if (!sp) return;
  const id = dominantRegion(c); if (!id) return;
  let div = sp.div; if (div === 8 && Math.random() < 0.4) div = 4; if (harmOn()) div = Math.min(div, 2);      // calmer: no faster than quavers, and no filler strokes               // demisemiquavers: only the very strongest columns, and not always
  const I = INSTR[id], u = CROTCHET / div, base = 0.25 + 0.3 * sp.rank;
  const accent = colLoad[c] - colLoad[(c + V.cols - 1) % V.cols] > accentThr ? 1.5 : 1;   // data jumps up (edge of a plume or current): louder hits
  for (let k = Math.ceil((t - gridOrigin) / u - 1e-6); gridOrigin + k * u < t + step - 1e-6; k++) {
    const tt = gridOrigin + k * u;
    if (k % div === 0) hit(id, I.pat[(k / div) % I.pat.length], tt, base * accent);          // on the beat: the instrument's own 8-beat pattern
    else if (!harmOn()) hit(id, I.filler, tt, base * (div === 8 ? 0.35 : 0.5));                              // between beats: light fillers
  }
}
function drumPhrase(t, c, r) {                       // click-to-explore: a few strokes of that spot's drum, at that spot's speed
  const sp = speedOf(c), id = V.reg[r * V.cols + c], I = INSTR[id]; if (!sp || !I) return;
  const gap = Math.max(0.09, CROTCHET / Math.min(sp.div, 4));
  [0, 1, 2, 3].forEach(i => hit(id, I.pat[i] || I.filler, t + i * gap, .3 + .3 * sp.rank));
}
// Urgency: where the data is at its strongest and rising, a heartbeat on every beat and a tense repeating figure (the tonic against the note a semitone above).
function heartbeat(t, g) {
  const { ctx, bus } = A;
  [[0, 1], [0.2, 0.6]].forEach(([dt, a]) => {
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.frequency.setValueAtTime(72, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
    og.gain.setValueAtTime(g * a, t + dt); og.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.2);
    o.connect(og); og.connect(bus[0]); o.start(t + dt); o.stop(t + dt + 0.25);
  });
  noteLog(4, t, 0, 0.12, 'heartbeat', 'urgent');
}
function stab(t, midi, gain, dur) {
  const { ctx, bus } = A, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  [-8, 8].forEach(d => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.05); });
  lp.connect(g); g.connect(bus[1]); noteLog(1, t, midi, dur);
}
function urgentFx(c, t, step) {
  const u = EMO.urgent; if (!A || u < 0.1 || !regionsOn()) return;
  for (let k = Math.ceil((t - gridOrigin) / CROTCHET - 1e-6); gridOrigin + k * CROTCHET < t + step - 1e-6; k++) heartbeat(gridOrigin + k * CROTCHET, 0.3 + 0.45 * u);
  if (u < 0.3 || T.percussionOnly) return;
  const q = CROTCHET / 2, fig = (harmOn() && barChord) ? [barChord.notes[0], barChord.notes[2], barChord.notes[0], barChord.notes[1]] : [50, 50, 51, 50];      // calm mode: the repeating figure uses the chord, not a clashing semitone
  for (let k = Math.ceil((t - gridOrigin) / q - 1e-6); gridOrigin + k * q < t + step - 1e-6; k++) stab(gridOrigin + k * q, fig[mod(k, 4)], 0.03 + 0.05 * u, 0.2);
}
function crackle(t, gain) {
  if (harmOn() && Math.random() < 0.6) return;                        // fewer crackles in the calmer mode
  const { ctx, bus, nb } = A, s = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
  s.buffer = nb; hp.type = 'highpass'; hp.frequency.value = 2500 + Math.random() * 3000;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  s.connect(hp); hp.connect(g); g.connect(bus[0]); s.start(t, Math.random() * 1.5, 0.05);
}
function padNote(t, midi, gain, dur) {
  const { ctx, bus } = A, g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1100;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.25); g.gain.linearRampToValueAtTime(0, t + dur);
  [-6, 6].forEach(d => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi); o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + .1); });
  lp.connect(g); g.connect(bus[1]);
}
function bellsFrom(T, c, t, step, k, thresh) {       // strongest two rows of voice k, alternating beats
  const rows = [];
  for (let r = 0; r < V.rows; r++) { const x = V.val(c, r, k); if (x > thresh) rows.push([x, r]); }
  rows.sort((a, b) => b[0] - a[0]);
  rows.slice(0, 2).forEach(([x, r], i) => {
    if (c % 2 === i) lead(t + (i ? step * 0.5 : 0), bellMidi(T, r, V), 0.05 + 0.13 * x, (r / (V.rows - 1) - .5), Math.max(1.1, step * 4));
  });
}
function colStats(c) {
  const skipAnt = $('skipAnt').checked;                    // option: leave the polar rows (south of 60 S) out of the drone voice
  const tot = [0, 0, 0, 0, 0], cen = [0, 0, 0, 0, 0];
  for (let r = 0; r < V.rows; r++) for (let k = 0; k < 5; k++) { if (k === 4 && r >= V.rows - 2) continue; if (k === 0 && skipAnt && latOf(r) < -60) continue; const x = V.val(c, r, k); tot[k] += x; cen[k] += x * r; }   // land ignores the 2 Antarctic rows
  for (let k = 0; k < 5; k++) cen[k] = tot[k] > 0.01 ? cen[k] / tot[k] : V.rows / 2;
  return { tot, cen };
}

// ================= TRANSPORT =================
let traceCol = null;                                 // the column whose notes are being scheduled (for the note trace)
let lastFrameIdx = -1, durBackup = null, sweepEnded = false, sweepEndTime = 0, guiding = false, guideTok = 0, guideSkip = false, lastNarrCol = -1, lastInstr = null, playing = false, nextCol = 0, nextTime = 0, timer = null, queue = [], pos = 0, lastSpoken = '', cur = null;
const stepDur = () => $('dur').value / V.cols;
function scheduler() {
  const ctx = A.ctx, step = stepDur();
  while (!sweepEnded && nextTime < ctx.currentTime + 0.3) {
    if (nextCol >= V.cols) { sweepEnded = true; sweepEndTime = nextTime; break; }   // the sweep plays once and stops at the east edge
    const { tot, cen } = colStats(nextCol);
    curBar = Math.floor(nextCol / Math.max(4, Math.round(2 / step))); traceCol = nextCol; setScaleFor(nextCol);                                      // scale and mood of this column (regional scale, calm or troubled)
    T.schedule(nextCol, nextTime, step, tot, cen, V);
    urgentFx(nextCol, nextTime, step);
    if (window.EJ_elnino && window.EJ_elnino.active()) window.EJ_elnino.fx(nextCol, nextTime, step);        // El Nino layer: the anomaly under the beam
    queue.push({ c: nextCol, t: nextTime, step });
    nextCol++; nextTime += step;
  }
}
let idleTimer = null, starting = false, holdAudio = false;      // holdAudio: the "Follow a current" feature is playing, so do not shut the audio down
async function wake() {                              // un-mute and make sure the audio clock is running
  clearTimeout(idleTimer); initAudio(); applyPalette();
  A.gate.gain.cancelScheduledValues(A.ctx.currentTime); A.gate.gain.setTargetAtTime(1, A.ctx.currentTime, 0.01);
  if (A.ctx.state !== 'running') await A.ctx.resume();
  if (sampleOn() && !SM.buf) { setReadout('Loading the MuseScore instrument sounds…'); try { await loadSamples(A.ctx); setReadout('MuseScore instrument sounds loaded.'); } catch (e) { setReadout('The instrument sounds could not be loaded, so the live synthesis is used.'); } }
}
function shutdownAudio() {                          // destroy the whole audio graph: nothing scheduled or ringing can survive, and a resume can never replay leftovers
  if (!A) return; const a = A; A = null;
  try { a.gate.gain.setValueAtTime(0, a.ctx.currentTime); } catch (e) {}
  a.ctx.close().catch(() => {});
}
function sleepSoon(ms) {                             // mute right away, then tear the audio down so nothing can keep sounding
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (!A || playing || starting || guiding || holdAudio) return;
    A.gate.gain.setTargetAtTime(0, A.ctx.currentTime, 0.02);
    idleTimer = setTimeout(() => { if (!playing && !starting && !guiding && !holdAudio) shutdownAudio(); }, 150);
  }, ms);
}
// The big sound files (instrument samples, the MuseScore composition, the composed music bed) are only fetched when a setting needs them, so the first page load stays light.
const DATA_LOADS = {};
function loadScript(src) { return DATA_LOADS[src] || (DATA_LOADS[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete DATA_LOADS[src]; rej(new Error(src)); }; document.head.appendChild(s); })); }
async function ensureData() {
  const need = []; if ($('source').value === 'samples' && !window.SAMPLES) need.push('samples_data.js'); if ($('source').value === 'score' && !window.SCORE_B64) need.push('score_data.js'); if ($('music').checked && !window.MUSIC_B64) need.push('music_data.js');
  if (!need.length) return; setReadout('Loading the extra sound data…');
  try { await Promise.all(need.map(loadScript)); setReadout('The extra sound data is ready.'); } catch (e) { setReadout('The extra sound data could not be loaded, so the live synthesis is used.'); }
}
async function play() {
  if (playing || starting) return; if (window.EJ_followStop) window.EJ_followStop(); curBar = -1; barChord = null; heldBarFor = -2; lastLeadT = -9; lastPluckT = -9; starting = true;
  try { await ensureData(); await wake(); } finally { starting = false; }
  if (SPEECH && $('speak').checked && pos < 1.5) { const ok = await runGuide(); if (!ok) return; }   // spoken overview + listening guide first
  clearInterval(timer); playing = true; sweepEnded = false; timpFreq = null; nextTime = A.ctx.currentTime + 0.1; gridOrigin = nextTime; nextCol = Math.floor(pos); if (nextCol >= V.cols) nextCol = 0; queue = [];
  timer = setInterval(scheduler, 50); scheduler();
  startVideo(); if (scoreOn()) startScore(); else { A.live.gain.value = 1; startMusic(); }
  $('play').innerHTML = '<span aria-hidden="true">⏸</span> Pause';
  playhead.style.display = 'block'; requestAnimationFrame(frame);
}

// ================= COMPOSED MUSIC (MuseScore-rendered snippets) =================
// Per track: a "bed" (chords, bass, sometimes harp) and a "tune" (a melody in Mohanam), each a 16 s loop (8 bars at 120 bpm).
// They are original phrases written for this project (tools/make-music.ps1), rendered by MuseScore 4, and sit under the live sound.
// The bed stays steady; the tune comes forward where the data is strong. Pausing closes the audio context, which also ends these loops.
const MUS = { buf: {}, loop: 16, lead: 0.075, bedRms: 0.025, tuneRms: 0.022 };              // target loudness (linear RMS) of each stem before the data swell
async function musicBuffers(ctx, id) {
  const out = {};
  for (const part of ['bed', 'tune']) {
    const key = id + '_' + part;
    if (!MUS.buf[key]) {
      const b64 = window.MUSIC_B64 && window.MUSIC_B64[key]; if (!b64) return null;
      const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const buf = await ctx.decodeAudioData(u.buffer);
      let s = 0, n = 0; const end = Math.min(buf.length, Math.floor(MUS.loop * buf.sampleRate));
      for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < end; i++) { s += d[i] * d[i]; n++; } }
      const rms = Math.sqrt(s / Math.max(1, n)) || 1e-4;
      MUS.buf[key] = { buf, norm: Math.min(8, (part === 'bed' ? MUS.bedRms : MUS.tuneRms) / rms) };   // so every stem sits at the same loudness whatever MuseScore rendered
    }
    out[part] = MUS.buf[key];
  }
  return out;
}
async function startMusic() {
  if (!A || !$('music').checked || A.music || scoreOn()) return;
  const a = A, ctx = a.ctx; a.music = { starting: true };
  let b = null; try { b = await musicBuffers(ctx, T.id); } catch (e) {}
  if (!b || A !== a || !playing) { if (A === a) a.music = null; return; }
  const out = ctx.createGain(); out.gain.value = 0; out.connect(a.mix); out.gain.setTargetAtTime(1, ctx.currentTime, 0.7);
  const parts = {}, t0 = ctx.currentTime + 0.05;
  for (const k of ['bed', 'tune']) {
    const g = ctx.createGain(); g.gain.value = b[k].norm * (k === 'bed' ? 0.8 : 0.3);
    const src = ctx.createBufferSource(); src.buffer = b[k].buf; src.loop = true; src.loopStart = MUS.lead; src.loopEnd = Math.min(MUS.lead + MUS.loop, b[k].buf.duration);   // mp3 encoding adds about 0.075 s of silence at the start: loop from there, so the join falls where the notes have ended
    src.connect(g); g.connect(out); src.start(t0); parts[k] = { g, norm: b[k].norm };
  }
  a.music = { out, parts };
}
function musicFollow(c) {                          // the tune comes forward where the data is strong
  if (!A || !A.music || !A.music.parts) return; const t = A.ctx.currentTime, r = colRank(c), p = A.music.parts;
  p.bed.g.gain.setTargetAtTime(p.bed.norm * (0.7 + 0.3 * r), t, 0.8);
  p.tune.g.gain.setTargetAtTime(p.tune.norm * (0.25 + 0.75 * r), t, 0.8);
}
$('music').addEventListener('change', async () => {
  await ensureData(); if (!A) return;
  if (!$('music').checked) fadeMusic(0.1);
  else if (playing) { if (A.music && A.music.out) A.music.out.gain.setTargetAtTime(1, A.ctx.currentTime, 0.3); else startMusic(); }
});
function fadeMusic(tc) {
  if (!A) return; const t = A.ctx.currentTime;
  if (A.music && A.music.out) A.music.out.gain.setTargetAtTime(0, t, tc);
  if (A.score && A.score.out) A.score.out.gain.setTargetAtTime(0, t, tc);
}

// ================= SOUND SOURCE: MUSESCORE COMPOSITION (5 instruments) =================
// An alternative to the live synthesis. One composition (made in MuseScore, editable: music_scores/EarthJukebox_5voice.mscz) has five
// instruments, which are the five voices of the app: drone, chords, high voice, lead melody and drums. The same five stems play for every
// track, and the data modulates them: each instrument gets louder where its kind of data is stronger (and, for the three upper voices,
// its tone opens up), and the drums follow the data strength rank. The live voices are muted while this plays.
const SCORE = { buf: null, loop: 32, lead: 0.075, names: ['drone', 'pad', 'high', 'lead', 'drums'], rms: [0.03, 0.028, 0.022, 0.03, 0.03] };
const scoreOn = () => $('source').value === 'score' && !!window.SCORE_B64;
$('source').addEventListener('change', async () => {                    // the source is chosen at the start of a sweep: stop, and say what will play next
  await ensureData(); const s = scoreOn(); $('music').disabled = s; if (playing) pause();
  setReadout(s ? 'Sound source: the MuseScore composition. Press play: its five instruments rise and fall with the data. The live voices are off.' : $('source').value === 'samples' ? 'Sound source: MuseScore instrument sounds playing the data. The first play loads the sounds, which takes a few seconds.' : 'Sound source: live synthesis. Press play.');
});
async function scoreBuffers(ctx) {
  if (SCORE.buf) return SCORE.buf;
  const out = [];
  for (let k = 0; k < 5; k++) {
    const bin = atob(window.SCORE_B64[SCORE.names[k]]), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const buf = await ctx.decodeAudioData(u.buffer);
    let s = 0, n = 0; const end = Math.min(buf.length, Math.floor(SCORE.loop * buf.sampleRate));
    for (let ch = 0; ch < buf.numberOfChannels; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < end; i++) { s += d[i] * d[i]; n++; } }
    out.push({ buf, norm: Math.min(10, SCORE.rms[k] / (Math.sqrt(s / Math.max(1, n)) || 1e-4)) });      // each instrument at its own target loudness at full data
  }
  return (SCORE.buf = out);
}
async function startScore() {
  if (!A || A.score) return;
  const a = A, ctx = a.ctx; a.live.gain.value = 0; a.score = { starting: true };
  let b = null; try { b = await scoreBuffers(ctx); } catch (e) {}
  if (!b || A !== a || !playing) { if (A === a) { a.score = null; if (!b) a.live.gain.value = 1; } return; }
  const out = ctx.createGain(); out.gain.value = 0; out.connect(a.mix); out.gain.setTargetAtTime(1, ctx.currentTime, 0.4);
  const t0 = ctx.currentTime + 0.05, parts = [];
  for (let k = 0; k < 5; k++) {
    const src = ctx.createBufferSource(); src.buffer = b[k].buf; src.loop = true; src.loopStart = SCORE.lead; src.loopEnd = Math.min(SCORE.lead + SCORE.loop, b[k].buf.duration);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 9000;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(lp); lp.connect(g); g.connect(out); src.start(t0); parts.push({ g, lp, norm: b[k].norm });
  }
  a.score = { out, parts, t0 }; scoreFollow(Math.max(0, Math.floor(pos)));
}
// ================= SOUND SOURCE: MUSESCORE INSTRUMENT SOUNDS PLAYING THE DATA =================
// The same live, data-driven notes as the default source (regional scales, sad and urgent moods, gamakas, latitude as pitch), but the
// melodic and harmonic voices are real instrument recordings rendered with MuseScore 4 (samples_data.js) instead of synthesis:
// lead = bassoon, clarinet, cello, flute, oboe or horn; chords = strings, choir, brass or organ; drone = cello, organ or tuba;
// high voice = timpani, marimba, vibraphone, harp, celesta, kalimba or glockenspiel. The regional drums and the gong are still synthesised.
const SM = { buf: null, loading: null, target: 0.2 };
const sampleOn = () => $('source').value === 'samples' && !!window.SAMPLES;
function loadSamples(ctx) {
  if (SM.buf) return Promise.resolve(SM.buf);
  if (SM.loading) return SM.loading;
  return (SM.loading = (async () => {
    const out = {};
    await Promise.all(Object.keys(window.SAMPLES).map(async key => {
      const S = window.SAMPLES[key], bin = atob(S.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const buf = await ctx.decodeAudioData(u.buffer), d = buf.getChannelData(0), sr = buf.sampleRate; let s = 0, n = 0;
      S.notes.forEach((_, i) => { const a = Math.floor((i * S.slot + 0.1) * sr), b = Math.min(d.length, Math.floor((i * S.slot + Math.min(S.hold, 0.8)) * sr)); for (let k = a; k < b; k++) { s += d[k] * d[k]; n++; } });
      out[key] = { buf, meta: S, norm: Math.min(12, SM.target / (Math.sqrt(s / Math.max(1, n)) || 1e-4)) };     // every instrument at the same loudness
    }));
    SM.buf = out; return out;
  })().catch(e => { SM.loading = null; throw e; }));
}
function samplePlay(key, midi, t, dur, gain, dest, o) {   // one note of a MuseScore instrument, re-pitched from the nearest recorded note
  const S = SM.buf && SM.buf[key]; if (!S) return null; const m = S.meta, ctx = A.ctx; o = o || {};
  let tg = midi; while (tg < m.lo - 2) tg += 12; while (tg > m.lo + m.step * (m.notes.length - 1) + 2) tg -= 12;      // notes outside the instrument's range are folded by octaves
  const idx = Math.max(0, Math.min(m.notes.length - 1, Math.round((tg - m.lo) / m.step))), rate = Math.pow(2, (tg - m.notes[idx]) / 12);
  const src = ctx.createBufferSource(); src.buffer = S.buf; src.playbackRate.value = rate;
  const off = idx * m.slot + 0.06, att = o.att || 0.015, rel = o.rel || 0.12, end = t + dur, g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * S.norm, t + att); g.gain.setTargetAtTime(0, end, rel / 3);
  let stopAt = end + rel * 3;
  if (o.loop && dur > (m.hold - 0.3)) { src.loop = true; src.loopStart = off + 0.45; src.loopEnd = off + m.hold - 0.2; }     // held longer than the recording: repeat its steady middle
  else stopAt = Math.min(stopAt, t + (m.hold - 0.05) / rate);
  if (o.cents) src.detune.setValueCurveAtTime(o.cents, t, o.gd);
  src.connect(g); g.connect(dest); src.start(t, off); src.stop(stopAt);
  return { src, g };
}
function padSample(t, chord, gain, lp) {                  // chords: three sustained, looping notes; they change only when the chord does
  const a = A, ctx = a.ctx, inst = { strings: 'strings', choir: 'choir', brass: 'brass', organ: 'organ', low: 'strings' }[T.instruments.pad] || 'strings';
  if (!a.smPad) { const g = ctx.createGain(), f = ctx.createBiquadFilter(); g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 3000; f.connect(g); g.connect(a.bus[1]); a.smPad = { g, f, key: '', voices: [] }; }
  const P = a.smPad, ck = inst + chord.join(',');
  if (P.key !== ck && gain > 0.001) {
    P.voices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.25); try { v.src.stop(t + 1.5); } catch (e) {} });
    P.voices = chord.slice(0, 3).map(mm => samplePlay(inst, mm, t, 600, 1, P.f, { loop: true, att: 0.4, rel: 0.3 })).filter(Boolean); P.key = ck;
  }
  P.g.gain.setTargetAtTime(gain * a.padScale * 1.6, t, 0.35); P.f.frequency.setTargetAtTime(Math.max(900, lp * a.padMul * 3 * (EMO.troubled ? 0.7 : 1)), t, 0.3);
}
function droneSample(t, hz, gain) {                       // the drone: the tonic and its fifth (or octave), sustained and looping
  const a = A, ctx = a.ctx, inst = { tanpura: 'cello', pedal: 'organ', didgeridoo: 'tuba' }[T.instruments.drone] || 'cello';
  if (!a.smDrone) { const g = ctx.createGain(); g.gain.value = 0; g.connect(a.bus[0]); a.smDrone = { g, key: '', voices: [] }; }
  const D = a.smDrone, m1 = 69 + 12 * Math.log2(hz / 440);
  if (D.key !== inst && gain > 0.001) {
    D.voices.forEach(v => { v.g.gain.cancelScheduledValues(t); v.g.gain.setTargetAtTime(0, t, 0.25); try { v.src.stop(t + 1.5); } catch (e) {} });
    D.voices = [m1, m1 + 12 * Math.log2(droneRatio())].map(mm => samplePlay(inst, mm, t, 600, 1, D.g, { loop: true, att: 0.5, rel: 0.3 })).filter(Boolean); D.key = inst;
  }
  D.g.gain.setTargetAtTime(gain * 0.4 * a.droneScale * 3, t, 0.4);
}

function scoreFollow(c) {
  if (!A || !A.score || !A.score.parts) return; const t = A.ctx.currentTime, { tot } = colStats(c);
  A.score.parts.forEach((p, k) => {
    const lvl = k < 4 ? Math.min(1, tot[k] / V.rows * 4) : colRank(c);                 // same readings the meters show
    const on = meters[k] && meters[k].cb && !meters[k].cb.checked ? 0 : 1;             // the per-voice mute boxes still work
    p.lvl = on * lvl; p.g.gain.setTargetAtTime(p.norm * on * lvl, t, 0.25);
    if (k >= 1 && k <= 3) p.lp.frequency.setTargetAtTime(600 + 8400 * lvl, t, 0.25);   // more data, brighter tone
  });
}
function startVideo() {                                // start the movie at the sweep's position
  if (!T.video) return; const vid = $('vid'); vid.currentTime = pos / V.cols * T.grid.dur;
  vid.play().then(() => { if (!playing) vid.pause(); }).catch(() => {});      // if Pause was pressed while the movie was starting, stop it again
}
function silenceContinuous() {
  if (!A) return; const t = A.ctx.currentTime;
  [A.padGain, A.saltGain, A.droneGain, A.smPad && A.smPad.g, A.smDrone && A.smDrone.g].forEach(g => g && g.gain.setTargetAtTime(0, t, 0.15));
}
function hardStop() {                                  // silence everything at once: mute the output, then destroy the whole audio graph
  curBar = -1; barChord = null; heldBarFor = -2;
  clearTimeout(idleTimer);
  if (A) { try { A.gate.gain.cancelScheduledValues(A.ctx.currentTime); A.gate.gain.setValueAtTime(0, A.ctx.currentTime); } catch (e) {} }
  shutdownAudio();
}
function pause() {
  playing = false; if (T.video) $('vid').pause(); stopSpeech(); clearInterval(timer); timer = null;
  hardStop();                                                        // Pause means silence now: no fade, no ringing tail, no drone
  $('play').innerHTML = '<span aria-hidden="true">▶</span> Play';
}
function seek(col) { lastNarrCol = -1; narrReset(); pos = col; if (T.video) $('vid').currentTime = col / V.cols * T.grid.dur; queue = []; sweepEnded = false; if (playing) { nextCol = col; nextTime = A.ctx.currentTime + 0.05; } setHead(col); }
function setHead(p) {
  if (T.timeAxis) {                                  // time-lapse: show the frame for this step and move the time slider
    const c = Math.max(0, Math.min(V.cols - 1, Math.floor(p))); playhead.style.display = 'none'; $('tline').value = c;
    if (c !== lastFrameIdx) { lastFrameIdx = c; $('map').src = T.frames[c]; }
    return;
  }
  if (T.video) { playhead.style.display = 'none'; return; } playhead.style.display = 'block'; playhead.style.left = (p / V.cols * 100) + '%'; }
function frame() {
  if (!playing) return;
  const now = A.ctx.currentTime;
  if (sweepEnded && now >= sweepEndTime) { finishSweep(); return; }
  while (queue.length > 1 && queue[1].t <= now) queue.shift();
  if (queue.length && queue[0].t <= now) {
    const q = queue[0]; pos = (q.c + Math.min(1, (now - q.t) / q.step)) % V.cols;
    if (T.video) { const tgt = pos / V.cols * T.grid.dur, vid = $('vid'); if (Math.abs(vid.currentTime - tgt) > 0.3) vid.currentTime = tgt; if (vid.paused) vid.play().catch(() => {}); }   // keep the picture in step with the sound
    setHead(pos); updateMeters(q.c); musicFollow(q.c); scoreFollow(q.c);
    if (q.c !== lastNarrCol) { lastNarrCol = q.c; if ($('narrate').checked) narrateTour(q.c, false, q.step); }
  }
  requestAnimationFrame(frame);
}
function drumsNowText(c) {
  const sp = speedOf(c), id = sp ? dominantRegion(c) : null;
  return id ? `Drums now: ${INSTR[id].name} (${INSTR[id].where}), ${sp.name}` : 'Drums now: silent (quiet data)';
}
function updateMeters(c) {
  const { tot } = colStats(c), dn = $('drumNow'); if (dn) dn.textContent = drumsNowText(c);
  const sn = $('scaleNow');
  if (sn && V.emo) {
    if (!regionsOn()) sn.textContent = 'Scale: Mohanam everywhere (regional scales and emotion are off).';
    else { const reg = V.emo.reg[c], d = SCALES[reg] || SCALES.ocean, ov = colMoodOverride(c), trb = ov ? ov.trb : V.emo.tro[c], u = ov ? ov.urg : V.emo.urg[c]; sn.textContent = ov ? `Scale: ${(trb ? d.sad : d.calm)[0]}, for ${d.place}. Mood (from the El Nino layer): ${ov.text}.` : `Scale: ${(trb ? d.sad : d.calm)[0]}, for ${d.place}. Mood: ${u > 0.3 ? 'urgent, because the data is at its strongest and rising: something is wrong' : trb ? 'troubled and sad, because the data is strong' : 'calm and hopeful, because the data is light'}.`; }
  }
  if (T.video) $('vcap').textContent = `Video time ${Math.round((c + 0.5) * T.grid.dur / V.cols)} s: the beam is at about ${fmtLon(lonOf(c))}`;
  { const wn = $('whereNow'), lab = T.timeAxis ? dateLabel(T.grid.dates[c]) : 'Longitude ' + fmtLon(lonOf(c)); if (wn && wn.textContent !== lab) wn.textContent = lab; }   // the strip under the map always shows where the beam is now
  if (T.timeAxis) { const d = dateLabel(T.grid.dates[c]); $('vcap').textContent = d; $('tlineOut').textContent = d; $('tline').setAttribute('aria-valuetext', d); }
  tot.slice(0, 4).forEach((t, k) => { meters[k].bar.style.width = Math.min(100, t / V.rows * 400) + '%'; });
  meters[4].bar.style.width = Math.round(colRank(c) * 100) + '%';           // drum meter = data strength rank
}

// ================= DESCRIPTIONS =================
function describeCell(c, r) {
  const lon = lonOf(c), lat = latOf(r), parts = [];
  T.species.slice(0, 4).forEach((s, k) => { const x = V.val(c, r, k); if (x > 0.12) parts.push(`${word(x)} ${s.name.toLowerCase()} (${s.what})`); });
  const hs = T.hotspots.filter(h => lon >= h.lon[0] && lon <= h.lon[1] && lat >= h.lat[0] && lat <= h.lat[1] && V.val(c, r, h.k) > 0.1);
  let txt = `${T.headFn ? T.headFn(c, r) : fmtLat(lat) + ", " + fmtLon(lon)}: ` + (parts.length ? parts.join('; ') + '.' : T.quiet);
  if (hs.length) txt += ` This is ${hs[0].name}.`;
  if (T.describeValue && V.mean(c, r) > 0 && V.cov(c, r) > 0.05) txt += ' ' + T.describeValue(V.mean(c, r));
  const sp = speedOf(c), I = INSTR[V.reg[r * V.cols + c]];
  txt += sp ? ` Drums: ${I.name} (${I.where}), playing ${sp.name}.` : ' The drums are silent here.';
  return txt;
}
// The text under the map ("Where you are"). The number beside it (date or longitude) moves with every step; this description changes much more slowly, at most every
// few seconds, and says what is actually under the beam: which kind of data dominates, over which part of the world, near which latitude, and the value there (a
// temperature, say). When the beam passes a landmark (a dust plume, a season) its story is shown instead, and given a little longer to read.
function latPhrase(lat) {
  const a = Math.abs(lat), h = lat >= 0 ? 'northern' : 'southern';
  return a < 8 ? 'the equator' : a < 23 ? `the ${h} tropics` : a < 40 ? `the ${h} subtropics` : a < 60 ? `the ${h} mid-latitudes` : lat >= 0 ? 'the far north' : 'the far south';
}
function areaDescription(c) {                        // {key, make(n)}: key changes when the picture under the beam changes; make(n) words it, rotating the phrasing
  const isFront = k => /^an? /.test(T.species[k].what);
  const all = T.percussionOnly ? [0, 1, 3, 4] : [0, 1, 2, 3], main = all.filter(k => !isFront(k)), front = all.find(isFront);
  let bestR = -1, bestL = 0; const tot = {}; main.forEach(k => { tot[k] = 0; });
  for (let r = 0; r < V.rows - 2; r++) { const L = V.load[r * V.cols + c]; if (L > bestL) { bestL = L; bestR = r; } main.forEach(k => { tot[k] += V.val(c, r, k); }); }
  if (bestR < 0 || bestL < 0.05) return { key: 'quiet', make: () => `Very little under the beam here: ${T.quiet}` };
  const ranked = main.slice().sort((x, y) => tot[y] - tot[x]), k1 = ranked[0], k2 = ranked[1], two = tot[k2] > 0.4 * tot[k1];
  const strength = word(Math.max(...main.map(k => V.val(c, bestR, k)))), what1 = T.species[k1].what, what2 = two ? T.species[k2].what : '';
  const id = !T.timeAxis && dominantRegion(c), where = id ? INSTR[id].where : '', band = latPhrase(latOf(bestR));
  const sharp = front !== undefined && V.val(c, bestR, front) > 0.5 ? T.species[front].what : '';
  let value = T.describeValue && V.mean(c, bestR) > 0 && V.cov(c, bestR) > 0.05 ? T.describeValue(V.mean(c, bestR)) : '';
  if (T.id === 'year') {                              // the equator hardly changes through the year: the seasons show in the mid-latitudes, so say how warm each side is
    const rowAt = lat => { let b = 0; for (let r = 1; r < V.rows; r++) if (Math.abs(latOf(r) - lat) < Math.abs(latOf(b) - lat)) b = r; return b; };
    const dn = Math.round(32 * V.mean(c, rowAt(45))), ds = Math.round(32 * V.mean(c, rowAt(-45)));
    value = `The northern mid-latitudes are near ${dn} degrees, the southern near ${ds}: ${dn > ds + 1 ? 'summer in the north' : ds > dn + 1 ? 'summer in the south' : 'the seasons are balanced'}.`;
  }
  const key = [k1, two ? k2 : '', strength, where, band, sharp, value].join('|');
  return { key, make: n => {
    const lead = what1.match(/^(.*? over )/), mix = !what2 ? what1 : lead && what2.startsWith(lead[1]) ? `${what1}, and also over ${what2.slice(lead[1].length)}` : `${what1}, with ${what2}`, over = where ? ` over ${where}` : '', tail = sharp ? `, with ${sharp}` : '';
    const t = [`${cap(strength)} ${mix}${over}, strongest around ${band}${tail}.`, `Around ${band}${over} the beam finds ${strength} ${mix}${tail}.`, `${cap(mix)}${over || ' under the beam'}, ${strength} and peaking near ${band}${tail}.`][n % 3];
    return value ? t + ' ' + value : t;
  } };
}
const narr = { n: 0, pending: [], at: -99, hold: 4, story: false, key: '' };
function narrReset() { narr.pending = []; narr.at = -99; narr.hold = 4; narr.story = false; narr.key = ''; }
function narrateTour(c0, force, step) {
  // The text takes a few seconds to appear and to read, so it describes what the beam is about to reach, not where it is this instant: the words and the beam arrive together.
  const ahead = !force && step > 0 ? Math.min(30, Math.round(3 / step)) : 0, c = Math.min(V.cols - 1, c0 + ahead), lon = lonOf(c), now = performance.now() / 1000;
  if (force) narrReset();
  else T.hotspots.forEach(h => { if (lonOf(c - 1) < h.say && lon >= h.say) narr.pending.push({ h, text: `${cap(h.name)}. ${h.story}` }); });
  narr.pending = narr.pending.filter(p => lon <= p.h.lon[1]).slice(-2);          // a landmark the beam has already left is no longer worth telling
  const area = areaDescription(c), since = now - narr.at; let text = null, story = false;
  if (narr.pending.length && since >= (narr.story ? narr.hold : 2)) { text = narr.pending.shift().text; story = true; narr.key = area.key; }   // landmarks may interrupt a plain description, but not each other
  else if (!narr.pending.length && area.key !== narr.key && since >= narr.hold) { text = area.make(narr.n++); narr.key = area.key; }
  if (!text || text === lastSpoken) return;
  lastSpoken = text; narr.at = now; narr.story = story; narr.hold = story ? 4.5 : 3.5;
  setReadoutEvent((T.timeAxis ? dateLabel(T.grid.dates[c]) : 'Longitude ' + fmtLon(lon)) + ': ', text);
}
// ================= SPOKEN NARRATION (browser speech synthesis) =================
const SPEECH = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
let speechQ = [], speaking = false, curUtt = null;
let reading = false, readTimer = 0;     // "Quiet the music while I read": the sound drops to a whisper while new text is being read by a screen reader
function applyVolume() { if (A) A.master.gain.setTargetAtTime($('vol').value / 100 * 0.95 * (speaking ? 0.35 : 1) * (reading ? 0.1 : 1), A.ctx.currentTime, 0.1); }   // music ducks while the voice speaks
function duckForReading(text) {
  if (!$('quietRead').checked || !text) return; reading = true; applyVolume(); clearTimeout(readTimer);
  readTimer = setTimeout(() => { reading = false; applyVolume(); }, Math.min(15000, Math.max(2500, String(text).length * 75)));   // about how long a screen reader takes to say it
}
function setQuiet(on, say) { $('quietRead').checked = on; try { localStorage.setItem('ej_quiet', on ? '1' : '0'); } catch (e) {} if (!on) { clearTimeout(readTimer); reading = false; applyVolume(); } if (say) { const e = $('jbLive'); e.textContent = ''; setTimeout(() => { e.textContent = on ? 'Quiet the music while I read: on.' : 'Quiet the music while I read: off.'; }, 60); } }
try { $('quietRead').checked = localStorage.getItem('ej_quiet') === '1'; } catch (e) {}
$('quietRead').addEventListener('change', () => setQuiet($('quietRead').checked, false));
{ const mo = new MutationObserver(ms => { for (const m of ms) { const t = m.target.nodeType === 1 ? m.target : m.target.parentElement; if (t && $('quietRead').checked) duckForReading(t.textContent); } });
  ['readout', 'followStatus', 'elStatus', 'demoStatus', 'jbLive'].forEach(id => { const e = $(id); if (e) mo.observe(e, { childList: true, characterData: true, subtree: true }); }); }
document.addEventListener('keydown', e => {
  if ((e.key !== 'm' && e.key !== 'M') || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
  const t = e.target; if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== 'checkbox' && t.type !== 'range' || t.isContentEditable)) return;
  setQuiet(!$('quietRead').checked, true);
});
// ---- Captions: while the narrator speaks, the words also appear as text near the bottom of the picture (needs Spoken narration on) ----
const CAPS = { u: null, chunks: [], timers: [], sync: false, shown: -1 };
const captionsActive = () => $('captions').checked && $('speak').checked;
function capChunks(text) {                           // sentences, split further at commas so each caption stays short
  const out = []; let pos = 0;
  for (let p of (text.match(/[^.!?]+[.!?]*\s*/g) || [text])) {
    let start = pos; pos += p.length;
    while (p.length > 90) { let cut = Math.max(p.lastIndexOf(', ', 84), p.lastIndexOf('; ', 84)); if (cut < 30) cut = p.lastIndexOf(' ', 84); if (cut < 30) cut = 84; out.push({ i: start, t: p.slice(0, cut + 1).trim() }); p = p.slice(cut + 1); start += cut + 1; }
    if (p.trim()) out.push({ i: start, t: p.trim() });
  }
  return out;
}
function capShow(k) { const bar = $('captionBar'); if (!bar || k === CAPS.shown || !CAPS.chunks[k]) return; CAPS.shown = k; bar.firstElementChild.textContent = CAPS.chunks[k].t; bar.hidden = false; }
function capClear() { CAPS.timers.forEach(clearTimeout); CAPS.timers = []; CAPS.u = null; CAPS.chunks = []; CAPS.shown = -1; CAPS.sync = false; const bar = $('captionBar'); if (bar) { bar.hidden = true; bar.firstElementChild.textContent = ''; } }
function capBegin(u, text) {                         // call just before speaking an utterance
  if (!captionsActive()) return;
  u.addEventListener('start', () => {
    capClear(); CAPS.u = u; CAPS.chunks = capChunks(text); capShow(0);
    CAPS.timers.push(setTimeout(() => { if (CAPS.sync || CAPS.u !== u) return; CAPS.chunks.forEach((c, k) => { if (k) CAPS.timers.push(setTimeout(() => { if (!CAPS.sync && CAPS.u === u) capShow(k); }, c.i * 68 / (u.rate || 1))); }); }, 700));   // no word events from this voice: time the captions by length
  });
  u.addEventListener('boundary', e => { if (CAPS.u !== u) return; CAPS.sync = true; const at = e.charIndex * text.length / Math.max(1, (u.text || text).length); let k = 0; CAPS.chunks.forEach((c, j) => { if (c.i <= at) k = j; }); capShow(k); });   // the spoken copy can differ in length from the caption text
  const end = () => { if (CAPS.u === u) capClear(); };
  u.addEventListener('end', end); u.addEventListener('error', end);
}
function speak(text, interrupt) {
  if (!SPEECH || !$('speak').checked) return;
  if (interrupt) { speechQ = []; curUtt = null; speechSynthesis.cancel(); speaking = false; }
  speechQ.push(text); if (speechQ.length > 3) speechQ.shift();
  nextSpeech();
}
function nextSpeech() {
  if (speaking || !speechQ.length) return;
  const text = speechQ.shift(), u = new SpeechSynthesisUtterance(window.EJ_PRON ? window.EJ_PRON(text) : text); curUtt = u;
  const v = speechSynthesis.getVoices().find(x => x.name === $('voice').value);
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = 0.95; capBegin(u, text);
  const done = () => { if (curUtt !== u) return; speaking = false; applyVolume(); nextSpeech(); };
  u.onend = done; u.onerror = done;
  speaking = true; applyVolume(); speechSynthesis.speak(u);
}
function stopSpeech() { capClear(); speechQ = []; curUtt = null; if (SPEECH) speechSynthesis.cancel(); speaking = false; applyVolume(); }

// ---- Guided tour: 1) describe the image west to east, 2) explain how to listen, 3) the sweep plays once in silence from the narrator ----
function guideSentences() {
  if ($('introLen').value === 'short') {              // about 20 seconds: what it shows, how to listen, then play
    const what = T.speech.open[0].replace(/^Welcome to the Earth Jukebox\.\s*/, '').trim();
    const travel = T.timeAxis ? 'The sweep runs through the year.' : T.video ? 'The sweep follows the line down the middle of the turning globe.' : 'The sweep travels from west to east.';
    return [what, travel + ' Pitch tells you the latitude: higher notes are further north.', 'Each kind of data has its own instrument, and the drums speed up where the data is stronger. Use the Hear voices button to learn them.', 'The sweep will now play once, and then stop.'];
  }
  const sl = T.startLon === undefined ? -180 : T.startLon, hs = [...T.hotspots].sort((a, b) => (((a.say - sl) % 360) + 360) % 360 - (((b.say - sl) % 360) + 360) % 360);
  return [...T.speech.open, ...hs.map(h => `${cap(h.name)}. ${h.story}`), 'That is the whole picture.', ...T.speech.listen];
}
function say(text) {                                 // speak one sentence and resolve when it has finished (or after a safety timeout)
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(window.EJ_PRON ? window.EJ_PRON(text) : text); curUtt = u;
    const v = speechSynthesis.getVoices().find(x => x.name === $('voice').value);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 0.95; capBegin(u, text);
    let done = false, started = false, to = null, startCheck = null;
    const fin = () => { if (done) return; done = true; clearTimeout(to); clearTimeout(startCheck); if (curUtt === u) { curUtt = null; speaking = false; applyVolume(); } res(started); };
    u.onstart = () => { started = true; clearTimeout(startCheck); };
    u.onend = fin; u.onerror = fin;
    startCheck = setTimeout(() => { if (!started && !speechSynthesis.speaking) { speechSynthesis.cancel(); fin(); } }, 8000);   // nothing began speaking (slow voices get 8 s): give up on speech
    to = setTimeout(() => { speechSynthesis.cancel(); fin(); }, Math.max(6000, text.length * 120));
    speaking = true; applyVolume(); speechSynthesis.speak(u);
  });
}
function showGuideUI(on) {
  $('skip').hidden = !on;
  $('play').innerHTML = on ? '<span aria-hidden="true">⏹</span> Stop intro' : '<span aria-hidden="true">▶</span> Play';
}
async function runGuide() {
  stopSpeech(); guiding = true; guideSkip = false; const tok = ++guideTok; showGuideUI(true);
  setReadout('Spoken guide: first a description of the image, then how to listen. The sweep starts afterwards. Use "Skip intro" to go straight to the sweep.');
  let failed = false;
  for (const s of guideSentences()) { if (tok !== guideTok || guideSkip) break; if (!(await say(s)) && tok === guideTok && !guideSkip) { failed = true; break; } }
  const ok = tok === guideTok; guiding = false; showGuideUI(false);
  if (ok) setReadout(failed ? 'Speech did not start in this browser or on this device (no voice or sound output), so the spoken intro was skipped. The sweep plays now.' : '');
  return ok;
}
function cancelGuide() { if (!guiding) return; guideTok++; guiding = false; stopSpeech(); showGuideUI(false); setReadout('Intro stopped. Press play to start again.'); }
function finishSweep() {                             // the sweep reached the east edge: let the last notes ring out, then stop
  curBar = -1; barChord = null; heldBarFor = -2;
  if (T.video) $('vid').pause();
  clearInterval(timer); timer = null; playing = false; silenceContinuous(); fadeMusic(0.8); sleepSoon(3000);
  $('play').innerHTML = '<span aria-hidden="true">▶</span> Play';
  pos = 0; lastNarrCol = -1; setHead(V.cols);
  setReadout('The sweep has reached the end. Press play to hear it again, or click the map to explore.');
  speak('The sweep has reached the end.');
  if (window.EJ_songEnded) window.EJ_songEnded('sweep');
}
// The voice list: whatever voices this device and browser offer, grouped so the best-sounding ones are easy to find. Natural (neural) and online voices come first, then the
// voices installed on the device, then other languages. The choice is remembered. Susan is the house voice when the device has her.
const langName = (() => { let dn = null; try { dn = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) {} return l => { try { return dn ? dn.of(l) : l; } catch (e) { return l; } }; })();
const isEnglish = v => /^en/i.test(v.lang), isNatural = v => /natural|neural/i.test(v.name) || (!v.localService && /microsoft/i.test(v.name));
function voiceText(v) {
  const short = v.name.replace(/^Microsoft\s+/i, '').replace(/\s+-\s+.*$/, '').replace(/\s*Online\s*\(Natural\)/i, '').trim() || v.name;
  return `${short} (${langName(v.lang)})${isNatural(v) ? ', natural' : !v.localService ? ', online' : ''}`;
}
function fillVoices() {
  if (!SPEECH) return; const sel = $('voice'), vs = speechSynthesis.getVoices(); let keep = sel.value; if (!keep) { try { keep = localStorage.getItem('ej_voice') || ''; } catch (e) {} }
  const byName = (a, b) => a.name.localeCompare(b.name), grp = (label, list) => { if (!list.length) return ''; return `<optgroup label="${label}">` + list.sort(byName).map(v => `<option value="${v.name.replace(/"/g, '&quot;')}">${voiceText(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</option>`).join('') + '</optgroup>'; };
  const en = vs.filter(isEnglish), best = en.filter(v => isNatural(v) || !v.localService), local = en.filter(v => !(isNatural(v) || !v.localService));
  sel.innerHTML = grp('Natural and online voices (English)', best) + grp('Voices on this device (English)', local) + grp('Other languages', vs.filter(v => !isEnglish(v)));
  const pick = vs.find(v => /susan/i.test(v.name)) || best.find(isNatural) || best[0] || en.find(v => v.default) || en[0] || vs[0];
  sel.value = vs.some(v => v.name === keep) ? keep : (pick ? pick.name : '');
  const info = $('voiceInfo'); if (info) info.textContent = `${vs.length} voice${vs.length === 1 ? '' : 's'} found, ${best.length} natural or online.`;
}
if (SPEECH) { fillVoices(); speechSynthesis.addEventListener('voiceschanged', fillVoices); }
else { $('speak').disabled = true; $('speak').parentElement.title = 'Speech is not supported in this browser'; }
try { $('speak').checked = SPEECH && localStorage.getItem('ej_speak') === '1'; } catch (e) { $('speak').checked = false; }   // off by default, remembered
try { $('introLen').value = localStorage.getItem('ej_intro') === 'full' ? 'full' : 'short'; } catch (e) {}
$('introLen').addEventListener('change', () => { try { localStorage.setItem('ej_intro', $('introLen').value); } catch (e) {} });
try { $('skipAnt').checked = localStorage.getItem('ej_skipant') === '1'; } catch (e) {}
$('skipAnt').addEventListener('change', () => { try { localStorage.setItem('ej_skipant', $('skipAnt').checked ? '1' : '0'); } catch (e) {} if (V) updateMeters(Math.max(0, Math.min(V.cols - 1, Math.floor(pos)))); });
try { $('captions').checked = localStorage.getItem('ej_captions') === '1'; } catch (e) {}
$('captions').addEventListener('change', () => { try { localStorage.setItem('ej_captions', $('captions').checked ? '1' : '0'); } catch (e) {} if (!$('captions').checked) capClear(); });
$('speak').addEventListener('change', () => {
  try { localStorage.setItem('ej_speak', $('speak').checked ? '1' : '0'); } catch (e) {}
  if (!$('speak').checked) stopSpeech(); else speak('Spoken narration is on.', true);
});
$('voice').addEventListener('change', () => { try { localStorage.setItem('ej_voice', $('voice').value); } catch (e) {} if ($('speak').checked) speak('This is how I sound.', true); });
$('voiceTest').addEventListener('click', () => {                    // hear the chosen voice, whether or not narration is switched on
  if (!SPEECH) return; stopSpeech(); const u = new SpeechSynthesisUtterance('Hello. This is how I sound, reading the Earth Jukebox.'), v = speechSynthesis.getVoices().find(x => x.name === $('voice').value);
  if (v) { u.voice = v; u.lang = v.lang; } u.rate = 0.95; speechSynthesis.speak(u);
});
const setReadout = t => { $('readout').textContent = t; };
function setReadoutEvent(prefix, text) {      // the visible label beside it already shows the current date or longitude, so the prefix is only for screen readers
  const e = $('readout'), p = document.createElement('span'); p.className = 'sr-only'; p.textContent = prefix; e.textContent = ''; e.append(p, document.createTextNode(text));
}

// ================= EXPLORE =================
function showCursor() { cursorEl.style.display = 'block'; cursorEl.style.left = (T.timeAxis ? 50 : (cur.c + .5) / V.cols * 100) + '%'; cursorEl.style.top = ((cur.r + .5) / V.rows * 100) + '%'; }
async function explore(c, r, jump) {
  cur = { c: Math.max(0, Math.min(V.cols - 1, c)), r: Math.max(0, Math.min(V.rows - 1, r)) };
  showCursor(); setReadout(describeCell(cur.c, cur.r)); updateMeters(cur.c);
  if ($('speak').checked && !guiding) speak(describeCell(cur.c, cur.r), true);
  await wake();
  setScaleFor(cur.c, cur.r);                       // a clicked spot plays in the scale and mood of its own region
  T.explore(cur.c, cur.r, V);
  if (!playing) sleepSoon(3500);                    // let the one-shot ring out, then go quiet
  if (jump || (T.timeAxis && !playing)) seek(cur.c);
}
stage.addEventListener('pointerdown', e => {
  const b = $('mapBox').getBoundingClientRect();
  if (e.clientY < b.top || e.clientY > b.bottom) return;                    // the empty black space above and below a short picture makes no sound
  const c = T.timeAxis ? Math.min(V.cols - 1, Math.floor(pos)) : Math.floor((e.clientX - b.left) / b.width * V.cols);   // on the time-lapse the x position means nothing, so use the current time step
  explore(c, Math.floor((e.clientY - b.top) / b.height * V.rows), !T.timeAxis);
});
stage.addEventListener('keydown', e => {
  const big = e.shiftKey ? 8 : 1; let c = cur ? cur.c : Math.floor(pos), r = cur ? cur.r : 8, h = true;
  switch (e.key) {
    case 'ArrowLeft': c -= big; break; case 'ArrowRight': c += big; break;
    case 'ArrowUp': r -= big > 1 ? 3 : 1; break; case 'ArrowDown': r += big > 1 ? 3 : 1; break;
    case 'Home': c = 0; break; case 'End': c = V.cols - 1; break;
    case 'Enter': break;
    case ' ': togglePlay(); e.preventDefault(); return;
    default: h = false;
  }
  if (h) { e.preventDefault(); explore(c, r, playing); }
});

// ================= DATA AND LIMITS (shown in the page for the current track) =================
const COMMON_LIMIT = 'The values are read from the colour bars on the NASA pictures, but how they become sound (pitch, instruments, drums, scale) is an artistic interpretation.';
const DATA_INFO = {
  year: {
    source: 'NASA SVS 3912, "Global Sea Surface Currents and Temperature" (ECCO2 ocean model), flat 2048×1024 frames.', url: 'https://svs.gsfc.nasa.gov/3912/',
    date: '2,001 frames from 25 March 2007 12:00 UTC to 3 March 2008 12:00 UTC, about 4.1 hours apart. This track samples 160 of them, one about every 2.15 days.',
    colour: 'Line colour is sea surface temperature on NASA\'s colour bar, from 0 °C (blue) to 32 °C (red). The lines themselves follow the currents.',
    decode: ['Each coloured pixel is matched to the colour bar by hue (within 4/255, saturation at least 64/255, brightness at least 20/255), which gives an estimated temperature.', 'Cold, mild and warm are the three thirds of the scale (below about 11 °C, about 11 to 21 °C, above about 21 °C).', 'Swirl is measured in 32-pixel tiles from the direction of the flow lines: parallel lines mean a steady current, tangled lines mean eddies.', 'Each 10° latitude band is read across all longitudes.'],
    caveats: ['These are estimates decoded from a rendering, not the raw ECCO2 model values. About a third of the pixels carry a usable flow-line colour.', 'The decoding was checked against the colour bar itself (round-trip error about 0.05 °C), not against the model.', 'One year is not a climate trend.', 'Current speeds are not decoded, only temperature and the geometry of the flow lines.', 'Longitudes are blended together, so regional differences inside a band are lost.'],
  },
  aerosols: {
    source: 'NASA SVS 5669, an aerosol visualization.', url: 'https://svs.gsfc.nasa.gov/5669/',
    date: '19 August 2025, 20:00 UTC (taken from the image file name). One moment in time.',
    colour: 'NASA\'s colour key: orange-red is black carbon (smoke), lilac is dust, grey-teal is sea salt, and bright green is sulfate.',
    decode: ['Each pixel is sorted into one of the four types by hue, saturation and brightness. Brightness gives how strong that type is.', 'The image is summed into 160 columns (west to east) and 18 latitude bands.'],
    caveats: ['Types are told apart by colour, so the values are relative amounts in a visualization, not measured concentrations.', 'Dense aerosol tints the land, so land under heavy haze is only partly detected.', 'The named hotspots use hand-drawn boxes, so their edges are approximate.'],
  },
  sst: {
    source: 'NASA SVS 3652, "Sea Surface Temperature, Salinity and Density" (released 9 October 2009): the average sea surface temperature map, 2000×1000.', url: 'https://svs.gsfc.nasa.gov/3652/',
    date: 'An average map, so it has no single date. I did not verify the averaging period.',
    colour: 'NASA\'s colour bar runs from -2 °C (dark blue) to 30 °C (red).',
    decode: ['Each ocean pixel is matched to its nearest colour on the colour bar. Land photo pixels do not match and drop out, and only smooth areas are used.', 'Cold, mild and warm are the three thirds of the colour bar.', 'Fronts measure how sharply the value changes inside a cell.', 'The result is 160 columns by 18 latitude bands.'],
    caveats: ['Matching is by colour, so cells next to coasts or sea ice can be wrong.', 'It is an average, so there are no seasons.', 'The value read out when you click is an estimate from the colour.'],
  },
  sss: {
    source: 'NASA SVS 3652, "Sea Surface Temperature, Salinity and Density" (released 9 October 2009): the average sea surface salinity map, 2000×1000.', url: 'https://svs.gsfc.nasa.gov/3652/',
    date: 'An average map, so it has no single date. I did not verify the averaging period.',
    colour: 'NASA\'s colour bar runs from about 5 practical salinity units (dark teal) to 40 (white).',
    decode: ['Each ocean pixel is matched to its nearest colour on the colour bar, using a tight tolerance so that ice and pale land are not mistaken for water. Water below about 62° S is left out.', 'Fresher, average and salty are the three thirds of the colour bar position.', 'Fronts measure how sharply the value changes inside a cell.'],
    caveats: ['NASA\'s colour bar is not evenly spaced, so the thirds are thirds of the colour scale, not equal steps of salinity.', 'Cells next to coasts and ice can be wrong.', 'The Antarctic coast and the far south are left silent by design.'],
  },
  density: {
    source: 'NASA SVS 3652, "Sea Surface Temperature, Salinity and Density" (released 9 October 2009): the average sea surface density map, 2000×1000.', url: 'https://svs.gsfc.nasa.gov/3652/',
    date: 'An average map, so it has no single date. I did not verify the averaging period.',
    colour: 'NASA\'s colour bar runs from 1002 kilograms per cubic metre (pale blue) to 1028 (black).',
    decode: ['Each ocean pixel is matched to its nearest colour on the colour bar. The scale is flipped so that the densest water is the "low" end, which plays the deep drone.', 'Dense, medium and light are the three thirds of the colour bar position. Water below about 62° S is left out.', 'Fronts measure how sharply the value changes inside a cell.'],
    caveats: ['NASA\'s colour bar is not evenly spaced, so the thirds are thirds of the colour scale, not equal steps of density.', 'Pale ice and the darkest water can be confused with the ends of the scale near coasts.'],
  },
  densityVideo: {
    source: 'NASA SVS 3652: the sea surface density movie, a globe turning once in 60 seconds.', url: 'https://svs.gsfc.nasa.gov/3652/',
    date: 'Based on the same average density field as the map, so it has no single date.',
    colour: 'The same density colour bar as the map: pale blue is light water, dark navy and black are the densest.',
    decode: ['Each video frame is read along a strip down the middle of the globe (tools/analyse-video.html), split into 18 bands from top to bottom, and matched to the density colour bar like the map.', 'The sound follows that strip as the globe turns, so the sweep goes eastward from the Americas and around again.'],
    caveats: ['The globe is tilted and shaded, so latitudes are approximate and colours shift near the edge.', 'The longitude at each moment is assumed to start at 90° W and turn 6° a second. I read that off the frames by eye.', 'Agreement with the flat density map is modest: about 63% of cells agree on ocean or land, and values differ by about 14% of the scale on average.'],
  },
  ocean: {
    source: 'NASA SVS 3912 (ECCO2), a single frame.', url: 'https://svs.gsfc.nasa.gov/3912/', date: '19 June 2007, 12:00 UTC (frame 25000).',
    colour: 'Line colour is sea surface temperature, 0 °C (blue) to 32 °C (red).', decode: ['As in the Year of the ocean track.'], caveats: ['As in the Year of the ocean track.'],
  },
};
// Checks that were run on the decoded data (scripts in tools/, results in analysis/). They test that the decode behaves like the real thing, not that its values are exact.
DATA_INFO.year.checks = [
  'Seasonal cycle (tools/seasonal-cycle.py): a one-year harmonic fitted to the decoded temperature of each 10-degree latitude band. The northern mid-latitudes (60 to 30 N) are warmest in late August to early September and the southern ones (30 to 60 S) in late February to early March. The seasonal swing is largest at 30 to 50 degrees (amplitude about 4.5 to 4.8 °C) and small in the tropics (under 1 °C). The northern and southern mid-latitude series are strongly opposite (correlation -0.95).',
  'This is one partial year (342 days), temperature is decoded from flow-line colour in 10-degree bands, and no independent measurement was used, so it checks the behaviour of the decode, not its accuracy. The polar band (90 to 80 N) is too sparse to fit and should be ignored.',
];
DATA_INFO.sstEl = Object.assign({}, DATA_INFO.sst, { source: DATA_INFO.sst.source + ' With the El Niño layer: NASA SVS 4695 (monthly sea surface temperature anomaly maps, 1982 to 2017) and the NOAA PSL Niño 3.4 index.', url: 'https://svs.gsfc.nasa.gov/4695/', checks: [
  'El Niño layer, EOF / principal component analysis of the 432 decoded monthly anomaly maps (tools/validate-elnino.py): the first mode explains 15.7% of the variance, its time series follows NOAA\'s Niño 3.4 index with correlation +0.91, and its pattern peaks in the eastern equatorial Pacific (about 5° S, 120° W). Separately, the decoded Niño 3.4 box correlates 0.96 with the index. So the decoded maps carry the real El Niño signal.',
  'Not shown by those checks: that the values are exact. The picture\'s anomalies run a few tenths of a degree larger than NOAA\'s index, probably because of different baselines, which has not been checked. About 39% of cells (land, ice and the corner covered by NASA\'s inset) have no data.',
  'NOAA\'s index over 1948 to 2026: the strongest peak in the El Niño band is at 3.6 years, and 61% of the variance lies in the 2 to 8 year band, as expected for El Niño.',
  'Naive baselines for next month\'s index: repeating this month gives an average error of 0.18 °C, against 0.65 °C for the long-term mean (correlation from one month to the next: 0.94). This app makes no predictions; any future prediction would have to beat these.',
  '"Urgent" in Play the years: the index is at or above +1.5 °C, or it is already in the El Niño range and has risen fast and steadily: in the latest quarter at least as fast as its usual quarter-to-quarter change (a robust, median-based measure from the whole 1948 to 2026 record), and at least three-quarters as fast in the quarter before. This is descriptive, not a forecast.',
] });
DATA_INFO.lightning = {
  source: 'NASA SVS 5011, "Lightning Events Detected from the International Space Station (ISS) 2017-2023" (visualizer Michala Garrison, SSAI; data from the Lightning Imaging Sensor on the ISS).', url: 'https://svs.gsfc.nasa.gov/5011/',
  date: 'A movie of about six and a half years, from March 2017 to July 2023, with a 10-day moving window. The movie has no date labels: The dates shown are assumed: I spread 160 moments evenly from 1 March 2017 to 31 July 2023 (about 15 days apart). An attempt to check them against the seasons did not work, so treat the dates as approximate.',
  colour: 'Yellow dots are flashes. There is no colour bar: a dot carries a place and a time, not a value.',
  decode: ['For each of 160 moments the yellow pixels are counted in 18 latitude bands and four longitude sectors (the Americas; Africa, Europe and the Middle East; South and Central Asia; East Asia, Southeast Asia and Oceania), and scaled by their 97th percentile (tools/analyse-lightning.html).', 'Each count becomes a number of drum strikes, so more dots mean more strikes. The timpani roll when the all-sector total is in the top 28% of the record.'],
  caveats: ['These are dots in a picture, not flash counts: dots overlap and fade, so very dense places are undercounted.', 'The satellite sees only between about 55 degrees north and south, so there is no data beyond that.', 'The dates are assumed (the movie has no date labels), so they are approximate.', 'The drums are an artistic translation, and the drum chosen for a region is not a statement about that place.'],
};
const globeInfo = (base, noun, bar) => ({
  source: `NASA SVS 3652: the sea surface ${noun} movie, a globe turning once in 60 seconds.`, url: 'https://svs.gsfc.nasa.gov/3652/',
  date: `Based on the same average ${noun} field as the map, so it has no single date.`, colour: bar,
  decode: [`Each video frame is read along a strip down the middle of the globe (tools/analyse-video.html?kind=${base}), split into 18 bands from top to bottom, and matched to the ${noun} colour bar like the map.`, 'The sound follows that strip as the globe turns, so the sweep goes eastward from the Americas and around again.'],
  caveats: ['The globe is tilted and shaded, so latitudes are approximate and colours shift near the edge.', 'The longitude at each moment is assumed to start at 90° W and turn 6° a second, as for the density movie (read off the frames by eye).', 'Agreement with the flat map was not measured for this movie.'],
});
DATA_INFO.sstVideo = globeInfo('sst', 'temperature', 'The same temperature colour bar as the map: dark blue is near freezing, red is the warmest water.');
DATA_INFO.sssVideo = globeInfo('sss', 'salinity', 'The same salinity colour bar as the map: dark teal is fresh, white is the saltiest.');
// El Niño 2026 (NASA SVS 5683). The numbers in the checks come from tools/validate-elnino2026.py (analysis/elnino2026_validation.json).
{
  const common = {
    source: 'NASA SVS 5683, "Signs of El Niño in 2026" (visualization by Kel Elkins), the sea surface temperature anomaly panels. The SVS page names the data products behind them; I did not check which baseline NASA used.', url: 'https://svs.gsfc.nasa.gov/5683/',
    colour: 'Sea surface temperature anomaly: the difference from normal, from minus 4 °C (dark blue) through pale cream (normal) to plus 4 °C (dark red). The colour bar stops at 4, so water that is hotter or colder is read as 4.',
    checks: [
      'Against NOAA\'s weekly Niño indices (NOAA Climate Prediction Center, analysis/noaa_cpc_weekly_nino_indices.txt; tools/validate-elnino2026.py): the Niño 3.4 box decoded from the pictures follows NOAA\'s weekly index with correlation +0.994 from 29 January to 10 October 2026 (decoded minus NOAA: +0.42 °C on average, RMSE 0.44 °C) and +0.83 over the same dates in 2025 (+0.10 °C, RMSE 0.24 °C). Over both years together the correlation is +0.98. For Niño 3 and Niño 4 in 2026 it is +0.99 and +0.94.',
      'On 10 October 2026 the Niño 3.4 box decodes to +3.35 °C and NOAA\'s weekly value is +3.2 °C. Always guessing zero would be wrong by 1.80 °C (RMSE) over 2026; the decode is wrong by 0.44 °C.',
      'Not shown by these checks: that the values are exact. The decode runs warmer than NOAA\'s index in 2026. That could be a different baseline and data product (NASA\'s picture against NOAA\'s OISST and 1991 to 2020 normal), or a difference of up to four weeks in timing (shifting NOAA\'s series by 28 days fits better in 2026, with an RMSE of 0.16 °C, but not in 2025). A steadily rising series cannot tell these apart.',
      'The Niño 1+2 box, a small strip along the coast, is the weakest match in 2026 (correlation +0.94, RMSE 0.64 °C), partly because the colour bar stops at 4 °C and NOAA\'s value there reaches 5.3 °C.',
    ],
  };
  const dec1 = 'Each ocean pixel is matched to its nearest colour on NASA\'s published colour bar (tools/make-elnino2026.py). Grey pixels are land and make no sound.';
  const dec2 = 'The picture has no coordinates. Its extent (about 105° E to 40° W and 30° N to 23° S, with slightly different scales in the two directions) was fitted by matching its grey land to a public coastline, so latitudes and longitudes are approximate.';
  const cav = ['These are estimates decoded from a picture, not NASA\'s numbers. About 38% of the Niño 3.4 box sits at the end of the colour bar in October 2026, so the warmest water is under-read.',
    'The map covers only the tropical Pacific, with parts of the Atlantic and Indian oceans at its edges. The bottom two rows (about 17 to 23 degrees south) are left out of the drum rhythm and mood, as the bottom rows of the world maps are.',
    'The El Niño stories need a citation check. The sound mapping is an artistic translation.'];
  const rank = 'The mood (calm, sad or urgent) is ranked against both years together, so a normal year sounds calmer than a strong El Niño.';
  const cells = 'The map is cut into 160 columns and 18 rows. In each cell the share of pixels cooler than minus 0.5 °C, within 0.5 °C of normal, warmer than plus 0.5 °C, and more than 2 °C from normal either way become the four voices, scaled so that the strongest 5% of the two years together reach full strength. Two more counts, medium-dark red (2.5 to 3.5 °C above normal) and almost black-red (3.5 °C and above), drive the double bass chord and the low timpani rumble.';
  DATA_INFO.elnino26 = { ...common, date: '10 October 2026 (the top half of frame 2200 of NASA\'s image sequence).', decode: [dec1, dec2, cells, rank], caveats: cav };
  DATA_INFO.elnino25 = { ...common, date: '10 October 2025, one year earlier (the bottom half of the same frame). NOAA\'s Niño 3.4 value that week was about minus 0.3 °C.', decode: [dec1, dec2, cells, rank], caveats: cav };
  DATA_INFO.elninoYear = { ...common, date: '29 January to 10 October 2026: 121 of the movie\'s 1,201 frames (every tenth), blended into 160 moments. The dates were read off the labelled movie (frame 0 is 29 January and frame 1200 is 10 October) and are assumed to be even in between.',
    decode: [dec1, dec2, 'Each moment is one frame. The pitch is latitude, and each of 18 latitude bands is read across all longitudes in the picture, in the same four ways as the map records (cooler, near normal, warmer, strong).', rank],
    caveats: [...cav, 'Reading every longitude together blurs where the warm water is: the warming along the equator is mixed with cooler and warmer patches elsewhere in the same latitude band. The map records keep the longitude.'] };
}
function renderData() {
  const d = DATA_INFO[T.id], el = $('dataBody'); if (!d) { el.innerHTML = ''; return; }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;'), li = a => '<ul>' + a.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
  el.innerHTML = `<dl>
    <dt>Source</dt><dd>${esc(d.source)} <a href="${d.url}" target="_blank" rel="noopener">${d.url.replace('https://', '')}</a></dd>
    <dt>Date</dt><dd>${esc(d.date)}</dd>
    <dt>What the colours mean</dt><dd>${esc(d.colour)}</dd>
    <dt>How the values were decoded</dt><dd>${li(d.decode)}</dd>
    ${d.checks ? `<dt>Checks that were run</dt><dd>${li(d.checks)}</dd>` : ''}
    <dt>Limits and caveats</dt><dd>${li(d.caveats.concat([COMMON_LIMIT]))}</dd></dl>`;
}

// ================= HEAR THE INSTRUMENTS =================
// Plays each voice of the current track alone, with its label, so the listener can learn the mapping (and so each sound can be tested).
let demoTok = 0, demoTimers = [], demoRunning = false;
const dwait = ms => new Promise(res => { demoTimers.push(setTimeout(res, ms)); });
function demoLabel(text, k) {
  $('demoStatus').textContent = text;
  document.querySelectorAll('.voice').forEach((e, i) => e.classList.toggle('demo-on', i === k));
  return ($('speak').checked && SPEECH) ? say(text) : Promise.resolve(false);   // with spoken narration on, resolves only when the description has been read out in full
}
function stopDemo(quiet) {
  demoTok++; demoTimers.forEach(clearTimeout); demoTimers = []; demoRunning = false;
  document.querySelectorAll('.voice.demo-on').forEach(e => e.classList.remove('demo-on'));
  if (!quiet) { hardStop(); stopSpeech(); }         // the Stop button: silence now, and cut off the voice if it is still reading a description
  silenceContinuous(); if (!quiet) $('demoStatus').textContent = ''; demoBtn(false); sleepSoon(300);
}
async function demoVoice(k, tok) {
  const P = T.instruments, rows = V.rows, mid = Math.round(rows * 0.45), sp = T.species;
  await wake(); if (tok !== demoTok) return; let t = A.ctx.currentTime + 0.15;
  // Show the description, wait until it has been read out in full (if narration is on), and only then play the sound
  const lab = async (text, kk) => { await demoLabel(text, kk); if (tok !== demoTok) return false; t = A.ctx.currentTime + 0.15; return true; };
  if (T.percussionOnly) {                              // lightning: the voices are families of untuned drums, and the timpani
    if (!await lab(`${sp[k].name}: ${sp[k].sound}.`, k)) return;
    if (k === 2) { const f = mtof(scNote(38, 3)); for (let i = 0; i < 7; i++) timpStrike(t + i * 0.09, f, f, 0.14); }
    else { const S = LSECT.find(s => s.bus === k), id = lightningDrum(S.k, 10), st = INSTR[id].pat.filter(Boolean); for (let i = 0; i < 8; i++) hit(id, st[i % st.length], t + i * 0.25, 0.45, S.bus); }
    await dwait(3200); return;
  }
  if (k === 0) {
    if (!await lab(`${sp[0].name}: ${sp[0].sound}.`, 0)) return; drone(t, T.droneHz, 0.25);
    if (T.id === 'aerosols') for (let i = 0; i < 8; i++) crackle(t + 0.2 + i * 0.35, 0.18);
    await dwait(3400); if (tok === demoTok) drone(A.ctx.currentTime, T.droneHz, 0);
  } else if (k === 1) {
    if (!await lab(`${sp[1].name}: ${sp[1].sound}.`, 1)) return; pad(t, chordFor(0), 0.4, 1400); await dwait(1700); if (tok !== demoTok) return;
    pad(A.ctx.currentTime, chordFor(2), 0.4, 1400); await dwait(1700); if (tok === demoTok) pad(A.ctx.currentTime, chordFor(2), 0, 1000);
  } else if (k === 2) {
    if (!await lab(`${sp[2].name}, where it is strong: ${STRONG_NAME[P.strong]}.`, 2)) return;
    for (let i = 0; i < 10; i++) strongPlay(i * 3, t + i * 0.25, 0.25, 0.8, mid, rows);
    await dwait(3000); if (tok !== demoTok) return;
    if (!await lab(`${sp[2].name}, where it is light: ${LIGHT_NAME[P.light]}.`, 2)) return; const t2 = A.ctx.currentTime + 0.1;
    for (let i = 0; i < 6; i++) lightArp(i * 2, t2 + i * 0.5, 0.25, 0.28, mid + (i % 3), rows);
    await dwait(3400);
  } else if (k === 3) {
    if (!await lab(`${sp[3].name}: ${LEAD_NAME[P.lead]}, with gamakas (ornaments) on the notes.`, 3)) return;
    [9, 7, 5, 6, 3, 5].forEach((r, i) => lead(t + i * 0.6, bellMidi(T, r, V), 0.2, 0, 1.2));
    await dwait(4300);
  } else {
    for (const id of ['tabla', 'djembe', 'kit']) {
      if (tok !== demoTok) return; const I = INSTR[id];
      if (!await lab(`${sp[4].name}: ${I.name}, the drum of ${I.where}.`, 4)) return; const tt = A.ctx.currentTime + 0.1;
      for (let i = 0; i < 8; i++) hit(id, I.pat[i % I.pat.length] || I.filler, tt + i * 0.25, 0.5);
      await dwait(2500);
    }
    if (tok === demoTok) await demoLabel('Every region has its own drum, and the drums play faster where the data is stronger.', 4);
    if (tok === demoTok) await dwait(1500);
  }
}
async function demoOne(k) {
  if (playing) pause(); cancelGuide(); stopDemo(true); const tok = ++demoTok; demoRunning = true; demoBtn(true);
  await demoVoice(k, tok); if (tok === demoTok) { stopDemo(true); $('demoStatus').textContent = 'Done. Press Hear on another voice, or Play to hear them all together.'; }
}
function demoBtn(on) { const b = $('demoAll'); b.innerHTML = '<span class="ic" aria-hidden="true">' + (on ? '⏹' : '🎧') + '</span><span class="lb">' + (on ? 'Stop demo' : 'Hear voices') + '</span><span class="st" aria-hidden="true"></span>'; b.removeAttribute('aria-label'); b.classList.toggle('running', on); b.title = on ? 'Stop the instruments demo' : 'Hear the instruments, one after another'; }
async function demoAll() {
  if (demoRunning) { stopDemo(); return; }
  if (playing) pause(); cancelGuide(); stopSpeech(); stopDemo(true); const tok = ++demoTok; demoRunning = true; demoBtn(true);
  for (let k = 0; k < 5; k++) { if (tok !== demoTok) return; await demoVoice(k, tok); await dwait(300); }
  if (tok === demoTok) { stopDemo(true); $('demoStatus').textContent = 'That is every voice. Press Play to hear them all together.'; if ($('speak').checked && SPEECH) speak('That is every voice. Press Play to hear them all together.', true); }
}
$('demoAll').addEventListener('click', demoAll);

// ================= START SCREEN =================
const startEl = $('start');
function openStart() { $('startSpeak').checked = $('speak').checked; if (typeof startEl.showModal === 'function') { if (!startEl.open) startEl.showModal(); } else startEl.setAttribute('open', ''); $('startGo').focus(); }
function closeStart(thenDemo) {
  if ($('speak').checked !== $('startSpeak').checked) { $('speak').checked = $('startSpeak').checked; $('speak').dispatchEvent(new Event('change')); }
  try { if ($('startSeen').checked) localStorage.setItem('ej_seen', '1'); } catch (e) {}
  if (typeof startEl.close === 'function') startEl.close(); else startEl.removeAttribute('open');
  wake().then(() => { if (thenDemo) demoAll(); else sleepSoon(300); });         // this click also unlocks the browser's audio
}
$('startGo').addEventListener('click', () => closeStart(false));
$('startDemo').addEventListener('click', () => closeStart(true));
$('helpBtn').addEventListener('click', openStart);
let seen = false; try { seen = localStorage.getItem('ej_seen') === '1'; } catch (e) {}
// the jukebox home page (jukebox.js) replaces the welcome dialog; the Help buttons still open it

// ================= UI WIRING =================
function buildVoices() {
  $('voices').innerHTML = ''; meters.length = 0;
  T.species.forEach((s, k) => {
    const d = document.createElement('div');
    d.className = 'voice'; d.style.borderLeftColor = s.color;
    d.innerHTML = `<label><input type="checkbox" checked> <strong style="color:${s.color}">${s.name}</strong></label>
      ${k === 4 ? '<small id="drumNow" style="color:var(--text)">Drums now: silent</small>' : ''}<button type="button" class="hear secondary" aria-label="Hear ${s.name} on its own"><span aria-hidden="true">▶</span> Hear</button><div class="meter" aria-hidden="true"><i style="color:${s.color}"></i></div>`;
    $('voices').appendChild(d);
    const cb = d.querySelector('input');
    cb.setAttribute('aria-label', `${s.name} voice on: ${s.sound}`);
    cb.addEventListener('change', () => { if (A) A.bus[k].gain.setTargetAtTime(cb.checked ? busGain(k) : 0, A.ctx.currentTime, 0.05); });
    d.querySelector('.hear').addEventListener('click', () => demoOne(k));
    meters.push({ cb, bar: d.querySelector('i') });
  });
  if (A) A.bus.forEach((g, k) => g.gain.setTargetAtTime(meters[k] && !meters[k].cb.checked ? 0 : busGain(k), A.ctx.currentTime, 0.05));
}
function setTrack(i) {
  if (window.EJ_followStop) window.EJ_followStop();
  if (playing) pause(); stopSpeech(); lastNarrCol = -1;
  T = TRACKS[i]; document.title = 'Earth Jukebox – ' + T.name; $('stage').setAttribute('aria-label', `${T.name}: the picture. Use arrow keys to explore, Enter to hear a spot, Space to play or pause.`); V = mkView(T.grid); computeRegions(); computeDrumModel(); computeEmotion(); lastInstr = null; narrReset(); pos = 0; cur = null; queue = []; lastSpoken = '';
  const vid = $('vid');
  if (T.video) { $('map').style.display = 'none'; vid.style.display = 'block'; vid.setAttribute('aria-label', T.alt); vid.src = T.video; $('vcap').style.display = 'block'; $('vcap').textContent = ''; }
  else { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.style.display = 'none'; $('vcap').style.display = 'none'; $('map').style.display = 'block'; $('map').src = T.image; $('map').alt = T.alt; }
  if ($('lightLayer')) $('lightLayer').style.display = T.id === 'lightning' ? 'block' : 'none';
  stage.classList.toggle('letterbox', /^elnino/.test(T.id));          // the El Niño picture is wide and short: it sits in a screen the same size as the others, with empty black space above and below
  $('vcap').style.display = (T.video || T.timeAxis) ? 'block' : 'none'; $('tlineWrap').style.display = T.timeAxis ? 'block' : 'none';
  $('help').textContent = T.timeAxis ? 'Drag the time slider to move through the year. Click or tap the picture to hear the latitude you click, at the current time. With a keyboard: left and right arrows move through time, up and down change latitude, Enter replays the spot, Space plays or pauses.' : HELP0;
  if (T.timeAxis) { T._pre = T._pre || T.frames.map(s => { const i = new Image(); i.src = s; return i; }); lastFrameIdx = -1; $('tline').max = V.cols - 1; $('vcap').textContent = dateLabel(T.grid.dates[0]); }
  $('dur').disabled = !!T.fixedDur;                                   // the video track runs at the video's own speed
  if (T.fixedDur) { if (durBackup === null) durBackup = $('dur').value; $('dur').value = T.fixedDur; } else if (durBackup !== null) { $('dur').value = durBackup; durBackup = null; }
  $('durOut').textContent = $('dur').value + ' s'; $('trackIntro').textContent = T.intro;
  $('legend').innerHTML = T.legend; renderData(); stopDemo(true); $('demoStatus').textContent = '';
  $('how').innerHTML = '<tr><th>In the picture</th><th>In the sound</th></tr>' + T.how.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('');
  cursorEl.style.display = 'none'; playhead.style.display = 'none';
  buildVoices(); meters.forEach(m => { m.bar.style.width = '0'; }); applyPalette();
  document.querySelectorAll('#tracks button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.track === T.id)));
  setReadout(`Track: ${T.name}. Press play, or click the map.`);
}
// El Niño ('sstEl') is switched off for now: its map image does not look good enough. Its code stays, so it can be put back by adding it here and to the sea temperature entry in jukebox.js, and by adding the <script> tags for elnino_grid.js and elnino_fine.js (about 5.8 MB, left out of the page for now) back to index.html.
const TAB_ORDER = ['year', 'ocean', 'aerosols', 'sst', 'sstVideo', 'sss', 'sssVideo', 'density', 'densityVideo', 'lightning', 'elnino26', 'elnino25', 'elninoYear'];        // the single-frame "Ocean currents" track is hidden: the Year track covers the same data and adds time
const tabIndex = id => TRACKS.findIndex(t => t.id === id);
TAB_ORDER.forEach(id => {
  const i = tabIndex(id); if (i < 0) return; const t = TRACKS[i];
  const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary tab'; b.dataset.track = id;
  b.innerHTML = `<span aria-hidden="true">${t.emoji}</span> ${t.name}`; b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => setTrack(i)); $('tracks').appendChild(b);
});
function togglePlay() { if (guiding) cancelGuide(); else if (playing) pause(); else play(); }
$('play').addEventListener('click', togglePlay);
$('tline').addEventListener('input', e => { const c = +e.target.value; seek(c); updateMeters(c); if ($('narrate').checked) narrateTour(c, true); });   // drag the time slider through the year
$('restart').addEventListener('click', () => { cancelGuide(); if (playing) pause(); seek(0); play(); });
$('skip').addEventListener('click', () => { guideSkip = true; stopSpeech(); });
$('vol').addEventListener('input', applyVolume);
$('dur').addEventListener('input', e => { $('durOut').textContent = e.target.value + ' s'; if (playing) seek(Math.floor(pos)); });
// stop everything when the page is hidden, backgrounded or closed
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
window.addEventListener('pagehide', () => { stopSpeech(); if (playing) pause(); if (A) { try { A.ctx.close(); } catch (e) {} A = null; } });
// Offline render for measuring the mix (debug only): plays the sweep into an OfflineAudioContext and reports levels.
async function renderOffline(i, seconds, solo, winSec) {          // solo: one bus, or a list of buses; win: also return the level of each window of that many seconds
  const keep = A; A = null; setTrack(i); clearTimeout(idleTimer);        // setTrack arms the idle shut-down timer, which would mute this offline graph
  const sr = 22050, ctx = new OfflineAudioContext(2, Math.round(sr * seconds), sr);
  initAudio(ctx);
  A.bus.forEach((g, k) => { g.gain.value = (solo === undefined || solo === k || (Array.isArray(solo) && solo.includes(k))) ? busGain(k) : 0; });
  const step = 0.25, n = Math.floor(seconds / step); gridOrigin = 0.05; timpFreq = null;
  for (let c = 0; c < n; c++) { const cc = Math.floor(c * V.cols / n), { tot, cen } = colStats(cc); setScaleFor(cc); T.schedule(cc, 0.05 + c * step, step, tot, cen, V); if (deepOff !== 'only') urgentFx(cc, 0.05 + c * step, step); }
  const buf = await ctx.startRendering(); A = keep;
  const d = buf.getChannelData(0), win = Math.round(sr * 0.5), wins = []; let sum = 0, peak = 0, aSum = 0, aN = 0, nw = 0;
  if (winSec) { const w = Math.round(sr * winSec); for (let k = 0; k + w <= d.length; k += w) { let s2 = 0; for (let j = k; j < k + w; j++) s2 += d[j] * d[j]; wins.push(+(10 * Math.log10(s2 / w + 1e-12)).toFixed(1)); } }
  for (let w = 0; w + win <= d.length; w += win) { let s2 = 0; for (let j = w; j < w + win; j++) { const x = d[j]; s2 += x * x; if (Math.abs(x) > peak) peak = Math.abs(x); } sum += s2; nw++; if (s2 / win > 1e-7) { aSum += s2 / win; aN++; } }
  // A-weighted level of the active parts: closer to what a listener hears, because very low notes count for little on ordinary speakers
  const act = []; for (let w = 0; w + win <= d.length; w += win) { let s2 = 0; for (let j = w; j < w + win; j++) s2 += d[j] * d[j]; if (s2 / win > 1e-7) for (let j = w; j < w + win; j++) act.push(d[j]); }
  let aw = -120; if (act.length > 4096) {
    let N = 1; while (N < act.length) N <<= 1; const re = new Float64Array(N), im = new Float64Array(N); act.forEach((x, j) => { re[j] = x; });
    for (let j = 1, b = 0; j < N; j++) { let bit = N >> 1; for (; b & bit; bit >>= 1) b ^= bit; b ^= bit; if (j < b) { [re[j], re[b]] = [re[b], re[j]]; } }
    for (let len = 2; len <= N; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i0 = 0; i0 < N; i0 += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const a = i0 + j, bb = a + len / 2, tr = re[bb] * cr - im[bb] * ci, ti = re[bb] * ci + im[bb] * cr; re[bb] = re[a] - tr; im[bb] = im[a] - ti; re[a] += tr; im[a] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
    let ms = 0; for (let k = 1; k < N / 2; k++) { const f = k * sr / N, f2 = f * f, ra = 12194 * 12194 * f2 * f2 / ((f2 + 20.6 * 20.6) * Math.sqrt((f2 + 107.7 * 107.7) * (f2 + 737.9 * 737.9)) * (f2 + 12194 * 12194)); ms += (re[k] * re[k] + im[k] * im[k]) * ra * ra * 1.2589; } // +2 dB makes A(1 kHz) = 0 dB
    aw = 10 * Math.log10(2 * ms / (N * N) * (N / act.length) / 1) ;
  }
  const db = v => v > 0 ? 20 * Math.log10(v) : -120;
  return { aw: +aw.toFixed(1), rms: +db(Math.sqrt(sum / (nw * win))).toFixed(1), active: aN ? +db(Math.sqrt(aSum / aN)).toFixed(1) : -120, peak: +db(peak).toFixed(1), activeShare: +(aN / nw).toFixed(2), wins };
}

window.EJ = { get A() { return A; }, get T() { return T; }, get playing() { return playing; }, scoreOn, INSTR,
  traceContext() {                                   // what the note trace (trace.js) records about the column, step or month being scheduled
    const x = window.EJ_traceExtra, sc = SCALE, base = { track: T.id, scale: sc.name, scale_region: sc.reg, mood: EMO.urgent > 0.3 ? 'urgent' : EMO.troubled ? 'sad' : 'calm', urgency: +EMO.urgent.toFixed(2) };
    if (x) return Object.assign(base, x);
    const c = traceCol; if (c === null || !V) return base;
    const { tot } = colStats(c), o = Object.assign(base, { kind: 'sweep column', column: c, longitude_deg: T.timeAxis ? null : +lonOf(c).toFixed(1), data_channels: tot.slice(0, 4).map(v => +v.toFixed(3)), data_strength_rank: +colRank(c).toFixed(3),
      source: T.timeAxis ? T.frames[c] : (T.video || T.image) });
    if (T.timeAxis) o.date_utc = T.grid.dates[c]; if (T.video) o.video_seconds = +(c / V.cols * T.grid.dur).toFixed(2);
    if (window.EJ_elnino && window.EJ_elnino.active()) Object.assign(o, window.EJ_elnino.trace(c));
    return o;
  },
  latFromLead(midi) {                                // the latitude a lead note stands for (pitch is latitude in the sweep); '' if it cannot be told
    const L = LEADS[T.instruments.lead], span = scSpan(L.span);
    for (let i = 0; i <= span + 5; i++) if (scNote(L.root, i) === midi) return +(latOf(Math.round((1 - Math.min(1, i / span)) * (V.rows - 1)))).toFixed(0);
    return '';
  },
  settings: () => ({ sound_source: $('source').value, regional_scales_and_emotion: regionsOn(), skip_antarctic_drone: $('skipAnt').checked, tour_length_seconds: +$('dur').value, instruments: T.instruments, channel_names: T.species.slice(0, 4).map(s => s.name), image: T.image, video: T.video || null, grid_columns: V.cols, grid_rows: V.rows }),
  dataInfo: () => DATA_INFO[T.id] || null, commonLimit: COMMON_LIMIT, sourceName: id => (INSTR[id] ? INSTR[id].name : id),
  follow: {                                          // what the "Follow a current" feature (follow.js) needs from the sound engine
    wake, lead, pad, drone, pluck, chordFor, regionAt, SCALES, silence: silenceContinuous, pauseSweep: () => { if (playing) pause(); },
    hold: on => { holdAudio = on; }, hardStop, stopAll: () => { cancelGuide(); stopSpeech(); if (playing) pause(); stopDemo(true); hardStop(); }, setBar: n => { curBar = n; },
    scale: () => SCALE, say: s => setReadout(s),
    setScaleAt(lon, lat, trb, urg) { const h = holdFor(regionAt(lon, lat), trb), reg = h[0], trbH = h[1], def = SCALES[reg] || SCALES.ocean, pick = trbH ? def.sad : def.calm; SCALE = { deg: pick[1], name: pick[0], place: def.place, reg, thirds: !!def.thirds, trb: trbH }; EMO.troubled = trbH; EMO.urgent = urg; EMO.concern = trb ? 0.7 : 0.2; return SCALE; },
    valueMidi(frac) { const L = LEADS[T.instruments.lead]; return scNote(L.root, Math.round(Math.max(0, Math.min(1, frac)) * scSpan(L.span))); },
    urgentAt(t, step, t0) { gridOrigin = t0; urgentFx(0, t, step); },
    droneHz: () => T.droneHz, lightKind: () => T.instruments.light,
  } };   // read-only view for the scrolling sheet music (sheet.js)
if (location.search.includes("debug")) window.__jb = { setDeepOff: v => { deepOff = v; }, loadSamples, SM, TRACKS, musicBuffers, scoreBuffers, startMusic, setTrack, renderOffline, wake, colStats, get T() { return T; }, get V() { return V; }, get A() { return A; } };   // test hook, only with ?debug in the address
setTrack(tabIndex('year') >= 0 ? tabIndex('year') : 0);
})();
