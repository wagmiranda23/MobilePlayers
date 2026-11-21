# Desfaz o `pc:instalar`: apaga o atalho da pasta Inicializar e para o
# programa do PC. Os jogadores da pasta meus/ ficam onde estão.
$atalho = Join-Path ([Environment]::GetFolderPath('Startup')) 'MobilePlayers PC.lnk'
if (Test-Path $atalho) {
  Remove-Item $atalho
  Write-Output "Atalho removido: $atalho"
} else {
  Write-Output 'Não havia atalho na pasta Inicializar.'
}

$rodando = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*servidor/pc.ts*' -or $_.CommandLine -like '*servidor\pc.ts*' }
foreach ($p in $rodando) {
  Stop-Process -Id $p.ProcessId -Force
  Write-Output "Programa do PC parado (processo $($p.ProcessId))."
}
