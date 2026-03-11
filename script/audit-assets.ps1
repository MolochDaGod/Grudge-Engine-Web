# audit-assets.ps1
# Scans all faction asset directories and reports missing/broken GLB files
# referenced by faction-assets.ts
# Usage: pwsh script/audit-assets.ps1

$ErrorActionPreference = "Continue"
$AssetsRoot = Join-Path $PSScriptRoot "..\client\public\assets"

Write-Host "`n=== GGE Asset Audit ===" -ForegroundColor Cyan
Write-Host "Assets root: $AssetsRoot`n"

$totalFound = 0
$totalMissing = 0
$totalEmpty = 0

$dirs = @(
  "factions\orc\buildings", "factions\orc\units",
  "factions\elf\buildings", "factions\elf\units",
  "factions\human\buildings", "factions\human\units",
  "factions\barbarian\buildings", "factions\barbarian\units",
  "factions\dwarf\buildings", "factions\dwarf\units",
  "factions\undead\buildings", "factions\undead\units",
  "siege", "weapons", "terrain"
)

foreach ($dir in $dirs) {
  $fullPath = Join-Path $AssetsRoot $dir
  Write-Host "--- $dir ---" -ForegroundColor Yellow

  if (-not (Test-Path $fullPath)) {
    Write-Host "  MISSING DIR: $fullPath" -ForegroundColor Red
    $totalMissing++
    continue
  }

  $glbFiles = Get-ChildItem -Path $fullPath -Filter "*.glb" -File -ErrorAction SilentlyContinue
  if ($null -eq $glbFiles -or $glbFiles.Count -eq 0) {
    Write-Host "  No GLB files found" -ForegroundColor DarkYellow
    $totalEmpty++
  } else {
    foreach ($f in $glbFiles) {
      $size = [math]::Round($f.Length / 1024, 1)
      if ($f.Length -lt 100) {
        Write-Host "  SUSPICIOUS (${size} KB): $($f.Name)" -ForegroundColor Red
      } else {
        Write-Host "  OK (${size} KB): $($f.Name)" -ForegroundColor Green
        $totalFound++
      }
    }
  }

  # Check for animation subdirectory
  $animDir = Join-Path $fullPath "anims"
  if (Test-Path $animDir) {
    $animFiles = Get-ChildItem -Path $animDir -Filter "*.glb" -File -ErrorAction SilentlyContinue
    Write-Host "  Animations: $($animFiles.Count) GLB files" -ForegroundColor DarkCyan
    $totalFound += $animFiles.Count
  }
}

# Check referenced model paths from faction-assets.ts
Write-Host "`n=== Checking faction-assets.ts references ===" -ForegroundColor Cyan
$tsFile = Join-Path $PSScriptRoot "..\client\src\lib\faction-assets.ts"
if (Test-Path $tsFile) {
  $content = Get-Content $tsFile -Raw
  $modelPaths = [regex]::Matches($content, "modelPath:\s*'(/assets/[^']+)'") | ForEach-Object { $_.Groups[1].Value }

  $referencedMissing = 0
  foreach ($mp in $modelPaths) {
    $localPath = Join-Path $PSScriptRoot "..\client\public" $mp.Replace("/", "\")
    if (-not (Test-Path $localPath)) {
      Write-Host "  MISSING: $mp" -ForegroundColor Red
      $referencedMissing++
    }
  }
  Write-Host "  Referenced paths: $($modelPaths.Count)  Missing: $referencedMissing" -ForegroundColor $(if ($referencedMissing -gt 0) { "Yellow" } else { "Green" })
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "GLB files found: $totalFound" -ForegroundColor Green
Write-Host "Empty directories: $totalEmpty" -ForegroundColor $(if ($totalEmpty -gt 0) { "Yellow" } else { "Green" })
Write-Host "Missing directories: $totalMissing" -ForegroundColor $(if ($totalMissing -gt 0) { "Red" } else { "Green" })
Write-Host ""
Write-Host "To convert Toon_RTS FBX files: pwsh script/convert-toon-rts.ps1"
Write-Host "To convert 3DCharacters: pwsh script/convert-3d-characters.ps1"
Write-Host "To convert CraftPix packs: pwsh script/convert-craftpix.ps1"
