"""Builds the El Nino 2026 records from NASA SVS 5683 ("Signs of El Nino in 2026", visualization by Kel Elkins).

Needs numpy, scipy, Pillow and ffmpeg.  Download these three files from https://svs.gsfc.nasa.gov/5683/ into one folder (SRC):
    elnino_2026_ssta_1010_nolabels.02200.jpg        4K still, 2026-10-10 (top half) above 2025-10-10 (bottom half), no labels
    elnino_2026_ssta_1010_nolabels_1080p60.mp4      the same as a movie, 1,201 frames, 29 Jan to 10 Oct (2026 above, 2025 below)
    elnino_multi_legend_ssta_01.01000.png           the colour bar (transparent PNG, -4 to +4 degrees C)
Run:  python tools/make-elnino2026.py SRC
Writes elnino_grids.js and assets/elnino2026/ (two stills, 61 movie frames, a colour bar).

How the numbers are made (this is a decode of a picture, not of NASA's numeric data):
  * Each ocean pixel is matched to its nearest colour on the published bar (-4 to +4 degrees C anomaly). Grey pixels are land. The bar ends at +/-4,
    so anything hotter or colder is read as 4.
  * The map has no coordinates, so its extent was fitted by matching the grey land to a public coastline (about 105 E to 40 W, 30 N to 23 S;
    the two directions have slightly different scales). It is a fit, not a published specification.
  * Date of frame n of the movie: 29 Jan 2026 + n x 254/1200 days (read off the date labels of the labelled movie: n=0 29 Jan, n=1200 10 Oct).
  * Channels (each a share of the cell's pixels, scaled so the 95th percentile of the 2025 and 2026 data together is 1): 0 cooler than -0.5,
    1 within 0.5 of normal, 2 warmer than +0.5, 3 stronger than 2 degrees either way.
  * A second pair of channels (`deep`, two bytes per cell) drives the double bass chord and the low timpani rumble: the share of the cell that is
    medium-dark red (anomaly 2.5 to 3.5 C) and almost black-red (3.5 C and above). `deepRef` is the largest column average of each, over the two years
    of the same kind, so the loudness in the app means "how much of the strongest column this is".
"""
import base64, datetime as dt, json, pathlib, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

root = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1])
LON0, SX, LAT0, SY = 104.56661299204205, 4.4537004755539344, 30.27446803814538, 5.021496922751334   # fitted extent: pixels per degree at 960 px wide
COLS, ROWS, W, PH = 160, 18, 960, 268                                                              # panel size at 1/4 of the 4K still
EXTENT = dict(lon_from=round(LON0, 2), lon_to=round(LON0 + W / SX, 2), lat_north=round(LAT0, 2), lat_south=round(LAT0 - 269 / SY, 2))

lg = np.array(Image.open(src / 'elnino_multi_legend_ssta_01.01000.png').convert('RGB')).astype(float)
X0, STEP = 296.5, (3542.5 - 296.5) / 8                    # tick marks of -4 and +4 degrees in the 3840-wide legend
xs = np.arange(305, 3535); lut = lg[1080, xs]; lutv = -4 + (xs - X0) / STEP; tree = cKDTree(lut)


def decode(p):
    """p: HxWx3 uint8 panel -> (anomaly deg C with NaN where not decodable, land mask)"""
    f = p.reshape(-1, 3).astype(float); d, i = tree.query(f); v = lutv[i]
    mx, mn = f.max(1), f.min(1); sat = (mx - mn) / np.maximum(mx, 1)
    land = (sat < 0.12) & (mx < 200)                       # grey land and ice, darker than the pale ~0 degree end of the bar
    v = np.where(land | (d > 40), np.nan, v)
    return v.reshape(p.shape[:2]), land.reshape(p.shape[:2])


def bands(v, land, axis):
    """counts per row (axis='rows': a latitude profile) or per cell: cool, near, warm, strong, land, total"""
    ok = np.isfinite(v); a = np.where(ok, v, 0)
    m = [ok & (a < -0.5), ok & (np.abs(a) <= 0.5), ok & (a > 0.5), ok & (np.abs(a) >= 2), land, np.ones_like(ok),
         ok & (a >= 2.5) & (a < 3.5), ok & (a >= 3.5)]                  # 6: medium-dark red (2.5 to 3.5 C), 7: almost black-red (3.5 C and above)
    return m, ok, a


