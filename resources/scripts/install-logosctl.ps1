# Install logosctl on Windows, the PowerShell counterpart of install-logosctl.sh.
#
# Downloads a pinned logosctl release for Windows x86_64, unpacks it to
# %LOCALAPPDATA%\logosctl and adds its bin directory to the user PATH (no admin
# rights needed). To move to a newer build, bump the default tag below.
#   irm https://raw.githubusercontent.com/logos-co/logos-docs/main/resources/scripts/install-logosctl.ps1 | iex
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'  # the PS 5.1 progress bar slows downloads to a crawl

# Pinned tool release.
$tag = if ($env:LOGOSCTL_TAG) { $env:LOGOSCTL_TAG } else { '0.3.2' }

if ($env:PROCESSOR_ARCHITECTURE -ne 'AMD64') {
  throw "unsupported architecture: $env:PROCESSOR_ARCHITECTURE (need Windows x86_64)"
}
$platform = 'x86_64-windows'
$dest = Join-Path $env:LOCALAPPDATA 'logosctl'
$tmp = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
New-Item -ItemType Directory -Path $tmp | Out-Null

try {
  Write-Host "Downloading logosctl $tag for $platform ..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  $zip = Join-Path $tmp "logosctl-$platform.zip"
  Invoke-WebRequest -UseBasicParsing -OutFile $zip `
    -Uri "https://github.com/logos-co/logos-logoscore-cli/releases/download/$tag/logosctl-$platform.zip"
  Expand-Archive -Path $zip -DestinationPath $tmp

  Write-Host "Installing to $dest ..."
  if (Test-Path $dest) {
    # Fails while a logosctl daemon still holds files open: run `logosctl daemon stop` first.
    Remove-Item -Recurse -Force $dest
  }
  Move-Item (Join-Path $tmp "logosctl-$platform") $dest
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

$bin = Join-Path $dest 'bin'
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not (($userPath -split ';') -contains $bin)) {
  [Environment]::SetEnvironmentVariable('Path', ((@($userPath, $bin) | Where-Object { $_ }) -join ';'), 'User')
}
$env:Path = "$bin;$env:Path"
Write-Host "Done. $bin is on your user PATH; open a new terminal to pick it up."
