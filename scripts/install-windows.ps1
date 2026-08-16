[CmdletBinding()]
param(
    [string]$InstallDir = (Join-Path $env:LOCALAPPDATA "Veyqra"),
    [string]$ComfyUIDir,
    [ValidateSet("Auto", "Nvidia", "Amd", "Cpu")]
    [string]$Gpu = "Auto",
    [string]$Python,
    [string]$TorchIndexUrl,
    [string]$ListenAddress = "127.0.0.1",
    [ValidateRange(1, 65535)]
    [int]$Port = 8188,
    [switch]$WithManager,
    [switch]$WithTranslations,
    [string[]]$Models = @(),
    [switch]$Update,
    [switch]$NoStart,
    [switch]$Yes,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$projectRoot = Split-Path -Parent $PSScriptRoot
$nodeConfigPath = Join-Path $projectRoot "config\comfyui-nodes.json"
$installConfigPath = Join-Path $projectRoot "config\local-install.windows.json"
$comfyRepo = "https://github.com/Comfy-Org/ComfyUI.git"
$script:PythonCommand = $null
$script:PythonPrefix = @()

function Write-Step {
    param([string]$Message)
    Write-Host "`n[Veyqra] $Message" -ForegroundColor Magenta
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarningMessage {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Invoke-External {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [string[]]$Arguments = @()
    )

    Write-Host ("  + {0} {1}" -f $FilePath, ($Arguments -join " "))
    if ($DryRun) {
        return
    }

    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $FilePath"
    }
}

function Invoke-SelectedPython {
    param([string[]]$Arguments = @())
    Invoke-External -FilePath $script:PythonCommand -Arguments ($script:PythonPrefix + $Arguments)
}

function Test-CommandAvailable {
    param([string]$Name)
    return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Select-Python {
    if ($Python) {
        $resolved = Get-Command $Python -ErrorAction SilentlyContinue
        if ($null -eq $resolved) {
            throw "Python executable was not found: $Python"
        }
        $script:PythonCommand = $resolved.Source
        return
    }

    $launcher = Get-Command "py.exe" -ErrorAction SilentlyContinue
    if ($null -ne $launcher) {
        & $launcher.Source -3.12 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $script:PythonCommand = $launcher.Source
            $script:PythonPrefix = @("-3.12")
            return
        }

        & $launcher.Source -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $script:PythonCommand = $launcher.Source
            $script:PythonPrefix = @("-3")
            return
        }
    }

    foreach ($name in @("python.exe", "python3.exe")) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($null -eq $command) {
            continue
        }

        & $command.Source -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 11) else 1)" 2>$null
        if ($LASTEXITCODE -eq 0) {
            $script:PythonCommand = $command.Source
            return
        }
    }

    throw "Python 3.11 or newer was not found. Python 3.12 is recommended."
}

function Test-ComfyUIDirectory {
    param([string]$Path)
    return (Test-Path (Join-Path $Path "main.py") -PathType Leaf) -and
        (Test-Path (Join-Path $Path "comfy") -PathType Container)
}

function Resolve-ComfyUIDirectory {
    $managed = [System.IO.Path]::GetFullPath((Join-Path $InstallDir "ComfyUI"))

    if ($ComfyUIDir) {
        return [System.IO.Path]::GetFullPath($ComfyUIDir)
    }

    $candidates = New-Object System.Collections.Generic.List[string]
    if (Test-Path $installConfigPath -PathType Leaf) {
        try {
            $saved = Get-Content $installConfigPath -Raw | ConvertFrom-Json
            if ($saved.comfyui_dir) {
                $candidates.Add([string]$saved.comfyui_dir)
            }
        }
        catch {
            Write-WarningMessage "The saved Windows installation configuration could not be read."
        }
    }

    $candidates.Add((Join-Path $env:USERPROFILE "ComfyUI"))
    $candidates.Add((Join-Path $env:USERPROFILE "Desktop\ComfyUI"))
    $candidates.Add((Join-Path (Split-Path -Parent $projectRoot) "ComfyUI"))

    $detected = @($candidates | Select-Object -Unique | Where-Object { Test-ComfyUIDirectory $_ })
    if ($detected.Count -eq 0) {
        return $managed
    }
    if ($Yes) {
        return [System.IO.Path]::GetFullPath($detected[0])
    }

    Write-Host "`nExisting ComfyUI installations detected:"
    for ($index = 0; $index -lt $detected.Count; $index++) {
        Write-Host ("  [{0}] Use {1}" -f ($index + 1), $detected[$index])
    }
    Write-Host ("  [{0}] Install/use a Veyqra-managed copy at {1}" -f ($detected.Count + 1), $managed)
    Write-Host ("  [{0}] Enter another path" -f ($detected.Count + 2))

    while ($true) {
        $answer = Read-Host "Choose ComfyUI installation [1]"
        if ([string]::IsNullOrWhiteSpace($answer)) {
            $answer = "1"
        }

        $choice = 0
        if (-not [int]::TryParse($answer, [ref]$choice)) {
            Write-WarningMessage "Enter one of the displayed numbers."
            continue
        }
        if ($choice -ge 1 -and $choice -le $detected.Count) {
            return [System.IO.Path]::GetFullPath($detected[$choice - 1])
        }
        if ($choice -eq ($detected.Count + 1)) {
            return $managed
        }
        if ($choice -eq ($detected.Count + 2)) {
            $custom = Read-Host "ComfyUI directory"
            if (-not [string]::IsNullOrWhiteSpace($custom)) {
                return [System.IO.Path]::GetFullPath($custom)
            }
        }
        Write-WarningMessage "Enter one of the displayed numbers."
    }
}