def cell_stats(v, land):
    H, Wd = v.shape; out = np.zeros((ROWS, COLS, 10))       # cool near warm strong land total sum(anomaly) validcount mid-dark-red black-red
    m, ok, a = bands(v, land, 'cells')
    for r in range(ROWS):
        for c in range(COLS):
            sl = (slice(r * H // ROWS, (r + 1) * H // ROWS), slice(c * Wd // COLS, (c + 1) * Wd // COLS))
            for k in range(6): out[r, c, k] = m[k][sl].sum()
            out[r, c, 6] = a[sl][ok[sl]].sum(); out[r, c, 7] = ok[sl].sum(); out[r, c, 8] = m[6][sl].sum(); out[r, c, 9] = m[7][sl].sum()
    return out


def row_stats(v, land):
    H = v.shape[0]; out = np.zeros((ROWS, 10)); m, ok, a = bands(v, land, 'rows')
    for r in range(ROWS):
        sl = slice(r * H // ROWS, (r + 1) * H // ROWS)
        for k in range(6): out[r, k] = m[k][sl].sum()
        out[r, 6] = a[sl][ok[sl]].sum(); out[r, 7] = ok[sl].sum(); out[r, 8] = m[6][sl].sum(); out[r, 9] = m[7][sl].sum()
    return out


def to_grid(S, norm, nD, dates=None):
    """S: (ROWS, COLS, 8) sums -> the app's grid object"""
    tot = np.maximum(S[..., 5], 1); ch = np.stack([S[..., k] / tot for k in range(4)], -1)
    data = np.clip(np.round(ch / norm * 255), 0, 255).astype(int)
    valid = S[..., 7]; mean = np.where(valid > 0, S[..., 6] / np.maximum(valid, 1), 0)
    mean_b = np.where(valid > 0, np.clip(np.round((mean + 4) / 8 * 255), 1, 255), 0).astype(int)
    g = {'cols': COLS, 'rows': ROWS, 'data': data.reshape(-1).tolist(), 'land': np.round(S[..., 4] / tot * 255).astype(int).reshape(-1).tolist(),
         'mean': mean_b.reshape(-1).tolist(), 'cov': np.round(valid / tot * 255).astype(int).reshape(-1).tolist()}
    deep = np.stack([S[..., 8] / tot, S[..., 9] / tot], -1)            # shares of medium-dark red and black-red in each cell
    g['deep'] = np.clip(np.round(deep / nD * 255), 0, 255).astype(int).reshape(-1).tolist()
    if dates is not None: g['dates'] = dates
    return g


def norm_deep(*Ss):
    a = np.concatenate([np.stack([S[..., k] / np.maximum(S[..., 5], 1) for k in (8, 9)], -1).reshape(-1, 2) for S in Ss])
    return np.array([max(np.percentile(a[:, k][a[:, k] > 0], 95), 1e-6) if (a[:, k] > 0).any() else 1e-6 for k in range(2)])


def deep_ref(*gs):
    """the largest column average of each deep channel over the pair of grids (0..1): the reference the app scales loudness by"""
    ref = [0.0, 0.0]
    for g in gs:
        d = np.array(g['deep']).reshape(ROWS, COLS, 2) / 255.0
        for k in range(2): ref[k] = max(ref[k], float(d[:, :, k].mean(axis=0).max()))
    return [round(max(r, 1e-3), 4) for r in ref]


def norm_for(*Ss):
    sh = [np.stack([S[..., k] / np.maximum(S[..., 5], 1) for k in range(4)], -1).reshape(-1, 4) for S in Ss]
    a = np.concatenate(sh); return np.array([max(np.percentile(a[:, k][a[:, k] > 0], 95), 1e-6) for k in range(4)])


# ---- stills (4K frame: panels at rows 0-1075 (2026) and 1084-2159 (2025)) ----
still = np.array(Image.open(src / 'elnino_2026_ssta_1010_nolabels.02200.jpg').convert('RGB'))
pan = {'2026': still[0:1076:4, ::4], '2025': still[1084:2160:4, ::4]}
St = {y: cell_stats(*decode(p)) for y, p in pan.items()}
nS = norm_for(St['2026'], St['2025']); nDS = norm_deep(St['2026'], St['2025'])
# ---- movie: every 10th frame; per latitude band, summed over all longitudes ----
tmp = pathlib.Path(tempfile.mkdtemp()); fdir = tmp / 'f'; fdir.mkdir()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src / 'elnino_2026_ssta_1010_nolabels_1080p60.mp4'), '-vf', 'select=not(mod(n\\,10))', '-vsync', 'vfr', str(fdir / 'f_%04d.png')], check=True)
files = sorted(fdir.glob('f_*.png')); F = len(files)
R = {'2026': np.zeros((F, ROWS, 10)), '2025': np.zeros((F, ROWS, 10))}
for k, fn in enumerate(files):
    im = np.array(Image.open(fn).convert('RGB'))[::2, ::2]
    for y, p in (('2026', im[0:268]), ('2025', im[271:539])): R[y][k] = row_stats(*decode(p))
    if k % 20 == 0: print('frame', k * 10, flush=True)
