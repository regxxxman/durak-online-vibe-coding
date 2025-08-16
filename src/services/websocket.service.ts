import type { Card, ChatMessage, GameRoom, GameState, Player } from '../models/types'

// События WebSocket
export enum WebSocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  START_GAME = 'start_game',
  ATTACK = 'attack',
  DEFEND = 'defend',
  TAKE_CARDS = 'take_cards',
  PASS = 'pass',
  CONFIRM_ATTACK = 'confirm_attack',
  CONFIRM_DEFEND = 'confirm_defend',
  GAME_STATE = 'game_state',
  CHAT_MESSAGE = 'chat_message',
  ERROR = 'error',
}

export class WebSocketService {
  private socket: WebSocket | null = null
  private url: string
  private eventHandlers: Map<string, Array<(data: any) => void>> = new Map()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(url: string) {
    this.url = url
  }

  // Подключение к WebSocket серверу
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url)

      this.socket.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
        resolve()
      }

      this.socket.onclose = (event) => {
        console.log('WebSocket closed:', event)
        this.handleDisconnect()
        
        // Вызываем обработчики события отключения
        this.eventHandlers.get(WebSocketEvent.DISCONNECT)?.forEach((handler) => handler(event))
      }

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(error)
      }

      this.socket.onmessage = (event) => {
        this.handleMessage(event)
      }
    })
  }

  // Обработка сообщений
  private handleMessage(event: MessageEvent) {
    try {
      const message = JSON.parse(event.data)
      const { type, data } = message

      if (this.eventHandlers.has(type)) {
        this.eventHandlers.get(type)?.forEach((handler) => handler(data))
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  // Обработка отключения
  private handleDisconnect() {
    // Немедленно вызываем обработчики события отключения
    this.eventHandlers.get(WebSocketEvent.DISCONNECT)?.forEach((handler) => handler('disconnected'))
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)

      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectAttempts++
        console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`)
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error)
          
          // Если не удалось переподключиться, генерируем событие ошибки
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.eventHandlers
              .get(WebSocketEvent.ERROR)
              ?.forEach((handler) => handler('Maximum reconnection attempts reached'))
          }
        })
      }, delay)
    } else {
      this.eventHandlers
        .get(WebSocketEvent.ERROR)
        ?.forEach((handler) => handler('Maximum reconnection attempts reached'))
    }
  }

  // Отправка сообщения
  send(type: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }))
    } else {
      console.error('WebSocket not connected')
    }
  }

  // Регистрация обработчика события
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)?.push(handler)
  }

  // Удаление обработчика события
  off(event: string, handler: (data: any) => void): void {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event) || []
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  // Отключение от сервера
  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Игровые методы
  joinRoom(roomId: string, playerName: string): void {
    this.send(WebSocketEvent.JOIN_ROOM, { roomId, playerName })
  }

  leaveRoom(roomId: string): void {
    this.send(WebSocketEvent.LEAVE_ROOM, { roomId })
  }

  startGame(roomId: string): void {
    this.send(WebSocketEvent.START_GAME, { roomId })
  }

  attackWithCard(roomId: string, cardId: string): void {
    this.send(WebSocketEvent.ATTACK, { roomId, cardId })
  }

  defendWithCard(roomId: string, attackCardId: string, defendCardId: string): void {
    this.send(WebSocketEvent.DEFEND, { roomId, attackCardId, defendCardId })
  }

  confirmAttack(roomId: string): void {
    this.send(WebSocketEvent.CONFIRM_ATTACK, { roomId })
  }

  confirmDefend(roomId: string): void {
    this.send(WebSocketEvent.CONFIRM_DEFEND, { roomId })
  }

  takeCards(roomId: string): void {
    this.send(WebSocketEvent.TAKE_CARDS, { roomId })
  }

  pass(roomId: string): void {
    this.send(WebSocketEvent.PASS, { roomId })
  }

  sendChatMessage(roomId: string, message: string): void {
    this.send(WebSocketEvent.CHAT_MESSAGE, { roomId, message })
  }
}