function Resolve-GpuBackend {
    if ($Gpu -ne "Auto") {
        return $Gpu.ToLowerInvariant()
    }

    $names = @()
    try {
        $names = @(Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name })
    }
    catch {
        Write-WarningMessage "GPU detection failed; using the CPU backend."
    }

    if ($names -match "NVIDIA") {
        return "nvidia"
    }
    if ($names -match "AMD|Radeon") {
        return "amd"
    }
    return "cpu"
}

function Get-ComfyPython {
    param([string]$Directory)

    $venvPython = Join-Path $Directory ".venv\Scripts\python.exe"
    if (Test-Path $venvPython -PathType Leaf) {
        return $venvPython
    }

    $embeddedCandidates = @(
        (Join-Path $Directory "python_embeded\python.exe"),
        (Join-Path (Split-Path -Parent $Directory) "python_embeded\python.exe")
    )
    foreach ($candidate in $embeddedCandidates) {
        if (Test-Path $candidate -PathType Leaf) {
            return $candidate
        }
    }

    Invoke-SelectedPython -Arguments @("-m", "venv", (Join-Path $Directory ".venv"))
    return $venvPython
}

function Test-PythonModule {
    param(
        [string]$PythonPath,
        [string]$Module
    )
    if ($DryRun -or -not (Test-Path $PythonPath -PathType Leaf)) {
        return $false
    }
    & $PythonPath -c "import $Module" 2>$null
    return $LASTEXITCODE -eq 0
}

function Clone-Or-UpdateRepository {
    param(
        [string]$Name,
        [string]$Repository,
        [string]$Destination,
        [string]$Ref = ""
    )

    if (Test-Path (Join-Path $Destination ".git") -PathType Container) {
        Write-Info "$Name already exists at $Destination."
        if ($Update) {
            Invoke-External "git.exe" @("-C", $Destination, "pull", "--ff-only")
        }
        return
    }
    if ($Name -eq "ComfyUI" -and (Test-ComfyUIDirectory $Destination)) {
        Write-Info "Using the existing ComfyUI installation at $Destination."
        return
    }
    if (Test-Path $Destination) {
        throw "$Destination exists but is not a recognizable $Name installation."
    }

    $arguments = @("clone", "--depth", "1")
    if ($Ref) {
        $arguments += @("--branch", $Ref)
    }
    $arguments += @($Repository, $Destination)
    Invoke-External "git.exe" $arguments
}

function Install-CustomNodes {
    param(
        [string]$Directory,
        [string]$ComfyPython
    )

    Write-Step "Installing Veyqra custom nodes"
    $config = Get-Content $nodeConfigPath -Raw | ConvertFrom-Json
    foreach ($node in $config.nodes) {
        $enabled = [bool]$node.install_by_default
        if ($node.name -eq "ComfyUI-Manager" -and $WithManager) {
            $enabled = $true
        }
        if (-not $enabled) {
            continue
        }

        $destination = Join-Path $Directory ([string]$node.name)
        Clone-Or-UpdateRepository `
            -Name ([string]$node.name) `
            -Repository ([string]$node.repo) `
            -Destination $destination `
            -Ref ([string]$node.ref)

        $requirements = Join-Path $destination "requirements.txt"
        if ($DryRun -or (Test-Path $requirements -PathType Leaf)) {
            Invoke-External $ComfyPython @("-m", "pip", "install", "-r", $requirements)
        }
    }
}

