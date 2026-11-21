# Faz o programa do PC ligar junto com o Windows: cria o atalho
# "MobilePlayers PC" na pasta Inicializar (shell:startup) e já sobe o programa.
# Para desfazer: npm run pc:desinstalar
$iniciar = Join-Path $PSScriptRoot 'iniciar.ps1'
$atalho = Join-Path ([Environment]::GetFolderPath('Startup')) 'MobilePlayers PC.lnk'

$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut($atalho)
$lnk.TargetPath = (Get-Command powershell.exe).Source
$lnk.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$iniciar`""
$lnk.WorkingDirectory = Split-Path -Parent $PSScriptRoot
$lnk.WindowStyle = 7  # minimizado: a janela do PowerShell nem aparece
$lnk.Description = 'Recebe os jogadores do MobilePlayers no iPhone'
$lnk.Save()
Write-Output "Atalho criado: $atalho"

& $iniciar
Start-Sleep -Seconds 2
try {
  $s = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/status' -TimeoutSec 5
  Write-Output "Programa do PC rodando. Pasta: $($s.pasta)"
} catch {
  Write-Output "O atalho foi criado, mas o programa não respondeu. Rode 'npm run pc' para ver o erro."
}
