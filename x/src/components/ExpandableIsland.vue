<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getIslandModel, sectionIcons } from '../lib/expandableIsland.js';

const props = defineProps({
  sections: {
    type: Array,
    required: true,
  },
});

const islandRef = ref(null);
const active = ref(null);

const currentModel = computed(() => getIslandModel(active.value));
const leftButtons = computed(() => props.sections.slice(0, 4));
const rightButtons = computed(() => props.sections.slice(4));

function handleToggleSection(id) {
  active.value = active.value === id ? null : id;
}

function handlePointerDown(event) {
  if (!islandRef.value?.contains(event.target) || !event.target.closest('.floating-button-group')) {
    active.value = null;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handlePointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handlePointerDown);
});
</script>

<template>
  <div ref="islandRef" class="content-with-buttons interactive-island">
    <div class="side-buttons left-buttons">
      <div v-for="section in leftButtons" :key="section.id" class="floating-button-group">
        <button
          class="side-button"
          type="button"
          :aria-label="section.data.title"
          :aria-expanded="active === section.id"
          :aria-controls="`${section.id}-panel`"
          @click="handleToggleSection(section.id)"
        >
          <span class="icon">{{ sectionIcons[section.id] ?? '•' }}</span>
        </button>
        <div :id="`${section.id}-panel`" class="side-dialog" role="region">
          <h4>{{ section.data.title }}</h4>
          <p>{{ section.data.summary }}</p>
          <div v-for="item in section.data.details" :key="`${section.id}-${item.heading}`">
            <h4>{{ item.heading }}</h4>
            <p>{{ item.text }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="sketchfab-embed-wrapper">
      <iframe
        :title="currentModel.title"
        frameborder="0"
        allowfullscreen
        mozallowfullscreen="true"
        webkitallowfullscreen="true"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        xr-spatial-tracking
        execution-while-out-of-viewport
        execution-while-not-rendered
        web-share
        :src="currentModel.src"
      />
      <p class="sketchfab-credit">
        <a :href="currentModel.modelUrl" target="_blank" rel="nofollow noopener noreferrer">
          {{ currentModel.label }}
        </a>
        by
        <a :href="currentModel.authorUrl" target="_blank" rel="nofollow noopener noreferrer">
          {{ currentModel.author }}
        </a>
        on
        <a
          href="https://sketchfab.com?utm_medium=embed&utm_campaign=share-popup&utm_content=05836e1c71bb4ff3a423f59825c1764d"
          target="_blank"
          rel="nofollow noopener noreferrer"
        >
          Sketchfab
        </a>
      </p>
    </div>

    <div class="side-buttons right-buttons">
      <div v-for="section in rightButtons" :key="section.id" class="floating-button-group">
        <button
          class="side-button"
          type="button"
          :aria-label="section.data.title"
          :aria-expanded="active === section.id"
          :aria-controls="`${section.id}-panel`"
          @click="handleToggleSection(section.id)"
        >
          <span class="icon">{{ sectionIcons[section.id] ?? '•' }}</span>
        </button>
        <div :id="`${section.id}-panel`" class="side-dialog right-dialog" role="region">
          <h4>{{ section.data.title }}</h4>
          <p>{{ section.data.summary }}</p>
          <div v-for="item in section.data.details" :key="`${section.id}-${item.heading}`">
            <h4>{{ item.heading }}</h4>
            <p>{{ item.text }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>