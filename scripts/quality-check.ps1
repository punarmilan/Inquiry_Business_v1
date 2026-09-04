$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

function Invoke-Step {
  param(
    [string]$Name,
    [scriptblock]$Action
  )

  Write-Host "`n== $Name ==" -ForegroundColor Cyan
  Push-Location $repoRoot
  try {
    & $Action
    if ($LASTEXITCODE -ne 0) {
      throw "Step failed with exit code $LASTEXITCODE"
    }
  } finally {
    Pop-Location
  }
}

Write-Host 'InquiryExperts quality gate' -ForegroundColor Green

Invoke-Step 'Check tracked secret-like files' {
  $matches = @(git ls-files | Select-String -Pattern '(^|/)(\.env($|\.)|.*\.pem$|.*\.key$|.*credentials.*|.*secret.*)' -CaseSensitive:$false)
  $allowed = @('website/admin-frontend/.env.example', 'website/backend/.env.example')
  $unexpected = @($matches | Where-Object { $allowed -notcontains $_.Line })
  if ($unexpected.Count -gt 0) {
    $unexpected | ForEach-Object { Write-Host $_.Line -ForegroundColor Red }
    throw 'Secret-like files are tracked. Remove them before committing.'
  }
}

Invoke-Step 'Parse backend JavaScript' {
  $backendFiles = @(
    Get-ChildItem (Join-Path $repoRoot 'mobile/backend/src'), (Join-Path $repoRoot 'website/backend/src') -Filter '*.js' -Recurse -File
  )
  foreach ($file in $backendFiles) {
    node --check $file.FullName
    if ($LASTEXITCODE -ne 0) { throw "Invalid JavaScript: $($file.FullName)" }
  }
}

Invoke-Step 'Test mobile backend' {
  Push-Location (Join-Path $repoRoot 'mobile/backend')
  try { npm test } finally { Pop-Location }
}

Invoke-Step 'Type-check mobile app' {
  Push-Location (Join-Path $repoRoot 'mobile/frontend')
  try { npm exec tsc -- --noEmit } finally { Pop-Location }
}

Invoke-Step 'Build public website' {
  Push-Location (Join-Path $repoRoot 'website/frontend')
  try { npm run build } finally { Pop-Location }
}

Invoke-Step 'Build and lint admin console' {
  Push-Location (Join-Path $repoRoot 'website/admin-frontend')
  try {
    npm run build
    npm run lint
  } finally { Pop-Location }
}

Write-Host "`nQuality gate passed." -ForegroundColor Green
