<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import 'ol/ol.css';
import { supabase } from '../lib/supabaseClient.js';
import {
  applyRealtimeMessageChange,
  canDeleteMessage,
  formatMessageIp,
  getMessageAuthorLabel,
  getMessageMetrics,
  initialMessageForm,
  messageBoardCopy,
  removeMessage,
  shouldIgnoreOutsideClick,
  updateMessageField,
} from '../lib/messageBoard.js';
import {
  attachMapResizeHandling,
  createOpenStreetMap,
  flyToMessage,
  formatCoordinate,
  getMapEventCoordinates,
  hasMapCoordinates,
  loadMapModules,
  syncMessageMarkers,
} from '../service/mapService.js';

const pagePlacementIgnoreSelectors = [
  '.message-details-card',
  '.message-board-header',
  '.message-map-panel',
  '.modal-card',
  '.floating-island',
  '.side-dialog',
  '.side-button',
  '.info-button',
  'button',
  'input',
  'textarea',
  'a',
  'iframe',
];

const emojiLibrary = [
  '😀', '😂', '😍', '🥹', '😎', '🤔', '😭', '😡',
  '👍', '👎', '👏', '🙌', '💀', '🔥', '✨', '⭐',
  '❤️', '💛', '💙', '💜', '🖤', '💥', '💬', '📍',
  '🌍', '🗺️', '🎮', '🎵', '🌧️', '⚡', '☠️', '🚀',
];

function getFriendlySupabaseErrorMessage(nextError) {
  const message = nextError?.message || '';

  if (
    message.includes("Could not find the 'latitude' column of 'messages' in the schema cache") ||
    message.includes("Could not find the 'longitude' column of 'messages' in the schema cache")
  ) {
    return 'O Supabase ainda nao reconhece as colunas latitude/longitude. Rode o SQL atualizado em y/supabase-create-table.sql e depois recarregue o schema cache.';
  }

  return message;
}

const mapContainerRef = ref(null);
const mapRef = ref(null);
const mapModulesRef = ref(null);
const markerOverlaysRef = ref([]);
const cleanupMapResizeRef = ref(null);
const mobileMediaQueryRef = ref(null);
const placementModeRef = ref(null);
const selectedMessageRef = ref(null);
const realtimeChannelRef = ref(null);
const isMobileViewport = ref(false);

const messages = ref([]);
const placementMode = ref(null);
const modalOpen = ref(false);
const selectedCoordinates = ref(null);
const selectedPagePosition = ref(null);
const draftSurface = ref(null);
const form = ref({ ...initialMessageForm });
const saving = ref(false);
const error = ref(null);
const ipError = ref(null);
const currentIp = ref('');
const selectedMessage = ref(null);
const selectedMessageAnchor = ref(null);
const emojiPickerOpen = ref(false);
const modalMode = ref('create');

const canDeleteSelectedMessage = computed(() =>
  canDeleteMessage(selectedMessage.value, currentIp.value)
);

const pageMessages = computed(() => messages.value.filter(shouldRenderOnPage));

watch(placementMode, (value) => {
  placementModeRef.value = value;
});

watch(selectedMessage, (value) => {
  selectedMessageRef.value = value;
});

watch(isMobileViewport, (value) => {
  if (value) {
    disablePagePlacement();
  }
});

watch(messages, (currentMessages) => {
  if (!mapRef.value || !mapModulesRef.value) {
    return;
  }

  syncMessageMarkers({
    map: mapRef.value,
    modules: mapModulesRef.value,
    markerOverlaysRef,
    messages: currentMessages.filter(shouldRenderOnMap),
    getMessageMetrics,
    getMessageAuthorLabel,
    onMarkerClick: openMessage,
  });

  if (!selectedMessage.value) {
    return;
  }

  const nextSelectedMessage = currentMessages.find((item) => item.id === selectedMessage.value.id);

  if (!nextSelectedMessage) {
    clearSelectedMessageState();
    return;
  }

  if (nextSelectedMessage !== selectedMessage.value) {
    selectedMessage.value = nextSelectedMessage;
  }
});

watch(placementMode, (mode, _, onCleanup) => {
  if (mode !== 'page') {
    return;
  }

  function handlePagePlacement(event) {
    if (shouldIgnorePagePlacement(event.target)) {
      return;
    }

    openCreateModal('page', {
      pagePosition: getPagePlacementPosition(event),
    });
  }

  document.addEventListener('pointerdown', handlePagePlacement);
  onCleanup(() => {
    document.removeEventListener('pointerdown', handlePagePlacement);
  });
});

