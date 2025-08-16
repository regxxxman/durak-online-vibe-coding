/**
 * Типы и константы для игры "Дурак"
 */

// Масти карт
export const SUITS = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades',
}

// Ранги карт
export const RANKS = {
  SIX: '6',
  SEVEN: '7',
  EIGHT: '8',
  NINE: '9',
  TEN: '10',
  JACK: 'J',
  QUEEN: 'Q',
  KING: 'K',
  ACE: 'A',
}

// Статусы игры
export const GAME_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished',
}

// Событие WebSocket
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  START_GAME: 'start_game',
  ATTACK: 'attack',
  DEFEND: 'defend',
  TAKE_CARDS: 'take_cards',
  PASS: 'pass',
  CONFIRM_ATTACK: 'confirm_attack',
  CONFIRM_DEFEND: 'confirm_defend',
  GAME_STATE: 'game_state',
  CHAT_MESSAGE: 'chat_message',
  ERROR: 'error',
}

// Числовые значения рангов для сравнения
export const RANK_VALUES = {
  [RANKS.SIX]: 6,
  [RANKS.SEVEN]: 7,
  [RANKS.EIGHT]: 8,
  [RANKS.NINE]: 9,
  [RANKS.TEN]: 10,
  [RANKS.JACK]: 11,
  [RANKS.QUEEN]: 12,
  [RANKS.KING]: 13,
  [RANKS.ACE]: 14,
}
