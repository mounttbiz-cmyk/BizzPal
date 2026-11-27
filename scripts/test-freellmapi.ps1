# Verify FreeLLMAPI local OpenAI-compatible router from Windows PowerShell
param(
  [string]$BaseUrl = "http://127.0.0.1:31415/v1",
  [string]$Model = "auto"
)

$envPath = Join-Path $PSScriptRoot "..\.env"
$Key = $env:FREELMAPI_API_KEY
if (-not $Key -and (Test-Path $envPath)) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^FREELMAPI_API_KEY=(.+)$') { $Key = $Matches[1].Trim().Trim('"') }
    if ($_ -match '^FREELMAPI_BASE_URL=(.+)$' -and -not $PSBoundParameters.ContainsKey('BaseUrl')) { $BaseUrl = $Matches[1].Trim().Trim('"') }
  }
}

$BSTR = [IntPtr]::Zero
try {
  if (-not $Key) {
    $SecureKey = Read-Host "Enter FreeLLMAPI Unified API Key" -AsSecureString
    $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)
    $Key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($BSTR)
  }

  $Headers = @{ Authorization = "Bearer $Key"; "Content-Type" = "application/json" }
  $ModelsResp = Invoke-RestMethod -Uri "$BaseUrl/models" -Headers $Headers -Method Get -TimeoutSec 10
  Write-Host "API CONNECTION SUCCESSFUL" -ForegroundColor Green
  $ids = @($ModelsResp.data | ForEach-Object { $_.id })
  $ids | ForEach-Object { Write-Host " - $_" }

  $targetModel = if ($Model -eq "auto" -or ($ids -contains $Model)) { $Model } elseif ($ids.Count -gt 0) { $ids[0] } else { $Model }
  Write-Host "`nTesting /chat/completions with model '$targetModel'..." -ForegroundColor Cyan
  $body = @{
    model = $targetModel
    messages = @(@{ role = "user"; content = "Reply exactly: FreeLLMAPI connection successful." })
    temperature = 0
    max_tokens = 512
  } | ConvertTo-Json -Depth 4

  $ChatResp = Invoke-RestMethod -Uri "$BaseUrl/chat/completions" -Headers $Headers -Method Post -Body $body -TimeoutSec 30
  Write-Host "Served model: $($ChatResp.model)" -ForegroundColor Yellow
  Write-Host "Reply: $($ChatResp.choices[0].message.content)" -ForegroundColor Green
} catch {
  Write-Host "API CONNECTION FAILED" -ForegroundColor Red
  Write-Host $_.Exception.Message
  exit 1
} finally {
  if ($BSTR -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR) }
}
