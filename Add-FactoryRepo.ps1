#Requires -Version 7.0
<#
.SYNOPSIS
    Connects one repository (existing or new) to the factory.

.DESCRIPTION
    Adds the thin caller workflow, the project's gate files and the design
    scaffolding to a local clone, adds the factory block to CLAUDE.md, and on
    GitHub creates the ticket labels, allows Actions to open pull requests and
    stores the Claude credential as a repository secret.

    Existing files are kept unless -Force is given. Without -OpenPr nothing is
    committed; with it the changes go to branch factory/install and a pull
    request is opened for you to review and merge.

.PARAMETER RepoPath
    Path to the local clone. Defaults to the current directory.

.PARAMETER Profile
    'node', 'python' or 'static'. Detected when omitted, together with the app
    folder in a monorepo (package.json or a Python project file up to two folders
    down). A repository with no manifest and an index.html at its root is 'static'.

.PARAMETER Global
    Also install the two design-desk Claude Code plugins. Needed once per machine.

.PARAMETER OpenPr
    Commit the factory files on branch factory/install, push it and open a pull request.

.PARAMETER SkipGitHub
    Only copy files. Labels, the Actions setting and the secret are left alone.

.PARAMETER Force
    Overwrite factory files that already exist in the repository.

.EXAMPLE
    $env:CLAUDE_CODE_OAUTH_TOKEN = (Get-Content ~\.factory-token -Raw).Trim()
    ./Add-FactoryRepo.ps1 -RepoPath C:\dev\meet-me-halfway -Global -OpenPr
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Position = 0)]
    [string]$RepoPath = (Get-Location).Path,

    [ValidateSet('node', 'python', 'static')]
    [string]$Profile,

    [switch]$Global,
    [switch]$OpenPr,
    [switch]$SkipGitHub,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Test-Command {
    <#
    .SYNOPSIS
        Returns $true when an executable is on PATH.
    #>
    [OutputType([bool])]
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command -Name $Name -ErrorAction SilentlyContinue)
}

function Invoke-Native {
    <#
    .SYNOPSIS
        Runs a native command and throws when it exits non-zero.
    #>
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory, Position = 0)][string]$FilePath,
        [Parameter(Mandatory, Position = 1)][string[]]$Arguments
    )
    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath $($Arguments -join ' ') failed ($LASTEXITCODE): $($output -join [Environment]::NewLine)"
    }
    return [string[]]$output
}

function Resolve-FactoryProject {
    <#
    .SYNOPSIS
        Finds the project manifest (repository root first, then up to two folders
        down) and returns the matching profile and the folder that holds it.
    #>
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory)][string]$Repo,
        [string]$Profile
    )
    $markers = [ordered]@{
        'package.json'     = 'node'
        'pyproject.toml'   = 'python'
        'requirements.txt' = 'python'
        'setup.py'         = 'python'
    }
    $found = Get-ChildItem -LiteralPath $Repo -Recurse -Depth 2 -File -ErrorAction SilentlyContinue |
        Where-Object { $markers.Contains($_.Name) -and $_.FullName -notmatch '[\\/](node_modules|\.venv|venv|\.git)[\\/]' } |
        Where-Object { -not $Profile -or $markers[$_.Name] -eq $Profile } |
        Sort-Object { ($_.FullName -split '[\\/]').Count }, FullName |
        Select-Object -First 1
    if (-not $found) {
        if ($Profile) { return @{ Profile = $Profile; AppDir = '.' } }
        if (Test-Path -LiteralPath (Join-Path $Repo 'index.html')) { return @{ Profile = 'static'; AppDir = '.' } }
        throw "No package.json or Python project file found in $Repo. Pass -Profile node, -Profile python or -Profile static."
    }
    $dir = [System.IO.Path]::GetRelativePath($Repo, $found.DirectoryName).Replace('\', '/')
    return @{ Profile = $markers[$found.Name]; AppDir = $dir }
}

