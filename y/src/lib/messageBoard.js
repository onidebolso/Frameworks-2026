export const initialMessageForm = Object.freeze({ text: '', emoji: '', username: '' });

export const messageBoardCopy = Object.freeze({
  idle: 'Escolha se quer criar uma mensagem na pagina ou no mapa.',
  placement: 'Clique no local correspondente ao modo escolhido para posicionar a nova mensagem.',
});

const baseMessageSize = 48;
const likeGrowthInPixels = 5;
const dislikeShrinkInPixels = 2;
const maxGrowthLikes = 20;
const minimumMessageSize = 40;
const minimumEmojiSize = 1.15;
const baseEmojiSize = 1.4;
const likeEmojiGrowth = 0.18;
const dislikeEmojiShrink = 0.06;

const outsideClickIgnoreSelectors = [
  '.message',
  '.message-details-popover',
  '.modal-card',
  '.placement-toggle',
];

export function applyRealtimeMessageChange(currentMessages, payload) {
  if (payload.eventType === 'INSERT') {
    return [...currentMessages, payload.new];
  }

  if (payload.eventType === 'UPDATE') {
    return currentMessages.map((item) => (item.id === payload.new.id ? payload.new : item));
  }

  if (payload.eventType === 'DELETE') {
    return currentMessages.filter((item) => item.id !== payload.old.id);
  }

  return currentMessages;
}

export function shouldIgnoreOutsideClick(target) {
  return outsideClickIgnoreSelectors.some((selector) => target.closest(selector));
}

export function updateMessageField(messages, id, field, value) {
  return messages.map((item) => (item.id === id ? { ...item, [field]: value } : item));
}

export function removeMessage(messages, id) {
  return messages.filter((item) => item.id !== id);
}

export function canDeleteMessage(message, currentIp) {
  return Boolean(message?.author_ip && currentIp && message.author_ip === currentIp);
}

export function formatMessageIp(ip) {
  if (!ip) {
    return 'IP indisponivel';
  }

  if (ip === 'legacy') {
    return 'IP legado';
  }

  if (ip.includes('.')) {
    const parts = ip.split('.');

    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
    }
  }

  if (ip.includes(':')) {
    const parts = ip.split(':').filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****`;
    }
  }

  return ip;
}

export function getMessageAuthorLabel(message) {
  const username = message?.author_name?.trim();

  if (username) {
    return username;
  }

  return formatMessageIp(message?.author_ip);
}

export function getMessageMetrics(message) {
  const likes = message.likes ?? 0;
  const dislikes = message.dislikes ?? 0;
  const effectiveLikes = Math.min(likes, maxGrowthLikes);

  return {
    messageSize: Math.max(
      minimumMessageSize,
      baseMessageSize + effectiveLikes * likeGrowthInPixels - dislikes * dislikeShrinkInPixels
    ),
    emojiSize: Math.max(
      minimumEmojiSize,
      baseEmojiSize + effectiveLikes * likeEmojiGrowth - dislikes * dislikeEmojiShrink
    ),
  };
}