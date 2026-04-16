import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

const initialForm = { text: '', emoji: '' };
const baseMessageSize = 48;
const likeGrowthInPixels = 5;
const dislikeShrinkInPixels = 2;
const maxGrowthLikes = 20;
const minimumMessageSize = 40;

export default function MessageCanvas() {
  const boardRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 });
  const [popoverPos, setPopoverPos] = useState({ x: 0, y: 0 });
  const [form, setForm] = useState(initialForm);
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
          setMessages((current) => {
            if (payload.eventType === 'INSERT') {
              return [...current, payload.new];
            }
            if (payload.eventType === 'UPDATE') {
              return current.map((item) => (item.id === payload.new.id ? payload.new : item));
            }
            if (payload.eventType === 'DELETE') {
              return current.filter((item) => item.id !== payload.old.id);
            }
            return current;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event) {
      if (event.target.closest('.message')) {
        return;
      }

      if (event.target.closest('.message-popover')) {
        return;
      }

      if (event.target.closest('.modal-card')) {
        return;
      }

      if (event.target.closest('.placement-toggle')) {
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
    const x = boardRect ? Math.round(buttonRect.left - boardRect.left + buttonRect.width / 2) : 0;
    const y = boardRect ? Math.round(buttonRect.top - boardRect.top) : 0;

    setPopoverPos({ x, y });
    setSelectedMessage(message);
    setForm({ text: message.text, emoji: message.emoji });
    setModalMode('view');
    setError(null);
    setModalOpen(true);
  }

  function handleBoardClick(event) {
    if (!placementMode) {
      return;
    }

    if (
      event.target.closest('.message') ||
      event.target.closest('.modal-card') ||
      event.target.closest('.modal-actions') ||
      event.target.closest('button') ||
      event.target.closest('input')
    ) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.round(event.clientX - rect.left);
    const y = Math.round(event.clientY - rect.top);

    setClickPos({ x, y });
    setForm(initialForm);
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
      setForm(initialForm);
      setModalOpen(false);
      setPlacementMode(false);
    }

    setSaving(false);
  }

  async function vote(id, field) {
    const message = messages.find((item) => item.id === id);
    if (!message) return;

    const nextValue = message[field] + 1;

    setMessages((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: nextValue } : item))
    );
    setSelectedMessage((current) =>
      current?.id === id ? { ...current, [field]: nextValue } : current
    );

    const { error } = await supabase
      .from('messages')
      .update({ [field]: nextValue })
      .eq('id', id);

    if (error) {
      setMessages((current) =>
        current.map((item) => (item.id === id ? { ...item, [field]: message[field] } : item))
      );
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

    setMessages((current) => current.filter((item) => item.id !== id));

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

  function getMessageMetrics(message) {
    const likes = message.likes ?? 0;
    const dislikes = message.dislikes ?? 0;
    const effectiveLikes = Math.min(likes, maxGrowthLikes);
    const messageSize = Math.max(
      minimumMessageSize,
      baseMessageSize + effectiveLikes * likeGrowthInPixels - dislikes * dislikeShrinkInPixels
    );
    const emojiSize = Math.max(1.15, 1.4 + effectiveLikes * 0.18 - dislikes * 0.06);

    return {
      messageSize,
      emojiSize,
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
          <h2>Mensagens do mapa</h2>
          <p>
            {placementMode
              ? 'Clique em um ponto da página para posicionar a sua mensagem.'
              : 'Explore o modelo e as ilhas normalmente. Ative o modo de posicionamento para deixar uma mensagem.'}
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
        {messages.map((message) => (
          (() => {
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
          })()
        ))}

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
            <strong>{modalMode === 'create' ? 'Nova caixa de diálogo' : 'Mensagem'}</strong>
            <button type="button" className="modal-close" onClick={closeModal}>
              ×
            </button>
          </div>

          {modalMode === 'create' ? (
            <>
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                value={form.text}
                onChange={(event) => setForm({ ...form, text: event.target.value })}
              />

              <input
                type="text"
                placeholder="Emoji (ex: 👍, 💀, ❤️)"
                maxLength="2"
                value={form.emoji}
                onChange={(event) => setForm({ ...form, emoji: event.target.value })}
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
            </>
          ) : (
            <>
              <div className="message-preview">
                <span className="message-emoji preview">{selectedMessage?.emoji}</span>
                <p>{selectedMessage?.text}</p>
              </div>

              <div className="modal-actions">
                <button type="button" className="button-primary" onClick={() => vote(selectedMessage.id, 'likes')}>
                  👍 {selectedMessage?.likes}
                </button>
                <button type="button" className="button-secondary" onClick={() => vote(selectedMessage.id, 'dislikes')}>
                  👎 {selectedMessage?.dislikes}
                </button>
              </div>
            </>
          )}

          {error ? <p className="modal-error">{error}</p> : null}
        </div>
      </div>
      )}
    </section>
  );
}
