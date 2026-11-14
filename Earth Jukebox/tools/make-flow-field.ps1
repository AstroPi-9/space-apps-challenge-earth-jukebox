# Flow-line field for the "Follow a current" feature, from the NASA SVS 3912 (ECCO2) frame assets\ocean.jpg.
# The picture draws the ocean currents as thousands of thin lines coloured by temperature. For each 16 x 16 pixel tile this measures
#   ori  : the dominant direction of the lines (structure tensor of the luminance, turned 90 degrees), 0..pi stored as 0..255
#   coh  : how parallel the lines are (1 = all one direction, 0 = tangled), 0..255
#   temp : mean temperature of the decoded line colour (0..32 C stored as 0..254; 255 = no decoded colour)
#   cov  : share of the tile covered by decoded flow-line colour, 0..255
# A line has an orientation but NO arrow, so the direction of flow cannot be read from the still picture; the app picks a sign.
# Decoding as in make-ocean-grid.ps1 (hue within 4/255 of NASA's colour bar, saturation >= 64/255, value >= 20/255).
# Output: flow_field.js (window.FLOW_FIELD)
$root = Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Text;
public static class FlowMaker {
  static void Hsv(double r, double g, double b, out double h, out double s, out double v) {
    double mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b)), d = mx - mn; v = mx; s = mx <= 0 ? 0 : d / mx; h = 0;
    if (d > 0) { if (mx == r) h = 60 * (((g - b) / d) % 6); else if (mx == g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
  }
  public static string Run(string framePath, string cbarPath, int tile) {
    var cb = new Bitmap(cbarPath); var hueTemp = new double[256]; for (int i = 0; i < 256; i++) hueTemp[i] = -1;
    var lutHue = new List<double>(); var lutT = new List<double>();
    for (int x = 15; x <= 291; x++) { var c = cb.GetPixel(x, 45); double h, s, v; Hsv(c.R / 255.0, c.G / 255.0, c.B / 255.0, out h, out s, out v); lutHue.Add(h / 360.0 * 255.0); lutT.Add(32.0 * (x - 15) / 276.0); }
    cb.Dispose();
    for (int hb = 0; hb < 256; hb++) { double best = 1e9, bt = -1; for (int i = 0; i < lutHue.Count; i++) { double d = Math.Abs(hb - lutHue[i]); d = Math.Min(d, 256 - d); if (d < best) { best = d; bt = lutT[i]; } } if (best <= 4) hueTemp[hb] = bt; }
    var bmp = new Bitmap(framePath); int W = bmp.Width, H = bmp.Height, cols = W / tile, rows = H / tile;
    var bd = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[bd.Stride * H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, px.Length);
    double[,] jxx = new double[rows, cols], jyy = new double[rows, cols], jxy = new double[rows, cols], ts = new double[rows, cols], val = new double[rows, cols];
    Func<int,int,double> lum = (x, y) => { int i = y * bd.Stride + x * 4; return 0.299 * px[i + 2] + 0.587 * px[i + 1] + 0.114 * px[i]; };
    for (int y = 1; y < H - 1; y++) for (int x = 1; x < W - 1; x++) {
      int cx = x / tile, cy = y / tile; if (cx >= cols || cy >= rows) continue;
      int i0 = y * bd.Stride + x * 4; double r = px[i0 + 2] / 255.0, g = px[i0 + 1] / 255.0, b = px[i0] / 255.0, h, s, v; Hsv(r, g, b, out h, out s, out v);
      if (s < 64 / 255.0 || v < 20 / 255.0) continue;
      double t = hueTemp[(int)Math.Min(255, Math.Round(h / 360.0 * 255.0))]; if (t < 0) continue;
      val[cy, cx]++; ts[cy, cx] += t;
      double gx = lum(x + 1, y) - lum(x - 1, y), gy = lum(x, y + 1) - lum(x, y - 1);
      jxx[cy, cx] += gx * gx; jyy[cy, cx] += gy * gy; jxy[cy, cx] += gx * gy;
    }
    var ori = new List<int>(); var coh = new List<int>(); var temp = new List<int>(); var cov = new List<int>();
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) {
      double tr = jxx[y, x] + jyy[y, x], c = 0, th = 0;
      if (val[y, x] > 12 && tr > 1) {
        c = Math.Sqrt((jxx[y, x] - jyy[y, x]) * (jxx[y, x] - jyy[y, x]) + 4 * jxy[y, x] * jxy[y, x]) / tr;
        th = 0.5 * Math.Atan2(2 * jxy[y, x], jxx[y, x] - jyy[y, x]) + Math.PI / 2;      // the lines run at right angles to the brightness gradient
        th = ((th % Math.PI) + Math.PI) % Math.PI;
      }
      ori.Add((int)Math.Round(th / Math.PI * 255)); coh.Add((int)Math.Round(Math.Min(1, c) * 255));
      temp.Add(val[y, x] > 12 ? (int)Math.Round(Math.Min(32, ts[y, x] / val[y, x]) / 32 * 254) : 255);
      cov.Add((int)Math.Round(Math.Min(1, val[y, x] / (tile * tile)) * 255));
    }
    bmp.UnlockBits(bd); bmp.Dispose();
    return "{\"cols\":" + cols + ",\"rows\":" + rows + ",\"ori\":[" + string.Join(",", ori) + "],\"coh\":[" + string.Join(",", coh) + "],\"temp\":[" + string.Join(",", temp) + "],\"cov\":[" + string.Join(",", cov) + "]}";
  }
}
"@
$json = [FlowMaker]::Run((Join-Path $root "assets\ocean.jpg"), (Join-Path $root "assets\ocean_cbar.png"), 16)
Set-Content -Path (Join-Path $root "flow_field.js") -Value ("// Flow-line orientation, coherence, temperature and coverage per 16 px tile of the SVS 3912 frame. Built by tools/make-flow-field.ps1.`nwindow.FLOW_FIELD = " + $json + ";") -Encoding utf8
Write-Host ("flow_field.js written ({0:N0} KB)" -f ((Get-Item (Join-Path $root "flow_field.js")).Length / 1KB))