fi = np.linspace(0, F - 1, COLS)                            # 160 moments, evenly spread over the 121 decoded frames
def interp(a):
    i0 = np.floor(fi).astype(int); i1 = np.minimum(i0 + 1, F - 1); w = (fi - i0)[:, None, None]; return a[i0] * (1 - w) + a[i1] * w
T = {y: interp(R[y]).transpose(1, 0, 2) for y in R}         # (ROWS, COLS, 8)
nT = norm_for(T['2026'], T['2025']); nDT = norm_deep(T['2026'], T['2025'])
start = dt.datetime(2026, 1, 29, 12, 0)
dates = [(start + dt.timedelta(days=float(f) * 10 * 254 / 1200)).strftime('%Y-%m-%dT%H:%MZ') for f in fi]
dates25 = [d.replace('2026', '2025', 1) for d in dates]
out = {'ELNINO_EXTENT': EXTENT, 'ELNINO26_GRID': to_grid(St['2026'], nS, nDS), 'ELNINO25_GRID': to_grid(St['2025'], nS, nDS),
       'ELNINO_YEAR_GRID': to_grid(T['2026'], nT, nDT, dates), 'ELNINO_YEAR25_GRID': to_grid(T['2025'], nT, nDT, dates25)}
for a_, b_ in (('ELNINO26_GRID', 'ELNINO25_GRID'), ('ELNINO_YEAR_GRID', 'ELNINO_YEAR25_GRID')):
    r_ = deep_ref(out[a_], out[b_]); out[a_]['deepRef'] = r_; out[b_]['deepRef'] = r_
with open(root / 'elnino_grids.js', 'w', encoding='utf-8') as f:
    f.write('// Built by tools/make-elnino2026.py from NASA SVS 5683. Four grids in the app format (data: 4 channels per cell, land, mean, cov) and the map extent.\n')
    for k, v in out.items(): f.write('window.%s = %s;\n' % (k, json.dumps(v, separators=(',', ':'))))
# ---- images ----
d = root / 'assets' / 'elnino2026'; d.mkdir(parents=True, exist_ok=True)
Image.fromarray(still[0:1076]).resize((1920, 538), Image.LANCZOS).save(d / 'oct2026.jpg', quality=82, optimize=True)
Image.fromarray(still[1084:2160]).resize((1920, 538), Image.LANCZOS).save(d / 'oct2025.jpg', quality=82, optimize=True)
for j, k in enumerate(range(0, F, 2)):                       # 61 frames of 2026 for the timeline
    Image.open(files[k]).convert('RGB').crop((0, 0, 1920, 538)).resize((1280, 359), Image.LANCZOS).save(d / ('t%03d.jpg' % j), quality=76, optimize=True)
bar = Image.open(src / 'elnino_multi_legend_ssta_01.01000.png').convert('RGBA').crop((60, 700, 3780, 1500))
bg = Image.new('RGBA', bar.size, (24, 16, 10, 255)); bg.alpha_composite(bar); bg.convert('RGB').resize((930, 200), Image.LANCZOS).save(d / 'ssta_cbar.png', optimize=True)
print('done', F, 'frames; extent', EXTENT)