function Set-EnvValue {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )
    if ($DryRun) {
        Write-Host "  + set $Key=$Value in $Path"
        return
    }

    $parent = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $lines = @()
    if (Test-Path $Path -PathType Leaf) {
        $lines = @(Get-Content $Path | Where-Object { $_ -notmatch ("^" + [regex]::Escape($Key) + "=") })
    }
    $lines += "$Key=$Value"
    [System.IO.File]::WriteAllLines($Path, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

function Confirm-Installation {
    if ($Yes -or $DryRun) {
        return $true
    }
    $answer = Read-Host "Continue with this installation plan? [y/N]"
    return $answer -match "^[Yy]$"
}

foreach ($required in @("git.exe", "node.exe", "npm.cmd")) {
    if (-not (Test-CommandAvailable $required)) {
        throw "$required was not found. Install Git and Node.js 22 or newer first."
    }
}

$nodeMajor = [int]((& node.exe -p "Number(process.versions.node.split('.')[0])").Trim())
if ($nodeMajor -lt 22) {
    throw "Node.js 22 or newer is required (detected: $(& node.exe --version))."
}

Select-Python
$resolvedComfyDir = Resolve-ComfyUIDirectory
$resolvedGpu = Resolve-GpuBackend
$comfyUrl = "http://${ListenAddress}:$Port"

Write-Step "Installation plan"
Write-Info "Repository:    $projectRoot"
Write-Info "Install root:  $InstallDir"
Write-Info "ComfyUI:       $resolvedComfyDir"
Write-Info "Python:        $script:PythonCommand $($script:PythonPrefix -join ' ')"
Write-Info "GPU backend:   $resolvedGpu"
Write-Info "ComfyUI URL:   $comfyUrl"
if ($TorchIndexUrl) {
    Write-Info "PyTorch index: $TorchIndexUrl"
}

if (-not (Confirm-Installation)) {
    Write-Info "Installation cancelled."
    exit 0
}

Write-Step "Installing ComfyUI"
if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}
Clone-Or-UpdateRepository -Name "ComfyUI" -Repository $comfyRepo -Destination $resolvedComfyDir

$comfyPython = Get-ComfyPython $resolvedComfyDir
Invoke-External $comfyPython @("-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools")

$torchAvailable = Test-PythonModule -PythonPath $comfyPython -Module "torch"
if ($TorchIndexUrl -or -not $torchAvailable) {
    $selectedTorchIndex = $TorchIndexUrl
    if (-not $selectedTorchIndex) {
        switch ($resolvedGpu) {
            "nvidia" { $selectedTorchIndex = "https://download.pytorch.org/whl/cu130" }
            "cpu" { $selectedTorchIndex = "https://download.pytorch.org/whl/cpu" }
            "amd" {
                throw "A new Windows AMD setup needs a GPU-specific PyTorch build. Use an existing working ComfyUI installation, the official AMD portable package, or pass -TorchIndexUrl explicitly."
            }
        }
    }
    Invoke-External $comfyPython @(
        "-m", "pip", "install", "torch", "torchvision", "torchaudio",
        "--index-url", $selectedTorchIndex
    )
}
else {
    Write-Info "Existing PyTorch installation detected; keeping it unchanged."
}

Invoke-External $comfyPython @("-m", "pip", "install", "-r", (Join-Path $resolvedComfyDir "requirements.txt"))

foreach ($directory in @(
    "models\checkpoints",
    "models\diffusion_models",
    "models\unet",
    "models\loras",
    "models\clip",
    "models\vae",
    "models\LLM",
    "custom_nodes"
)) {
    $path = Join-Path $resolvedComfyDir $directory
    if ($DryRun) {
        Write-Host "  + create $path"
    }
    else {
        New-Item -ItemType Directory -Force -Path $path | Out-Null
    }
}

Install-CustomNodes -Directory (Join-Path $resolvedComfyDir "custom_nodes") -ComfyPython $comfyPython

