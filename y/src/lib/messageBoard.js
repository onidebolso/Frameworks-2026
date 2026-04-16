export const initialMessageForm = Object.freeze({ text: '', emoji: '' });

export const messageBoardCopy = Object.freeze({
  idle: 'Explore o modelo e as ilhas normalmente. Clique em nova mensagem para deixar uma mensagem.',
  placement: 'Clique em um ponto da página para posicionar a sua mensagem.',
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
  '.message-popover',
  '.modal-card',
  '.placement-toggle',
];

const placementClickIgnoreSelectors = [
  '.message',
  '.modal-card',
  '.modal-actions',
  'button',
  'input',
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

export function shouldIgnorePlacementClick(target) {
  return placementClickIgnoreSelectors.some((selector) => target.closest(selector));
}

export function getBoardCoordinates(containerRect, event) {
  return {
    x: Math.round(event.clientX - containerRect.left),
    y: Math.round(event.clientY - containerRect.top),
  };
}

export function getPopoverCoordinates(boardRect, buttonRect) {
  return {
    x: boardRect ? Math.round(buttonRect.left - boardRect.left + buttonRect.width / 2) : 0,
    y: boardRect ? Math.round(buttonRect.top - boardRect.top) : 0,
  };
}

export function updateMessageField(messages, id, field, value) {
  return messages.map((item) => (item.id === id ? { ...item, [field]: value } : item));
}

export function removeMessage(messages, id) {
  return messages.filter((item) => item.id !== id);
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