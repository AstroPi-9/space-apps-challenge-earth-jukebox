# Analyses the aerosol frame and writes grid.js (cols x rows x 4 species intensities 0-255).
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-grid.ps1
$root = Split-Path $PSScriptRoot -Parent
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Text;
public static class GridMaker {
  public static string Run(string path, int cols, int rows) {
    var bmp = new Bitmap(path); int W = bmp.Width, H = bmp.Height;
    var bd = bmp.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] px = new byte[bd.Stride*H]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, px, 0, px.Length);
    double[,,] acc = new double[4, rows, cols]; double[,] land = new double[rows, cols]; double[,] cnt = new double[rows, cols];
    for (int y=0;y<H;y++) for (int x=0;x<W;x++) {
      int i=y*bd.Stride+x*4; double b=px[i]/255.0,g=px[i+1]/255.0,r=px[i+2]/255.0;
      double mx=Math.Max(r,Math.Max(g,b)), mn=Math.Min(r,Math.Min(g,b)), d=mx-mn, v=mx, s=mx<=0?0:d/mx, h=0;
      if (d>0){ if(mx==r) h=60*(((g-b)/d)%6); else if(mx==g) h=60*((b-r)/d+2); else h=60*((r-g)/d+4); if(h<0)h+=360; }
      int cx=x*cols/W, cy=y*rows/H; cnt[cy,cx]++; if (s<0.28 && v>=0.14 && v<=0.42) land[cy,cx]++;
      // 0 black carbon, 1 dust, 2 sea salt, 3 sulfate
      if ((h<=40||h>=345) && s>0.4 && v>0.35) acc[0,cy,cx]+=v;
      else if (h>=255 && h<=330 && s>0.12 && v>0.3) acc[1,cy,cx]+=v;
      else if (h>=170 && h<=255 && s>0.08 && v>0.35) acc[2,cy,cx]+=v;
      else if (h>=75 && h<=160 && s>0.35 && v>0.25) acc[3,cy,cx]+=v;
    }
    var sb = new StringBuilder("{\"cols\":"+cols+",\"rows\":"+rows+",\"data\":[");
    double[] top = new double[4];
    for (int k=0;k<4;k++){ double m=0; for(int y=0;y<rows;y++)for(int x=0;x<cols;x++) m=Math.Max(m,acc[k,y,x]/cnt[y,x]); top[k]=m; }
    for (int y=0;y<rows;y++) for (int x=0;x<cols;x++) for (int k=0;k<4;k++) {
      int val=(int)Math.Round(Math.Min(1.0, acc[k,y,x]/cnt[y,x]/top[k])*255);
      sb.Append(val); if(!(y==rows-1&&x==cols-1&&k==3)) sb.Append(',');
    }
    sb.Append("],\"land\":["); for (int y=0;y<rows;y++) for (int x=0;x<cols;x++) { sb.Append((int)Math.Round(land[y,x]/cnt[y,x]*255)); if(!(y==rows-1&&x==cols-1)) sb.Append(","); } sb.Append("]}"); bmp.UnlockBits(bd); bmp.Dispose(); return sb.ToString();
  }
}
"@
$json = [GridMaker]::Run((Join-Path $root "assets\aerosols.png"), 160, 18)
Set-Content -Path (Join-Path $root "grid.js") -Value ("window.AEROSOL_GRID = " + $json + ";") -Encoding utf8
Write-Host "grid.js written"
