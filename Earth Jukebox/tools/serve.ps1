# Tiny static file server for local testing (supports HTTP range requests so videos can seek, and streams large files):
#   powershell -File tools\serve.ps1 [port] [-Root <folder to serve>] [-SaveDir <folder the dev-only /save/ route writes to>]
param([int]$Port = 8765, [string]$Root = '', [string]$SaveDir = '')
$root = if ($Root) { (Resolve-Path $Root).Path } else { Split-Path $PSScriptRoot -Parent }
$saveRoot = if ($SaveDir) { (Resolve-Path $SaveDir).Path } else { $root }
$types = @{'.html'='text/html';'.js'='text/javascript';'.png'='image/png';'.jpg'='image/jpeg';'.css'='text/css';'.webm'='video/webm';'.mp4'='video/mp4';'.json'='application/json'}
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.LocalPath).TrimStart('/'); if (-not $p) { $p = 'index.html' }
  $f = Join-Path $root $p
  try {
    if ($c.Request.HttpMethod -eq 'POST' -and $p -match '^save/([a-z0-9_]+.js)$') {      # dev only: lets the analysis tools save their result next to the app
      $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms)
      if ($ms.Length -lt 8MB) { [IO.File]::WriteAllBytes((Join-Path $saveRoot $Matches[1]), $ms.ToArray()); $c.Response.StatusCode = 200 } else { $c.Response.StatusCode = 413 }
    }
    elseif ($c.Request.HttpMethod -eq 'POST' -and $p -match '^saveimg/([a-z0-9_]+)/([a-z0-9_]+\.jpg)$') {      # dev only: the analysis tools save the picture frames they extract into assets/<folder>/
      $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms); $dir = Join-Path (Join-Path $saveRoot 'assets') $Matches[1]
      if ($ms.Length -lt 2MB) { New-Item -ItemType Directory -Force $dir | Out-Null; [IO.File]::WriteAllBytes((Join-Path $dir $Matches[2]), $ms.ToArray()); $c.Response.StatusCode = 200 } else { $c.Response.StatusCode = 413 }
    }
    elseif ((Test-Path $f -PathType Leaf) -and ($f.StartsWith($root))) {
      $e = [IO.Path]::GetExtension($f); $fs = [IO.File]::Open($f, 'Open', 'Read', 'ReadWrite'); $len = $fs.Length
      $c.Response.ContentType = $(if ($types[$e]) { $types[$e] } else { 'application/octet-stream' })
      $c.Response.AddHeader('Accept-Ranges', 'bytes')
      $rng = $c.Request.Headers['Range']; $s = 0; $en = $len - 1
      if ($rng -match 'bytes=(\d*)-(\d*)') {
        if ($Matches[1] -ne '') { $s = [long]$Matches[1] }
        if ($Matches[2] -ne '') { $en = [Math]::Min([long]$Matches[2], $len - 1) }
        $c.Response.StatusCode = 206; $c.Response.AddHeader('Content-Range', "bytes $s-$en/$len")
      }
      $n = $en - $s + 1; $c.Response.ContentLength64 = $n; $fs.Position = $s
      $buf = New-Object byte[] 1048576; $left = $n
      while ($left -gt 0) { $r = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left)); if ($r -le 0) { break }; $c.Response.OutputStream.Write($buf, 0, $r); $left -= $r }
      $fs.Dispose()
    } else { $c.Response.StatusCode = 404 }
  } catch { } finally { try { $c.Response.Close() } catch { } }
}
