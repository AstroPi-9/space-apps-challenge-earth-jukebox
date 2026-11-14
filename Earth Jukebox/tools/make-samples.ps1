# Renders a small set of instrument sounds with MuseScore 4 (its bundled MS Basic sound font) for the "MuseScore instrument sounds" source.
# For each instrument, one MIDI file holds a row of single notes (every 5 semitones across the useful range), each in its own time slot;
# MuseScore renders it to one mp3, and the app cuts the slots apart and re-pitches them (by at most 2.5 semitones) to play any note.
# Output: samples_data.js  (window.SAMPLES = { instrument: { lo, step, slot, hold, notes[], b64 } })
# Usage: powershell -ExecutionPolicy Bypass -File tools\make-samples.ps1
param(
  [string]$MuseScore = "C:\Program Files\MuseScore 4\bin\MuseScore4.exe",
  [string]$Work = (Join-Path $env:TEMP "ej_samples")
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
New-Item -ItemType Directory -Force $Work | Out-Null
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

# key, General MIDI program, lowest and highest note to sample, long (sustained: loopable) or short (struck/plucked: decays by itself)
$inst = @(
  @('bassoon', 70, 34, 72, 'L'), @('clarinet', 71, 50, 90, 'L'), @('cello', 42, 36, 84, 'L'), @('flute', 73, 60, 96, 'L'), @('oboe', 68, 58, 92, 'L'), @('horn', 60, 41, 79, 'L'),
  @('strings', 48, 40, 76, 'L'), @('choir', 52, 48, 76, 'L'), @('brass', 61, 40, 72, 'L'), @('organ', 19, 36, 76, 'L'), @('tuba', 58, 28, 56, 'L'),
  @('timpani', 47, 36, 57, 'S'), @('marimba', 12, 48, 88, 'S'), @('vibes', 11, 53, 89, 'S'), @('harp', 46, 46, 98, 'S'), @('celesta', 8, 72, 108, 'S'), @('kalimba', 108, 55, 96, 'S'), @('glass', 9, 72, 108, 'S')
)
$step = 5
$entries = New-Object System.Collections.Generic.List[string]
foreach ($i in $inst) {
  $key, $prog, $lo, $hi, $kind = $i
  $slotBeats = if ($kind -eq 'L') { 5.0 } else { 3.0 }; $holdBeats = if ($kind -eq 'L') { 4.2 } else { 2.4 }
  $notes = @(); for ($m = $lo; $m -le $hi; $m += $step) { $notes += $m }
  $ev = New-Object System.Collections.Generic.List[object]; $ev.Add((Meta 0 0x03 ([Text.Encoding]::ASCII.GetBytes($key)))); $ev.Add(@{ t = 0; b = [byte[]]@(0xC0, $prog) })
  for ($n = 0; $n -lt $notes.Count; $n++) {
    $on = [int]($n * $slotBeats * $PPQ); $off = [int](($n * $slotBeats + $holdBeats) * $PPQ)
    $ev.Add(@{ t = $on; b = [byte[]]@(0x90, $notes[$n], 90) }); $ev.Add(@{ t = $off; b = [byte[]]@(0x80, $notes[$n], 0) })
  }
  $tempo = [int](60000000 / 120)
  $cond = @((Meta 0 0x51 ([byte[]]@((($tempo -shr 16) -band 255), (($tempo -shr 8) -band 255), ($tempo -band 255)))), (Meta 0 0x58 ([byte[]]@(4, 2, 24, 8))))
  $all = New-Object System.Collections.Generic.List[byte]
  $all.AddRange([byte[]](Chunk 'MThd' ([byte[]]@(0, 1, 0, 2, (($PPQ -shr 8) -band 255), ($PPQ -band 255)))))
  $all.AddRange([byte[]](Chunk 'MTrk' (TrackBytes $cond))); $all.AddRange([byte[]](Chunk 'MTrk' (TrackBytes $ev)))
  $mid = "$Work\$key.mid"; $mp3 = "$Work\$key.mp3"; [IO.File]::WriteAllBytes($mid, $all.ToArray())
  & $MuseScore -o $mp3 $mid | Out-Null
  if (-not (Test-Path $mp3)) { throw "MuseScore did not render $key" }
  "{0}: {1} notes, {2:N0} KB" -f $key, $notes.Count, ((Get-Item $mp3).Length / 1KB) | Write-Host
  $entries.Add(('  "{0}": {{ "lo": {1}, "step": {2}, "slot": {3}, "hold": {4}, "notes": [{5}], "b64": "{6}" }}' -f $key, $lo, $step, ($slotBeats * 0.5), ($holdBeats * 0.5), ($notes -join ','), [Convert]::ToBase64String([IO.File]::ReadAllBytes($mp3))))
}
$js = "// Instrument sounds rendered with MuseScore 4 (MS Basic sound font): one row of single notes per instrument. Built by tools/make-samples.ps1.`nwindow.SAMPLES = {`n" + ($entries -join ",`n") + "`n};`n"
[IO.File]::WriteAllText((Join-Path $root 'samples_data.js'), $js)
"wrote samples_data.js ({0:N1} MB)" -f ((Get-Item (Join-Path $root 'samples_data.js')).Length / 1MB)
