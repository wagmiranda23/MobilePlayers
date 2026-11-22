# MobilePlayers

Crie jogadores de Football Manager pelos atributos e veja o overall na hora.
Web app feito para o iPhone: abre no Safari e pode ficar na Tela de Início.

**Abrir:** https://wagmiranda23.github.io/MobilePlayers/ e, no Safari,
Compartilhar → Adicionar à Tela de Início.

- **Criar**: atributos de 1 a 20, posições no campinho com os níveis do FM,
  pés, biotipo. O overall (escala FIFA) e o CA se atualizam enquanto você mexe.
- **Base**: jogadores em JSON do FMRTE. Busca por nome, clube, temporada ou
  nação, filtro por setor, ficha completa e exportação do JSON.
- **Importar e backup**: jogador do FMRTE (arquivo ou colado), lista de
  jogadores ou backup do próprio app.
- **Versão do PC**: em tela larga, lista, ficha no estilo do FM e campinho
  lado a lado, atributos editáveis pelo teclado, comparar até 3 jogadores,
  duplicar, arrastar JSONs para a janela.

## iPhone e PC juntos

Os seus jogadores ficam na pasta `meus/` do PC (nunca no GitHub) e iguais em
todos os aparelhos, pela rede do [Tailscale](https://tailscale.com): o que
você cria no iPhone aparece no PC, e o contrário também. Se o mesmo jogador
mudou dos dois lados, vale a mudança mais recente.

1. Tailscale no PC e no iPhone, com a mesma conta.
2. No PC: `npm run pc:instalar` (o programa liga junto com o Windows e ganha
   o atalho "MobilePlayers", que abre o app no PC) e `tailscale serve --bg 8765`.
3. No iPhone: Base → Sincronizar com o PC → cole o endereço `https://…ts.net`.

Com o PC desligado, as mudanças esperam numa fila no iPhone e vão quando o
PC estiver ligado e o app aberto.

## Rodar no PC

```bash
npm install
npm run dev      # abre em http://localhost:5173 e na rede local
npm test         # testa o cálculo contra exports reais
npm run conferir # confere os JSONs da base
```

Cada push na `main` testa, confere e publica no GitHub Pages.
Detalhes do cálculo e do formato estão em [CLAUDE.md](CLAUDE.md).
