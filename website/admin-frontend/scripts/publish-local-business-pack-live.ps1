$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$pack = Get-Content (Join-Path $PSScriptRoot '../src/data/local-business-36-template-pack.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if (@($pack).Count -ne 36) { throw 'Pack does not contain 36 templates.' }
$receiptFile = Join-Path $root 'artifacts/local-business-36/publication-live.json'
$receipt = [ordered]@{ baseUrl = 'https://web-api.inquiry.business'; startedAt = [DateTime]::UtcNow.ToString('o'); verified = $false; records = @() }
$headers = @{}
$refreshToken = $null
function Save-Receipt {
  $receipt | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $receiptFile -Encoding UTF8
}
function Request([string]$method, [string]$path, $data = $null) {
  $args = @{ Uri = "https://web-api.inquiry.business$path"; Method = $method; Headers = $headers; TimeoutSec = 30; ErrorAction = 'Stop' }
  if ($null -ne $data) { $args.ContentType = 'application/json'; $args.Body = $data | ConvertTo-Json -Depth 100 -Compress }
  try { return Invoke-RestMethod @args }
  catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'network' }
    throw "$method $path failed (HTTP $status)."
  }
}
try {
  if ([Console]::IsInputRedirected) {
    $credentialsLine = [Console]::In.ReadLine()
    if (-not $credentialsLine) { throw 'Credentials were not received on stdin.' }
    $credentials = $credentialsLine | ConvertFrom-Json
  } else {
    $emailSecure = Read-Host 'Admin email' -AsSecureString
    $passwordSecure = Read-Host 'Admin password' -AsSecureString
    $emailPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($emailSecure)
    $passwordPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSecure)
    try {
      $credentials = [pscustomobject]@{
        email = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($emailPtr)
        password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPtr)
      }
    } finally {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($emailPtr)
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPtr)
    }
  }
  if (-not $credentials.email -or -not $credentials.password) { throw 'Credentials were incomplete.' }
  $session = Request 'POST' '/auth/login' $credentials
  $credentials.password = ''; $credentials.email = ''; $credentialsLine = $null
  if (-not $session.success -or -not $session.accessToken) { throw 'Admin login did not return an access token.' }
  $refreshToken = $session.refreshToken
  $headers.Authorization = "Bearer $($session.accessToken)"
  Write-Output 'Production admin login successful.'
  $current = Request 'GET' '/hyperlocal/offer-templates'
  if (-not $current.success) { throw 'Could not list production templates.' }
  foreach ($template in $pack) {
    $found = @($current.data | Where-Object { $_.slug -eq $template.slug })
    if ($found.Count -gt 1) { throw "Duplicate production slug $($template.slug)." }
    if ($found.Count -eq 1 -and ($found[0].name -ne $template.name -or $found[0].category -ne $template.category -or $found[0].metadata.pack -ne 'local-business-36-v1')) {
      throw "Existing slug differs: $($template.slug)."
    }
  }
  Save-Receipt
  foreach ($template in $pack) {
    $found = @($current.data | Where-Object { $_.slug -eq $template.slug })
    if ($found.Count) { $item = $found[0]; $action = 'already-present' }
    else {
      $created = Request 'POST' '/hyperlocal/offer-templates' $template
      $item = $created.template; $action = 'created'
    }
    if (-not $item._id -or $item.slug -ne $template.slug -or -not $item.isActive -or @($item.canvas.elements).Count -ne @($template.canvas.elements).Count) {
      throw "Readback mismatch for $($template.slug)."
    }
    $receipt.records += @{ id = $item._id; slug = $template.slug; category = $template.category; action = $action }
    Save-Receipt
    Write-Output "$($receipt.records.Count)/36 $action $($template.category): $($template.name)"
  }
  $live = Invoke-RestMethod -Uri 'https://app-api.inquiry.business/offer-templates' -TimeoutSec 30
  $published = @($live.data | Where-Object { $_.slug -like 'ny36-*' })
  if ($published.Count -ne 36) { throw "Mobile production API exposes $($published.Count)/36 templates." }
  foreach ($template in $pack) {
    $found = @($published | Where-Object { $_.slug -eq $template.slug })
    if ($found.Count -ne 1 -or -not $found[0].isActive) { throw "Missing active mobile template: $($template.slug)." }
  }
  $receipt.verified = $true
  $receipt.finishedAt = [DateTime]::UtcNow.ToString('o')
  Save-Receipt
  Write-Output 'PASS: all 36 templates are visible through the production mobile API.'
} finally {
  if ($refreshToken) {
    try { $null = Request 'POST' '/auth/logout' @{ refreshToken = $refreshToken }; Write-Output 'Production admin session logged out.' }
    catch { Write-Output 'Production admin session logout failed.' }
  }
}
