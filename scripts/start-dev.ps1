$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiDirectory = Join-Path $projectRoot "apps\api"
$apiUvicorn = Join-Path $apiDirectory ".venv\Scripts\uvicorn.exe"

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Write-Error "npm wurde nicht gefunden. Installiere zuerst Node.js 22 oder neuer."
    exit 1
}

if (-not (Test-Path -Path $apiUvicorn -PathType Leaf)) {
    Write-Error "Die API-Umgebung fehlt: $apiUvicorn"
    Write-Host "Erstelle sie und installiere anschließend apps\api\requirements.txt."
    exit 1
}

$apiProcess = $null
$webProcess = $null
$exitCode = 0

function Stop-ProcessTree {
    param([System.Diagnostics.Process]$Process)

    if ($null -ne $Process -and -not $Process.HasExited) {
        & taskkill.exe /PID $Process.Id /T /F 2>$null | Out-Null
    }
}

try {
    Write-Host "Backend startet auf http://localhost:8000 ..."
    $apiProcess = Start-Process `
        -FilePath $apiUvicorn `
        -ArgumentList "app.main:app", "--reload" `
        -WorkingDirectory $apiDirectory `
        -NoNewWindow `
        -PassThru

    Write-Host "Frontend startet auf http://localhost:3000 ..."
    $webProcess = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList "run", "dev", "--workspace=web" `
        -WorkingDirectory $projectRoot `
        -NoNewWindow `
        -PassThru

    Write-Host "Frontend und Backend laufen mit Reload. Mit Ctrl+C werden beide beendet."

    while (-not $apiProcess.HasExited -and -not $webProcess.HasExited) {
        Start-Sleep -Milliseconds 500
    }

    if ($apiProcess.HasExited -and $apiProcess.ExitCode -ne 0) {
        $exitCode = $apiProcess.ExitCode
        Write-Error "Das Backend wurde mit Status $exitCode beendet." -ErrorAction Continue
    }
    elseif ($webProcess.HasExited -and $webProcess.ExitCode -ne 0) {
        $exitCode = $webProcess.ExitCode
        Write-Error "Das Frontend wurde mit Status $exitCode beendet." -ErrorAction Continue
    }
}
finally {
    Stop-ProcessTree -Process $apiProcess
    Stop-ProcessTree -Process $webProcess
}

exit $exitCode
