[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ComfyArguments = @()
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$configurationPath = Join-Path $projectRoot "config\local-install.windows.json"

if (-not (Test-Path $configurationPath -PathType Leaf)) {
    Write-Error "Veyqra Windows installation configuration was not found: $configurationPath"
    Write-Host "Run scripts\install-windows.cmd first."
    exit 1
}

$configuration = Get-Content $configurationPath -Raw | ConvertFrom-Json
$comfyDirectory = [string]$configuration.comfyui_dir
$comfyPython = [string]$configuration.comfyui_python

if (-not (Test-Path (Join-Path $comfyDirectory "main.py") -PathType Leaf)) {
    Write-Error "ComfyUI was not found at $comfyDirectory"
    exit 1
}
if (-not (Test-Path $comfyPython -PathType Leaf)) {
    Write-Error "The configured ComfyUI Python executable was not found: $comfyPython"
    exit 1
}

$arguments = @(
    (Join-Path $comfyDirectory "main.py"),
    "--listen", [string]$configuration.comfyui_host,
    "--port", [string]$configuration.comfyui_port
) + $ComfyArguments

Push-Location $comfyDirectory
try {
    & $comfyPython @arguments
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
