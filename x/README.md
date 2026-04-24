# x

Variante do projeto construída com Vue 3 + Vite dentro do mesmo repositório, criada para comparar arquitetura, bundle e comportamento com a versão Astro em [../y](../y).

## O que já foi portado

- layout principal da página
- fundo e identidade visual base
- wiki lateral com ilhas informativas
- modelo 3D via Sketchfab
- mural de mensagens
- mapa com OpenStreetMap via OpenLayers
- integração com Supabase
- votos, username, IP do autor e exclusão restrita ao autor
- popovers e modal de criação de mensagens
- biblioteca de emojis

## Stack

- Vue 3
- Vite 8
- Supabase JS
- OpenLayers

## Variáveis de ambiente

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
```

O app também aceita VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY por compatibilidade, mas o padrão deste repositório está em PUBLIC_*.

## Comandos

Execute os comandos abaixo dentro de [x](.)

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Observação

Esta versão Vue reutiliza a mesma estrutura conceitual da versão Astro, mas a wiki foi convertida para dado JavaScript em [src/data/wikiSections.js](src/data/wikiSections.js), em vez de Astro Content Collections.
