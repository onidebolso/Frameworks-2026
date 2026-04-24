# Frameworks-2026

Projeto acadêmico construído com Astro para apresentar uma wiki estilizada de Death Stranding, combinando conteúdo em Markdown, modelo 3D interativo, ilhas de navegação e um mural de mensagens com suporte a mapa mundial.

Slides do projeto:

https://canva.link/d0ulbrpir2njf1o

## Visão geral

O projeto mistura uma experiência de wiki com elementos interativos. O usuário pode explorar conteúdos sobre o universo de Death Stranding, interagir com um modelo 3D, abrir painéis de informações e publicar mensagens tanto na página quanto no mapa.

## O que o projeto usa

- Astro 6 como framework principal
- React 19 para componentes interativos hidratados no cliente
- Astro Content Collections para organizar a wiki em Markdown
- MDX via @astrojs/mdx
- Supabase para persistência, realtime e políticas de acesso
- OpenLayers com OpenStreetMap para o mapa interativo
- Sketchfab para o modelo 3D incorporado
- CSS global customizado para toda a identidade visual
- Google Fonts para a fonte Roboto

## Funcionalidades implementadas

- Wiki temática com conteúdos organizados em Markdown dentro de collections do Astro
- Navegação por ilhas laterais com painéis informativos sobrepostos
- Modelo 3D interativo incorporado via iframe do Sketchfab
- Mural de mensagens com votos positivos e negativos
- Mensagens posicionadas diretamente na página
- Mensagens posicionadas em qualquer lugar do mapa mundial
- Separação entre mensagens da página e mensagens do mapa
- Chat box ancorada sobre a mensagem clicada
- Criação de mensagens com username opcional
- Biblioteca de emojis clicável no formulário de criação
- Identificação por IP no Supabase para limitar exclusão ao autor da mensagem
- Atualização em tempo real das mensagens via canais realtime do Supabase

## Estrutura principal

O app Astro fica dentro da pasta [y/package.json](y/package.json).

Tambem existe uma segunda base em [x/package.json](x/package.json), criada com Vue + Vite para testes comparativos de performance e arquitetura no mesmo repositório. Essa variante já replica o layout principal, a wiki lateral, o modelo 3D, o mural com Supabase e o mapa com OpenStreetMap.

- [y/src/pages/index.astro](y/src/pages/index.astro): página principal
- [y/src/components/ExpandableIsland.jsx](y/src/components/ExpandableIsland.jsx): ilhas laterais e integração com o modelo 3D
- [y/src/components/MessageCanvas.jsx](y/src/components/MessageCanvas.jsx): mural de mensagens, modal, votos, mapa e popovers
- [y/src/lib/messageBoard.js](y/src/lib/messageBoard.js): utilitários do mural
- [y/src/service/mapService.js](y/src/service/mapService.js): integração do mapa com OpenLayers
- [y/src/lib/supabaseClient.js](y/src/lib/supabaseClient.js): cliente Supabase
- [y/src/content/wiki](y/src/content/wiki): conteúdos da wiki em Markdown
- [y/supabase-create-table.sql](y/supabase-create-table.sql): schema SQL, funções e policies do Supabase
- [x](x): variante em Vue + Vite usada para benchmark e comparação direta com a versão Astro

## Requisitos

- Node.js 22.12.0 ou superior
- npm
- Projeto Supabase configurado

## Instalação

Clone o repositório e instale as dependências do app Astro:

```bash
git clone https://github.com/onidebolso/Frameworks-2026.git
cd Frameworks-2026/y
npm install
```

## Variáveis de ambiente

O projeto depende destas variáveis públicas do Supabase:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

Elas são lidas em [y/src/lib/supabaseClient.js](y/src/lib/supabaseClient.js).

## Configuração do banco

Antes de usar o mural de mensagens, execute o SQL de [y/supabase-create-table.sql](y/supabase-create-table.sql) no editor SQL do Supabase. Esse arquivo cria e atualiza:

- tabela public.messages
- colunas de autor, latitude e longitude
- função request_ip()
- trigger para travar identidade do autor
- políticas de select, insert, update e delete
- recarga do schema cache com notify pgrst

## Comandos do projeto

Todos os comandos abaixo devem ser executados dentro da pasta y.

```bash
npm install
npm run dev
npm run build
npm run preview
npm run astro -- --help
```

Para a base Vue + Vite em [x](x):

```bash
cd x
npm install
npm run dev
npm run build
```

## Fluxo de desenvolvimento

Para rodar localmente:

```bash
cd y
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
cd y
npm run build
```

## Comparativo de performance

Foi executado um teste comparativo entre as duas bases do repositório com o mesmo critério:

