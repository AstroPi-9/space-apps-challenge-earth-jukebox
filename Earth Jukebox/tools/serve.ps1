# Tiny static file server for local testing (supports HTTP range requests so videos can seek): powershell -File tools\serve.ps1 [port]
param([int]$Port = 8765)
$root = Split-Path $PSScriptRoot -Parent
$types = @{'.html'='text/html';'.js'='text/javascript';'.png'='image/png';'.jpg'='image/jpeg';'.css'='text/css';'.webm'='video/webm';'.mp4'='video/mp4';'.json'='application/json'}
$l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$Port/"); $l.Start()
while ($l.IsListening) {
  $c = $l.GetContext(); $p = [Uri]::UnescapeDataString($c.Request.Url.LocalPath).TrimStart('/'); if (-not $p) { $p = 'index.html' }
  $f = Join-Path $root $p
  try {
    if ($c.Request.HttpMethod -eq 'POST' -and $p -match '^save/([a-z0-9_]+.js)$') {      # dev only: lets tools/analyse-video.html save its result next to the app
      $ms = New-Object IO.MemoryStream; $c.Request.InputStream.CopyTo($ms)
      if ($ms.Length -lt 5MB) { [IO.File]::WriteAllBytes((Join-Path $root $Matches[1]), $ms.ToArray()); $c.Response.StatusCode = 200 } else { $c.Response.StatusCode = 413 }
    }
    elseif ((Test-Path $f -PathType Leaf) -and ($f.StartsWith($root))) {
      $b = [IO.File]::ReadAllBytes($f); $e = [IO.Path]::GetExtension($f)
      $c.Response.ContentType = $(if ($types[$e]) { $types[$e] } else { 'application/octet-stream' })
      $c.Response.AddHeader('Accept-Ranges', 'bytes')
      $rng = $c.Request.Headers['Range']
      if ($rng -match 'bytes=(\d*)-(\d*)') {
        $s = if ($Matches[1] -ne '') { [int]$Matches[1] } else { 0 }
        $en = if ($Matches[2] -ne '') { [Math]::Min([int]$Matches[2], $b.Length - 1) } else { $b.Length - 1 }
        $c.Response.StatusCode = 206; $c.Response.AddHeader('Content-Range', "bytes $s-$en/$($b.Length)")
        $c.Response.ContentLength64 = $en - $s + 1; $c.Response.OutputStream.Write($b, $s, $en - $s + 1)
      } else { $c.Response.ContentLength64 = $b.Length; $c.Response.OutputStream.Write($b, 0, $b.Length) }
    } else { $c.Response.StatusCode = 404 }
  } catch { } finally { try { $c.Response.Close() } catch { } }
}