watch([modalMode, selectedMessage], ([mode, message], _, onCleanup) => {
  if (mode !== 'view' || !message) {
    return;
  }

  function handleOutsidePointerDown(event) {
    if (shouldIgnoreOutsideClick(event.target)) {
      return;
    }

    closeModal();
  }

  document.addEventListener('pointerdown', handleOutsidePointerDown);
  onCleanup(() => {
    document.removeEventListener('pointerdown', handleOutsidePointerDown);
  });
});

onMounted(async () => {
  const mediaQuery = window.matchMedia('(max-width: 768px)');
  const syncViewportMode = (event) => {
    isMobileViewport.value = event.matches;
  };

  mobileMediaQueryRef.value = mediaQuery;
  isMobileViewport.value = mediaQuery.matches;
  mediaQuery.addEventListener('change', syncViewportMode);

  await Promise.all([fetchMessages(), fetchCurrentIp()]);
  await initializeMap();

  realtimeChannelRef.value = supabase
    .channel('messages-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload) => {
        messages.value = applyRealtimeMessageChange(messages.value, payload);
      }
    )
    .subscribe();
});

onBeforeUnmount(() => {
  if (mobileMediaQueryRef.value) {
    mobileMediaQueryRef.value.removeEventListener('change', syncViewportMode);
    mobileMediaQueryRef.value = null;
  }

  if (realtimeChannelRef.value) {
    supabase.removeChannel(realtimeChannelRef.value);
  }

  if (mapRef.value) {
    cleanupMapResizeRef.value?.();
    cleanupMapResizeRef.value = null;
    mapRef.value.setTarget(undefined);
    mapRef.value = null;
    mapModulesRef.value = null;
    markerOverlaysRef.value = [];
  }
});

async function initializeMap() {
  if (!mapContainerRef.value || mapRef.value) {
    return;
  }

  const modules = await loadMapModules();

  if (!mapContainerRef.value || mapRef.value) {
    return;
  }

  const { map } = createOpenStreetMap(mapContainerRef.value, modules);

  mapModulesRef.value = modules;
  mapRef.value = map;
  cleanupMapResizeRef.value = attachMapResizeHandling(map, mapContainerRef.value);

  map.on('moveend', () => {
    const currentMessage = selectedMessageRef.value;

    if (!currentMessage || !shouldRenderOnMap(currentMessage)) {
      return;
    }

    selectedMessageAnchor.value = getMapMessageAnchor(currentMessage, map, modules);
  });

  map.on('click', (event) => {
    if (placementModeRef.value !== 'map') {
      return;
    }

    openCreateModal('map', {
      coordinates: getMapEventCoordinates(event, modules),
    });
  });
}

async function fetchMessages() {
  const { data, error: fetchError } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    error.value = getFriendlySupabaseErrorMessage(fetchError);
    return;
  }

  messages.value = data || [];
}

async function fetchCurrentIp() {
  const { data, error: rpcError } = await supabase.rpc('request_ip');

  if (rpcError || !data) {
    ipError.value = 'Nao foi possivel identificar seu IP. Rode o SQL atualizado no Supabase antes de criar ou excluir mensagens.';
    return;
  }

  currentIp.value = data;
  ipError.value = null;
}

function syncViewportMode(event) {
  isMobileViewport.value = event.matches;
}

function disablePagePlacement() {
  if (placementMode.value === 'page') {
    placementMode.value = null;
  }

  if (draftSurface.value === 'page') {
    draftSurface.value = null;
    selectedPagePosition.value = null;

    if (modalMode.value === 'create') {
      closeModal();
    }
  }
}

function clearSelectedMessageState() {
  selectedMessage.value = null;
  selectedMessageAnchor.value = null;
}

function resetComposerState() {
  modalOpen.value = false;
  placementMode.value = null;
  selectedCoordinates.value = null;
  selectedPagePosition.value = null;
  draftSurface.value = null;
  form.value = { ...initialMessageForm };
  emojiPickerOpen.value = false;
  modalMode.value = 'create';
}

function openCreateModal(surface, { coordinates = null, pagePosition = null } = {}) {
  clearSelectedMessageState();
  selectedCoordinates.value = coordinates;
  selectedPagePosition.value = pagePosition;
  draftSurface.value = surface;
  form.value = { ...initialMessageForm };
  modalMode.value = 'create';
  error.value = null;
  placementMode.value = null;
  emojiPickerOpen.value = false;
  modalOpen.value = true;
}

