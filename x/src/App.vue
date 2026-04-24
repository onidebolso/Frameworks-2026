<script setup>
import ExpandableIsland from './components/ExpandableIsland.vue';
import MessageCanvas from './components/MessageCanvas.vue';
import { wikiSections } from './data/wikiSections.js';
</script>

<template>
  <main>
    <MessageCanvas />
    <h1>Death Stranding</h1>
    <ExpandableIsland :sections="wikiSections" />
  </main>

  <div class="floating-island">
    <button class="info-button" title="Informações">
      <span class="icon">ℹ</span>
    </button>
    <div class="dialog-box">
      <p>Bem-vindo Death Stranding.</p>
    </div>
  </div>
</template>
