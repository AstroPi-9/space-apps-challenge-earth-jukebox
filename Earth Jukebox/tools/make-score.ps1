# Writes the 5-instrument MuseScore composition used by the "MuseScore composition" sound source.
#   One score, five instruments = the five voices the data modulates:
#     1 drone  2 chords (pad)  3 high voice (harp)  4 lead melody  5 drums
#   16 bars of 4/4 at 120 bpm (32 s), in the raga Mohanam, Sa = D. The app loops it and, as the sweep moves,
#   raises and lowers each instrument (and opens or closes its tone) according to the data for that voice.
# Outputs:  music_scores\EarthJukebox_5voice.mscz   (open and edit this in MuseScore)
#           score_data.js                           (the five stems the app plays, base64 mp3)
# To use your own edits, export five mp3 files named drone.mp3 pad.mp3 high.mp3 lead.mp3 drums.mp3
# (one instrument soloed each time, same length, starting on beat 1) into a folder and run:
#   powershell -ExecutionPolicy Bypass -File tools\make-score.ps1 -StemDir <that folder>
param(
  [string]$MuseScore = "C:\Program Files\MuseScore 4\bin\MuseScore4.exe",
  [string]$Work = (Join-Path $env:TEMP "ej_score"),
  [string]$StemDir = ""
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force $Work | Out-Null
$names = 'drone', 'pad', 'high', 'lead', 'drums'

if (-not $StemDir) {
  $PPQ = 480
  function VLQ([int]$v) { $b = @($v -band 0x7F); $v = $v -shr 7; while ($v -gt 0) { $b = @(($v -band 0x7F) -bor 0x80) + $b; $v = $v -shr 7 }; return ,$b }
  function Chunk([string]$id, [byte[]]$data) {
    $len = [byte[]]@((($data.Length -shr 24) -band 255), (($data.Length -shr 16) -band 255), (($data.Length -shr 8) -band 255), ($data.Length -band 255))
    return [byte[]]([Text.Encoding]::ASCII.GetBytes($id) + $len + $data)
  }
  function TrackBytes($events) {
    $sorted = $events | Sort-Object { $_.t }, { if ($_.b[0] -band 0x10) { 1 } else { 0 } }
    $out = New-Object System.Collections.Generic.List[byte]; $last = 0
    foreach ($e in $sorted) { $out.AddRange([byte[]](VLQ ($e.t - $last))); $out.AddRange([byte[]]$e.b); $last = $e.t }
    $out.AddRange([byte[]]@(0, 0xFF, 0x2F, 0)); return ,($out.ToArray())
  }
  function Meta([int]$t, [int]$type, [byte[]]$data) { @{ t = $t; b = [byte[]](@(0xFF, $type) + (VLQ $data.Length) + $data) } }
  function Note([int]$ch, [double]$beat, [double]$beats, [int]$pitch, [int]$vel) {
    $on = [int]($beat * $PPQ); $off = [int](($beat + $beats) * $PPQ) - 10
    @(@{ t = $on; b = [byte[]]@((0x90 + $ch), $pitch, $vel) }, @{ t = $off; b = [byte[]]@((0x80 + $ch), $pitch, 0) })
  }
  function WriteMidi([string]$path, $parts) {
    $tracks = New-Object System.Collections.Generic.List[byte[]]
    $tempo = [int](60000000 / 120)
    $conductor = @((Meta 0 0x51 ([byte[]]@((($tempo -shr 16) -band 255), (($tempo -shr 8) -band 255), ($tempo -band 255)))), (Meta 0 0x58 ([byte[]]@(4, 2, 24, 8))), (Meta 0 0x59 ([byte[]]@(2, 0))))
    $tracks.Add((Chunk 'MTrk' (TrackBytes $conductor)))
    foreach ($p in $parts) {
      $ev = New-Object System.Collections.Generic.List[object]
      $ev.Add((Meta 0 0x03 ([Text.Encoding]::ASCII.GetBytes($p.name))))
      if ($p.ch -ne 9) { $ev.Add(@{ t = 0; b = [byte[]]@((0xC0 + $p.ch), $p.prog) }) }
      foreach ($e in $p.events) { $ev.Add($e) }
      $tracks.Add((Chunk 'MTrk' (TrackBytes $ev)))
    }
    $hdr = [byte[]]@(0, 1, 0, ($tracks.Count), (($PPQ -shr 8) -band 255), ($PPQ -band 255))
    $all = New-Object System.Collections.Generic.List[byte]; $all.AddRange([byte[]](Chunk 'MThd' $hdr)); foreach ($t in $tracks) { $all.AddRange($t) }
    [IO.File]::WriteAllBytes($path, $all.ToArray())
  }

  # Mohanam, Sa = D: D E F# A B
  $deg = 0, 2, 4, 7, 9
  function Pitch([int]$idx, [int]$base) { $oct = [math]::Floor($idx / 5); $i = $idx - 5 * $oct; return $base + 12 * $oct + $deg[$i] }
  $chord = @{ 1 = @(50, 54, 57, 38, 45); 2 = @(52, 57, 59, 40, 47); 3 = @(57, 62, 66, 45, 52); 4 = @(54, 59, 62, 42, 49) }   # upper three notes, then two bass notes
  $prog = 1, 2, 3, 4, 1, 4, 2, 3                       # eight chords, two bars each = 16 bars

  # 1 drone: D and A held under everything, renewed every four bars
  $ev = New-Object System.Collections.Generic.List[object]
  for ($k = 0; $k -lt 4; $k++) { foreach ($n in 38, 45) { foreach ($e in (Note 0 ($k * 16) 16 $n 60)) { $ev.Add($e) } } }
  $drone = @{ name = 'Drone (cello)'; ch = 0; prog = 42; events = $ev }
  # 2 chords
  $ev = New-Object System.Collections.Generic.List[object]
  for ($k = 0; $k -lt 8; $k++) { $c = $chord[$prog[$k]]; foreach ($n in $c[0..2]) { foreach ($e in (Note 1 ($k * 8) 8 $n 54)) { $ev.Add($e) } } }
  $pad = @{ name = 'Chords (strings)'; ch = 1; prog = 48; events = $ev }
  # 3 high voice: a harp arpeggio over each chord
  $ev = New-Object System.Collections.Generic.List[object]; $pat = 0, 1, 2, 1, 0, 1, 2, 1
  for ($k = 0; $k -lt 8; $k++) { $c = $chord[$prog[$k]]; for ($b = 0; $b -lt 8; $b++) { foreach ($e in (Note 2 ($k * 8 + $b) 1.0 ($c[$pat[$b]] + 12) 56)) { $ev.Add($e) } } }
  $high = @{ name = 'High voice (harp)'; ch = 2; prog = 46; events = $ev }
  # 4 lead melody: four four-bar phrases (A, A', B, A''), a short grace note on the longer notes (a nod to gamakas)
  $phrases = '0:1 2:.5 3:.5 4:2  3:1 2:1 1:1 0:1  2:1 3:1 4:1 5:1  4:3 r:1',
             '0:1 2:.5 3:.5 4:2  5:1 4:1 3:1 2:1  3:1 2:1 1:1 2:1  0:3 r:1',
             '5:2 7:1 6:1  5:1 6:1 7:1 9:1  8:2 7:1 6:1  5:3 r:1',
             '4:1 5:.5 4:.5 3:2  2:1 3:1 4:1 2:1  1:2 2:1 1:1  0:4'
  $ev = New-Object System.Collections.Generic.List[object]; $beat = 0.0
  foreach ($ph in $phrases) {
    foreach ($tok in ($ph -split '\s+' | Where-Object { $_ })) {
      $a, $b = $tok -split ':'; $len = [double]$b
      if ($a -ne 'r') {
        $idx = [int]$a; $p = Pitch $idx 62
        if ($len -ge 2) { $g = Pitch ($idx + 1) 62; foreach ($e in (Note 3 $beat 0.12 $g 66)) { $ev.Add($e) }; foreach ($e in (Note 3 ($beat + 0.1) ($len - 0.1) $p 80)) { $ev.Add($e) } }
        else { foreach ($e in (Note 3 $beat ($len * 0.95) $p 80)) { $ev.Add($e) } }
      }
      $beat += $len
    }
  }
  if ([math]::Abs($beat - 64) -gt 0.001) { throw "melody is $beat beats, not 64" }
  $lead = @{ name = 'Lead (clarinet)'; ch = 3; prog = 71; events = $ev }
  # 5 drums (General MIDI drum kit): kick on 1 and 3, rim on 2 and 4, hi-hat quavers, a small fill in the last bar
  $ev = New-Object System.Collections.Generic.List[object]
  for ($bar = 0; $bar -lt 16; $bar++) {
    $s = $bar * 4
    foreach ($e in (Note 9 $s 0.4 36 80)) { $ev.Add($e) }; foreach ($e in (Note 9 ($s + 2) 0.4 36 72)) { $ev.Add($e) }
    foreach ($e in (Note 9 ($s + 1) 0.3 37 68)) { $ev.Add($e) }; foreach ($e in (Note 9 ($s + 3) 0.3 37 68)) { $ev.Add($e) }
    for ($q = 0; $q -lt 8; $q++) { foreach ($e in (Note 9 ($s + $q * 0.5) 0.25 42 (46 + 8 * ($q % 2)))) { $ev.Add($e) } }
    if ($bar -eq 15) { foreach ($q in 3.0, 3.25, 3.5, 3.75) { foreach ($e in (Note 9 ($s + $q) 0.2 38 75)) { $ev.Add($e) } } }
  }
  $drums = @{ name = 'Drums'; ch = 9; prog = 0; events = $ev }

  $all = @($drone, $pad, $high, $lead, $drums)
  $scoreDir = Join-Path $root 'music_scores'; New-Item -ItemType Directory -Force $scoreDir | Out-Null
  WriteMidi "$Work\EarthJukebox_5voice.mid" $all
  & $MuseScore -o (Join-Path $scoreDir 'EarthJukebox_5voice.mscz') "$Work\EarthJukebox_5voice.mid" | Out-Null
  for ($i = 0; $i -lt 5; $i++) { WriteMidi "$Work\$($names[$i]).mid" @($all[$i]); & $MuseScore -o "$Work\$($names[$i]).mp3" "$Work\$($names[$i]).mid" | Out-Null }
  $StemDir = $Work
}

$packed = foreach ($n in $names) {
  $f = Join-Path $StemDir "$n.mp3"; if (-not (Test-Path $f)) { throw "missing stem $f" }
  "{0}: {1:N0} KB" -f $n, ((Get-Item $f).Length / 1KB) | Write-Host
  '  "' + $n + '": "' + [Convert]::ToBase64String([IO.File]::ReadAllBytes($f)) + '"'
}
$js = "// The five stems of the MuseScore composition (drone, chords, high voice, lead, drums). Built by tools/make-score.ps1.`nwindow.SCORE_B64 = {`n" + ($packed -join ",`n") + "`n};`n"
[IO.File]::WriteAllText((Join-Path $root 'score_data.js'), $js)
"wrote score_data.js ({0:N0} KB)" -f ((Get-Item (Join-Path $root 'score_data.js')).Length / 1KB)
