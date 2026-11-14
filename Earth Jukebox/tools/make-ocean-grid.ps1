# Sound grid for NASA SVS 3912 "Global Sea Surface Currents and Temperature" (ECCO2). In this visualization COLOUR IS SEA-SURFACE TEMPERATURE (0-32 C,
# see assets\ocean_cbar.png) and the thousands of flow lines show the CURRENTS. So:
#   channels 0, 1, 2 = cold / mild / warm water (thirds of the 0-32 C scale), decoded from line colour using the colour bar
#   channel 3         = swirling flow: how much the flow lines curl and change direction inside a cell (eddies). Measured from the line
#                       orientation (structure-tensor coherence): straight parallel lines = a steady current, tangled lines = eddies.
# also writes "mean" (average temperature as a share of 0-32 C, 0-255) and "cov" (share of the cell covered by decoded flow lines).
# Inputs: assets\ocean.jpg (a frame) and assets\ocean_cbar.png (NASA's colour bar). The decoding follows the earlier calibration on the USB
# (hue match within 4/255, saturation >= 64/255, value >= 20/255); it is an estimate from the rendering, not model output.
$root = Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Text;
public static class OceanMaker {
  static void Hsv(double r, double g, double b, out double h, out double s, out double v) {
    double mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b)), d = mx - mn; v = mx; s = mx <= 0 ? 0 : d / mx; h = 0;
    if (d > 0) { if (mx == r) h = 60 * (((g - b) / d) % 6); else if (mx == g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
  }
  public static string Run(string framePath, string cbarPath, int cols, int rows) {
    // hue -> temperature table from the colour bar (interior row y=45, x=15..291)
    var cb = new Bitmap(cbarPath); var hueTemp = new double[256]; for (int i = 0; i < 256; i++) hueTemp[i] = -1;
    var lutHue = new List<double>(); var lutT = new List<double>();
    for (int x = 15; x <= 291; x++) { var c = cb.GetPixel(x, 45); double h, s, v; Hsv(c.R / 255.0, c.G / 255.0, c.B / 255.0, out h, out s, out v); lutHue.Add(h / 360.0 * 255.0); lutT.Add(32.0 * (x - 15) / 276.0); }
    cb.Dispose();
    for (int hb = 0; hb < 256; hb++) { double best = 1e9, bt = -1; for (int i = 0; i < lutHue.Count; i++) { double d = Math.Abs(hb - lutHue[i]); d = Math.Min(d, 256 - d); if (d < best) { best = d; bt = lutT[i]; } } if (best <= 4) hueTemp[hb] = bt; }
    var bmp = new Bitmap(framePath); int W = bmp.Width, H = bmp.Height;
    var bd = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[bd.Stride * H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, px.Length);
    double[,,] band = new double[3, rows, cols]; double[,] tot = new double[rows, cols], val = new double[rows, cols], st = new double[rows, cols], grey = new double[rows, cols];
    double[,] jxx = new double[rows, cols], jyy = new double[rows, cols], jxy = new double[rows, cols];
    Func<int,int,double> lum = (x, y) => { int i = y * bd.Stride + x * 4; return 0.299 * px[i + 2] + 0.587 * px[i + 1] + 0.114 * px[i]; };
    for (int y = 1; y < H - 1; y++) for (int x = 1; x < W - 1; x++) {
      int cx = x * cols / W, cy = y * rows / H; tot[cy, cx]++;
      int i0 = y * bd.Stride + x * 4; double r = px[i0 + 2] / 255.0, g = px[i0 + 1] / 255.0, b = px[i0] / 255.0, h, s, v; Hsv(r, g, b, out h, out s, out v);
      if (s < 0.10 && v >= 0.2 && v <= 0.6) grey[cy, cx]++;                      // grey land
      if (s < 64 / 255.0 || v < 20 / 255.0) continue;
      double t = hueTemp[(int)Math.Min(255, Math.Round(h / 360.0 * 255.0))]; if (t < 0) continue;
      val[cy, cx]++; st[cy, cx] += t / 32.0; band[t < 10.667 ? 0 : (t < 21.333 ? 1 : 2), cy, cx]++;
      double gx = lum(x + 1, y) - lum(x - 1, y), gy = lum(x, y + 1) - lum(x, y - 1);   // flow-line direction
      jxx[cy, cx] += gx * gx; jyy[cy, cx] += gy * gy; jxy[cy, cx] += gx * gy;
    }
    var cells = new double[4, rows, cols];
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) {
      for (int k = 0; k < 3; k++) cells[k, y, x] = band[k, y, x] / tot[y, x];
      double tr = jxx[y, x] + jyy[y, x];
      if (val[y, x] > 20 && tr > 1) { double coh = Math.Sqrt((jxx[y, x] - jyy[y, x]) * (jxx[y, x] - jyy[y, x]) + 4 * jxy[y, x] * jxy[y, x]) / tr; cells[3, y, x] = (1 - coh) * (val[y, x] / tot[y, x]); }
    }
    var sb = new StringBuilder("{\"cols\":" + cols + ",\"rows\":" + rows + ",\"data\":[");
    double[] top = new double[4];
    for (int k = 0; k < 4; k++) { var l = new List<double>(); for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) l.Add(cells[k, y, x]); l.Sort(); top[k] = Math.Max(1e-6, l[(int)(l.Count * 0.97)]); }
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) for (int k = 0; k < 4; k++) {
      int vv = (int)Math.Round(Math.Min(1.0, cells[k, y, x] / top[k]) * 255); sb.Append(vv); if (!(y == rows - 1 && x == cols - 1 && k == 3)) sb.Append(',');
    }
    sb.Append("],\"land\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append((int)Math.Round(Math.Min(1.0, grey[y, x] / tot[y, x]) * 255)); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("],\"mean\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append(val[y, x] > 20 ? (int)Math.Round(st[y, x] / val[y, x] * 255) : 0); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("],\"cov\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append((int)Math.Round(val[y, x] / tot[y, x] * 255)); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("]}"); bmp.UnlockBits(bd); bmp.Dispose(); return sb.ToString();
  }
}
"@
$json = [OceanMaker]::Run((Join-Path $root "assets\ocean.jpg"), (Join-Path $root "assets\ocean_cbar.png"), 160, 18)
Set-Content -Path (Join-Path $root "ocean_grid.js") -Value ("window.OCEAN_GRID = " + $json + ";") -Encoding utf8
Write-Host "ocean_grid.js written"