function Copy-TemplateTree {
    <#
    .SYNOPSIS
        Copies a template directory into the repository and returns the relative
        paths it skipped because they already exist.
    #>
    [OutputType([string[]])]
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Destination,
        [string[]]$Exclude = @(),
        [switch]$Overwrite
    )
    $skipped = [System.Collections.Generic.List[string]]::new()
    foreach ($file in Get-ChildItem -LiteralPath $Source -Recurse -File -Force) {
        $relative = [System.IO.Path]::GetRelativePath($Source, $file.FullName)
        if ($Exclude -contains $relative) { continue }
        $target = Join-Path $Destination $relative
        if ((Test-Path -LiteralPath $target) -and -not $Overwrite) {
            $skipped.Add($relative)
            continue
        }
        $targetDir = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $target -Force
        Write-Host "  + $relative"
    }
    return $skipped.ToArray()
}

function Add-LineIfMissing {
    <#
    .SYNOPSIS
        Appends a line to a text file (LF endings) unless the file already has it.
    #>
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Line
    )
    $existing = if (Test-Path -LiteralPath $Path) { Get-Content -LiteralPath $Path -Raw } else { '' }
    if ($null -eq $existing) { $existing = '' }
    if (($existing -split "`r?`n") -contains $Line) { return }
    $prefix = if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { "`n" } else { '' }
    [System.IO.File]::AppendAllText($Path, "$prefix$Line`n", [System.Text.UTF8Encoding]::new($false))
    Write-Host "  ~ $(Split-Path -Leaf $Path): added '$Line'"
}

function Add-ClaudeBlock {
    <#
    .SYNOPSIS
        Adds the factory block to CLAUDE.md, or replaces a block added earlier.
    #>
    param(
        [Parameter(Mandatory)][string]$ClaudeMdPath,
        [Parameter(Mandatory)][string]$BlockPath
    )
    $block = (Get-Content -LiteralPath $BlockPath -Raw).TrimEnd()
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    if (-not (Test-Path -LiteralPath $ClaudeMdPath)) {
        [System.IO.File]::WriteAllText($ClaudeMdPath, "$block`n", $utf8)
        Write-Host '  + CLAUDE.md'
        return
    }
    $current = Get-Content -LiteralPath $ClaudeMdPath -Raw
    if ($null -eq $current) { $current = '' }
    $pattern = '(?s)<!-- factory:start -->.*?<!-- factory:end -->'
    if ($current -match $pattern) {
        $updated = [regex]::Replace($current, $pattern, { param($m) $block })
        [System.IO.File]::WriteAllText($ClaudeMdPath, $updated, $utf8)
        Write-Host '  ~ CLAUDE.md: factory block refreshed'
    }
    else {
        [System.IO.File]::WriteAllText($ClaudeMdPath, ($current.TrimEnd() + "`n`n$block`n"), $utf8)
        Write-Host '  ~ CLAUDE.md: factory block added'
    }
}

function Set-FactorySecret {
    <#
    .SYNOPSIS
        Stores the Claude credential from the environment as a repository secret,
        unless the repository already has one. Returns $true when a credential is in place.
    #>
    [OutputType([bool])]
    param([Parameter(Mandatory)][string]$Slug)
    $names = 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'
    $present = Invoke-Native gh @('secret', 'list', '--repo', $Slug, '--json', 'name', '--jq', '.[].name')
    foreach ($name in $names) {
        if ($present -contains $name) {
            Write-Host "  = secret $name already set"
            return $true
        }
    }
    foreach ($name in $names) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ([string]::IsNullOrWhiteSpace($value)) { continue }
        # The value goes over stdin so it never appears on a command line.
        $value.Trim() | & gh secret set $name --repo $Slug | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "gh secret set $name failed for $Slug." }
        Write-Host "  + secret $name"
        return $true
    }
    return $false
}

