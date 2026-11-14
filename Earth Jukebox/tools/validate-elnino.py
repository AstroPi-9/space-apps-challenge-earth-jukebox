"""Checks on the El Nino layer's decoded anomaly maps (needs only numpy).  Run:  python tools/validate-elnino.py
Writes analysis/elnino_validation.json.  The methods are standard climate analysis (EOF/PCA, spectral analysis, robust differences, naive baselines),
applied to the app's own decoded data; they were suggested by the RAM AVATAR project's choice of methods (reimplemented here, no code copied)."""
import base64, json, pathlib
import numpy as np

root = pathlib.Path(__file__).resolve().parent.parent


def js_obj(name):
    t = (root / name).read_text(encoding='utf-8-sig')
    return t[t.index('{', t.index('window.')):t.rindex('}') + 1]


E = json.loads(js_obj('elnino_grid.js'))
I = json.loads(js_obj('nino34_index.js').replace('start', '"start"').replace('values', '"values"'))
M, R, C = E['months'], E['rows'], E['cols']
D = np.frombuffer(base64.b64decode(E['b64']), dtype=np.uint8).reshape(M, R, C).astype(float)
miss = D == 255
A = (D - 100) / 10.0
idx = np.array([np.nan if v is None else v for v in I['values']])
off = (E['start'] - I['start']) * 12
n34 = idx[off:off + M]
out = {'method_note': 'applied to anomaly maps decoded from NASA SVS 4695 (tools/analyse-nino.html) and the NOAA PSL Nino 3.4 index', 'months': M, 'grid': [R, C]}

# 1. EOF / PCA of the anomaly maps (latitude-weighted; cells missing in more than 10% of months dropped; remaining gaps set to zero anomaly)
ok = (~miss).mean(axis=0) > 0.9
lat = 90 - (np.arange(R) + 0.5) * 10
w = np.sqrt(np.cos(np.deg2rad(lat)))[:, None] * np.ones((1, C))
X = np.where(miss, 0.0, A)[:, ok] * w[ok]
X -= X.mean(axis=0)
U, S, Vt = np.linalg.svd(X, full_matrices=False)
var = S ** 2 / np.sum(S ** 2)
pcs = [{'mode': k + 1, 'variance_explained_pct': round(float(var[k] * 100), 1),
        'r_with_nino34': round(float(np.corrcoef(U[:, k] * S[k], n34)[0, 1]), 3)} for k in range(3)]
L = np.zeros(ok.shape)
L[ok] = Vt[0]
L = L.reshape(R, C)
r, c = np.unravel_index(np.argmax(np.abs(L)), L.shape)
out['eof'] = {'cells_used': int(ok.sum()), 'cells_total': int(ok.size), 'missing_share_of_all_cells': round(float(miss.mean()), 3), 'modes': pcs,
              'mode1_peak_loading': {'lat_band_centre': float(lat[r]), 'lon': round(-180 + (c + 0.5) * 360 / C, 1)},
              'reading': 'mode 1 is the El Nino pattern if its time series follows the Nino 3.4 index and its loading peaks in the eastern equatorial Pacific'}

# 2. spectrum of the long index (the standard ENSO band is about 2 to 8 years)
full = idx[~np.isnan(idx)]
f = np.fft.rfftfreq(len(full), d=1 / 12.0)
P = np.abs(np.fft.rfft(full - full.mean())) ** 2
band = (f > 1 / 8) & (f < 1 / 2)
k = int(np.argmax(np.where(band, P, 0)))
out['index_spectrum'] = {'months': int(len(full)), 'first_year': I['start'], 'strongest_period_years_in_2_to_8_year_band': round(float(1 / f[k]), 1),
                         'variance_share_in_band_pct': round(float(100 * P[band].sum() / P[1:].sum()), 0)}

# 3. robust rate of change (differences scaled by the median absolute deviation, as in the PDHIS-style signature)
d = np.diff(full)
mad = 1.4826 * np.median(np.abs(d - np.median(d)))
q = np.convolve(full, np.ones(3) / 3, mode='valid')
dq = np.diff(q)
madq = 1.4826 * np.median(np.abs(dq - np.median(dq)))
out['tendency'] = {'monthly_change_mad_scale_c': round(float(mad), 3), 'three_month_mean_change_mad_scale_c': round(float(madq), 3),
                   'last_12_monthly_changes_in_mad_units': [round(float(v), 1) for v in d[-12:] / mad],
                   'last_4_three_month_mean_changes_in_mad_units': [round(float(v), 1) for v in dq[-4:] / madq]}

# 4. naive baselines for the next-month index: climatology (mean) and persistence (repeat this month), on the last 20 percent of the record
y = full[1:]
cut = int(len(y) * 0.8)
yt = y[cut:]
out['naive_baselines_next_month_index'] = {
    'test_months': int(len(yt)), 'mae_climatology': round(float(np.mean(np.abs(yt - y[:cut].mean()))), 3),
    'mae_persistence': round(float(np.mean(np.abs(yt - full[:-1][cut:]))), 3),
    'lag1_autocorrelation': round(float(np.corrcoef(full[:-1], full[1:])[0, 1]), 3),
    'note': 'any prediction claim must beat these; this app makes no predictions'}
(root / 'analysis').mkdir(exist_ok=True)
(root / 'analysis' / 'elnino_validation.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
print(json.dumps(out, indent=2))
