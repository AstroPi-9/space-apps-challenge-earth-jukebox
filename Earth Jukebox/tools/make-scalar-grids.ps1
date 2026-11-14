# Turns NASA's sea-surface temperature, salinity and density maps (colour-coded scalars) into sound grids.
# Each ocean pixel is matched to its position on the map's own colour bar (0 = low end, 1 = high end); land photo pixels do not match and are dropped.
# channels: 0 low third of the scale, 1 middle third, 2 high third, 3 fronts (how sharply the value changes inside a cell)
# also writes "mean" (average position on the scale, 0-255) and "cov" (share of the cell that is ocean, 0-255).
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-scalar-grids.ps1
$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path (Split-Path $root -Parent) "salinity and density"
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Imaging; using System.Text;
public static class ScalarMaker {
  public static string Run(string mapPath, string cbarPath, int cols, int rows, double thr, double yMaxFrac, bool invert) {
    var cb = new Bitmap(cbarPath); int n = 253; var lut = new int[n,3];
    for (int i = 0; i < n; i++) { var c = cb.GetPixel(34 + i, 44); lut[i,0]=c.R; lut[i,1]=c.G; lut[i,2]=c.B; } cb.Dispose();
    var bmp = new Bitmap(mapPath); int W = bmp.Width, H = bmp.Height;
    var bd = bmp.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[bd.Stride*H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, px.Length);
    double[,,] band = new double[3, rows, cols]; double[,] tot = new double[rows, cols], val = new double[rows, cols], st = new double[rows, cols], st2 = new double[rows, cols];
    int yMax = (int)(H * yMaxFrac); double thr2 = thr * thr;
    for (int y = 0; y < H - 1; y++) for (int x = 0; x < W - 1; x++) {
      int cx = x * cols / W, cy = y * rows / H; tot[cy, cx]++;
      if (y > yMax) continue;
      int i0 = y * bd.Stride + x * 4, ir = i0 + 4, id = i0 + bd.Stride;
      int B = px[i0], G = px[i0+1], R = px[i0+2];
      int tex = Math.Abs(R - px[ir+2]) + Math.Abs(G - px[ir+1]) + Math.Abs(B - px[ir]) + Math.Abs(R - px[id+2]) + Math.Abs(G - px[id+1]) + Math.Abs(B - px[id]);
      if (tex > 24) continue;                                                 // land photo is textured, the data fields are smooth
      double best = 1e9; int bi = 0;
      for (int i = 0; i < n; i++) { int dr = R - lut[i,0], dg = G - lut[i,1], db = B - lut[i,2]; double d = dr*dr + dg*dg + db*db; if (d < best) { best = d; bi = i; if (d < 4) break; } }
      if (best > thr2) continue;
      double t = bi / (double)(n - 1); if (invert) t = 1 - t;           // density: dense (dark end of the bar) becomes the LOW end, so heavy water maps to the low drone
      val[cy, cx]++; st[cy, cx] += t; st2[cy, cx] += t * t; band[t < 0.3333 ? 0 : (t < 0.6667 ? 1 : 2), cy, cx]++;
    }
    var cells = new double[4, rows, cols];
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) {
      for (int k = 0; k < 3; k++) cells[k, y, x] = band[k, y, x] / tot[y, x];
      if (val[y, x] > 20) { double m = st[y, x] / val[y, x]; cells[3, y, x] = Math.Sqrt(Math.Max(0, st2[y, x] / val[y, x] - m * m)) * (val[y, x] / tot[y, x]); }
    }
    var sb = new StringBuilder("{\"cols\":" + cols + ",\"rows\":" + rows + ",\"data\":[");
    double[] top = new double[4];
    for (int k = 0; k < 4; k++) { var l = new List<double>(); for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) l.Add(cells[k, y, x]); l.Sort(); top[k] = Math.Max(1e-6, l[(int)(l.Count * 0.97)]); }
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) for (int k = 0; k < 4; k++) {
      int v = (int)Math.Round(Math.Min(1.0, cells[k, y, x] / top[k]) * 255);
      sb.Append(v); if (!(y == rows - 1 && x == cols - 1 && k == 3)) sb.Append(',');
    }
    sb.Append("],\"land\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append((int)Math.Round((1 - val[y, x] / tot[y, x]) * 255)); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("],\"mean\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append(val[y, x] > 20 ? (int)Math.Round(st[y, x] / val[y, x] * 255) : 0); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("],\"cov\":[");
    for (int y = 0; y < rows; y++) for (int x = 0; x < cols; x++) { sb.Append((int)Math.Round(val[y, x] / tot[y, x] * 255)); if (!(y == rows - 1 && x == cols - 1)) sb.Append(','); }
    sb.Append("]}"); bmp.UnlockBits(bd); bmp.Dispose(); return sb.ToString();
  }
}
"@
# name, source map, colour bar, asset name, js variable, match tolerance (colour distance), lowest latitude row to use
$jobs = @(
  @('SST',     'SSTMap_2000x1000.jpg',     'sst_cbar.png', 'sst.jpg',     'SST_GRID',     30, 0.999, $false),
  @('SSS',     'SSSMap_2000x1000.jpg',     'sss_cbar.png', 'sss.jpg',     'SSS_GRID',     14, 0.865, $false),
  @('Density', 'DensityMap_2000x1000.jpg', 'ssd_cbar.png', 'density.jpg', 'DENSITY_GRID', 26, 0.865, $true)
)
foreach ($j in $jobs) {
  Copy-Item (Join-Path $src $j[1]) (Join-Path $root "assets\$($j[3])") -Force
  Copy-Item (Join-Path $src $j[2]) (Join-Path $root ("assets\" + $j[2])) -Force
  $json = [ScalarMaker]::Run((Join-Path $src $j[1]), (Join-Path $src $j[2]), 160, 18, $j[5], $j[6], [bool]$j[7])
  $file = $j[0].ToLower() + "_grid.js"
  Set-Content -Path (Join-Path $root $file) -Value ("window.$($j[4]) = " + $json + ";") -Encoding utf8
  Write-Host "$file written"
}
