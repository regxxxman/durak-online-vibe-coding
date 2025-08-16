import { defineStore } from 'pinia'
import type { ChatMessage, GameRoom, GameState, Player, Suit, Table } from '../models/types'
import { GameStatus } from '../models/types'
import { WebSocketEvent, WebSocketService } from '../services/websocket.service'
import { roomsApi } from '../services/api.service'

interface GameStoreState {
  connected: boolean
  currentRoomId: string | null
  availableRooms: GameRoom[]
  gameState: GameState | null
  playerId: string | null
  playerName: string | null
  chatMessages: ChatMessage[]
  loading: boolean
  error: string | null
  webSocket: WebSocketService | null
  roomNotFound: boolean
}

export const useGameStore = defineStore('game', {
  state: (): GameStoreState => ({
    connected: false,
    currentRoomId: null,
    availableRooms: [],
    gameState: null,
    playerId: null,
    playerName: null,
    chatMessages: [],
    loading: false,
    error: null,
    webSocket: null,
    roomNotFound: false,
  }),

  getters: {
    // Текущий игрок
    currentPlayer: (state): Player | undefined => {
      if (!state.gameState || !state.playerId) return undefined
      return state.gameState.players.find((p) => p.id === state.playerId)
    },

    // Является ли текущий игрок атакующим
    isAttacker: (state): boolean => {
      return !!state.gameState?.players.find((p) => p.id === state.playerId && p.isAttacker)
    },

    // Является ли текущий игрок защищающимся
    isDefender: (state): boolean => {
      return !!state.gameState?.players.find((p) => p.id === state.playerId && p.isDefender)
    },

    // Козырная масть
    trumpSuit: (state): Suit | undefined => {
      return state.gameState?.trumpSuit
    },

    // Игровой стол
    table: (state): Table | undefined => {
      return state.gameState?.table
    },

    // Количество карт в колоде
    deckSize: (state): number => {
      return state.gameState?.deck.length || 0
    },

    // Статус игры
    gameStatus: (state): GameStatus | undefined => {
      return state.gameState?.status
    },

    // Активная комната
    currentRoom: (state): GameRoom | undefined => {
      if (!state.currentRoomId) return undefined
      return state.availableRooms.find((room) => room.id === state.currentRoomId)
    },

    // Может ли игрок сделать ход
    canMakeMove: (state): boolean => {
      if (!state.gameState || !state.playerId) return false
      return state.gameState.currentPlayerId === state.playerId
    },
  },

  actions: {
// Инициализация WebSocket соединения
async initWebSocket(url: string) {
  // Если соединение уже существует, сначала отключаемся
  if (this.webSocket) {
    this.webSocket.disconnect()
    this.webSocket = null
  }
  
  const wsService = new WebSocketService(url)

  try {
    await wsService.connect()
    this.connected = true
    this.error = null

    // Настройка обработчиков событий
    wsService.on(WebSocketEvent.GAME_STATE, this.handleGameState)
    wsService.on(WebSocketEvent.JOIN_ROOM, this.handleJoinRoom)
    wsService.on(WebSocketEvent.CHAT_MESSAGE, this.handleChatMessage)
    wsService.on(WebSocketEvent.ERROR, this.handleError)
    wsService.on(WebSocketEvent.DISCONNECT, this.handleDisconnect)

    // Сохраняем сервис в локальной переменной для использования
    this.webSocket = wsService
    return true
  } catch (error) {
    this.error = 'Failed to connect to game server'
    this.connected = false
    console.error(error)
    return false
  }
},    // Загрузка списка доступных комнат
    async loadRooms() {
      this.loading = true
      this.error = null

      try {
        this.availableRooms = await roomsApi.getAll()
      } catch (error) {
        this.error = 'Failed to load game rooms'
        console.error(error)
      } finally {
        this.loading = false
      }
    },

    // Создание новой комнаты
    async createRoom(name: string, maxPlayers: number) {
      this.loading = true
      this.error = null

      try {
        const newRoom = await roomsApi.create(name, maxPlayers)
        this.availableRooms.push(newRoom)
        return newRoom
      } catch (error) {
        this.error = 'Failed to create game room'
        console.error(error)
        return null
      } finally {
        this.loading = false
      }
    },

    // Вход в комнату
    async joinRoom(roomId: string, playerName: string) {
      if (!this.webSocket || !this.connected) {
        this.error = 'Not connected to game server'
        return false
      }
      
      // Сбрасываем флаг ошибки комнаты перед попыткой входа
      this.roomNotFound = false
      
      // Проверяем существование комнаты перед входом
      await this.loadRooms()
      const roomExists = this.availableRooms.some(room => room.id === roomId)
      
      if (!roomExists) {
        console.error(`Комната с ID ${roomId} не найдена`)
        this.error = `Комната с ID ${roomId} не найдена`
        this.roomNotFound = true
        return false
      }

      this.playerName = playerName
      this.webSocket.joinRoom(roomId, playerName)
      this.currentRoomId = roomId

      return true
    },

    // Выход из комнаты
    leaveRoom() {
      if (!this.webSocket || !this.currentRoomId) return

      this.webSocket.leaveRoom(this.currentRoomId)
      this.currentRoomId = null
      this.gameState = null
      this.chatMessages = []
      this.roomNotFound = false
    },

    // Запуск игры
    startGame() {
      if (!this.webSocket || !this.currentRoomId) return
      this.webSocket.startGame(this.currentRoomId)
    },

    // Атака картой
    attackWithCard(cardId: string) {
      if (!this.webSocket || !this.currentRoomId || !this.isAttacker) return
      this.webSocket.attackWithCard(this.currentRoomId, cardId)
    },

    // Защита картой
    defendWithCard(attackCardId: string, defendCardId: string) {
      if (!this.webSocket || !this.currentRoomId || !this.isDefender) return
      this.webSocket.defendWithCard(this.currentRoomId, attackCardId, defendCardId)
    },

    // Подтвердить атаку (после выбора всех карт для атаки)
    confirmAttack() {
      if (!this.webSocket || !this.currentRoomId || !this.isAttacker) return
      this.webSocket.confirmAttack(this.currentRoomId)
    },

    // Подтвердить защиту (после защиты всех карт)
    confirmDefend() {
      if (!this.webSocket || !this.currentRoomId || !this.isDefender) return
      this.webSocket.confirmDefend(this.currentRoomId)
    },

    // Взять карты (когда не можешь отбиться)
    takeCards() {
      if (!this.webSocket || !this.currentRoomId || !this.isDefender) return
      this.webSocket.takeCards(this.currentRoomId)
    },

    // Бито (когда атакующий больше не хочет атаковать)
    pass() {
      if (!this.webSocket || !this.currentRoomId || !this.isAttacker) return
      this.webSocket.pass(this.currentRoomId)
    }, // Отправка сообщения в чат
    sendChatMessage(message: string) {
      if (!this.webSocket || !this.currentRoomId) return
      this.webSocket.sendChatMessage(this.currentRoomId, message)
    },

// Обработчик обновления состояния игры
handleGameState(data: { game?: GameState; room?: GameRoom }) {
  if (data.game) {
    this.gameState = data.game

    // Установка ID игрока, если он еще не установлен
    if (!this.playerId && this.playerName) {
      const player = data.game.players.find((p: Player) => p.name === this.playerName)
      if (player) {
        this.playerId = player.id
      }
    }
  }

  // Если пришли данные о комнате, обновляем её в списке доступных комнат
  if (data.room) {
    const roomIndex = this.availableRooms.findIndex((r: GameRoom) => r.id === data.room?.id)
    if (roomIndex >= 0) {
      this.availableRooms[roomIndex] = data.room
    } else {
      this.availableRooms.push(data.room)
    }
  }
},

// Обработчик входа в комнату
handleJoinRoom(data: { room?: GameRoom; player?: Player }) {
  if (data.room) {
    const roomIndex = this.availableRooms.findIndex((r: GameRoom) => r.id === data.room?.id)
    if (roomIndex >= 0) {
      this.availableRooms[roomIndex] = data.room
    } else {
      this.availableRooms.push(data.room)
    }

    // Устанавливаем текущую комнату и ID игрока
    if (data.player && data.player.id) {
      this.playerId = data.player.id
    }
  }
},    // Обработчик сообщений чата
    handleChatMessage(message: ChatMessage) {
      this.chatMessages.push(message)

      // Ограничиваем количество сообщений, чтобы избежать переполнения
      if (this.chatMessages.length > 100) {
        this.chatMessages = this.chatMessages.slice(-100)
      }
    },

    // Обработчик ошибок
    handleError(error: string) {
      this.error = error
      console.error('WebSocket error:', error)
      
      // Проверка на ошибку входа в несуществующую комнату
      if (error.includes('Комната') && error.includes('не найдена')) {
        // Устанавливаем флаг ошибки комнаты для обработки в компоненте
        this.roomNotFound = true
        
        // Сбрасываем данные комнаты, так как она не существует
        this.currentRoomId = null
        this.gameState = null
      }
    },
    
    // Обработчик отключения WebSocket
    handleDisconnect() {
      console.warn('WebSocket disconnected')
      this.connected = false
      this.error = 'Соединение с сервером потеряно'
    },
  },
})