- remoção da pasta dist antes de cada medição
- build de produção com npm run build
- medição do tempo total de execução do comando
- comparação do tamanho final dos artefatos gerados em dist

Resultado da medição local neste repositório:

| Métrica | x (Vue + Vite) | y (Astro + React) |
| --- | ---: | ---: |
| Tempo total de build | 1,20 s | 6,81 s |
| Tamanho total de dist | 537.028 bytes | 698.141 bytes |
| JavaScript emitido | 505.165 bytes | 644.268 bytes |
| CSS emitido | 14.566 bytes | 14.773 bytes |
| HTML emitido | 731 bytes | 21.626 bytes |
| Arquivos em dist | 20 | 24 |

Leitura do resultado:

- A variante [x](x) venceu em velocidade de build e volume total de arquivos emitidos.
- A variante [y](y) gerou mais HTML estático já pronto na saída final, o que é coerente com a proposta do Astro de entregar mais conteúdo pré-renderizado.
- O custo dessa abordagem apareceu no build local: mais tempo de compilação e mais bytes totais no diretório final.
- Para benchmark de empacotamento, x ficou mais eficiente. Para entrega de conteúdo estático e renderização inicial orientada a HTML, y mantém uma vantagem arquitetural.

Esse comparativo mede build de produção e artefatos estáticos do repositório atual. Ele não substitui um teste de runtime no navegador, como Lighthouse, Web Vitals ou perfil de hidratação.

### Comparativo real de carregamento com Lighthouse

Também foi executado um teste de carregamento real em navegador com Lighthouse, usando os previews de produção locais de [x](x) e [y](y), ambos medidos com o preset desktop.

Dados de reprodução desta medição:

- Data: 2026-04-24
- Navegador: Google Chrome for Testing 148.0.7778.56
- CLI: npx --yes lighthouse 13.1.0

Comandos usados na medição:

```bash
cd x && npm run preview -- --host 0.0.0.0 --port 4173
cd y && npm run preview -- --host 0.0.0.0 --port 4321

export CHROME_PATH=/tmp/lh-browser/chrome/linux-148.0.7778.56/chrome-linux64/chrome
npx --yes lighthouse http://127.0.0.1:4173 --preset=desktop --only-categories=performance --output=json --output-path=/tmp/lh-x.json --quiet --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader'
npx --yes lighthouse http://127.0.0.1:4321 --preset=desktop --only-categories=performance --output=json --output-path=/tmp/lh-y.json --quiet --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage --enable-unsafe-swiftshader'
```

Critério usado nesta medição:

- build de produção já gerado para cada app
- servidor local de preview para cada variante
- Lighthouse rodando sobre o HTML realmente servido
- mesma máquina, mesmo navegador e mesmas flags headless

Resultado da medição local com Lighthouse:

| Métrica | x (Vue + Vite) | y (Astro + React) |
| --- | ---: | ---: |
| Score de performance | 92 | 91 |
| FCP | 1.103 ms | 728 ms |
| LCP | 1.143 ms | 840 ms |
| Speed Index | 1.103 ms | 1.094 ms |
| TTI | 1.143 ms | 952 ms |
| TBT | 0 ms | 49 ms |
| CLS | 0,109 | 0,174 |
| Transferência total | 1.685 KiB | 1.730 KiB |
| Requisições de rede | 78 | 81 |

Leitura do Lighthouse:

- A variante [y](y) apareceu mais rápida nas métricas de primeira entrega visual, como FCP, LCP e TTI.
- A variante [x](x) terminou com score geral ligeiramente melhor e menor custo de bloqueio, estabilidade visual e volume transferido.
- Na prática, y entrega conteúdo visível mais cedo, enquanto x mantém execução mais leve depois que a página começa a hidratar.
- Como as duas páginas carregam recursos externos, como Sketchfab, mapas e integrações de cliente, os números podem variar entre execuções e devem ser lidos como benchmark local comparativo, não como valor absoluto.

## Refatorações e adições recentes

- Remoção de dependências de Tailwind que não estavam sendo usadas
- Extração da lógica de mapa para [y/src/service/mapService.js](y/src/service/mapService.js)
- Reestruturação do mural para suportar página e mapa como superfícies distintas
- Ajuste de camadas visuais para wiki, mapa, modal e popovers
- Inclusão de biblioteca de emojis no modal de nova mensagem
- Melhoria do controle de autoria e exclusão de mensagens com Supabase
- Limpeza de utilitários mortos no mural e no serviço de mapa

## Contribuidores

<a href="https://github.com/onidebolso"><img src="https://github.com/onidebolso.png" width="45" height="45"></a>
