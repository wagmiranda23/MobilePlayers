# Sobe o programa do PC escondido (sem janela). É o que o atalho da pasta
# Inicializar do Windows chama; `npm run pc:instalar` cria esse atalho.
$projeto = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
Start-Process -FilePath $node -ArgumentList @('--import', 'tsx', 'servidor/pc.ts') -WorkingDirectory $projeto -WindowStyle Hidden
