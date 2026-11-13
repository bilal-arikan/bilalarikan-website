param(
    [string]$SshHost = 'myhermes',
    [switch]$InstallCaddy
)

$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path -Parent $PSScriptRoot
$release = Get-Date -Format 'yyyyMMdd-HHmmss'
$archive = Join-Path ([System.IO.Path]::GetTempPath()) "bilalarikan-$release.tar.gz"
Push-Location $siteRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Website build failed.' }
    & npm.cmd run check
    if ($LASTEXITCODE -ne 0) { throw 'Website validation failed.' }
    $export = Get-Content -LiteralPath 'dist/api.json' -Raw | ConvertFrom-Json
    $projectCount = @($export.projects).Count
    if ($projectCount -lt 1) { throw 'Website export contains no projects.' }
    & tar -czf $archive -C dist .
    if ($LASTEXITCODE -ne 0) { throw 'Website packaging failed.' }
    & ssh $SshHost 'mkdir -p /home/hermes/bilalarikan-incoming'
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare upload directory.' }
    & scp $archive "${SshHost}:/home/hermes/bilalarikan-incoming/$release.tar.gz"
    if ($LASTEXITCODE -ne 0) { throw 'Website upload failed.' }
    & scp deploy/release.sh deploy/install-caddy.sh deploy/Caddyfile deploy/origin.pem "${SshHost}:/home/hermes/bilalarikan-incoming/"
    if ($LASTEXITCODE -ne 0) { throw 'Deployment configuration upload failed.' }
    & ssh $SshHost "sudo -n bash /home/hermes/bilalarikan-incoming/release.sh $release $projectCount"
    if ($LASTEXITCODE -ne 0) { throw 'Website release failed.' }
    if ($InstallCaddy) {
        & ssh $SshHost 'sudo -n bash /home/hermes/bilalarikan-incoming/install-caddy.sh'
        if ($LASTEXITCODE -ne 0) { throw 'Caddy configuration failed.' }
    }
    Write-Output "Published release $release."
} finally {
    Pop-Location
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive }
}
