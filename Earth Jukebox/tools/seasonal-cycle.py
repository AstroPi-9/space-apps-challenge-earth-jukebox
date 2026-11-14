"""Seasonal cycle of the decoded sea surface temperature in the Year track (needs only numpy).  Run:  python tools/seasonal-cycle.py
Fits a one-year harmonic to the decoded mean temperature of each 10-degree latitude band (160 time steps, 26 Mar 2007 to 3 Mar 2008)
and writes analysis/seasonal_cycle.json."""
import datetime
import json
import pathlib
import numpy as np

root = pathlib.Path(__file__).resolve().parent.parent
t = (root / 'year_grid.js').read_text(encoding='utf-8-sig')
G = json.loads(t[t.index('{'):t.rindex('}') + 1])
R, C = G['rows'], G['cols']
temp = np.array(G['mean'], float).reshape(R, C) / 255 * 32
cov = np.array(G['cov'], float).reshape(R, C) / 255
days = np.array([(datetime.datetime.fromisoformat(s.replace('Z', '')) - datetime.datetime(2007, 1, 1)).total_seconds() / 86400 for s in G['dates']])
w = 2 * np.pi / 365.25
rows = []
for r in range(R):
    ok = temp[r] > 0.5
    band = f'{90 - 10 * r} to {80 - 10 * r}'
    if ok.sum() < 0.8 * C:
        rows.append({'lat_band': band, 'status': 'too little decoded data'})
        continue
    X = np.column_stack([np.ones(ok.sum()), np.cos(w * days[ok]), np.sin(w * days[ok])])
    y = temp[r][ok]
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    fit = X @ beta
    ss = np.sum((y - y.mean()) ** 2)
    amp = float(np.hypot(beta[1], beta[2]))
    peak = (np.degrees(np.arctan2(beta[2], beta[1])) / 360 * 365.25) % 365.25
    peak_date = (datetime.date(2007, 1, 1) + datetime.timedelta(days=float(peak))).strftime('%d %b')
    rows.append({'lat_band': band, 'mean_c': round(float(beta[0]), 1), 'annual_amplitude_c': round(amp, 2), 'warmest_around': peak_date,
                 'harmonic_r2': round(float(1 - np.sum((y - fit) ** 2) / ss), 2) if ss > 0 else None, 'decoded_share': round(float(cov[r].mean()), 2)})


def band_series(r0, r1):
    return np.nanmean(np.where(temp[r0:r1] > 0.5, temp[r0:r1], np.nan), axis=0)


north = band_series(3, 6)    # about 60 N to 30 N
south = band_series(12, 15)  # about 30 S to 60 S
good = ~np.isnan(north) & ~np.isnan(south)
out = {'record': f"{G['dates'][0][:10]} to {G['dates'][-1][:10]} ({days[-1] - days[0]:.0f} days, less than a full year)", 'bands': rows,
       'hemisphere_check': {'northern_vs_southern_mid_latitudes_correlation': round(float(np.corrcoef(north[good], south[good])[0, 1]), 2),
                            'expected': 'strongly negative: the seasons are opposite'},
       'limits': ['one partial year, so the fitted amplitude mixes the seasonal cycle with any other change in that year',
                  'temperature is decoded only from flow-line colour (about a third of pixels), and the bands are 10 degrees wide',
                  'no independent measurement was used: this checks that the decode behaves like a seasonal cycle, not that its values are right']}
(root / 'analysis').mkdir(exist_ok=True)
(root / 'analysis' / 'seasonal_cycle.json').write_text(json.dumps(out, indent=2), encoding='utf-8')
print(json.dumps(out, indent=2))
