// Масти карт
export enum Suit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades',
}

// Значения карт
export enum Rank {
  SIX = '6',
  SEVEN = '7',
  EIGHT = '8',
  NINE = '9',
  TEN = '10',
  JACK = 'J',
  QUEEN = 'Q',
  KING = 'K',
  ACE = 'A',
}

// Состояния игры
export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

// Тип игрока
export interface Player {
  id: string
  name: string
  cards: Card[]
  isAttacker: boolean
  isDefender: boolean
  connected: boolean
}

// Тип карты
export interface Card {
  id: string
  suit: Suit
  rank: Rank
  value: number // Числовое значение для определения старшинства
}

// Стол с картами
export interface Table {
  attackCards: Card[]
  defendCards: Card[]
  // Каждая карта защиты соответствует карте атаки с тем же индексом
}

// Сообщение чата
export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
}

// Игровая комната
export interface GameRoom {
  id: string
  name: string
  players: Player[]
  maxPlayers: number
  status: GameStatus
  createdAt: number
}

// Состояние игры
export interface GameState {
  roomId: string
  players: Player[]
  currentPlayerId: string
  trumpCard?: Card
  trumpSuit?: Suit
  deck: Card[]
  table: Table
  status: GameStatus
  winner?: string
  loser?: string
}