function getMessageAnchor(message) {
  if (shouldRenderOnPage(message)) {
    return {
      x: Number(message.x ?? 0),
      y: Number(message.y ?? 0),
    };
  }

  if (mapRef.value && mapModulesRef.value && hasMapCoordinates(message)) {
    return getMapMessageAnchor(message, mapRef.value, mapModulesRef.value);
  }

  return null;
}

function openMessage(message) {
  selectedMessage.value = message;
  selectedMessageAnchor.value = getMessageAnchor(message);
  modalMode.value = 'view';
  error.value = null;
  modalOpen.value = false;
  emojiPickerOpen.value = false;

  if (mapRef.value && mapModulesRef.value && hasMapCoordinates(message)) {
    flyToMessage(mapRef.value, mapModulesRef.value, message);
  }
}

function togglePlacementMode(nextMode) {
  if (nextMode === 'page' && isMobileViewport.value) {
    disablePagePlacement();
    return;
  }

  placementMode.value = placementMode.value === nextMode ? null : nextMode;

  if (placementMode.value) {
    modalOpen.value = false;
    clearSelectedMessageState();
    selectedCoordinates.value = null;
    selectedPagePosition.value = null;
    draftSurface.value = nextMode;
    modalMode.value = 'create';
    error.value = null;
  }
}

async function saveMessage() {
  if (!form.value.text.trim()) {
    error.value = 'Escreva uma mensagem antes de salvar.';
    return;
  }

  if (!currentIp.value) {
    error.value = ipError.value || 'Nao foi possivel identificar seu IP.';
    return;
  }

  if (!draftSurface.value) {
    error.value = 'Escolha se a mensagem sera criada na pagina ou no mapa.';
    return;
  }

  if (draftSurface.value === 'page' && !selectedPagePosition.value) {
    error.value = 'Escolha um ponto da pagina antes de salvar a mensagem.';
    return;
  }

  if (draftSurface.value === 'map' && !selectedCoordinates.value) {
    error.value = 'Clique em um ponto do mapa antes de salvar a mensagem.';
    return;
  }

  saving.value = true;
  error.value = null;

  const { error: insertError } = await supabase.from('messages').insert({
    text: form.value.text.trim(),
    emoji: form.value.emoji.trim() || '💬',
    author_name: form.value.username.trim() || null,
    author_ip: currentIp.value,
    latitude: draftSurface.value === 'map' ? selectedCoordinates.value.lat : null,
    longitude: draftSurface.value === 'map' ? selectedCoordinates.value.lng : null,
    x: draftSurface.value === 'page' ? selectedPagePosition.value.x : -1,
    y: draftSurface.value === 'page' ? selectedPagePosition.value.y : -1,
    likes: 0,
    dislikes: 0,
  });

  if (insertError) {
    error.value = getFriendlySupabaseErrorMessage(insertError);
  } else {
    closeModal();
  }

  saving.value = false;
}

async function vote(id, field) {
  const message = messages.value.find((item) => item.id === id);
  if (!message) return;

  const nextValue = message[field] + 1;

  messages.value = updateMessageField(messages.value, id, field, nextValue);

  if (selectedMessage.value?.id === id) {
    selectedMessage.value = { ...selectedMessage.value, [field]: nextValue };
  }

  const { error: updateError } = await supabase
    .from('messages')
    .update({ [field]: nextValue })
    .eq('id', id);

  if (updateError) {
    messages.value = updateMessageField(messages.value, id, field, message[field]);

    if (selectedMessage.value?.id === id) {
      selectedMessage.value = { ...selectedMessage.value, [field]: message[field] };
    }

    error.value = getFriendlySupabaseErrorMessage(updateError);
  }
}

async function deleteMessage(id) {
  const message = messages.value.find((item) => item.id === id);
  if (!message) return;

  if (!canDeleteMessage(message, currentIp.value)) {
    error.value = 'Apenas o criador da mensagem pode excluí-la.';
    return;
  }

  const confirmed = window.confirm('Tem certeza que deseja remover esta mensagem?');
  if (!confirmed) return;

  const { error: deleteError } = await supabase.from('messages').delete().eq('id', id);

  if (deleteError) {
    error.value = getFriendlySupabaseErrorMessage(deleteError);
    return;
  }

  messages.value = removeMessage(messages.value, id);

  if (selectedMessage.value?.id === id) {
    closeModal();
  }
}

