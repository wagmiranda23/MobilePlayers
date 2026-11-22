# Abre o MobilePlayers no PC numa janela própria, sem a barra do navegador
# (o Edge com --app). É o que o atalho "MobilePlayers" da área de trabalho e
# do menu Iniciar chama. Se o programa do PC não estiver rodando, sobe ele antes.
$url = 'http://localhost:8765/'

function Test-Programa {
  try {
    $null = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/status' -TimeoutSec 2
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-Programa)) {
  & (Join-Path $PSScriptRoot 'iniciar.ps1')
  for ($i = 0; $i -lt 30 -and -not (Test-Programa); $i++) { Start-Sleep -Milliseconds 500 }
}

$edge = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe' -ErrorAction SilentlyContinue).'(default)'
if (-not $edge) { $edge = Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe' }
if (Test-Path $edge) {
  Start-Process -FilePath $edge -ArgumentList "--app=$url"
} else {
  Start-Process $url
}
