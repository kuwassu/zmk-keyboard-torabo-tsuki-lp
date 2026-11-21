[CmdletBinding()]
param(
    [ValidateSet('all', 'left', 'right', 'reset')]
    [string]$Target = 'all',
    [switch]$Update,
    [switch]$Pristine,
    [ValidateRange(1, 64)]
    [int]$Jobs = 4
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$image = (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'zmk-build-image.txt') -Raw).Trim()
$outputPath = Join-Path $repoRoot '.local-build\firmware'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'Docker Desktop is required. Install it with the WSL 2 backend, then start it.'
}
$dockerOS = & docker info --format '{{.OSType}}'
if ($LASTEXITCODE -ne 0) {
    throw 'Start Docker Desktop with Linux containers, then run this command again.'
}
if ($dockerOS.Trim() -ne 'linux') {
    throw 'Switch Docker Desktop to Linux containers, then run this command again.'
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$containerArgs = @(
    'run', '--rm',
    '--mount', "type=bind,source=$repoRoot,target=/repo,readonly",
    '--mount', "type=bind,source=$outputPath,target=/out",
    '--mount', 'type=volume,source=torabotsuki-zmk-v03,target=/workspaces/torabo',
    '--env', "ZMK_BUILD_IMAGE=$image",
    '--workdir', '/workspaces/torabo',
    $image,
    'python3', '/repo/scripts/build_local.py',
    '--target', $Target, '--jobs', "$Jobs"
)
if ($Update) { $containerArgs += '--update' }
if ($Pristine) { $containerArgs += '--pristine' }

& docker @containerArgs
if ($LASTEXITCODE -ne 0) {
    throw "Local ZMK build failed (exit $LASTEXITCODE). See the build output above."
}
Write-Host "Firmware: $outputPath"
