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
    intro: '',
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
Object.keys(PALETTE).forEach(id => { const tr = TRACKS.find(t => t.id === id); if (tr) tr.instruments = PALETTE[id]; });
// Per-track voice balance [drone, chords, high, lead, drums], set from offline renders (A-weighted levels, see PROCESS.md). Multipliers on the global TRIM.
const TRIMS = { year: [4.64, 1.55, 1.33, 1.86, 1.9], aerosols: [5.0, 4.58, 4.74, 0.44, 3.58], sst: [2.86, 2.17, 0.75, 0.43, 3.64], sss: [5.0, 5.73, 1.38, 0.58, 4.27], density: [1.46, 1.34, 1.05, 1.5, 3.82], densityVideo: [2.39, 1.18, 1.1, 3.39, 5.13] };
Object.keys(TRIMS).forEach(id => { const tr = TRACKS.find(t => t.id === id); if (tr) tr.trim = TRIMS[id]; });
// The same balance for the MuseScore instrument sounds (source "samples"): each voice re-measured offline and scaled to the same A-weighted targets (see PROCESS.md).
const TRIMS_S = { year: [1.34, 0.30, 0.93, 1.64, 1.9], aerosols: [2.6, 1.66, 2.12, 1.12, 3.58], sst: [2.35, 0.27, 0.31, 0.87, 3.64], sss: [1.33, 0.99, 0.68, 0.79, 4.27], density: [0.44, 0.27, 1.14, 1.34, 3.82], densityVideo: [0.74, 0.24, 1.68, 2.79, 5.13] };
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
function applyPaletteText(tr) {                       // rewrite the instrument wording of a track from its palette, so the text always matches the sound
  const P = tr.instruments, X = PALETTE_TEXT[tr.id]; if (!P || !X) return;
  const cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const d = DRONES[P.drone].name, p = PADS[P.pad].name, hs = `${STRONG_NAME[P.strong]} where it is strong and ${LIGHT_NAME[P.light]} where it is light`, l = LEAD_NAME[P.lead];
  const plural = /fronts|eddies|currents/i.test(X.names[3]), ex = X.extra0 || '';
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

// ================= STATE / VIEW =================
let T = TRACKS[0], V = null;                       // current track and its grid view
const mkView = g => ({ cols: g.cols, rows: g.rows, mean: (c, r) => g.mean ? g.mean[r * g.cols + c] / 255 : 0, cov: (c, r) => g.cov ? g.cov[r * g.cols + c] / 255 : 1, val: (c, r, k) => k === 4 ? g.land[r * g.cols + c] / 255 : g.data[((r * g.cols + c) * 4) + k] / 255 });
const HELP0 = $('help').textContent;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateLabel = iso => { const d = new Date(iso.replace('Z', ':00Z')); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const lonOf = c => T.lonFn ? T.lonFn(c) : -180 + (c + 0.5) / V.cols * 360;
const latOf = r => 90 - (r + 0.5) / V.rows * 180;
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
function chordFor(k) {                                    // the pad chord for latitude band k (0..3), built on the current scale
  const n = SCALE.deg.length, j = [0, 1, Math.round(n * 0.6), Math.round(n * 0.4)][k], R = scNote(50, j);
  if (SCALE.thirds) return [R, R + (SCALE.trb ? 3 : 4), R + 7];                 // Latin America: chords of major thirds, or minor thirds when troubled
  return n >= 7 ? [R, scNote(50, j + 2), scNote(50, j + 4)] : [R, scNote(50, j + 2), scNote(50, j + 3)];
}
function setScaleFor(c, r) {                              // choose the scale and mood for column c (and, when clicking, the region of row r)
  if (!regionsOn() || !V.emo) { SCALE = FIXED_SCALE; EMO.troubled = false; EMO.urgent = 0; EMO.concern = 0; return SCALE; }
  const e = V.emo, reg = (r != null && !T.timeAxis && V.reg && V.reg[r * V.cols + c]) || e.reg[c], def = SCALES[reg] || SCALES.ocean, trb = !!e.tro[c], pick = trb ? def.sad : def.calm;
  SCALE = { deg: pick[1], name: pick[0], place: def.place, reg, thirds: !!def.thirds, trb };
  EMO.troubled = trb; EMO.urgent = e.urg[c]; EMO.concern = e.con[c];
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
  noteLog(2, t, midi, 0.5);                           // sheet music
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
  if (kind !== 'gong' || c % 3 === 0) noteLog(2, t, kind === 'marimba' ? scNote(50, latIdx(cenRow, rows, 8)) : kind === 'vibes' ? pluckMidi('harp', latIdx(cenRow, rows, 8)) : kind === 'gong' ? scNote(38, latIdx(cenRow, rows, 8)) + 12 : scNote(38, latIdx(cenRow, rows, 8)), step);   // sheet music
  if (kind === 'timpani') {                           // quiet roll, tuned to the latitude and gliding between columns
    const f = mtof(scNote(38, latIdx(cenRow, rows, 8))), n = Math.max(2, Math.round(step / 0.075)), from0 = timpFreq || f;
    for (let i = 0; i < n; i++) timpStrike(t + i * step / n, f, i === 0 ? from0 : f, (0.05 + 0.07 * level) * (0.85 + Math.random() * 0.3));
    timpFreq = f;
  } else if (kind === 'marimba') {                    // a soft mallet roll
    const f = mtof(scNote(50, latIdx(cenRow, rows, 8))), n = Math.max(2, Math.round(step / 0.06));
    for (let i = 0; i < n; i++) barStrike(t + i * step / n, f, (0.05 + 0.08 * level) * (0.85 + Math.random() * 0.3), 0.5, false);
  } else if (kind === 'vibes') {                      // a gentle trill between two neighbouring scale notes
    const i0 = latIdx(cenRow, rows, 8), fa = mtof(pluckMidi('harp', i0)), fb = mtof(pluckMidi('harp', i0 + 1)), n = Math.max(2, Math.round(step / 0.11));
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
  if (gain > 0.001) { const m = Math.round(69 + 12 * Math.log2(hz / 440)); noteLog(0, t, m, 0.6); noteLog(0, t, m + Math.round(12 * Math.log2(A.droneRatio)), 0.6); }   // sheet music
  if (sampleOn() && SM.buf) { droneSample(t, hz, gain); return; }
  A.d1.frequency.setTargetAtTime(hz, t, 0.2); A.d2.frequency.setTargetAtTime(hz * A.droneRatio, t, 0.2); A.droneGain.gain.setTargetAtTime(gain * 0.4 * A.droneScale, t, 0.4); }
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
  noteLog(3, t, midi, durIn || 1.4);                  // sheet music
  const { ctx, bus, nb } = A, name = T.instruments.lead, L = LEADS[name], f = mtof(midi), dur = durIn || 1.4;
  const dg = SCALE.deg, nd = dg.length, di = Math.max(0, dg.indexOf(mod(midi - 62, 12)));       // position of this note in the current scale
  const below = Math.max(1, dg[di] - (di ? dg[di - 1] : dg[nd - 1] - 12)), above = Math.max(1, (di < nd - 1 ? dg[di + 1] : dg[0] + 12) - dg[di]);   // semitone gaps to the neighbouring scale notes, for the gamaka
  const type = di === 0 ? (Math.random() < 0.3 ? 'jaru' : 'plain') : GAMAKA[di % 5];
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
function strike(t, g, comps) {
  const { ctx, bus, nb } = A;
  comps.forEach(cp => {
    if (cp[0] === 't') {
      const [, f0, f1, dur, amp] = cp, o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.min(dur, 0.15));
      og.gain.setValueAtTime(g * amp, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(og); og.connect(bus[4]); o.start(t); o.stop(t + dur + 0.02);
    } else {
      const [, fr, q, dur, amp, type] = cp, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), og = ctx.createGain();
      f.type = type || 'bandpass'; f.frequency.value = fr; f.Q.value = q;
      og.gain.setValueAtTime(g * amp, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.buffer = nb; s.connect(f); f.connect(og); og.connect(bus[4]); s.start(t, Math.random() * 1.5, dur + 0.02);
    }
  });
}
function hit(id, stroke, t, g) { noteLog(4, t, 0, 0.12, stroke, id); const I = INSTR[id]; if (I && stroke) strike(t, g, STROKES[I.kit][stroke]); }

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
  loadSorted = colLoad.slice().sort((a, b) => a - b);
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
  let div = sp.div; if (div === 8 && Math.random() < 0.4) div = 4;               // demisemiquavers: only the very strongest columns, and not always
  const I = INSTR[id], u = CROTCHET / div, base = 0.25 + 0.3 * sp.rank;
  const accent = colLoad[c] - colLoad[(c + V.cols - 1) % V.cols] > accentThr ? 1.5 : 1;   // data jumps up (edge of a plume or current): louder hits
  for (let k = Math.ceil((t - gridOrigin) / u - 1e-6); gridOrigin + k * u < t + step - 1e-6; k++) {
    const tt = gridOrigin + k * u;
    if (k % div === 0) hit(id, I.pat[(k / div) % I.pat.length], tt, base * accent);          // on the beat: the instrument's own 8-beat pattern
    else hit(id, I.filler, tt, base * (div === 8 ? 0.35 : 0.5));                              // between beats: light fillers
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
  if (u < 0.3) return;
  const q = CROTCHET / 2, fig = [50, 50, 51, 50];
  for (let k = Math.ceil((t - gridOrigin) / q - 1e-6); gridOrigin + k * q < t + step - 1e-6; k++) stab(gridOrigin + k * q, fig[mod(k, 4)], 0.03 + 0.05 * u, 0.2);
}
function crackle(t, gain) {
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
let lastFrameIdx = -1, durBackup = null, sweepEnded = false, sweepEndTime = 0, guiding = false, guideTok = 0, guideSkip = false, lastNarrCol = -1, lastInstr = null, playing = false, nextCol = 0, nextTime = 0, timer = null, queue = [], pos = 0, lastSpoken = '', cur = null;
const stepDur = () => $('dur').value / V.cols;
function scheduler() {
  const ctx = A.ctx, step = stepDur();
  while (!sweepEnded && nextTime < ctx.currentTime + 0.3) {
    if (nextCol >= V.cols) { sweepEnded = true; sweepEndTime = nextTime; break; }   // the sweep plays once and stops at the east edge
    const { tot, cen } = colStats(nextCol);
    setScaleFor(nextCol);                                                          // scale and mood of this column (regional scale, calm or troubled)
    T.schedule(nextCol, nextTime, step, tot, cen, V);
    urgentFx(nextCol, nextTime, step);
    queue.push({ c: nextCol, t: nextTime, step });
    nextCol++; nextTime += step;
  }
}
let idleTimer = null, starting = false;
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
    if (!A || playing || starting || guiding) return;
    A.gate.gain.setTargetAtTime(0, A.ctx.currentTime, 0.02);
    idleTimer = setTimeout(() => { if (!playing && !starting && !guiding) shutdownAudio(); }, 150);
  }, ms);
}
async function play() {
  if (playing || starting) return; starting = true;
  try { await wake(); } finally { starting = false; }
  if (SPEECH && $('speak').checked && pos < 1.5) { const ok = await runGuide(); if (!ok) return; }   // spoken overview + listening guide first
  clearInterval(timer); playing = true; sweepEnded = false; timpFreq = null; nextTime = A.ctx.currentTime + 0.1; gridOrigin = nextTime; nextCol = Math.floor(pos); if (nextCol >= V.cols) nextCol = 0; queue = [];
  timer = setInterval(scheduler, 50); scheduler();
  startVideo(); if (scoreOn()) startScore(); else { A.live.gain.value = 1; startMusic(); }
  $('play').textContent = '⏸ Pause'; $('play').setAttribute('aria-pressed', 'true');
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
$('music').addEventListener('change', () => {
  if (!A) return;
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
$('source').addEventListener('change', () => {                    // the source is chosen at the start of a sweep: stop, and say what will play next
  const s = scoreOn(); $('music').disabled = s; if (playing) pause();
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
    D.voices = [m1, m1 + 12 * Math.log2(a.droneRatio)].map(mm => samplePlay(inst, mm, t, 600, 1, D.g, { loop: true, att: 0.5, rel: 0.3 })).filter(Boolean); D.key = inst;
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
function pause() {
  playing = false; if (T.video) $('vid').pause(); stopSpeech(); clearInterval(timer); timer = null; silenceContinuous();
  if (A) A.gate.gain.setTargetAtTime(0, A.ctx.currentTime, 0.03);   // cut scheduled notes and the reverb tail right away
  sleepSoon(250);
  $('play').textContent = '▶ Play the globe'; $('play').setAttribute('aria-pressed', 'false');
}
function seek(col) { lastNarrCol = -1; pos = col; if (T.video) $('vid').currentTime = col / V.cols * T.grid.dur; queue = []; sweepEnded = false; if (playing) { nextCol = col; nextTime = A.ctx.currentTime + 0.05; } setHead(col); }
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
    if (q.c !== lastNarrCol) { lastNarrCol = q.c; if ($('narrate').checked) narrateTour(q.c); }
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
    else { const reg = V.emo.reg[c], d = SCALES[reg] || SCALES.ocean, trb = V.emo.tro[c], u = V.emo.urg[c]; sn.textContent = `Scale: ${(trb ? d.sad : d.calm)[0]}, for ${d.place}. Mood: ${u > 0.3 ? 'urgent, because the data is at its strongest and rising: something is wrong' : trb ? 'troubled and sad, because the data is strong' : 'calm and hopeful, because the data is light'}.`; }
  }
  if (T.video) $('vcap').textContent = `Video time ${Math.round((c + 0.5) * T.grid.dur / V.cols)} s: the beam is at about ${fmtLon(lonOf(c))}`;
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
function narrateTour(c) {
  const lon = lonOf(c), msgs = [], hits = [];
  T.hotspots.forEach(h => { if (lonOf(c - 1) < h.say && lon >= h.say) { msgs.push(h.name); hits.push(h); } });
  if (c === 0) msgs.push('starting at the dateline in the Pacific');
  const sp = speedOf(c), id = sp ? dominantRegion(c) : null;
  if (id && id !== lastInstr) msgs.push('the drums change to ' + INSTR[id].name + ', from ' + INSTR[id].where);
  if (id) lastInstr = id;
  if (msgs.length && $('narrate').checked) { const m = (T.timeAxis ? dateLabel(T.grid.dates[c]) : 'Longitude ' + fmtLon(lon)) + ': ' + msgs.join(' and ') + '.'; if (m !== lastSpoken) { lastSpoken = m; setReadout(m); } }
}

// ================= SPOKEN NARRATION (browser speech synthesis) =================
const SPEECH = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
let speechQ = [], speaking = false, curUtt = null;
function applyVolume() { if (A) A.master.gain.setTargetAtTime($('vol').value / 100 * 0.95 * (speaking ? 0.35 : 1), A.ctx.currentTime, 0.1); }   // music ducks while the voice speaks
function speak(text, interrupt) {
  if (!SPEECH || !$('speak').checked) return;
  if (interrupt) { speechQ = []; curUtt = null; speechSynthesis.cancel(); speaking = false; }
  speechQ.push(text); if (speechQ.length > 3) speechQ.shift();
  nextSpeech();
}
function nextSpeech() {
  if (speaking || !speechQ.length) return;
  const u = new SpeechSynthesisUtterance(speechQ.shift()); curUtt = u;
  const v = speechSynthesis.getVoices().find(x => x.name === $('voice').value);
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = 0.95;
  const done = () => { if (curUtt !== u) return; speaking = false; applyVolume(); nextSpeech(); };
  u.onend = done; u.onerror = done;
  speaking = true; applyVolume(); speechSynthesis.speak(u);
}
function stopSpeech() { speechQ = []; curUtt = null; if (SPEECH) speechSynthesis.cancel(); speaking = false; applyVolume(); }

// ---- Guided tour: 1) describe the image west to east, 2) explain how to listen, 3) the sweep plays once in silence from the narrator ----
function guideSentences() {
  if ($('introLen').value === 'short') {              // about 20 seconds: what it shows, how to listen, then play
    const what = T.speech.open[0].replace(/^Welcome to the Earth Jukebox\.\s*/, '').trim();
    const travel = T.timeAxis ? 'The sweep runs through the year.' : T.video ? 'The sweep follows the line down the middle of the turning globe.' : 'The sweep travels from west to east.';
    return [what, travel + ' Pitch tells you the latitude: higher notes are further north.', 'Each kind of data has its own instrument, and the drums speed up where the data is stronger. Use the Hear the instruments button to learn them.', 'The sweep will now play once, and then stop.'];
  }
  const sl = T.startLon === undefined ? -180 : T.startLon, hs = [...T.hotspots].sort((a, b) => (((a.say - sl) % 360) + 360) % 360 - (((b.say - sl) % 360) + 360) % 360);
  return [...T.speech.open, ...hs.map(h => `${cap(h.name)}. ${h.story}`), 'That is the whole picture.', ...T.speech.listen];
}
function say(text) {                                 // speak one sentence and resolve when it has finished (or after a safety timeout)
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text); curUtt = u;
    const v = speechSynthesis.getVoices().find(x => x.name === $('voice').value);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 0.95;
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
  $('play').textContent = on ? '⏹ Stop intro' : '▶ Play the globe'; $('play').setAttribute('aria-pressed', String(on));
}
async function runGuide() {
  stopSpeech(); guiding = true; guideSkip = false; const tok = ++guideTok; showGuideUI(true);
  setReadout('Spoken guide: first a description of the image, then how to listen. The sweep starts afterwards. Use "Skip intro" to go straight to the sweep.');
  let failed = false;
  for (const s of guideSentences()) { if (tok !== guideTok || guideSkip) break; if (!(await say(s)) && tok === guideTok && !guideSkip) { failed = true; break; } }
  const ok = tok === guideTok; guiding = false; showGuideUI(false);
  if (ok) setReadout(failed ? 'Speech did not start in this browser or on this device (no voice or sound output), so the spoken intro was skipped. The sweep plays now.' : 'Playing the sweep once, from west to east.');
  return ok;
}
function cancelGuide() { if (!guiding) return; guideTok++; guiding = false; stopSpeech(); showGuideUI(false); setReadout('Intro stopped. Press play to start again.'); }
function finishSweep() {                             // the sweep reached the east edge: let the last notes ring out, then stop
  if (T.video) $('vid').pause();
  clearInterval(timer); timer = null; playing = false; silenceContinuous(); fadeMusic(0.8); sleepSoon(3000);
  $('play').textContent = '▶ Play the globe'; $('play').setAttribute('aria-pressed', 'false');
  pos = 0; lastNarrCol = -1; setHead(V.cols);
  setReadout('The sweep has reached the end. Press play to hear it again, or click the map to explore.');
  speak('The sweep has reached the end.');
}
function fillVoices() {
  if (!SPEECH) return; const sel = $('voice'), keep = sel.value, vs = speechSynthesis.getVoices();
  sel.innerHTML = vs.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
  const en = vs.find(v => /^en/i.test(v.lang) && v.default) || vs.find(v => /^en/i.test(v.lang));
  sel.value = vs.some(v => v.name === keep) ? keep : (en ? en.name : (vs[0] ? vs[0].name : ''));
}
if (SPEECH) { fillVoices(); speechSynthesis.addEventListener('voiceschanged', fillVoices); }
else { $('speak').disabled = true; $('speak').parentElement.title = 'Speech is not supported in this browser'; }
try { $('speak').checked = SPEECH && localStorage.getItem('ej_speak') === '1'; } catch (e) { $('speak').checked = false; }   // off by default, remembered
try { $('introLen').value = localStorage.getItem('ej_intro') === 'full' ? 'full' : 'short'; } catch (e) {}
$('introLen').addEventListener('change', () => { try { localStorage.setItem('ej_intro', $('introLen').value); } catch (e) {} });
try { $('skipAnt').checked = localStorage.getItem('ej_skipant') === '1'; } catch (e) {}
$('skipAnt').addEventListener('change', () => { try { localStorage.setItem('ej_skipant', $('skipAnt').checked ? '1' : '0'); } catch (e) {} if (V) updateMeters(Math.max(0, Math.min(V.cols - 1, Math.floor(pos)))); });
$('speak').addEventListener('change', () => {
  try { localStorage.setItem('ej_speak', $('speak').checked ? '1' : '0'); } catch (e) {}
  if (!$('speak').checked) stopSpeech(); else speak('Spoken narration is on.', true);
});
$('voice').addEventListener('change', () => { if ($('speak').checked) speak('This is how I sound.', true); });
const setReadout = t => { $('readout').textContent = t; };

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
  const b = stage.getBoundingClientRect();
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
const COMMON_LIMIT = 'The sound mapping (pitch, instruments, drums, scale) is an artistic translation. It is not a measurement of anything in the ocean or atmosphere.';
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
function renderData() {
  const d = DATA_INFO[T.id], el = $('dataBody'); if (!d) { el.innerHTML = ''; return; }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;'), li = a => '<ul>' + a.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
  el.innerHTML = `<dl>
    <dt>Source</dt><dd>${esc(d.source)} <a href="${d.url}" target="_blank" rel="noopener">${d.url.replace('https://', '')}</a></dd>
    <dt>Date</dt><dd>${esc(d.date)}</dd>
    <dt>What the colours mean</dt><dd>${esc(d.colour)}</dd>
    <dt>How the values were decoded</dt><dd>${li(d.decode)}</dd>
    <dt>Limits and caveats</dt><dd>${li(d.caveats.concat([COMMON_LIMIT]))}</dd></dl>`;
}

// ================= HEAR THE INSTRUMENTS =================
// Plays each voice of the current track alone, with its label, so the listener can learn the mapping (and so each sound can be tested).
let demoTok = 0, demoTimers = [], demoRunning = false;
const dwait = ms => new Promise(res => { demoTimers.push(setTimeout(res, ms)); });
function demoLabel(text, k) {
  $('demoStatus').textContent = text;
  document.querySelectorAll('.voice').forEach((e, i) => e.classList.toggle('demo-on', i === k));
  if ($('speak').checked && SPEECH) speak(text, true);
}
function stopDemo(quiet) {
  demoTok++; demoTimers.forEach(clearTimeout); demoTimers = []; demoRunning = false;
  document.querySelectorAll('.voice.demo-on').forEach(e => e.classList.remove('demo-on'));
  silenceContinuous(); if (!quiet) $('demoStatus').textContent = ''; $('demoAll').textContent = '🎧 Hear the instruments'; $('demoAll').setAttribute('aria-pressed', 'false'); sleepSoon(300);
}
async function demoVoice(k, tok) {
  const P = T.instruments, rows = V.rows, mid = Math.round(rows * 0.45), sp = T.species;
  await wake(); if (tok !== demoTok) return; const t = A.ctx.currentTime + 0.15;
  if (k === 0) {
    demoLabel(`${sp[0].name}: ${sp[0].sound}.`, 0); drone(t, T.droneHz, 0.25);
    if (T.id === 'aerosols') for (let i = 0; i < 8; i++) crackle(t + 0.2 + i * 0.35, 0.18);
    await dwait(3400); if (tok === demoTok) drone(A.ctx.currentTime, T.droneHz, 0);
  } else if (k === 1) {
    demoLabel(`${sp[1].name}: ${sp[1].sound}.`, 1); pad(t, chordFor(0), 0.4, 1400); await dwait(1700); if (tok !== demoTok) return;
    pad(A.ctx.currentTime, chordFor(2), 0.4, 1400); await dwait(1700); if (tok === demoTok) pad(A.ctx.currentTime, chordFor(2), 0, 1000);
  } else if (k === 2) {
    demoLabel(`${sp[2].name}, where it is strong: ${STRONG_NAME[P.strong]}.`, 2);
    for (let i = 0; i < 10; i++) strongPlay(i * 3, t + i * 0.25, 0.25, 0.8, mid, rows);
    await dwait(3000); if (tok !== demoTok) return;
    demoLabel(`${sp[2].name}, where it is light: ${LIGHT_NAME[P.light]}.`, 2); const t2 = A.ctx.currentTime + 0.1;
    for (let i = 0; i < 6; i++) lightArp(i * 2, t2 + i * 0.5, 0.25, 0.28, mid + (i % 3), rows);
    await dwait(3400);
  } else if (k === 3) {
    demoLabel(`${sp[3].name}: ${LEAD_NAME[P.lead]}, with gamakas (ornaments) on the notes.`, 3);
    [9, 7, 5, 6, 3, 5].forEach((r, i) => lead(t + i * 0.6, bellMidi(T, r, V), 0.2, 0, 1.2));
    await dwait(4300);
  } else {
    for (const id of ['tabla', 'djembe', 'kit']) {
      if (tok !== demoTok) return; const I = INSTR[id];
      demoLabel(`${sp[4].name}: ${I.name}, the drum of ${I.where}.`, 4); const tt = A.ctx.currentTime + 0.1;
      for (let i = 0; i < 8; i++) hit(id, I.pat[i % I.pat.length] || I.filler, tt + i * 0.25, 0.5);
      await dwait(2500);
    }
    if (tok === demoTok) demoLabel('Every region has its own drum, and the drums play faster where the data is stronger.', 4);
    await dwait(1500);
  }
}
async function demoOne(k) {
  if (playing) pause(); cancelGuide(); stopDemo(true); const tok = ++demoTok; demoRunning = true; $('demoAll').textContent = '⏹ Stop';
  await demoVoice(k, tok); if (tok === demoTok) { stopDemo(true); $('demoStatus').textContent = 'Done. Press Hear on another voice, or Play to hear them all together.'; }
}
async function demoAll() {
  if (demoRunning) { stopDemo(); return; }
  if (playing) pause(); cancelGuide(); stopSpeech(); stopDemo(true); const tok = ++demoTok; demoRunning = true; $('demoAll').textContent = '⏹ Stop'; $('demoAll').setAttribute('aria-pressed', 'true');
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
if (!seen && !/[?&](debug|nostart)/.test(location.search)) openStart();

// ================= UI WIRING =================
function buildVoices() {
  $('voices').innerHTML = ''; meters.length = 0;
  T.species.forEach((s, k) => {
    const d = document.createElement('div');
    d.className = 'voice'; d.style.borderLeftColor = s.color;
    d.innerHTML = `<label><input type="checkbox" checked> <strong style="color:${s.color}">${s.name}</strong></label>
      <small>${s.sound}</small>${k === 4 ? '<small id="drumNow" style="color:var(--text)">Drums now: silent</small>' : ''}<button type="button" class="hear secondary" aria-label="Hear ${s.name} on its own">▶ Hear</button><div class="meter" aria-hidden="true"><i style="color:${s.color}"></i></div>`;
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
  if (playing) pause(); stopSpeech(); lastNarrCol = -1;
  T = TRACKS[i]; V = mkView(T.grid); computeRegions(); computeDrumModel(); computeEmotion(); lastInstr = null; pos = 0; cur = null; queue = []; lastSpoken = '';
  const vid = $('vid');
  if (T.video) { $('map').style.display = 'none'; vid.style.display = 'block'; vid.setAttribute('aria-label', T.alt); vid.src = T.video; $('vcap').style.display = 'block'; $('vcap').textContent = ''; }
  else { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.style.display = 'none'; $('vcap').style.display = 'none'; $('map').style.display = 'block'; $('map').src = T.image; $('map').alt = T.alt; }
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
const TAB_ORDER = ['year', 'aerosols', 'sst', 'sss', 'density', 'densityVideo'];        // the single-frame "Ocean currents" track is hidden: the Year track covers the same data and adds time
const tabIndex = id => TRACKS.findIndex(t => t.id === id);
TAB_ORDER.forEach(id => {
  const i = tabIndex(id); if (i < 0) return; const t = TRACKS[i];
  const b = document.createElement('button'); b.type = 'button'; b.className = 'secondary tab'; b.dataset.track = id;
  b.textContent = `${t.emoji} ${t.name}`; b.setAttribute('aria-pressed', 'false');
  b.addEventListener('click', () => setTrack(i)); $('tracks').appendChild(b);
});
function togglePlay() { if (guiding) cancelGuide(); else if (playing) pause(); else play(); }
$('play').addEventListener('click', togglePlay);
$('tline').addEventListener('input', e => { const c = +e.target.value; seek(c); updateMeters(c); });   // drag the time slider through the year
$('restart').addEventListener('click', () => { cancelGuide(); if (playing) pause(); seek(0); play(); });
$('skip').addEventListener('click', () => { guideSkip = true; stopSpeech(); });
$('vol').addEventListener('input', applyVolume);
$('dur').addEventListener('input', e => { $('durOut').textContent = e.target.value + ' s'; if (playing) seek(Math.floor(pos)); });
// stop everything when the page is hidden, backgrounded or closed
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
window.addEventListener('pagehide', () => { stopSpeech(); if (playing) pause(); if (A) { try { A.ctx.close(); } catch (e) {} A = null; } });
// Offline render for measuring the mix (debug only): plays the sweep into an OfflineAudioContext and reports levels.
async function renderOffline(i, seconds, solo) {
  const keep = A; A = null; setTrack(i); clearTimeout(idleTimer);        // setTrack arms the idle shut-down timer, which would mute this offline graph
  const sr = 22050, ctx = new OfflineAudioContext(2, Math.round(sr * seconds), sr);
  initAudio(ctx);
  A.bus.forEach((g, k) => { g.gain.value = (solo === undefined || solo === k) ? busGain(k) : 0; });
  const step = 0.25, n = Math.floor(seconds / step); gridOrigin = 0.05; timpFreq = null;
  for (let c = 0; c < n; c++) { const cc = Math.floor(c * V.cols / n), { tot, cen } = colStats(cc); setScaleFor(cc); T.schedule(cc, 0.05 + c * step, step, tot, cen, V); urgentFx(cc, 0.05 + c * step, step); }
  const buf = await ctx.startRendering(); A = keep;
  const d = buf.getChannelData(0), win = Math.round(sr * 0.5); let sum = 0, peak = 0, aSum = 0, aN = 0, nw = 0;
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
  return { aw: +aw.toFixed(1), rms: +db(Math.sqrt(sum / (nw * win))).toFixed(1), active: aN ? +db(Math.sqrt(aSum / aN)).toFixed(1) : -120, peak: +db(peak).toFixed(1), activeShare: +(aN / nw).toFixed(2) };
}

window.EJ = { get A() { return A; }, get T() { return T; }, get playing() { return playing; }, scoreOn, INSTR };   // read-only view for the scrolling sheet music (sheet.js)
if (location.search.includes("debug")) window.__jb = { loadSamples, SM, TRACKS, musicBuffers, scoreBuffers, startMusic, setTrack, renderOffline, wake, colStats, get T() { return T; }, get V() { return V; }, get A() { return A; } };   // test hook, only with ?debug in the address
setTrack(tabIndex('year') >= 0 ? tabIndex('year') : 0);
})();
