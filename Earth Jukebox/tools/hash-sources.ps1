# Writes source_hashes.js: the SHA-256 fingerprint of every picture, movie and data file the app reads, so each exported note trace
# can name the exact file a note came from. Run again whenever a file in assets\ or a data file changes.
# Usage: powershell -ExecutionPolicy Bypass -File tools\hash-sources.ps1
$root = Split-Path $PSScriptRoot -Parent
$files = @()
foreach ($pattern in 'assets\*.jpg', 'assets\*.png', 'assets\video\*', 'assets\elnino\*', 'assets\year\*.jpg') { $files += Get-ChildItem (Join-Path $root $pattern) -File }
foreach ($name in 'grid.js', 'ocean_grid.js', 'sst_grid.js', 'sss_grid.js', 'density_grid.js', 'video_grid.js', 'year_grid.js', 'flow_field.js', 'elnino_grid.js', 'elnino_fine.js', 'nino34_index.js') { $files += Get-Item (Join-Path $root $name) }
$lines = foreach ($f in ($files | Sort-Object FullName)) {
  $rel = $f.FullName.Substring($root.Length + 1).Replace('\', '/')
  '  "' + $rel + '": "' + (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLower() + '"'
}
$js = "// SHA-256 fingerprints of the files the app reads (built by tools/hash-sources.ps1). Used by the note trace export.`nwindow.SOURCE_HASHES = {`n" + ($lines -join ",`n") + "`n};`n"
[IO.File]::WriteAllText((Join-Path $root 'source_hashes.js'), $js)
"wrote source_hashes.js ($($files.Count) files)"