function closeModal() {
  resetComposerState();
  error.value = null;
  clearSelectedMessageState();
}

function updateFormField(field, value) {
  form.value = { ...form.value, [field]: value };
}

function selectEmoji(emoji) {
  form.value = { ...form.value, emoji };
  emojiPickerOpen.value = false;
}

function shouldIgnorePagePlacement(target) {
  return pagePlacementIgnoreSelectors.some((selector) => target.closest(selector));
}

function getPagePlacementPosition(event) {
  return {
    x: Math.max(0, Math.round(event.clientX)),
    y: Math.max(0, Math.round(event.clientY)),
  };
}

function getMessagePositionStyle(message) {
  const x = Math.max(0, Number(message.x ?? 0));
  const y = Math.max(0, Number(message.y ?? 0));

  return {
    left: `${x}px`,
    top: `${y}px`,
  };
}

function getMessageButtonStyle(message) {
  const { messageSize } = getMessageMetrics(message);

  return {
    width: `${messageSize}px`,
    height: `${messageSize}px`,
    minWidth: `${messageSize}px`,
    minHeight: `${messageSize}px`,
  };
}

function getMessageEmojiStyle(message) {
  const { emojiSize } = getMessageMetrics(message);

  return {
    fontSize: `${emojiSize}rem`,
  };
}

function shouldRenderOnPage(message) {
  return Number(message?.x) >= 0 && Number(message?.y) >= 0;
}

function shouldRenderOnMap(message) {
  return hasMapCoordinates(message) && (Number(message?.x) < 0 || Number(message?.y) < 0);
}

function getMapMessageAnchor(message, map, modules) {
  if (!hasMapCoordinates(message)) {
    return null;
  }

  const targetElement = map.getTargetElement();

  if (!targetElement) {
    return null;
  }

  const pixel = map.getPixelFromCoordinate(
    modules.fromLonLat([Number(message.longitude), Number(message.latitude)])
  );

  if (!pixel) {
    return null;
  }

  const rect = targetElement.getBoundingClientRect();

  return {
    x: Math.round(rect.left + pixel[0]),
    y: Math.round(rect.top + pixel[1]),
  };
}

function getSelectedMessagePopoverStyle() {
  if (!selectedMessageAnchor.value) {
    return undefined;
  }

  return {
    left: `clamp(1rem, ${selectedMessageAnchor.value.x}px, calc(100vw - 1rem))`,
    top: `clamp(5.5rem, ${selectedMessageAnchor.value.y - 16}px, calc(100vh - 1rem))`,
  };
}
</script>

