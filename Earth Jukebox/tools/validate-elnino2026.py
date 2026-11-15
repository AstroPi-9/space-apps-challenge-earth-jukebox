"""Checks the El Nino 2026 records against NOAA's weekly Nino indices.  Needs numpy, scipy, Pillow and ffmpeg.
Run:  python tools/validate-elnino2026.py SRC      (SRC: the folder described in tools/make-elnino2026.py)
Reads analysis/noaa_cpc_weekly_nino_indices.txt (NOAA Climate Prediction Center, https://www.cpc.ncep.noaa.gov/data/indices/wksst9120.for).
Writes analysis/elnino2026_validation.json.

For every 10th frame of the movie (121 frames, 29 Jan to 10 Oct) it decodes the picture, averages the anomaly in the four Nino boxes, and compares the
result with NOAA's weekly value for the same calendar day (linear interpolation between the weekly values), for 2026 and for 2025.
It tests that the decode behaves like the real thing. It does not prove that every value is exact: the picture's colour bar stops at +/-4 degrees C,
its anomalies use NASA's own baseline (NOAA's index uses OISST and 1991-2020), and the map extent is a fit (see make-elnino2026.py)."""
import datetime as dt, json, pathlib, re, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy.spatial import cKDTree

root = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1])
LON0, SX, LAT0, SY = 104.56661299204205, 4.4537004755539344, 30.27446803814538, 5.021496922751334
lg = np.array(Image.open(src / 'elnino_multi_legend_ssta_01.01000.png').convert('RGB')).astype(float)
X0, STEP = 296.5, (3542.5 - 296.5) / 8
xs = np.arange(305, 3535); lut = lg[1080, xs]; lutv = -4 + (xs - X0) / STEP; tree = cKDTree(lut)


def decode(p):
    f = p.reshape(-1, 3).astype(float); d, i = tree.query(f); v = lutv[i]
    mx, mn = f.max(1), f.min(1); sat = (mx - mn) / np.maximum(mx, 1)
    return np.where(((sat < 0.12) & (mx < 200)) | (d > 40), np.nan, v).reshape(p.shape[:2])


tmp = pathlib.Path(tempfile.mkdtemp()); fdir = tmp / 'f'; fdir.mkdir()
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src / 'elnino_2026_ssta_1010_nolabels_1080p60.mp4'), '-vf', 'select=not(mod(n\\,10))', '-vsync', 'vfr', str(fdir / 'f_%04d.png')], check=True)
files = sorted(fdir.glob('f_*.png'))
boxes = {'nino34': (-5, 5, 190, 240), 'nino3': (-5, 5, 210, 270), 'nino4': (-5, 5, 160, 210), 'nino12': (-10, 0, 270, 280)}     # lat0, lat1, lon0, lon1 (degrees east)
series = {(y, b): [] for y in ('2025', '2026') for b in boxes}; clip = {'2025': [], '2026': []}; days = []
for k, fn in enumerate(files):
    im = np.array(Image.open(fn).convert('RGB'))[::2, ::2]
    for y, pan in (('2026', im[0:268]), ('2025', im[271:539])):
        v = decode(pan); H, W = v.shape
        lon = (LON0 + (np.arange(W) + .5) * (960 / W) / SX) % 360; lat = LAT0 - (np.arange(H) + .5) * (269 / H) / SY
        LON, LAT = np.meshgrid(lon, lat)
        for b, (a0, a1, o0, o1) in boxes.items():
            m = (LAT >= a0) & (LAT <= a1) & (LON >= o0) & (LON <= o1); series[(y, b)].append(float(np.nanmean(v[m])))
            if b == 'nino34': clip[y].append(float(np.nanmean(v[m] >= 3.9)))
    days.append(dt.date(2026, 1, 29) + dt.timedelta(days=k * 10 * 254 / 1200))
# NOAA weekly: columns = [N1+2 sst, ssta, N3 sst, ssta, N3.4 sst, ssta, N4 sst, ssta]
wk = {}
for line in (root / 'analysis' / 'noaa_cpc_weekly_nino_indices.txt').read_text().splitlines():
    m = re.match(r'\s*(\d\d[A-Z]{3}\d{4})\s+(.*)', line)
    if not m: continue
    try: d = dt.datetime.strptime(m.group(1), '%d%b%Y').date()
    except ValueError: continue
    n = [float(x) for x in re.findall(r'-?\d+\.\d', m.group(2))]
    if len(n) == 8: wk[d] = n
D = sorted(wk); tt = np.array([(d - dt.date(2000, 1, 1)).days for d in D])
col = {'nino12': 1, 'nino3': 3, 'nino34': 5, 'nino4': 7}
noaa = lambda c, day: float(np.interp((day - dt.date(2000, 1, 1)).days, tt, [wk[d][c] for d in D]))
res = {}
for y in ('2025', '2026'):
    ds = [d.replace(year=int(y)) for d in days]
    for b, c in col.items():
        a = np.array(series[(y, b)]); n = np.array([noaa(c, d) for d in ds])
        lags = {}
        for lag in range(-28, 29, 2):
            n2 = np.array([noaa(c, d + dt.timedelta(days=lag)) for d in ds]); lags[lag] = float(np.sqrt(np.mean((a - n2) ** 2)))
        best = min(lags, key=lags.get); g, o = np.polyfit(n, a, 1)
        res[f'{b}_{y}'] = dict(correlation=round(float(np.corrcoef(a, n)[0, 1]), 3), mean_offset_c=round(float(np.mean(a - n)), 2), rmse_c=round(float(np.sqrt(np.mean((a - n) ** 2))), 2),
                               mean_decoded_c=round(float(a.mean()), 2), mean_noaa_c=round(float(n.mean()), 2), best_lag_days=best, rmse_at_best_lag_c=round(lags[best], 2),
                               fit_decoded_equals=f'{g:.2f} x NOAA + {o:+.2f}')
pooled = {}
for b, c in col.items():
    a = np.concatenate([series[(y, b)] for y in ('2025', '2026')]); n = np.concatenate([[noaa(c, d.replace(year=int(y))) for d in days] for y in ('2025', '2026')])
    pooled[b] = dict(correlation=round(float(np.corrcoef(a, n)[0, 1]), 3), mean_offset_c=round(float(np.mean(a - n)), 2), rmse_c=round(float(np.sqrt(np.mean((a - n) ** 2))), 2))
n26 = np.array([noaa(5, d) for d in days]); a26 = np.array(series[('2026', 'nino34')])
out = dict(note='Decoded from the NASA SVS 5683 pictures (every 10th frame) against NOAA CPC weekly Nino indices. Offsets are decoded minus NOAA. Not a check of exactness.',
           frames=len(files), first_day='2026-01-29', last_day=str(days[-1]), regions=res, pooled_2025_and_2026=pooled,
           nino34_2026_rmse_if_always_zero_c=round(float(np.sqrt(np.mean(n26 ** 2))), 2), nino34_2026_rmse_decoded_c=round(float(np.sqrt(np.mean((a26 - n26) ** 2))), 2),
           share_of_nino34_box_at_colour_bar_end_late_2026=round(float(np.mean(clip['2026'][-21:])), 2),
           final_frame=dict(date=str(days[-1]), nino34_decoded_c=round(float(a26[-1]), 2), nino34_noaa_c=round(float(n26[-1]), 2)))
(root / 'analysis' / 'elnino2026_validation.json').write_text(json.dumps(out, indent=1))
print(json.dumps(out['pooled_2025_and_2026'])); print(out['regions']['nino34_2026'])
