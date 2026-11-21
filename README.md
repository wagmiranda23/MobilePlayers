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

## Rodar no PC

```bash
npm install
npm run dev      # abre em http://localhost:5173 e na rede local
npm test         # testa o cálculo contra exports reais
npm run conferir # confere os JSONs da base
```

Cada push na `main` testa, confere e publica no GitHub Pages.
Detalhes do cálculo e do formato estão em [CLAUDE.md](CLAUDE.md).
