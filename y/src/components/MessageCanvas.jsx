import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import {
  applyRealtimeMessageChange,
  getBoardCoordinates,
  getMessageMetrics,
  getPopoverCoordinates,
  initialMessageForm,
  messageBoardCopy,
  removeMessage,
  shouldIgnoreOutsideClick,
  shouldIgnorePlacementClick,
  updateMessageField,
} from '../lib/messageBoard.js';

export default function MessageCanvas() {
  const boardRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [form, setForm] = useState(initialMessageForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  useEffect(() => {
    fetchMessages();

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
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (shouldIgnoreOutsideClick(event.target)) {
        return;
      }

      if (modalOpen || selectedMessage) {
        closeModal();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [modalOpen, selectedMessage]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    setMessages(data || []);
  }

  function openMessage(message, event) {
    const boardRect = boardRef.current?.getBoundingClientRect();
    const buttonRect = event.currentTarget.getBoundingClientRect();

    setPopoverPos(getPopoverCoordinates(boardRect, buttonRect));
    setSelectedMessage(message);
    setModalMode('view');
    setError(null);
    setModalOpen(true);
  }

  function handleBoardClick(event) {
    if (!placementMode) {
      return;
    }

    if (shouldIgnorePlacementClick(event.target)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const nextClickPos = getBoardCoordinates(rect, event);

    setClickPos(nextClickPos);
    setForm(initialMessageForm);
    setSelectedMessage(null);
    setModalMode('create');
    setError(null);
    setPlacementMode(false);
    setModalOpen(true);
  }

  function togglePlacementMode() {
    setPlacementMode((current) => {
      const nextValue = !current;

      if (nextValue) {
        setModalOpen(false);
        setSelectedMessage(null);
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

    setSaving(true);
    setError(null);

    const { error } = await supabase.from('messages').insert({
      text: form.text.trim(),
      emoji: form.emoji.trim() || '💬',
      x: clickPos.x,
      y: clickPos.y,
      likes: 0,
      dislikes: 0,
    });

    if (error) {
      setError(error.message);
    } else {
      setForm(initialMessageForm);
      setModalOpen(false);
      setPlacementMode(false);
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
      setError(error.message);
    }
  }

  async function deleteMessage(id) {
    const confirmed = window.confirm('Tem certeza que deseja remover esta mensagem?');
    if (!confirmed) return;

    const { error } = await supabase.from('messages').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessages((current) => removeMessage(current, id));

    if (selectedMessage?.id === id) {
      closeModal();
    }
  }

  function closeModal() {
    setModalOpen(false);
    setPlacementMode(false);
    setError(null);
    setSelectedMessage(null);
    setModalMode('create');
  }

  function updateFormField(field) {
    return (event) => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  }

  return (
    <section
      className={`message-board ${placementMode ? 'placement-active' : ''}`}
      ref={boardRef}
      onClick={handleBoardClick}
    >
      <div className="message-board-header">
        <div>
          <h2>Mensagens no mapa</h2>
          <p>
            {placementMode
              ? messageBoardCopy.placement
              : messageBoardCopy.idle}
          </p>
        </div>
        <div className="message-board-info">
          <span>👍 / 👎 deixe uma avaliação</span>
          <button
            type="button"
            className={placementMode ? 'button-secondary placement-toggle' : 'button-primary placement-toggle'}
            onClick={togglePlacementMode}
          >
            {placementMode ? 'Cancelar posicionamento' : 'Nova mensagem'}
          </button>
        </div>
      </div>

      {error ? <p className="message-board-error">{error}</p> : null}

      <div id="message-canvas" className="message-canvas">
        {messages.map((message) => {
          const { messageSize, emojiSize } = getMessageMetrics(message);

          return (
            <div
              key={message.id}
              className="message-marker"
              style={{ left: `${message.x}px`, top: `${message.y}px` }}
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
                onClick={(event) => {
                  event.stopPropagation();
                  openMessage(message, event);
                }}
              >
                <span className="message-emoji" style={{ fontSize: `${emojiSize}rem` }}>
                  {message.emoji}
                </span>
              </button>
            </div>
          );
        })}

      </div>

      {modalMode === 'view' && selectedMessage && (
        <div
          className="message-popover"
          style={{ left: `${popoverPos.x}px`, top: `${popoverPos.y}px` }}
        >
          <div className="message-preview">
            <span className="message-emoji preview">{selectedMessage.emoji}</span>
            <p>{selectedMessage.text}</p>
          </div>
          <div className="modal-actions popover-actions">
            <button type="button" className="button-primary" onClick={() => vote(selectedMessage.id, 'likes')}>
              👍 {selectedMessage.likes}
            </button>
            <button type="button" className="button-secondary" onClick={() => vote(selectedMessage.id, 'dislikes')}>
              👎 {selectedMessage.dislikes}
            </button>
            <button type="button" className="button-danger" onClick={() => deleteMessage(selectedMessage.id)}>
              Excluir
            </button>
          </div>
        </div>
      )}

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

            <input
              type="text"
              placeholder="Emoji (ex: 👍, 💀, ❤️)"
              maxLength="2"
              value={form.emoji}
              onChange={updateFormField('emoji')}
            />

            <div className="modal-actions">
              <button type="button" className="button-primary" onClick={saveMessage} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar mensagem'}
              </button>
              <button type="button" className="button-secondary" onClick={closeModal}>
                Cancelar
              </button>
            </div>

            <p className="modal-hint">Posição: {clickPos.x}px, {clickPos.y}px</p>

            {error ? <p className="modal-error">{error}</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}
