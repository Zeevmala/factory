#Requires -Version 7.0
<#
.SYNOPSIS
    Publishes this folder as the central factory repository, or updates it.

.DESCRIPTION
    First run: creates a public GitHub repository from this folder.
    Every run: commits local changes, pushes main, and fast-forwards the release
    branch (v1) to it. Connected repositories call the workflows at @v1, so moving
    that branch updates all of them at once. A branch is used rather than a tag so
    that a release is an ordinary push.

    The repository must be public so that public and private project
    repositories can both call its workflows. It holds no secrets.

.PARAMETER Owner
    GitHub account that will own the repository. Defaults to the account gh is logged in as.

.PARAMETER Name
    Repository name. Defaults to 'factory'.

.PARAMETER Tag
    Release branch the caller workflows reference. Defaults to 'v1'.

.EXAMPLE
    ./Deploy-Factory.ps1
#>
[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Owner,
    [string]$Name = 'factory',
    [string]$Tag = 'v1'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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

function Set-FactorySlug {
    <#
    .SYNOPSIS
        Rewrites the factory repository slug in the workflows and the caller
        template, and the release ref in the caller template. Returns the slug it replaced.
    #>
    [OutputType([string])]
    param(
        [Parameter(Mandatory)][string]$Root,
        [Parameter(Mandatory)][string]$Slug,
        [Parameter(Mandatory)][string]$Tag
    )
    $buildPath = Join-Path $Root '.github/workflows/build.yml'
    $match = [regex]::Match((Get-Content -LiteralPath $buildPath -Raw), '(?m)^\s*FACTORY_REPO:\s*(\S+)\s*$')
    if (-not $match.Success) { throw "FACTORY_REPO not found in $buildPath." }
    $current = $match.Groups[1].Value
    $utf8 = [System.Text.UTF8Encoding]::new($false)

    $files = @(Get-ChildItem -LiteralPath (Join-Path $Root '.github/workflows') -Filter '*.yml' -File)
    $callerPath = Join-Path $Root 'caller/.github/workflows/factory.yml'
    $files += Get-Item -LiteralPath $callerPath
    foreach ($file in $files) {
        $text = Get-Content -LiteralPath $file.FullName -Raw
        $updated = $text.Replace($current, $Slug)
        if ($file.FullName -eq (Get-Item -LiteralPath $callerPath).FullName) {
            $updated = [regex]::Replace($updated, '(\.yml)@[\w.\-]+', "`$1@$Tag")
            $updated = [regex]::Replace($updated, '(?m)^(\s*factory_ref:\s*)\S+\s*$', "`$1$Tag")
        }
        if ($updated -ne $text) { [System.IO.File]::WriteAllText($file.FullName, $updated, $utf8) }
    }
    return $current
}

foreach ($tool in 'git', 'gh') {
    if (-not (Get-Command -Name $tool -ErrorAction SilentlyContinue)) { throw "$tool is not on PATH." }
}
$root = $PSScriptRoot
if (-not $Owner) { $Owner = (Invoke-Native gh @('api', 'user', '--jq', '.login') | Select-Object -First 1).Trim() }
$slug = "$Owner/$Name"
Write-Host "Publishing the factory as $slug (release branch $Tag)" -ForegroundColor Cyan

if (-not $PSCmdlet.ShouldProcess($slug, 'commit and push the factory repository')) { return }

$previous = Set-FactorySlug -Root $root -Slug $slug -Tag $Tag
if ($previous -ne $slug) { Write-Host "  ~ workflows now reference $slug (was $previous)" }

Push-Location $root
try {
    if (-not (Test-Path -LiteralPath (Join-Path $root '.git'))) {
        Invoke-Native git @('init', '-q', '-b', 'main') | Out-Null
    }
    Invoke-Native git @('add', '-A') | Out-Null
    if (Invoke-Native git @('status', '--porcelain')) {
        Invoke-Native git @('commit', '-q', '-m', "Factory update $(Get-Date -Format 'yyyy-MM-dd')") | Out-Null
        Write-Host '  + committed local changes'
    }

    & gh repo view $slug --json name *> $null
    if ($LASTEXITCODE -ne 0) {
        Invoke-Native gh @(
            'repo', 'create', $slug, '--public', '--source', '.', '--remote', 'origin', '--push',
            '--description', 'Design-gated software factory: reusable GitHub Actions workflows, prompts and gate profiles'
        ) | Out-Null
        Write-Host "  + created https://github.com/$slug"
    }
    else {
        if (-not (Invoke-Native git @('remote') | Where-Object { $_ -eq 'origin' })) {
            Invoke-Native git @('remote', 'add', 'origin', "https://github.com/$slug.git") | Out-Null
        }
        Invoke-Native git @('push', '-q', 'origin', 'HEAD:main') | Out-Null
        Write-Host '  + pushed to main'
    }

    Invoke-Native git @('push', '-q', 'origin', "HEAD:refs/heads/$Tag") | Out-Null
    Write-Host "  + release branch $Tag now at $(@(Invoke-Native git @('rev-parse', '--short', 'HEAD'))[0])"

    # The weekly curate workflow runs in this repository: it needs a credential
    # and permission for Actions to open its pull request.
    Invoke-Native gh @(
        'api', '--method', 'PUT', "repos/$slug/actions/permissions/workflow",
        '-f', 'default_workflow_permissions=read', '-F', 'can_approve_pull_request_reviews=true'
    ) | Out-Null
    $secretNames = 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_API_KEY'
    $present = @(Invoke-Native gh @('secret', 'list', '--repo', $slug, '--json', 'name', '--jq', '.[].name'))
    if ($present | Where-Object { $secretNames -contains $_ }) {
        Write-Host '  = curate credential already set'
    }
    elseif (-not [string]::IsNullOrWhiteSpace($env:CLAUDE_CODE_OAUTH_TOKEN)) {
        # The value goes over stdin so it never appears on a command line.
        $env:CLAUDE_CODE_OAUTH_TOKEN.Trim() | & gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo $slug | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "gh secret set CLAUDE_CODE_OAUTH_TOKEN failed for $slug." }
        Write-Host '  + curate credential CLAUDE_CODE_OAUTH_TOKEN'
    }
    else {
        Write-Host '  ! no credential for the weekly curate run: set $env:CLAUDE_CODE_OAUTH_TOKEN and run this again.' -ForegroundColor Yellow
    }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Every connected repo now runs this version. To connect a repo:' -ForegroundColor Cyan
Write-Host '  ./Add-FactoryRepo.ps1 -RepoPath <path to clone> -OpenPr'