<template>
  <section :class="['message-board', { 'placement-active': placementMode, 'modal-layer-active': modalOpen }]">
    <div class="message-page-layer">
      <div
        v-if="modalMode === 'view' && selectedMessage && selectedMessageAnchor"
        :class="['message-details-card', 'message-details-popover', { 'message-details-map-popover': shouldRenderOnMap(selectedMessage) }]"
        :style="getSelectedMessagePopoverStyle()"
      >
        <div class="message-preview">
          <span class="message-emoji preview">{{ selectedMessage.emoji }}</span>
          <div>
            <p>{{ selectedMessage.text }}</p>
            <p class="modal-hint">Autor: {{ getMessageAuthorLabel(selectedMessage) }}</p>
            <p v-if="hasMapCoordinates(selectedMessage)" class="modal-hint">
              Local: {{ formatCoordinate(Number(selectedMessage.latitude), 'N', 'S') }} /
              {{ formatCoordinate(Number(selectedMessage.longitude), 'E', 'W') }}
            </p>
          </div>
        </div>
        <div class="modal-actions popover-actions">
          <button type="button" class="button-primary" @click="vote(selectedMessage.id, 'likes')">
            👍 {{ selectedMessage.likes }}
          </button>
          <button type="button" class="button-secondary" @click="vote(selectedMessage.id, 'dislikes')">
            👎 {{ selectedMessage.dislikes }}
          </button>
          <button
            v-if="canDeleteSelectedMessage"
            type="button"
            class="button-danger"
            @click="deleteMessage(selectedMessage.id)"
          >
            Excluir
          </button>
        </div>
        <p v-if="!canDeleteSelectedMessage" class="modal-hint">
          Apenas o criador da mensagem pode excluí-la.
        </p>
      </div>

      <div
        v-for="message in pageMessages"
        :key="message.id"
        class="message-page-marker"
        :style="getMessagePositionStyle(message)"
      >
        <button
          type="button"
          class="message"
          :style="getMessageButtonStyle(message)"
          @click="openMessage(message)"
        >
          <span class="message-emoji" :style="getMessageEmojiStyle(message)">
            {{ message.emoji }}
          </span>
        </button>
      </div>
    </div>

    <aside class="message-map-panel">
      <div class="message-map-shell">
        <div id="message-canvas" ref="mapContainerRef" class="message-canvas" />
      </div>
    </aside>

    <div class="message-board-header">
      <div class="message-board-copy">
        <h2>Mensagens no mapa</h2>
        <p>{{ placementMode ? messageBoardCopy.placement : messageBoardCopy.idle }}</p>
      </div>
      <div class="message-board-info">
        <span>👍 / 👎 deixe uma avaliação</span>
        <button
          v-if="!isMobileViewport"
          type="button"
          :class="placementMode === 'page' ? 'button-secondary placement-toggle' : 'button-primary placement-toggle'"
          @click="togglePlacementMode('page')"
        >
          {{ placementMode === 'page' ? 'Cancelar pagina' : 'Mensagem na pagina' }}
        </button>
        <button
          type="button"
          :class="placementMode === 'map' ? 'button-secondary placement-toggle' : 'button-primary placement-toggle'"
          @click="togglePlacementMode('map')"
        >
          {{ placementMode === 'map' ? 'Cancelar mapa' : 'Mensagem no mapa' }}
        </button>
      </div>
    </div>

    <div v-if="error || ipError" class="message-board-errors">
      <p v-if="error" class="message-board-error">{{ error }}</p>
      <p v-if="ipError" class="message-board-error">{{ ipError }}</p>
    </div>

    <div v-if="modalMode === 'create'" id="message-modal" :class="modalOpen ? 'modal-open' : 'hidden'">
      <div class="modal-card">
        <div class="modal-header">
          <strong>Nova caixa de diálogo</strong>
          <button type="button" class="modal-close" @click="closeModal">
            ×
          </button>
        </div>

        <input
          type="text"
          placeholder="Digite sua mensagem..."
          :value="form.text"
          @input="updateFormField('text', $event.target.value)"
        >

        <div class="emoji-picker-field">
          <input
            type="text"
            placeholder="Emoji (ex: 👍, 💀, ❤️)"
            maxlength="8"
            :value="form.emoji"
            @input="updateFormField('emoji', $event.target.value)"
          >
          <button
            type="button"
            class="button-secondary emoji-picker-toggle"
            :aria-expanded="emojiPickerOpen"
            @click="emojiPickerOpen = !emojiPickerOpen"
          >
            Biblioteca de emojis
          </button>
        </div>

        <div v-if="emojiPickerOpen" class="emoji-picker-panel" role="listbox" aria-label="Biblioteca de emojis">
          <button
            v-for="emoji in emojiLibrary"
            :key="emoji"
            type="button"
            class="emoji-option"
            :aria-label="`Selecionar emoji ${emoji}`"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>

        <input
          type="text"
          placeholder="Username opcional"
          maxlength="24"
          :value="form.username"
          @input="updateFormField('username', $event.target.value)"
        >

        <div class="modal-actions">
          <button type="button" class="button-primary" :disabled="saving" @click="saveMessage">
            {{ saving ? 'Salvando...' : 'Salvar mensagem' }}
          </button>
          <button type="button" class="button-secondary" @click="closeModal">
            Cancelar
          </button>
        </div>

        <p class="modal-hint">
          Tipo: {{ draftSurface === 'page' ? 'mensagem na pagina' : draftSurface === 'map' ? 'mensagem no mapa' : 'nenhum modo selecionado' }}
        </p>
        <p class="modal-hint">
          Local do mapa: {{ selectedCoordinates ? `${selectedCoordinates.lat.toFixed(4)}°, ${selectedCoordinates.lng.toFixed(4)}°` : 'nao se aplica' }}
        </p>
        <p class="modal-hint">
          Posicao na pagina: {{ selectedPagePosition ? `${selectedPagePosition.x}px, ${selectedPagePosition.y}px` : 'nao se aplica' }}
        </p>
        <p class="modal-hint">
          Username opcional. Sem ele, sua identificacao aparecera como {{ currentIp ? formatMessageIp(currentIp) : 'IP mascarado' }}.
        </p>

        <p v-if="error" class="modal-error">{{ error }}</p>
      </div>
    </div>
  </section>
</template>