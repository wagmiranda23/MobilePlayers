# MobilePlayers — contexto para o Claude Code

Web app (PWA) para **criar jogadores de Football Manager** pelos atributos e ver
o **overall**, mais uma **base de jogadores** em JSON que o Claude gera sob
pedido. O usuário usa **iPhone** e desenvolve no Windows, então o app é web:
roda no Safari e vai para a Tela de Início. O idioma de trabalho é
**português**: código, comentários, interface e conversa. Os rótulos dos
atributos ficam em **português de Portugal** ("Finta", "Remates de Longe",
"Guarda-redes"), por decisão do usuário.

É o mesmo ecossistema do MC-Editor (`C:\dev\MC-editor`). Os outros projetos
de `C:\dev` são **só leitura** para este: copie o que precisar, não altere nada lá.
O app é independente do FM, mas o JSON segue o formato do FMRTE porque o
usuário pode importar os jogadores no **FM27** pelo TablineEditor27.

Publicado em **https://wagmiranda23.github.io/MobilePlayers/** (repositório
público `wagmiranda23/MobilePlayers`). Cada push na `main` testa, confere a
base e publica pelo GitHub Actions (`.github/workflows/publicar.yml`).

Há também a **versão do PC**: o mesmo app, em tela larga, aberto pelo atalho
"MobilePlayers" (área de trabalho e menu Iniciar) em `http://localhost:8765`.
Lá os jogadores do usuário são a pasta `meus/`, a mesma que o iPhone
sincroniza.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor com `--host`: abre no iPhone pela rede local (`http://<ip-do-pc>:5173`) |
| `npm run build` | checa tipos e gera `dist/` (com `versao.json`) |
| `npm test` | cálculo contra 7 exports reais do FMRTE, formato, posições e backup |
| `npm run conferir` | confere os JSONs da base; sai com erro se houver aviso (o deploy roda isso) |
| `npm run conferir -- --gravar "Nome (2005-06)"` | regrava CA/PA/RCA/ratings e a ordem das chaves |
| `npm run pc` | roda o programa do PC no terminal (pasta `meus/`, sincronia e o app em `localhost:8765`) |
| `npm run pc:instalar` / `pc:desinstalar` | liga/desliga o programa do PC junto com o Windows e cria/apaga os atalhos "MobilePlayers" |
| `npm run pc:abrir` | abre o app no PC numa janela própria (o que o atalho faz) |

## Onde vive o quê

| Arquivo | Papel |
|---|---|
| `src/lib/overall.ts` | o cálculo: média ponderada → CA → OVR |
| `src/lib/pesos.ts` | pesos por perfil de posição (cópia de `legends/shared.js`) |
| `src/lib/atributos.ts` | os 54 atributos + 8 de personalidade, rótulos PT, ordem do FMRTE |
| `src/lib/posicoes.ts` | as 14 posições, siglas BR, perfil, níveis de aptidão, lugar no campinho |
| `src/lib/fmrte.ts` | formato do JSON: tipo, `normalizar`, `recalcular`, biotipo, idade, nome do arquivo |
| `src/lib/registro.ts` | registro (jogador + origem), backup, importação, mesclar — puro, testável |
| `src/lib/base.ts` | a base (`src/data/jogadores/*.json`) + "meus" e rascunho (localStorage) |
| `src/lib/versao.ts` | confere se há build novo publicado e oferece atualizar |
| `src/lib/sincronia.ts` | fila, envio, retrato da pasta e `reconciliar` (os dois sentidos) |
| `src/lib/modo.ts` | onde o app está aberto (`NO_PC`) e se a tela é larga (layout de PC a partir de 1024 px) |
| `src/lib/lista.ts` | a lista com overall calculado, busca e filtro (celular e PC) |
| `servidor/pc.ts` | o programa do PC: HTTP em 127.0.0.1:8765, rotas da sincronia e do app |
| `servidor/pasta.ts` | a pasta `meus/`: índice, exclusões, conflito (409), mudanças feitas à mão |
| `servidor/app.ts` | serve o build do app no PC (`.pc-app/`) e refaz o build quando o código ou a base mudam |
| `servidor/*.ps1` | iniciar escondido, abrir no Edge (`--app`), instalar/desinstalar atalhos |
| `meus/` | **os jogadores do usuário** (do iPhone e do PC), só no PC (no `.gitignore`, nunca vai para o GitHub) |
| `src/telas/` | celular: `Criar`, `Base`, `Ficha`; PC: `pc/LayoutPc`, `pc/Painel`, `pc/Comparar` |
| `src/components/` | `ui.tsx` (caixas, seções, folha), `Campinho`, `EscolherNivel`, `Cartoes` (sincronia e backup), `Importar` |
| `src/data/jogadores/` | **a base**: um JSON por jogador |
| `tests/fixtures/` | 7 exports reais (de `C:\dev\LiveEditor24`), o gabarito do cálculo |

## O cálculo do overall

O CA é nosso, baseado no do FM (o usuário não exige que bata com o FM27).

