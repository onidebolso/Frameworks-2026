import { useEffect, useRef, useState } from 'react';
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

function getFriendlySupabaseErrorMessage(error) {
  const message = error?.message || '';

  if (
    message.includes("Could not find the 'latitude' column of 'messages' in the schema cache") ||
    message.includes("Could not find the 'longitude' column of 'messages' in the schema cache")
  ) {
    return 'O Supabase ainda nao reconhece as colunas latitude/longitude. Rode o SQL atualizado em y/supabase-create-table.sql e depois recarregue o schema cache.';
  }

  return message;
}

export default function MessageCanvas() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const mapModulesRef = useRef(null);
  const markerOverlaysRef = useRef([]);
  const cleanupMapResizeRef = useRef(null);
  const placementModeRef = useRef(null);
  const selectedMessageRef = useRef(null);
  const mobileMediaQueryRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [placementMode, setPlacementMode] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [selectedPagePosition, setSelectedPagePosition] = useState(null);
  const [draftSurface, setDraftSurface] = useState(null);
  const [form, setForm] = useState(initialMessageForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [ipError, setIpError] = useState(null);
  const [currentIp, setCurrentIp] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedMessageAnchor, setSelectedMessageAnchor] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    placementModeRef.current = placementMode;
  }, [placementMode]);

  useEffect(() => {
    selectedMessageRef.current = selectedMessage;
  }, [selectedMessage]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const handleChange = (event) => {
      setIsMobileViewport(event.matches);
    };

    mobileMediaQueryRef.current = mediaQuery;
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      mobileMediaQueryRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      disablePagePlacement();
    }
  }, [isMobileViewport]);

  useEffect(() => {
    let isMounted = true;

    fetchMessages();
    fetchCurrentIp();
    initializeMap();

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((current) => applyRealtimeMessageChange(current, payload));
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);

      if (mapRef.current) {
        cleanupMapResizeRef.current?.();
        cleanupMapResizeRef.current = null;
        mapRef.current.setTarget(undefined);
        mapRef.current = null;
        mapModulesRef.current = null;
        markerOverlaysRef.current = [];
      }
    };

    async function initializeMap() {
      if (!mapContainerRef.current || mapRef.current || !isMounted) {
        return;
      }

      const modules = await loadMapModules();

      if (!mapContainerRef.current || mapRef.current || !isMounted) {
        return;
      }

      const { map } = createOpenStreetMap(mapContainerRef.current, modules);

      mapModulesRef.current = modules;
      mapRef.current = map;
      cleanupMapResizeRef.current = attachMapResizeHandling(map, mapContainerRef.current);

      map.on('moveend', () => {
        const currentMessage = selectedMessageRef.current;

        if (!currentMessage || !shouldRenderOnMap(currentMessage)) {
          return;
        }

        const anchor = getMapMessageAnchor(currentMessage, map, modules);
        setSelectedMessageAnchor(anchor);
      });

      map.on('click', (event) => {
        if (placementModeRef.current !== 'map') {
          return;
        }

        openCreateModal('map', {
          coordinates: getMapEventCoordinates(event, modules),
        });
      });
    }
  }, []);

  useEffect(() => {
    if (placementMode !== 'page') {
      return undefined;
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

    return () => {
      document.removeEventListener('pointerdown', handlePagePlacement);
    };
  }, [placementMode]);

  useEffect(() => {
    if (!mapRef.current || !mapModulesRef.current) {
      return;
    }

    syncMessageMarkers({
      map: mapRef.current,
      modules: mapModulesRef.current,
      markerOverlaysRef,
      messages: messages.filter(shouldRenderOnMap),
      getMessageMetrics,
      getMessageAuthorLabel,
      onMarkerClick: openMessage,
    });
  }, [messages]);

  useEffect(() => {
    if (!selectedMessage) {
      return;
    }

    const nextSelectedMessage = messages.find((item) => item.id === selectedMessage.id);

    if (!nextSelectedMessage) {
      setSelectedMessage(null);
      return;
    }

    if (nextSelectedMessage !== selectedMessage) {
      setSelectedMessage(nextSelectedMessage);
    }
  }, [messages, selectedMessage]);

  useEffect(() => {
    if (modalMode !== 'view' || !selectedMessage) {
      return undefined;
    }

    function handleOutsidePointerDown(event) {
      if (shouldIgnoreOutsideClick(event.target)) {
        return;
      }

      closeModal();
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
    };
  }, [modalMode, selectedMessage]);

  const canDeleteSelectedMessage = canDeleteMessage(selectedMessage, currentIp);
  const pageMessages = messages.filter(shouldRenderOnPage);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError(getFriendlySupabaseErrorMessage(error));
      return;
    }

    setMessages(data || []);
  }

  async function fetchCurrentIp() {
    const { data, error } = await supabase.rpc('request_ip');

    if (error || !data) {
      setIpError('Nao foi possivel identificar seu IP. Rode o SQL atualizado no Supabase antes de criar ou excluir mensagens.');
      return;
    }

    setCurrentIp(data);
    setIpError(null);
  }

  function clearSelectedMessageState() {
    setSelectedMessage(null);
    setSelectedMessageAnchor(null);
  }

  function disablePagePlacement() {
    setPlacementMode((current) => (current === 'page' ? null : current));
    setSelectedPagePosition(null);
    setDraftSurface((current) => (current === 'page' ? null : current));

    if (modalMode === 'create' && draftSurface === 'page') {
      closeModal();
    }
  }

  function openCreateModal(surface, { coordinates = null, pagePosition = null } = {}) {
    clearSelectedMessageState();
    setSelectedCoordinates(coordinates);
    setSelectedPagePosition(pagePosition);
    setDraftSurface(surface);
    setForm(initialMessageForm);
    setModalMode('create');
    setError(null);
    setPlacementMode(null);
    setEmojiPickerOpen(false);
    setModalOpen(true);
  }

  function getMessageAnchor(message) {
    if (shouldRenderOnPage(message)) {
      return {
        x: Number(message.x ?? 0),
        y: Number(message.y ?? 0),
      };
    }

    if (mapRef.current && mapModulesRef.current && hasMapCoordinates(message)) {
      return getMapMessageAnchor(message, mapRef.current, mapModulesRef.current);
    }

    return null;
  }

  function openMessage(message) {
    setSelectedMessage(message);
    setSelectedMessageAnchor(getMessageAnchor(message));
    setModalMode('view');
    setError(null);
    setModalOpen(false);
    setEmojiPickerOpen(false);

    if (mapRef.current && mapModulesRef.current && hasMapCoordinates(message)) {
      flyToMessage(mapRef.current, mapModulesRef.current, message);
    }
  }

  function togglePlacementMode(nextMode) {
    if (nextMode === 'page' && isMobileViewport) {
      disablePagePlacement();
      return;
    }

    setPlacementMode((current) => {
      const nextValue = current === nextMode ? null : nextMode;

      if (nextValue) {
        setModalOpen(false);
        clearSelectedMessageState();
        setSelectedCoordinates(null);
        setSelectedPagePosition(null);
        setDraftSurface(nextMode);
        setModalMode('create');
        setError(null);
      }

      return nextValue;
    });
  }

  async function saveMessage() {
    if (!form.text.trim()) {
      setError('Escreva uma mensagem antes de salvar.');
      return;
    }

    if (!currentIp) {
      setError(ipError || 'Nao foi possivel identificar seu IP.');
      return;
    }

    if (!draftSurface) {
      setError('Escolha se a mensagem sera criada na pagina ou no mapa.');
      return;
    }

    if (draftSurface === 'page' && !selectedPagePosition) {
      setError('Escolha um ponto da pagina antes de salvar a mensagem.');
      return;
    }

    if (draftSurface === 'map' && !selectedCoordinates) {
      setError('Clique em um ponto do mapa antes de salvar a mensagem.');
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('messages').insert({
      text: form.text.trim(),
      emoji: form.emoji.trim() || '💬',
      author_name: form.username.trim() || null,
      author_ip: currentIp,
      latitude: draftSurface === 'map' ? selectedCoordinates.lat : null,
      longitude: draftSurface === 'map' ? selectedCoordinates.lng : null,
      x: draftSurface === 'page' ? selectedPagePosition.x : -1,
      y: draftSurface === 'page' ? selectedPagePosition.y : -1,
      likes: 0,
      dislikes: 0,
    });

    if (error) {
      setError(getFriendlySupabaseErrorMessage(error));
    } else {
      closeModal();
    }

    setSaving(false);
  }

  async function vote(id, field) {
    const message = messages.find((item) => item.id === id);
    if (!message) return;

    const nextValue = message[field] + 1;

    setMessages((current) => updateMessageField(current, id, field, nextValue));
    setSelectedMessage((current) =>
      current?.id === id ? { ...current, [field]: nextValue } : current
    );

    const { error } = await supabase
      .from('messages')
      .update({ [field]: nextValue })
      .eq('id', id);

    if (error) {
      setMessages((current) => updateMessageField(current, id, field, message[field]));
      setSelectedMessage((current) =>
        current?.id === id ? { ...current, [field]: message[field] } : current
      );
      setError(getFriendlySupabaseErrorMessage(error));
    }
  }

  async function deleteMessage(id) {
    const message = messages.find((item) => item.id === id);
    if (!message) return;

    if (!canDeleteMessage(message, currentIp)) {
      setError('Apenas o criador da mensagem pode excluí-la.');
      return;
    }

    const confirmed = window.confirm('Tem certeza que deseja remover esta mensagem?');
    if (!confirmed) return;

    const { error } = await supabase.from('messages').delete().eq('id', id);

    if (error) {
      setError(getFriendlySupabaseErrorMessage(error));
      return;
    }

    setMessages((current) => removeMessage(current, id));

    if (selectedMessage?.id === id) {
      closeModal();
    }
  }

  function closeModal() {
    setModalOpen(false);
    setPlacementMode(null);
    setSelectedCoordinates(null);
    setSelectedPagePosition(null);
    setDraftSurface(null);
    setForm(initialMessageForm);
    setError(null);
    clearSelectedMessageState();
    setEmojiPickerOpen(false);
    setModalMode('create');
  }

  function updateFormField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  function selectEmoji(emoji) {
    setForm((current) => ({ ...current, emoji }));
    setEmojiPickerOpen(false);
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
    if (!selectedMessageAnchor) {
      return undefined;
    }

    return {
      left: `clamp(1rem, ${selectedMessageAnchor.x}px, calc(100vw - 1rem))`,
      top: `clamp(5.5rem, ${selectedMessageAnchor.y - 16}px, calc(100vh - 1rem))`,
    };
  }

  return (
    <section className={`message-board ${placementMode ? 'placement-active' : ''} ${modalOpen ? 'modal-layer-active' : ''}`}>
      <div className="message-page-layer">
        {modalMode === 'view' && selectedMessage && selectedMessageAnchor ? (
          <div
            className={`message-details-card message-details-popover ${shouldRenderOnMap(selectedMessage) ? 'message-details-map-popover' : ''}`}
            style={getSelectedMessagePopoverStyle()}
          >
            <div className="message-preview">
              <span className="message-emoji preview">{selectedMessage.emoji}</span>
              <div>
                <p>{selectedMessage.text}</p>
                <p className="modal-hint">Autor: {getMessageAuthorLabel(selectedMessage)}</p>
                {hasMapCoordinates(selectedMessage) ? (
                  <p className="modal-hint">
                    Local: {formatCoordinate(Number(selectedMessage.latitude), 'N', 'S')} / {formatCoordinate(Number(selectedMessage.longitude), 'E', 'W')}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="modal-actions popover-actions">
              <button type="button" className="button-primary" onClick={() => vote(selectedMessage.id, 'likes')}>
                👍 {selectedMessage.likes}
              </button>
              <button type="button" className="button-secondary" onClick={() => vote(selectedMessage.id, 'dislikes')}>
                👎 {selectedMessage.dislikes}
              </button>
              {canDeleteSelectedMessage ? (
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => deleteMessage(selectedMessage.id)}
                >
                  Excluir
                </button>
              ) : null}
            </div>
            {!canDeleteSelectedMessage ? (
              <p className="modal-hint">Apenas o criador da mensagem pode excluí-la.</p>
            ) : null}
          </div>
        ) : null}

        {pageMessages.map((message) => {
          const { messageSize, emojiSize } = getMessageMetrics(message);

          return (
            <div
              key={message.id}
              className="message-page-marker"
              style={getMessagePositionStyle(message)}
            >
              <button
                type="button"
                className="message"
                style={{
                  width: `${messageSize}px`,
                  height: `${messageSize}px`,
                  minWidth: `${messageSize}px`,
                  minHeight: `${messageSize}px`,
                }}
                onClick={() => openMessage(message)}
              >
                <span className="message-emoji" style={{ fontSize: `${emojiSize}rem` }}>
                  {message.emoji}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <aside className="message-map-panel">
        <div className="message-map-shell">
          <div ref={mapContainerRef} id="message-canvas" className="message-canvas" />
        </div>
      </aside>

      <div className="message-board-header">
        <div className="message-board-copy">
          <h2>Mensagens no mapa</h2>
          <p>
            {placementMode
              ? messageBoardCopy.placement
              : messageBoardCopy.idle}
          </p>
        </div>
        <div className="message-board-info">
          <span>👍 / 👎 deixe uma avaliação</span>
          {!isMobileViewport ? (
            <button
              type="button"
              className={placementMode === 'page' ? 'button-secondary placement-toggle' : 'button-primary placement-toggle'}
              onClick={() => togglePlacementMode('page')}
            >
              {placementMode === 'page' ? 'Cancelar pagina' : 'Mensagem na pagina'}
            </button>
          ) : null}
          <button
            type="button"
            className={placementMode === 'map' ? 'button-secondary placement-toggle' : 'button-primary placement-toggle'}
            onClick={() => togglePlacementMode('map')}
          >
            {placementMode === 'map' ? 'Cancelar mapa' : 'Mensagem no mapa'}
          </button>
        </div>
      </div>

      {error || ipError ? (
        <div className="message-board-errors">
          {error ? <p className="message-board-error">{error}</p> : null}
          {ipError ? <p className="message-board-error">{ipError}</p> : null}
        </div>
      ) : null}

      {modalMode === 'create' && (
        <div id="message-modal" className={modalOpen ? 'modal-open' : 'hidden'}>
          <div className="modal-card">
            <div className="modal-header">
              <strong>Nova caixa de diálogo</strong>
              <button type="button" className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Digite sua mensagem..."
              value={form.text}
              onChange={updateFormField('text')}
            />

            <div className="emoji-picker-field">
              <input
                type="text"
                placeholder="Emoji (ex: 👍, 💀, ❤️)"
                maxLength="8"
                value={form.emoji}
                onChange={updateFormField('emoji')}
              />
              <button
                type="button"
                className="button-secondary emoji-picker-toggle"
                onClick={() => setEmojiPickerOpen((current) => !current)}
                aria-expanded={emojiPickerOpen}
              >
                Biblioteca de emojis
              </button>
            </div>

            {emojiPickerOpen ? (
              <div className="emoji-picker-panel" role="listbox" aria-label="Biblioteca de emojis">
                {emojiLibrary.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="emoji-option"
                    onClick={() => selectEmoji(emoji)}
                    aria-label={`Selecionar emoji ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}

            <input
              type="text"
              placeholder="Username opcional"
              maxLength="24"
              value={form.username}
              onChange={updateFormField('username')}
            />

            <div className="modal-actions">
              <button type="button" className="button-primary" onClick={saveMessage} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar mensagem'}
              </button>
              <button type="button" className="button-secondary" onClick={closeModal}>
                Cancelar
              </button>
            </div>

            <p className="modal-hint">
              Tipo: {draftSurface === 'page' ? 'mensagem na pagina' : draftSurface === 'map' ? 'mensagem no mapa' : 'nenhum modo selecionado'}
            </p>
            <p className="modal-hint">
              Local do mapa: {selectedCoordinates ? `${selectedCoordinates.lat.toFixed(4)}°, ${selectedCoordinates.lng.toFixed(4)}°` : 'nao se aplica'}
            </p>
            <p className="modal-hint">
              Posicao na pagina: {selectedPagePosition ? `${selectedPagePosition.x}px, ${selectedPagePosition.y}px` : 'nao se aplica'}
            </p>
            <p className="modal-hint">
              Username opcional. Sem ele, sua identificacao aparecera como {currentIp ? formatMessageIp(currentIp) : 'IP mascarado'}.
            </p>

            {error ? <p className="modal-error">{error}</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}
