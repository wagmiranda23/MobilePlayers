# Instala o programa do PC:
# - o atalho "MobilePlayers PC" na pasta Inicializar (shell:startup), para ele
#   ligar junto com o Windows, escondido;
# - o atalho "MobilePlayers" na área de trabalho e no menu Iniciar, que abre o
#   app aqui no PC numa janela própria.
# E já sobe o programa. Para desfazer: npm run pc:desinstalar
$projeto = Split-Path -Parent $PSScriptRoot
$powershell = (Get-Command powershell.exe).Source
$shell = New-Object -ComObject WScript.Shell

function New-Atalho($caminho, $script, $descricao, $icone) {
  $lnk = $shell.CreateShortcut($caminho)
  $lnk.TargetPath = $powershell
  $lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
  $lnk.WorkingDirectory = $projeto
  $lnk.WindowStyle = 7  # minimizado: a janela do PowerShell nem aparece
  $lnk.Description = $descricao
  if ($icone) { $lnk.IconLocation = "$icone,0" }
  $lnk.Save()
  Write-Output "Atalho criado: $caminho"
}

$iniciar = Join-Path $PSScriptRoot 'iniciar.ps1'
$abrir = Join-Path $PSScriptRoot 'abrir.ps1'
$icone = Join-Path $PSScriptRoot 'icone.ico'

New-Atalho (Join-Path ([Environment]::GetFolderPath('Startup')) 'MobilePlayers PC.lnk') $iniciar 'Guarda os jogadores do MobilePlayers e serve o app no PC' $null
foreach ($pasta in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
  New-Atalho (Join-Path $pasta 'MobilePlayers.lnk') $abrir 'Abre o MobilePlayers no PC' $icone
}

& $iniciar
Start-Sleep -Seconds 2
try {
  $s = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/status' -TimeoutSec 5
  Write-Output "Programa do PC rodando. Pasta: $($s.pasta)"
  Write-Output 'Abra o app pelo atalho MobilePlayers (área de trabalho ou menu Iniciar), ou em http://localhost:8765'
} catch {
  Write-Output "Os atalhos foram criados, mas o programa não respondeu. Rode 'npm run pc' para ver o erro."
}
