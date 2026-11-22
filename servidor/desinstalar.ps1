# Desfaz o `pc:instalar`: apaga os atalhos (Inicializar, área de trabalho e
# menu Iniciar) e para o programa do PC. Os jogadores da pasta meus/ ficam
# onde estão.
$atalhos = @(
  (Join-Path ([Environment]::GetFolderPath('Startup')) 'MobilePlayers PC.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Desktop')) 'MobilePlayers.lnk'),
  (Join-Path ([Environment]::GetFolderPath('Programs')) 'MobilePlayers.lnk')
)
foreach ($atalho in $atalhos) {
  if (Test-Path $atalho) {
    Remove-Item $atalho
    Write-Output "Atalho removido: $atalho"
  }
}

$rodando = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*servidor/pc.ts*' -or $_.CommandLine -like '*servidor\pc.ts*' }
foreach ($p in $rodando) {
  Stop-Process -Id $p.ProcessId -Force
  Write-Output "Programa do PC parado (processo $($p.ProcessId))."
}