if ($Models.Count -gt 0) {
    $normalizedModels = @(
        $Models |
            ForEach-Object { $_.Split(",") } |
            ForEach-Object { $_.Trim().ToLowerInvariant() } |
            Where-Object { $_ }
    )
    if ($normalizedModels -contains "all") {
        $normalizedModels = @("flux-schnell", "flux-dev", "flux-fill", "sdxl-base")
    }
    $normalizedModels = @($normalizedModels | ForEach-Object {
        if ($_ -eq "sdxl") { "sdxl-base" } else { $_ }
    })
    $allowedModels = @("flux-schnell", "flux-dev", "flux-fill", "sdxl-base")
    foreach ($model in $normalizedModels) {
        if ($allowedModels -notcontains $model) {
            throw "Unknown model '$model'. Use flux-schnell, flux-dev, flux-fill, sdxl-base, all, or none."
        }
    }
    $requiresToken = @($normalizedModels | Where-Object { $_ -like "flux-*" }).Count -gt 0
    if ($requiresToken -and -not $env:HF_TOKEN -and -not $env:HUGGING_FACE_HUB_TOKEN) {
        throw "HF_TOKEN is required to download optional FLUX models. The token is not stored by Veyqra."
    }
    Invoke-SelectedPython -Arguments (@(
            (Join-Path $PSScriptRoot "download-comfyui-models.py"),
            "--comfyui-dir", $resolvedComfyDir,
            "--manifest", (Join-Path $projectRoot "config\comfyui-models.json"),
            "--models"
        ) + $normalizedModels)
}

Write-Step "Installing Veyqra dependencies"
Invoke-External "npm.cmd" @("ci", "--prefix", $projectRoot)

$apiDirectory = Join-Path $projectRoot "apps\api"
$apiPython = Join-Path $apiDirectory ".venv\Scripts\python.exe"
if (-not (Test-Path $apiPython -PathType Leaf)) {
    Invoke-SelectedPython -Arguments @("-m", "venv", (Join-Path $apiDirectory ".venv"))
}
Invoke-External $apiPython @("-m", "pip", "install", "--upgrade", "pip", "wheel", "setuptools")
Invoke-External $apiPython @("-m", "pip", "install", "-r", (Join-Path $apiDirectory "requirements.txt"))

if ($WithTranslations) {
    Invoke-External $apiPython @((Join-Path $apiDirectory "scripts\install_translation_models.py"))
}

Write-Step "Writing local configuration"
Set-EnvValue -Path (Join-Path $apiDirectory ".env") -Key "VEYQRA_API_HOST" -Value "0.0.0.0"
Set-EnvValue -Path (Join-Path $apiDirectory ".env") -Key "VEYQRA_API_PORT" -Value "8000"
Set-EnvValue -Path (Join-Path $apiDirectory ".env") -Key "VEYQRA_CORS_ORIGINS" -Value "http://localhost:3000,http://127.0.0.1:3000"
Set-EnvValue -Path (Join-Path $apiDirectory ".env") -Key "VEYQRA_COMFYUI_URL" -Value $comfyUrl
Set-EnvValue -Path (Join-Path $apiDirectory ".env") -Key "VEYQRA_PUBLIC_API_URL" -Value ""

if (-not $DryRun) {
    $configuration = [ordered]@{
        generated_by = "scripts/install-windows.ps1"
        comfyui_dir = $resolvedComfyDir
        comfyui_python = $comfyPython
        comfyui_host = $ListenAddress
        comfyui_port = $Port
        gpu_backend = $resolvedGpu
    }
    $configuration | ConvertTo-Json | Set-Content -Path $installConfigPath -Encoding UTF8
}

if (-not $NoStart -and -not $DryRun) {
    Write-Step "Starting ComfyUI"
    $verifyArguments = @(
        (Join-Path $PSScriptRoot "verify-comfyui.py"),
        "--url", $comfyUrl
    )
    $probeArguments = $script:PythonPrefix + $verifyArguments
    & $script:PythonCommand @probeArguments 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Info "An existing compatible ComfyUI instance is already running."
    }
    else {
        $logsDirectory = Join-Path $projectRoot "logs"
        New-Item -ItemType Directory -Force -Path $logsDirectory | Out-Null
        $process = Start-Process `
            -FilePath $comfyPython `
            -ArgumentList @("main.py", "--listen", $ListenAddress, "--port", $Port) `
            -WorkingDirectory $resolvedComfyDir `
            -RedirectStandardOutput (Join-Path $logsDirectory "comfyui-windows.log") `
            -RedirectStandardError (Join-Path $logsDirectory "comfyui-windows-error.log") `
            -PassThru
        Write-Info "ComfyUI started with PID $($process.Id)."
        Invoke-SelectedPython -Arguments ($verifyArguments + @("--wait", "180"))
    }
}

Write-Host ""
Write-Host "Veyqra setup for Windows is complete." -ForegroundColor Green
Write-Host ""
Write-Host "Start ComfyUI:"
Write-Host "  scripts\start-comfyui.cmd"
Write-Host ""
Write-Host "Start Veyqra with reload:"
Write-Host "  npm run dev:windows"
Write-Host ""
Write-Host "Open: http://localhost:3000"