1. **Média ponderada** dos atributos com os pesos do perfil da posição
   principal (`PESOS`, fiel à "CA WEIGHT SYSTEM" de `legends/shared.js`).
   `WeakerFoot` = min(LeftFoot, RightFoot).
2. **CA = 20,574 × média − 133,061**, limitado a 1–200. Reta ajustada nos 7
   exports reais: erro máximo de 8 CA, média abaixo de 5. Não é proporcional:
   o FM cobra mais CA por atributo alto.
3. **OVR = `fmParaFifa(CA)`**: de CA 70 para cima, cópia fiel do `fmToFifa` de
   `legends/lib/utils.ts` (bate com o Manager's Club). Abaixo de 70 a escala é
   nossa: desce em linha reta de 60 (CA 69) até 40 (CA 1), sem o piso de 60.
4. Faixas de cor: os cortes de `ratingClass(…, 'fifa')` e as cores de
   `legends/app/globals.css` (grafite, bronze, prata, ouro, rubi, elite).

Se a calibração mudar, rode `npm test`, e os testes têm que continuar passando.

## O formato do JSON

O do FMRTE (`legends/shared.js`, exports do LiveEditor24) mais quatro chaves:

- `Name`, `Club`: o TablineEditor27 exporta as duas e **pula** as duas na
  importação. `Name` é o nome do jogador, dentro do JSON.
- `Season`: só do app. Temporada daquela versão do jogador: `"2005/06"`, ou
  `"2012"` para liga de ano corrido. A idade na ficha é contada em 1º de julho
  do primeiro ano da temporada.
- `BodyType`: biotipo do FM27, 1 (ectomorfo) a 5 (endomorfo). O FM27 não tem
  `Weight` e o FM24 não tem `BodyType`, então vão os dois.

O TablineEditor27 ignora chaves que não conhece, e só aceita valor inteiro.
`normalizar` põe `Name`, `Club`, `Season` no topo e `BodyType` logo depois de
`Weight`.

## Posições

Aptidão de 1 a 20, com os níveis do FM: 18–20 natural, 15–17 experiente,
12–14 competente, 9–11 pouco convincente, 5–8 desajeitado, 1–4 ineficaz.
**Só a posição principal é 20**; outra posição natural vai em **19**. A
principal é a de maior aptidão, e é nela que o overall é calculado.

## Quando o usuário pedir um jogador

O pedido vem assim: "faz o Kaká de 2007", "cria um zagueiro brasileiro de 19 anos".
O usuário **autorizou commit e push direto** quando o Claude cria jogadores:
é isso que faz o jogador aparecer no celular.

1. Crie `src/data/jogadores/<Name> (<temporada>).json`, com a barra da
   temporada virando hífen: `Kaká (2006-07).json`, `Neymar (2012).json`.
   Para jogador atual, use a temporada corrente.
2. Siga o formato de `Ronaldinho (2005-06).json`: todas as chaves, `Name`,
   `Club`, `Season`, `BodyType`, `Id: -1` em todo bloco, `"Nation.Id": -1`,
   `DocumentType: "Player"`, `FmrteVersion: "24.3.0.29"`.
3. Regras de valor: atributos de 1 a 20; **pé bom = 20 exato**, pé fraco
   3–7 (de um pé só) ou 15–17 (ambidestro); **goleiro de linha = 1 a 3**;
   principal = 20, outra natural = 19, as que ele joga bem 15–17; nação em
   português; `Born` real (`AAAA-MM-DDT00:00:00`); `BodyType` pelo físico
   real (o `biotipoSugerido` do IMC é só um ponto de partida).
4. Pense na escala do FM, não na do FIFA: um craque mundial tem CA 185–195.
   Atributo 20 é raro. Na primeira versão do Ronaldinho, tudo em 17–20 deu CA
   200 cravado; o FM real dava algo perto de 190.
5. Rode `npm run conferir -- --gravar "<arquivo sem .json>"`. Confira se o OVR
   faz sentido para o nível real do jogador e ajuste os atributos se não
   fizer. Depois `npm run conferir` sem argumentos tem que sair sem aviso.
6. `Ethnicity`, `HairColour` e `HairLength`: use só valores vistos em export
   real (`ETNIAS`, `CABELOS`, `COMPRIMENTOS` em `fmrte.ts`). Valor novo só
   entra depois de confirmado num export.
7. `npm test`, commit (`Adiciona Kaká (2006-07)`) e push na `main`. Em 1–2
   minutos o GitHub publica, e o app no iPhone mostra "Versão nova". No PC, o
   programa nota o arquivo novo, refaz o build sozinho e o app aberto mostra o
   mesmo aviso.

## Sincronia com o PC

O GitHub guarda só o código e a base que o Claude gera. Os jogadores que o
usuário cria **não vão para o GitHub**: ficam em `meus/`, no PC, e numa cópia
em cada aparelho. Vale nos dois sentidos: o que ele cria no iPhone chega no
PC, e o que cria no PC chega no iPhone.

- O iPhone fala com o programa do PC pela rede do **Tailscale** (no PC e no
  iPhone, mesma conta). No PC, `tailscale serve --bg 8765` publica o programa
  em `https://<pc>.<rede>.ts.net`; o usuário colou esse
  endereço no app (aba Base → Sincronizar com o PC).
- Cada mudança no aparelho entra numa fila. A sincronia roda ao abrir, ao
  voltar para a tela e a cada 30 s (15 s no app do PC): manda a fila, puxa o
  retrato da pasta (`GET /sincronia`) e `reconciliar` junta os dois lados.
  **Vale a mudança mais recente** (`atualizadoEm`): o PC recusa com 409 um
  PUT ou DELETE mais velho que a versão dele, e o retrato seguinte traz a dele.
  O iOS não roda app web em segundo plano.
- Em `meus/`: um JSON por jogador, com o nome de arquivo da base;
  `.indice.json` liga o id de cada aparelho ao arquivo e guarda quando mudou;
  `.excluidos.json` guarda quando cada id foi excluído; excluir move para
  `meus/lixeira/`; log em `.servidor.log`. Mexer na pasta à mão também vale:
  arquivo novo aparece com id `pc:<arquivo>`, editado conta como mudança (pela
  data do arquivo), apagado conta como exclusão.
- O app aberto no PC usa a mesma sincronia, com o próprio programa do PC como
  endereço (`NO_PC` em `src/lib/modo.ts`; o programa põe a meta
  `mobileplayers-pc` no index.html que ele serve).
- O programa só aceita navegador vindo do app publicado, do próprio PC, da
  rede local ou do endereço do Tailscale (`ORIGENS` em `servidor/pc.ts`). Se o
  endereço publicado mudar, mude lá. `POST /abrir-pasta` só vale do próprio PC.
- "Passa o João para a base": copie de `meus/` para `src/data/jogadores/`,
  complete o que faltar (`Season`, `Club`…), `conferir --gravar`, commit e push.

## Versão do PC

- `npm run pc:instalar` cria o atalho "MobilePlayers" (área de trabalho e
  menu Iniciar). Ele chama `servidor/abrir.ps1`, que sobe o programa se
  precisar e abre `http://localhost:8765` no Edge com `--app` (janela sem
  barra do navegador).
- O programa serve o build de `.pc-app/` (fora do git). Ao abrir a página ou
  pedir o `versao.json`, ele confere se algo em `src/`, `public/`,
  `index.html`, `vite.config.ts` ou `package.json` é mais novo que o build e,
  se for, gera outro em `.pc-app-novo/` e troca. Mudou o código do
  **servidor** (`servidor/*.ts`)? Aí precisa reiniciar o programa
  (`npm run pc:desinstalar` e `npm run pc:instalar`).
- Tela larga (a partir de 1024 px, em qualquer endereço) usa o layout de PC:
  lista à esquerda; no meio, o jogador no jeito do perfil do FM (atributos em
  três colunas, editáveis pelo teclado: digitar, setas, Tab/Enter, Ctrl+S
  salva); campinho e overall por posição do lado. Jogador da base abre só
  para ver ("Editar cópia"). Extras: comparar até 3 lado a lado, duplicar
  (outra temporada), arrastar JSONs para a janela, "Abrir pasta" (Ajustes).
- Para testar o layout de PC no `npm run dev`: `http://localhost:5173/?pc`
  finge que está no PC (as rotas do programa vão para a porta 8765 pelo proxy
  do Vite).

## Limites conhecidos

- A calibração usa só 7 jogadores, e nenhum deles é meia aberto, meia-atacante
  ou ponta. Esses perfis usam a mesma reta.
- `ActualRating`/`PotentialRating` saem de outra reta ajustada (erro de até
  ~4); a regra "CA/2.1" do `shared.js` não bate com os dados reais.
- Pela rede local (http), o iPhone não tem `navigator.share` nem
  `navigator.clipboard`; o app cai em download e em `execCommand('copy')`. No
  endereço publicado (HTTPS) os dois funcionam.
- No celular, os jogadores do usuário ficam no localStorage **daquele
  navegador** (Safari e o app da Tela de Início são separados), com cópia em
  `meus/` se a sincronia estiver ligada. O backup gera um arquivo que o
  "Restaurar" lê de volta.
- Na comparação, o overall em cada posição ainda não desconta a aptidão (isso
  vem com a fase 4).
- O GitHub Pages guarda o `index.html` em cache por até 10 minutos. O app
  compara a versão dele com a do `versao.json` publicado e oferece recarregar.

## Próximas fases (combinadas com o usuário)

2. Criar rápido: arquétipos, "overall alvo" (cálculo reverso), sortear regen.
3. Coleção e compartilhar: foto, card como imagem, comparar lado a lado no
   celular (no PC já existe), radar, favoritos.
4. Escalar times: lista fixa de formações (4-3-3, 4-4-2, 4-2-3-1, 3-5-2, 5-3-2,
   4-1-2-1-2…), 11 titulares + até 12 reservas, overall de cada titular na
   posição em que está com desconto pela aptidão, overall do time e por setor.
   Times prontos sob pedido ("monta o Barcelona 2009"): o Claude gera os
   jogadores e o time escalado.
