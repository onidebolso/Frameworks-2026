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

- [y/src/pages/index.astro](y/src/pages/index.astro): página principal
- [y/src/components/ExpandableIsland.jsx](y/src/components/ExpandableIsland.jsx): ilhas laterais e integração com o modelo 3D
- [y/src/components/MessageCanvas.jsx](y/src/components/MessageCanvas.jsx): mural de mensagens, modal, votos, mapa e popovers
- [y/src/lib/messageBoard.js](y/src/lib/messageBoard.js): utilitários do mural
- [y/src/service/mapService.js](y/src/service/mapService.js): integração do mapa com OpenLayers
- [y/src/lib/supabaseClient.js](y/src/lib/supabaseClient.js): cliente Supabase
- [y/src/content/wiki](y/src/content/wiki): conteúdos da wiki em Markdown
- [y/supabase-create-table.sql](y/supabase-create-table.sql): schema SQL, funções e policies do Supabase

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
