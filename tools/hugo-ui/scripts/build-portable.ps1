$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root "portable-output"
$distDir = Join-Path $root "dist"

Set-Location $root

if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
  npm ci
}

npm run clean
npm run build:portable

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$portableExe = Get-ChildItem -LiteralPath $distDir -Filter "Hugo UI *.exe" -File |
  Where-Object { $_.Name -notlike "*Setup*" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $portableExe) {
  throw "Portable exe was not found in $distDir"
}

$version = (Get-Content -LiteralPath (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version
$portableName = "Hugo UI $version.exe"
$portablePath = Join-Path $outputDir $portableName

Copy-Item -LiteralPath $portableExe.FullName -Destination $portablePath -Force
Copy-Item -LiteralPath (Join-Path $root "config.json") -Destination (Join-Path $outputDir "config.json") -Force

$bundleRoot = [System.IO.Path]::GetFullPath((Join-Path $root "..\..\.."))
$bundleHugoDir = Join-Path $bundleRoot "portable-hugo"

if (Test-Path -LiteralPath $bundleHugoDir) {
  Copy-Item -LiteralPath $portablePath -Destination (Join-Path $bundleHugoDir $portableName) -Force
  Copy-Item -LiteralPath (Join-Path $root "config.json") -Destination (Join-Path $bundleRoot "config.json") -Force
  Write-Host "Copied portable app to: $bundleHugoDir"
}

Write-Host "Portable build ready: $portablePath"
