# "Year of the ocean": turns NASA SVS 3912 frames (2,001 frames, 2007-03-25 to 2008-03-03) into a time-by-latitude sound grid.
# 160 evenly spaced frames become 160 time steps. For each step and each of 18 latitude bands (all longitudes together):
#   channels 0, 1, 2 = cold / mild / warm water (thirds of the 0-32 C scale, decoded from line colour with NASA's colour bar)
#   channel 3        = swirl: how tangled the flow lines are, measured in 32 px tiles from the line orientation
# also writes "mean" (average decoded temperature as a share of 0-32 C, 0-255), "cov", "land" (not used here) and "dates" (UTC time of each step).
# Each chosen frame is also saved as a small JPEG in assets\year\ so the page can show the time-lapse.
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-year-grid.ps1 [-DataDir "E:\Time- light\data"]
param([string]$DataDir = "E:\Time- light\data")
$root = Split-Path $PSScriptRoot -Parent
$frames = Join-Path $DataDir "Oceanflows"
$datesFile = Join-Path $DataDir "Oceanflows_support\flat_ecco2_dates.txt"
$out = Join-Path $root "assets\year"; New-Item -ItemType Directory -Force $out | Out-Null
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Collections.Generic; using System.Drawing; using System.Drawing.Drawing2D; using System.Drawing.Imaging; using System.IO; using System.Text;
public static class YearMaker {
  static void Hsv(double r, double g, double b, out double h, out double s, out double v) {
    double mx = Math.Max(r, Math.Max(g, b)), mn = Math.Min(r, Math.Min(g, b)), d = mx - mn; v = mx; s = mx <= 0 ? 0 : d / mx; h = 0;
    if (d > 0) { if (mx == r) h = 60 * (((g - b) / d) % 6); else if (mx == g) h = 60 * ((b - r) / d + 2); else h = 60 * ((r - g) / d + 4); if (h < 0) h += 360; }
  }
  static void SaveJpeg(Bitmap src, string path, int w, int h) {
    using (var o = new Bitmap(w, h)) using (var g = Graphics.FromImage(o)) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.DrawImage(src, 0, 0, w, h);
      var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg"); var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 72L); o.Save(path, enc, ps);
    }
  }
  public static string Run(string framesDir, string cbarPath, string outDir, string[] dates, int cols, int rows, int total) {
    var cb = new Bitmap(cbarPath); var hueTemp = new double[256]; for (int i = 0; i < 256; i++) hueTemp[i] = -1;
    var lutHue = new List<double>(); var lutT = new List<double>();
    for (int x = 15; x <= 291; x++) { var c = cb.GetPixel(x, 45); double h, s, v; Hsv(c.R / 255.0, c.G / 255.0, c.B / 255.0, out h, out s, out v); lutHue.Add(h / 360.0 * 255.0); lutT.Add(32.0 * (x - 15) / 276.0); } cb.Dispose();
    for (int hb = 0; hb < 256; hb++) { double best = 1e9, bt = -1; for (int i = 0; i < lutHue.Count; i++) { double d = Math.Abs(hb - lutHue[i]); d = Math.Min(d, 256 - d); if (d < best) { best = d; bt = lutT[i]; } } if (best <= 4) hueTemp[hb] = bt; }
    var cells = new double[4, rows, cols]; var mean = new double[rows, cols]; var cov = new double[rows, cols]; var used = new List<string>();
    for (int c = 0; c < cols; c++) {
      int idx = (int)Math.Round((c + 0.5) * total / cols - 0.5); int num = 23000 + 4 * idx;
      string path = Path.Combine(framesDir, "flat_global_ecco2_2028x1024." + num + ".tif"); used.Add(dates[idx]);
      using (var bmp = new Bitmap(path)) {
        SaveJpeg(bmp, Path.Combine(outDir, "f" + c.ToString("000") + ".jpg"), 1024, 512);
        int W = bmp.Width, H = bmp.Height; var bd = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        byte[] px = new byte[bd.Stride * H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, px.Length); int stride = bd.Stride; bmp.UnlockBits(bd);
        double[] tot = new double[rows], val = new double[rows], st = new double[rows]; double[,] band = new double[3, rows];
        int TW = W / 32, TH = H / 32; double[] txx = new double[TW * TH], tyy = new double[TW * TH], txy = new double[TW * TH], tv = new double[TW * TH];
        Func<int,int,double> lum = (x, y) => { int i = y * stride + x * 4; return 0.299 * px[i + 2] + 0.587 * px[i + 1] + 0.114 * px[i]; };
        for (int y = 1; y < H - 1; y++) { int r = y * rows / H;
          for (int x = 1; x < W - 1; x++) {
            tot[r]++; int i0 = y * stride + x * 4; double h, s, v; Hsv(px[i0 + 2] / 255.0, px[i0 + 1] / 255.0, px[i0] / 255.0, out h, out s, out v);
            if (s < 64 / 255.0 || v < 20 / 255.0) continue; double t = hueTemp[(int)Math.Min(255, Math.Round(h / 360.0 * 255.0))]; if (t < 0) continue;
            val[r]++; st[r] += t / 32.0; band[t < 10.667 ? 0 : (t < 21.333 ? 1 : 2), r]++;
            int ti = Math.Min(TH - 1, y / 32) * TW + Math.Min(TW - 1, x / 32); double gx = lum(x + 1, y) - lum(x - 1, y), gy = lum(x, y + 1) - lum(x, y - 1);
            txx[ti] += gx * gx; tyy[ti] += gy * gy; txy[ti] += gx * gy; tv[ti]++;
          } }
        double[] sw = new double[rows], swn = new double[rows];
        for (int ty = 0; ty < TH; ty++) for (int tx = 0; tx < TW; tx++) { int ti = ty * TW + tx; double tr = txx[ti] + tyy[ti]; if (tv[ti] < 40 || tr < 1) continue;
          double coh = Math.Sqrt((txx[ti] - tyy[ti]) * (txx[ti] - tyy[ti]) + 4 * txy[ti] * txy[ti]) / tr; int r = Math.Min(rows - 1, (ty * 32 + 16) * rows / H); sw[r] += (1 - coh); swn[r]++; }
        for (int r = 0; r < rows; r++) {
          for (int k = 0; k < 3; k++) cells[k, r, c] = tot[r] > 0 ? band[k, r] / tot[r] : 0;
          cells[3, r, c] = swn[r] > 0 ? sw[r] / swn[r] * (val[r] / Math.Max(1, tot[r])) : 0;
          mean[r, c] = val[r] > 200 ? st[r] / val[r] : 0; cov[r, c] = tot[r] > 0 ? val[r] / tot[r] : 0;
        }
      }
    }
    var sb = new StringBuilder("{\"cols\":" + cols + ",\"rows\":" + rows + ",\"data\":[");
    double[] top = new double[4], lo = new double[4];
    for (int k = 0; k < 4; k++) { var l = new List<double>(); for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) l.Add(cells[k, r, c]); l.Sort(); top[k] = Math.Max(1e-6, l[(int)(l.Count * 0.97)]); if (k == 3) lo[k] = l[(int)(l.Count * 0.30)]; }   // swirl is similar everywhere, so stretch the range to show the differences
    for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) for (int k = 0; k < 4; k++) { sb.Append((int)Math.Round(Math.Max(0.0, Math.Min(1.0, (cells[k, r, c] - lo[k]) / Math.Max(1e-6, top[k] - lo[k]))) * 255)); if (!(r == rows - 1 && c == cols - 1 && k == 3)) sb.Append(','); }
    sb.Append("],\"land\":["); for (int i = 0; i < rows * cols; i++) { sb.Append(0); if (i < rows * cols - 1) sb.Append(','); }
    sb.Append("],\"mean\":["); for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) { sb.Append((int)Math.Round(mean[r, c] * 255)); if (!(r == rows - 1 && c == cols - 1)) sb.Append(','); }
    sb.Append("],\"cov\":["); for (int r = 0; r < rows; r++) for (int c = 0; c < cols; c++) { sb.Append((int)Math.Round(cov[r, c] * 255)); if (!(r == rows - 1 && c == cols - 1)) sb.Append(','); }
    sb.Append("],\"dates\":[\"" + string.Join("\",\"", used.ToArray()) + "\"]}"); return sb.ToString();
  }
}
"@
$dates = Get-Content $datesFile | Where-Object { $_.Trim() } | ForEach-Object { ($_ -split '\s+')[1] }
Write-Host ("{0} timestamps, {1} .. {2}" -f $dates.Count, $dates[0], $dates[-1])
$json = [YearMaker]::Run($frames, (Join-Path $root "assets\ocean_cbar.png"), $out, [string[]]$dates, 160, 18, $dates.Count)
Set-Content -Path (Join-Path $root "year_grid.js") -Value ("window.YEAR_GRID = " + $json + ";") -Encoding utf8
Write-Host "year_grid.js and 160 frames written"
