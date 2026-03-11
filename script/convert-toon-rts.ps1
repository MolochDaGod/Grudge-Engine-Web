# convert-toon-rts.ps1
# Converts Toon_RTS FBX models to GLB and copies them into the faction asset directories.
# Requires: npx fbx2gltf (installed via package.json)
#
# Usage: pwsh script/convert-toon-rts.ps1

$ErrorActionPreference = "Continue"
$SrcRoot = "D:\Games\Models\Toon_RTS\Toon_RTS"
$DstRoot = Join-Path $PSScriptRoot "..\client\public\assets"

# ─── Mapping: Source faction → destination faction dir ───
$FactionMap = @{
  "Orcs"            = "factions\orc"
  "Elves"           = "factions\elf"
  "WesternKingdoms" = "factions\human"
}

function Convert-FbxToGlb {
  param([string]$InputFile, [string]$OutputFile)

  $outDir = Split-Path $OutputFile -Parent
  if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

  Write-Host "  Converting: $InputFile" -ForegroundColor Cyan
  Write-Host "  -> $OutputFile" -ForegroundColor Green

  try {
    npx --yes fbx2gltf -i "$InputFile" -o "$OutputFile" --binary 2>&1 | Out-Null
    if (Test-Path $OutputFile) {
      $size = [math]::Round((Get-Item $OutputFile).Length / 1024, 1)
      Write-Host "  OK (${size} KB)" -ForegroundColor Green
      return $true
    } else {
      Write-Host "  FAILED - output not created" -ForegroundColor Red
      return $false
    }
  } catch {
    Write-Host "  ERROR: $_" -ForegroundColor Red
    return $false
  }
}

$totalConverted = 0
$totalFailed = 0

foreach ($srcFaction in $FactionMap.Keys) {
  $dstFaction = $FactionMap[$srcFaction]
  Write-Host "`n=== $srcFaction -> $dstFaction ===" -ForegroundColor Yellow

  # ─── Models (characters, cavalry, siege) ───
  $modelsDir = Join-Path $SrcRoot "$srcFaction\models"
  if (Test-Path $modelsDir) {
    $fbxFiles = Get-ChildItem -Path $modelsDir -Filter "*.FBX" -File 2>$null
    foreach ($fbx in $fbxFiles) {
      $baseName = $fbx.BaseName.ToLower() -replace '[^a-z0-9_-]', '-'

      # Categorize: catapult → siege, cavalry/characters → units
      if ($baseName -match "catapult") {
        $outPath = Join-Path $DstRoot "siege\$baseName.glb"
      } elseif ($baseName -match "cavalry") {
        $outPath = Join-Path $DstRoot "$dstFaction\units\$baseName.glb"
      } else {
        $outPath = Join-Path $DstRoot "$dstFaction\units\$baseName.glb"
      }

      if (Convert-FbxToGlb -InputFile $fbx.FullName -OutputFile $outPath) {
        $totalConverted++
      } else { $totalFailed++ }
    }

    # ─── Equipment / Extra models ───
    $extraDirs = @("extra models\Equipment", "extra models\equipment", "extra_models\Equipment")
    foreach ($ed in $extraDirs) {
      $equipDir = Join-Path $modelsDir $ed
      if (Test-Path $equipDir) {
        $equipFiles = Get-ChildItem -Path $equipDir -Filter "*.FBX" -File 2>$null
        foreach ($fbx in $equipFiles) {
          $baseName = $fbx.BaseName.ToLower() -replace '[^a-z0-9_-]', '-'
          $outPath = Join-Path $DstRoot "weapons\$baseName.glb"
          if (Convert-FbxToGlb -InputFile $fbx.FullName -OutputFile $outPath) {
            $totalConverted++
          } else { $totalFailed++ }
        }
      }
    }
  }

  # ─── Animations (separate FBX per anim clip) ───
  $animDir = Join-Path $SrcRoot "$srcFaction\animation"
  if (Test-Path $animDir) {
    $animFolders = Get-ChildItem -Path $animDir -Directory 2>$null
    foreach ($af in $animFolders) {
      $animFiles = Get-ChildItem -Path $af.FullName -Filter "*.FBX" -File 2>$null
      foreach ($fbx in $animFiles) {
        $baseName = $fbx.BaseName.ToLower() -replace '[^a-z0-9_-]', '-'

        if ($af.Name -match "Catapult") {
          $outPath = Join-Path $DstRoot "siege\anims\$baseName.glb"
        } else {
          $outPath = Join-Path $DstRoot "$dstFaction\units\anims\$baseName.glb"
        }

        if (Convert-FbxToGlb -InputFile $fbx.FullName -OutputFile $outPath) {
          $totalConverted++
        } else { $totalFailed++ }
      }
    }
  }
}

# ─── Also convert Bolt Thrower (Elf siege) ───
$boltThrower = Join-Path $SrcRoot "Elves\models\ELF_BoltThrower.FBX"
if (Test-Path $boltThrower) {
  $outPath = Join-Path $DstRoot "siege\elf-boltthrower.glb"
  if (Convert-FbxToGlb -InputFile $boltThrower -OutputFile $outPath) {
    $totalConverted++
  } else { $totalFailed++ }
}

Write-Host "`n=== DONE ===" -ForegroundColor Yellow
Write-Host "Converted: $totalConverted  Failed: $totalFailed" -ForegroundColor $(if ($totalFailed -gt 0) { "Red" } else { "Green" })