# ---------------------------------------------------------------- preflight
$kit = $PSScriptRoot
$repo = (Resolve-Path -LiteralPath $RepoPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $repo '.git'))) { throw "$repo is not the root of a git repository." }
if (-not (Test-Command 'git')) { throw 'git is not on PATH.' }
$project = Resolve-FactoryProject -Repo $repo -Profile $Profile
$Profile = $project.Profile
$appDir = $project.AppDir

$useGitHub = -not $SkipGitHub
if ($useGitHub -and -not (Test-Command 'gh')) { throw 'GitHub CLI (gh) is not on PATH. Install it, or pass -SkipGitHub to copy files only.' }
if ($OpenPr -and -not $useGitHub) { throw '-OpenPr needs GitHub access; remove -SkipGitHub.' }
if ($OpenPr -and (Invoke-Native git @('-C', $repo, 'status', '--porcelain'))) {
    throw "$repo has uncommitted changes. Commit or stash them before using -OpenPr."
}

Write-Host "Connecting $repo to the factory ($Profile profile, app folder '$appDir')" -ForegroundColor Cyan

# ---------------------------------------------------------------- design-desk plugins
if ($Global) {
    if (-not (Test-Command 'claude')) { throw 'claude is not on PATH; cannot install plugins.' }
    Write-Host 'Design-desk plugins:'
    if ($PSCmdlet.ShouldProcess('Claude Code', 'install egm and mattpocock-skills plugins')) {
        Invoke-Native claude @('plugin', 'marketplace', 'add', 'google/elephant-goldfish-model') | Out-Null
        Invoke-Native claude @('plugin', 'install', 'egm@egm') | Out-Null
        Invoke-Native claude @('plugin', 'install', 'mattpocock-skills@claude-plugins-official') | Out-Null
        Write-Host '  + egm@egm, mattpocock-skills@claude-plugins-official'
    }
}

# ---------------------------------------------------------------- files
$branch = 'factory/install'
if ($OpenPr -and $PSCmdlet.ShouldProcess($repo, "create branch $branch")) {
    Invoke-Native git @('-C', $repo, 'checkout', '-q', '-B', $branch) | Out-Null
}

Write-Host 'Files:'
$skipped = @()
if ($PSCmdlet.ShouldProcess($repo, 'copy factory files')) {
    $skipped += Copy-TemplateTree -Source (Join-Path $kit 'caller') -Destination $repo `
        -Exclude @('CLAUDE.factory.md') -Overwrite:$Force
    $skipped += Copy-TemplateTree -Source (Join-Path $kit "profiles/$Profile") -Destination $repo -Overwrite:$Force
    if ($appDir -ne '.') {
        foreach ($gateFile in 'check.sh', 'setup.sh') {
            $path = Join-Path $repo ".factory/$gateFile"
            $text = Get-Content -LiteralPath $path -Raw
            $updated = [regex]::Replace($text, '(?m)^APP_DIR=\.(\s)', "APP_DIR=$appDir`$1")
            if ($updated -ne $text) {
                [System.IO.File]::WriteAllText($path, $updated, [System.Text.UTF8Encoding]::new($false))
                Write-Host "  ~ .factory/${gateFile}: APP_DIR=$appDir"
            }
        }
    }
    Add-ClaudeBlock -ClaudeMdPath (Join-Path $repo 'CLAUDE.md') -BlockPath (Join-Path $kit 'caller/CLAUDE.factory.md')

    # Compatibility: the gate scripts run on Linux runners; CRLF from a Windows checkout breaks bash.
    Add-LineIfMissing -Path (Join-Path $repo '.gitattributes') -Line '*.sh text eol=lf'
    Add-LineIfMissing -Path (Join-Path $repo '.gitignore') -Line '.factory-run/'
}
foreach ($item in $skipped) { Write-Host "  = $item (exists, kept)" -ForegroundColor DarkGray }

