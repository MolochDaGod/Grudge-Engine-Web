# convert-craftpix.ps1
# Batch convert CraftPix downloaded model packs (OBJ/FBX) to GLB
# Searches common download locations for CraftPix packs
# Usage: pwsh script/convert-craftpix.ps1 [-SourceDir "D:\Downloads\CraftPix"]

param(
  [string]$SourceDir = ""
)

$ErrorActionPreference = "Continue"
$DstRoot = Join-Path $PSScriptRoot "..\client\public\assets"

# Common locations to search for CraftPix downloads
$searchPaths = @(
  $SourceDir,
  "$env:USERPROFILE\Downloads",
  "D:\Games\Models",
  "C:\Users\nugye\Documents\1111111"
) | Where-Object { $_ -and (Test-Path $_) }

Write-Host "`n=== CraftPix Model Conversion ===" -ForegroundColor Cyan
Write-Host "Destination: $DstRoot`n"

$totalConverted = 0
$totalFailed = 0

foreach ($searchPath in $searchPaths) {
  Write-Host "Scanning: $searchPath" -ForegroundColor Yellow

  # Find FBX files
  $fbxFiles = Get-ChildItem -Path $searchPath -Filter "*.fbx" -File -Recurse -Depth 4 -ErrorAction SilentlyContinue
  # Find OBJ files
  $objFiles = Get-ChildItem -Path $searchPath -Filter "*.obj" -File -Recurse -Depth 4 -ErrorAction SilentlyContinue

  $allFiles = @()
  if ($fbxFiles) { $allFiles += $fbxFiles }
  if ($objFiles) { $allFiles += $objFiles }

  # Filter for CraftPix-style naming patterns
  $craftPixFiles = $allFiles | Where-Object {
    $dir = $_.DirectoryName.ToLower()
    $name = $_.Name.ToLower()
    ($dir -match "craftpix|lowpoly|low.poly|medieval|orc.build|elf.build|castle|siege|nature.prop") -or
    ($name -match "building|tower|wall|gate|house|barracks|catapult|ballista|tree_low|rock_low")
  }

  Write-Host "  Found $($craftPixFiles.Count) CraftPix-style model files" -ForegroundColor DarkCyan

  foreach ($file in $craftPixFiles) {
    $baseName = $file.BaseName.ToLower() -replace '[^a-z0-9_-]', '-'
    $ext = $file.Extension.ToLower()

    # Categorize by folder name
    $dirLower = $file.DirectoryName.ToLower()
    $category = if ($dirLower -match "orc") { "factions\orc\buildings" }
      elseif ($dirLower -match "elf") { "factions\elf\buildings" }
      elseif ($dirLower -match "castle|human|kingdom") { "factions\human\buildings" }
      elseif ($dirLower -match "siege|catapult|ballista") { "siege" }
      elseif ($dirLower -match "weapon|sword|axe") { "weapons" }
      elseif ($dirLower -match "nature|tree|rock") { "terrain" }
      else { "misc" }

    $outDir = Join-Path $DstRoot $category
    if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

    $outPath = Join-Path $outDir "$baseName.glb"

    if (Test-Path $outPath) {
      Write-Host "    SKIP: $baseName.glb" -ForegroundColor DarkGray
      continue
    }

    Write-Host "    Converting ($ext): $($file.Name) -> $category" -ForegroundColor Cyan
    try {
      if ($ext -eq ".fbx") {
        npx --yes fbx2gltf -i "$($file.FullName)" -o "$outPath" --binary 2>&1 | Out-Null
      } elseif ($ext -eq ".obj") {
        # obj2gltf for OBJ files
        npx --yes obj2gltf -i "$($file.FullName)" -o "$outPath" 2>&1 | Out-Null
      }

      if (Test-Path $outPath) {
        $size = [math]::Round((Get-Item $outPath).Length / 1024, 1)
        Write-Host "    OK (${size} KB)" -ForegroundColor Green
        $totalConverted++
      } else {
        Write-Host "    FAILED" -ForegroundColor Red
        $totalFailed++
      }
    } catch {
      Write-Host "    ERROR: $_" -ForegroundColor Red
      $totalFailed++
    }
  }
}

Write-Host "`n=== DONE ===" -ForegroundColor Yellow
Write-Host "Converted: $totalConverted  Failed: $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Green" })
