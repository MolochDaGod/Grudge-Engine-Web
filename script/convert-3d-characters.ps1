# convert-3d-characters.ps1
# Batch convert 3DCharacters FBX models to GLB
# Source: C:\Users\nugye\Documents\3DCharacters
# Usage: pwsh script/convert-3d-characters.ps1

$ErrorActionPreference = "Continue"
$SrcRoot = "C:\Users\nugye\Documents\3DCharacters"
$DstRoot = Join-Path $PSScriptRoot "..\client\public\assets\characters"

if (-not (Test-Path $SrcRoot)) {
  Write-Host "Source directory not found: $SrcRoot" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $DstRoot)) { New-Item -ItemType Directory -Path $DstRoot -Force | Out-Null }

$totalConverted = 0
$totalFailed = 0

Write-Host "`n=== 3DCharacters FBX→GLB Conversion ===" -ForegroundColor Cyan
Write-Host "Source: $SrcRoot"
Write-Host "Destination: $DstRoot`n"

# Find all FBX files recursively
$fbxFiles = Get-ChildItem -Path $SrcRoot -Filter "*.FBX" -File -Recurse 2>$null
if ($null -eq $fbxFiles -or $fbxFiles.Count -eq 0) {
  $fbxFiles = Get-ChildItem -Path $SrcRoot -Filter "*.fbx" -File -Recurse 2>$null
}

Write-Host "Found $($fbxFiles.Count) FBX files`n" -ForegroundColor Yellow

foreach ($fbx in $fbxFiles) {
  # Preserve subfolder structure
  $relativePath = $fbx.DirectoryName.Substring($SrcRoot.Length).TrimStart("\")
  $baseName = $fbx.BaseName.ToLower() -replace '[^a-z0-9_-]', '-'

  $outDir = if ($relativePath) { Join-Path $DstRoot $relativePath } else { $DstRoot }
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

  $outPath = Join-Path $outDir "$baseName.glb"

  # Skip if already converted
  if (Test-Path $outPath) {
    Write-Host "  SKIP (exists): $baseName.glb" -ForegroundColor DarkGray
    continue
  }

  Write-Host "  Converting: $($fbx.Name)" -ForegroundColor Cyan
  try {
    npx --yes fbx2gltf -i "$($fbx.FullName)" -o "$outPath" --binary 2>&1 | Out-Null
    if (Test-Path $outPath) {
      $size = [math]::Round((Get-Item $outPath).Length / 1024, 1)
      Write-Host "  OK (${size} KB): $outPath" -ForegroundColor Green
      $totalConverted++
    } else {
      Write-Host "  FAILED: Output not created" -ForegroundColor Red
      $totalFailed++
    }
  } catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    $totalFailed++
  }
}

Write-Host "`n=== DONE ===" -ForegroundColor Yellow
Write-Host "Converted: $totalConverted  Failed: $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Green" })