# ---------------------------------------------------------------- GitHub
$hasSecret = $false
if ($useGitHub) {
    Push-Location $repo
    try {
        $slug = (Invoke-Native gh @('repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner') | Select-Object -First 1).Trim()
        Write-Host "GitHub ($slug):"
        $labels = [ordered]@{
            'needs-triage'      = @('C5DEF5', 'Factory: not yet sorted')
            'needs-info'        = @('D876E3', 'Factory: the run has a question')
            'ready-for-agent'   = @('0E8A16', 'Factory: ready to build')
            'agent-in-progress' = @('FBCA04', 'Factory: a run is building this')
            'in-review'         = @('1D76DB', 'Factory: PR open, waiting for review')
            'ready-for-human'   = @('D93F0B', 'Factory: needs a human')
            'wontfix'           = @('FFFFFF', 'Will not be worked on')
            'review-pass'       = @('0E8A16', 'Factory review: no blocking findings')
            'review-block'      = @('B60205', 'Factory review: blocking findings')
            'design-drift'      = @('5319E7', 'Factory: designs and code disagree')
        }
        if ($PSCmdlet.ShouldProcess($slug, 'create labels, allow Actions to open pull requests, set secret')) {
            foreach ($name in $labels.Keys) {
                Invoke-Native gh @('label', 'create', $name, '--color', $labels[$name][0], '--description', $labels[$name][1], '--force') | Out-Null
            }
            Write-Host "  + $($labels.Count) labels"

            # Without this repository setting, GITHUB_TOKEN cannot open the factory's pull requests.
            # Jobs still get only the permissions the workflows declare.
            Invoke-Native gh @(
                'api', '--method', 'PUT', "repos/$slug/actions/permissions/workflow",
                '-f', 'default_workflow_permissions=read', '-F', 'can_approve_pull_request_reviews=true'
            ) | Out-Null
            Write-Host '  + Actions may create pull requests'

            $hasSecret = Set-FactorySecret -Slug $slug

            # The weekly curate run reads every repo listed here. Published by the next Deploy-Factory.ps1.
            $projectsFile = Join-Path $kit 'brain/projects.txt'
            if (Test-Path -LiteralPath $projectsFile) {
                Add-LineIfMissing -Path $projectsFile -Line $slug
            }

            if ($OpenPr) {
                $paths = @('.github/workflows/factory.yml', '.factory', 'docs/designs', 'docs/brain', 'CLAUDE.md', '.gitattributes', '.gitignore')
                Invoke-Native git (@('add', '--') + $paths) | Out-Null
                Invoke-Native git @('commit', '-q', '-m', 'Connect this repo to the factory') | Out-Null
                Invoke-Native git @('push', '-q', '-u', 'origin', $branch, '--force-with-lease') | Out-Null
                $body = "Adds the thin factory caller, this repo's gate files, the design scaffolding and the project brain (``docs/brain/``).`n`nBefore merging: make ``.factory/check.sh`` run this project's real checks and pass locally."
                $url = Invoke-Native gh @('pr', 'create', '--head', $branch, '--title', 'Connect this repo to the factory', '--body', $body)
                Write-Host "  + pull request: $($url | Select-Object -Last 1)"
            }
        }
    }
    finally {
        Pop-Location
    }
}

# ---------------------------------------------------------------- next steps
Write-Host ''
Write-Host 'Still to do by hand:' -ForegroundColor Cyan
Write-Host '  - Edit .factory/check.sh until it runs this project''s real lint, type and test commands and passes locally.'
if ($useGitHub) { Write-Host '  - Run ./Deploy-Factory.ps1 so the weekly curate run sees this repo in brain/projects.txt.' }
if (-not $hasSecret) {
    Write-Host '  - Add a credential: run `claude setup-token`, then `gh secret set CLAUDE_CODE_OAUTH_TOKEN` in this repo'
    Write-Host '    (or set $env:CLAUDE_CODE_OAUTH_TOKEN and re-run this script).'
}
if ($OpenPr) { Write-Host '  - Review and merge the pull request. Scheduled runs start only from the default branch.' }
else { Write-Host '  - Review the changes, commit, and push to the default branch. Scheduled runs start only from there.' }
