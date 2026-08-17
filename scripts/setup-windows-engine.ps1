# Requires: run from the Vesper repo root in PowerShell.
# Creates C:\vesper\engine and junctions .\engine to it so Firefox is not
# compiled inside OneDrive or a path with spaces.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$link = Join-Path $repoRoot "engine"
$target = "C:\vesper\engine"

Write-Host "Repo:   $repoRoot"
Write-Host "Link:   $link"
Write-Host "Target: $target"

if ($repoRoot -match "OneDrive") {
  Write-Host "This overlay is under OneDrive. That is OK for patches."
  Write-Host "The Firefox engine will live at $target instead."
}

if (-not (Test-Path "C:\vesper")) {
  New-Item -ItemType Directory -Path "C:\vesper" | Out-Null
}

if (-not (Test-Path $target)) {
  New-Item -ItemType Directory -Path $target | Out-Null
}

if (Test-Path $link) {
  $item = Get-Item $link -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    Write-Host "engine\ already points at a junction. Leaving it."
    exit 0
  }
  if ((Get-ChildItem $link -Force | Measure-Object).Count -gt 0) {
    Write-Error "engine\ already exists and is not empty. Move or delete it, then re-run."
  }
  Remove-Item $link -Force
}

cmd /c "mklink /J `"$link`" `"$target`""
if ($LASTEXITCODE -ne 0) {
  Write-Error "mklink failed. Run this script as a user who can create junctions."
}

Write-Host "Done. npm run download will place Firefox source in $target"
