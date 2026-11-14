# Writes the composed music snippets for the Earth Jukebox.
#   1. builds a small MIDI file per stem (original phrases in the raga Mohanam, Sa = D, 120 bpm, 8 bars = 16 s)
#   2. renders each one to mp3 with MuseScore 4 (its bundled "MS Basic" sound font)
#   3. packs the mp3 files into music_data.js (base64) so the app still works opened straight from a folder
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-music.ps1 [-MuseScore "C:\Program Files\MuseScore 4\bin\MuseScore4.exe"]
param(
  [string]$MuseScore = "C:\Program Files\MuseScore 4\bin\MuseScore4.exe",
  [string]$Work = (Join-Path $env:TEMP "ej_music")
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force $Work | Out-Null
$PPQ = 480

# ---- tiny MIDI writer -------------------------------------------------------
function VLQ([int]$v) { $b = @($v -band 0x7F); $v = $v -shr 7; while ($v -gt 0) { $b = @(($v -band 0x7F) -bor 0x80) + $b; $v = $v -shr 7 }; return ,$b }
function Chunk([string]$id, [byte[]]$data) {
  $len = [byte[]]@((($data.Length -shr 24) -band 255), (($data.Length -shr 16) -band 255), (($data.Length -shr 8) -band 255), ($data.Length -band 255))
  return [byte[]]([Text.Encoding]::ASCII.GetBytes($id) + $len + $data)
}
function TrackBytes($events) {                      # events: list of @{t=tick; b=byte[]}
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
function WriteMidi([string]$path, $parts) {         # parts: list of @{name; ch; prog; events}
  $tracks = New-Object System.Collections.Generic.List[byte[]]
  $tempo = [int](60000000 / 120)
  $conductor = @((Meta 0 0x51 ([byte[]]@((($tempo -shr 16) -band 255), (($tempo -shr 8) -band 255), ($tempo -band 255)))), (Meta 0 0x58 ([byte[]]@(4, 2, 24, 8))), (Meta 0 0x59 ([byte[]]@(2, 0))))
  $tracks.Add((Chunk 'MTrk' (TrackBytes $conductor)))   # key signature D major (2 sharps) so the notes are written sensibly
  foreach ($p in $parts) {
    $ev = New-Object System.Collections.Generic.List[object]
    $ev.Add((Meta 0 0x03 ([Text.Encoding]::ASCII.GetBytes($p.name))))
    $ev.Add(@{ t = 0; b = [byte[]]@((0xC0 + $p.ch), $p.prog) })
    foreach ($e in $p.events) { $ev.Add($e) }
    $tracks.Add((Chunk 'MTrk' (TrackBytes $ev)))
  }
  $hdr = [byte[]]@(0, 1, 0, ($tracks.Count), (($PPQ -shr 8) -band 255), ($PPQ -band 255))
  $all = New-Object System.Collections.Generic.List[byte]; $all.AddRange([byte[]](Chunk 'MThd' $hdr)); foreach ($t in $tracks) { $all.AddRange($t) }
  [IO.File]::WriteAllBytes($path, $all.ToArray())
}

# ---- Mohanam, Sa = D: D E F# A B -------------------------------------------
$deg = 0, 2, 4, 7, 9
function Pitch([int]$idx, [int]$base) { $oct = [math]::Floor($idx / 5); $i = $idx - 5 * $oct; return $base + 12 * $oct + $deg[$i] }
$chord = @{ 1 = @(50, 54, 57, 38); 2 = @(52, 57, 59, 40); 3 = @(57, 62, 66, 45); 4 = @(54, 59, 62, 42) }     # D F# A | E A B | A D F# | F# B D, then the bass note

# phrase = "idx:beats" items, 32 beats each; "r:beats" is a rest
$tracks = @(
  @{ id = 'year';         tune = 60; bedProg = 48; bass = 42; arp = $null; prog = 1,2,3,4; vel = 80
     phrase = '0:2 2:1 3:1  4:3 3:1  2:2 3:1 2:1  0:4  3:2 4:1 5:1  7:3 5:1  4:1 3:1 2:1 1:1  0:3 r:1' },
  @{ id = 'aerosols';     tune = 71; bedProg = 49; bass = 42; arp = $null; prog = 1,4,2,3; vel = 78
     phrase = '4:.5 5:.5 4:.5 3:.5 2:2  3:.5 4:.5 3:.5 2:.5 1:2  2:1 3:1 4:1 6:1  5:3 r:1  6:.5 7:.5 6:.5 5:.5 4:2  5:.5 4:.5 3:.5 2:.5 3:2  4:2 2:1 3:1  0:3 r:1' },
  @{ id = 'sst';          tune = 73; bedProg = 48; bass = 42; arp = 46;    prog = 1,3,2,4; vel = 76
     phrase = '5:1 r:.5 6:.5 7:1 6:1  8:2 7:1 6:1  7:.5 8:.5 9:1 8:1 7:1  6:4  5:1 6:1 7:1 9:1  10:2 9:1 8:1  8:1 7:1 6:1 5:1  5:3 r:1' },
  @{ id = 'sss';          tune = 68; bedProg = 19; bass = 42; arp = $null; prog = 1,4,3,2; vel = 76
     phrase = '4:3 3:1  2:2 3:2  4:2 5:2  4:3 r:1  5:3 4:1  3:2 2:1 1:1  2:2 1:2  0:4' },
  @{ id = 'density';      tune = 70; bedProg = 48; bass = 42; arp = $null; prog = 1,2,4,3; vel = 84
     phrase = '-5:2 -3:1 -2:1  0:3 -2:1  -3:2 -2:2  -5:4  -2:2 -1:1 0:1  1:2 0:1 -1:1  -2:1 -3:1 -4:2  -5:3 r:1' },
  @{ id = 'densityVideo'; tune = 70; bedProg = 48; bass = 42; arp = 46;    prog = 1,3,4,2; vel = 84
     phrase = '-5:1 -4:.5 -3:.5 -2:1 -3:1  -2:1 -1:.5 0:.5 -1:1 -2:1  0:1 1:.5 2:.5 1:1 0:1  -1:2 -3:2  -4:1 -3:.5 -2:.5 -1:1 -2:1  0:1 2:1 1:1 0:1  -1:1 -2:1 -3:1 -4:1  -5:3 r:1' }
)

$packed = [ordered]@{}
foreach ($tr in $tracks) {
  # tune stem: the melody, with a Carnatic-style ornament (a quick touch of the note above) on the longer notes
  $ev = New-Object System.Collections.Generic.List[object]; $beat = 0.0
  foreach ($tok in ($tr.phrase -split '\s+' | Where-Object { $_ })) {
    $a, $b = $tok -split ':'; $len = [double]$b
    if ($a -ne 'r') {
      $idx = [int]$a; $p = Pitch $idx 62
      if ($len -ge 2) {          # a short touch of the next scale note above (a nokku-like grace note), then the main note
        $g = Pitch ($idx + 1) 62; foreach ($e in (Note 0 $beat 0.12 $g ($tr.vel - 14))) { $ev.Add($e) }
        foreach ($e in (Note 0 ($beat + 0.1) ($len - 0.1) $p $tr.vel)) { $ev.Add($e) }
      } else { foreach ($e in (Note 0 $beat ($len * 0.95) $p $tr.vel)) { $ev.Add($e) } }
    }
    $beat += $len
  }
  if ([math]::Abs($beat - 32) -gt 0.001) { throw "$($tr.id): phrase is $beat beats, not 32" }
  WriteMidi "$Work\$($tr.id)_tune.mid" @(@{ name = 'Melody'; ch = 0; prog = $tr.tune; events = $ev })

  # bed stem: sustained chords (2 bars each), a bass note, and an optional harp arpeggio
  $ch = New-Object System.Collections.Generic.List[object]; $bs = New-Object System.Collections.Generic.List[object]; $ar = New-Object System.Collections.Generic.List[object]
  for ($k = 0; $k -lt 4; $k++) {
    $c = $chord[[int]$tr.prog[$k]]; $at = $k * 8
    foreach ($n in $c[0..2]) { foreach ($e in (Note 1 $at 8 $n 52)) { $ch.Add($e) } }
    foreach ($e in (Note 2 $at 8 $c[3] 58)) { $bs.Add($e) }
    if ($tr.arp) { for ($b = 0; $b -lt 8; $b++) { foreach ($e in (Note 3 ($at + $b * 1.0) 1.0 ($c[$b % 3] + 12) 46)) { $ar.Add($e) } } }
  }
  $parts = @(@{ name = 'Chords'; ch = 1; prog = $tr.bedProg; events = $ch }, @{ name = 'Bass'; ch = 2; prog = 42; events = $bs })
  if ($tr.arp) { $parts += @{ name = 'Arpeggio'; ch = 3; prog = $tr.arp; events = $ar } }
  WriteMidi "$Work\$($tr.id)_bed.mid" $parts
}

# ---- render with MuseScore, then pack ---------------------------------------
foreach ($f in (Get-ChildItem "$Work\*.mid")) {
  $mp3 = [IO.Path]::ChangeExtension($f.FullName, '.mp3')
  & $MuseScore -o $mp3 $f.FullName | Out-Null
  if (-not (Test-Path $mp3)) { throw "MuseScore did not render $($f.Name)" }
  $packed[$f.BaseName] = [Convert]::ToBase64String([IO.File]::ReadAllBytes($mp3))
  "{0}: {1:N0} KB" -f $f.BaseName, ((Get-Item $mp3).Length / 1KB)
}
$js = "// Composed music snippets (original phrases in raga Mohanam, Sa = D, rendered with MuseScore 4). Built by tools/make-music.ps1.`nwindow.MUSIC_B64 = {`n" +
  (($packed.GetEnumerator() | ForEach-Object { '  "' + $_.Key + '": "' + $_.Value + '"' }) -join ",`n") + "`n};`n"
[IO.File]::WriteAllText((Join-Path $root 'music_data.js'), $js)
"wrote music_data.js ({0:N0} KB)" -f ((Get-Item (Join-Path $root 'music_data.js')).Length / 1KB)
