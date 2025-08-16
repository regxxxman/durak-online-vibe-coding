/**
 * Сервис для управления WebSocket соединениями
 */
import { WebSocketServer } from 'ws'
import { WS_EVENTS } from '../models/constants.js'
import roomService from '../services/roomService.js'

class WebSocketService {
    /**
   * Создание WebSocket сервера
   * @param {Object} server - HTTP сервер
   */
  constructor(server) {
    // Настройки WebSocket сервера
    this.wss = new WebSocketServer({ 
      server,
      // Обработка заголовка Origin для CORS в WebSocket
      verifyClient: (info) => {
        const origin = info.origin || info.req.headers.origin;
        
        // В режиме разработки принимаем любой источник
        if (process.env.NODE_ENV !== 'production') {
          return true;
        }
        
        // Для продакшена проверяем разрешенные источники
        const allowedOrigins = [
          process.env.CLIENT_URL, 
          'https://durak-online-vibe-coding-frontend.onrender.com',
          'https://durak-online-vibe-coding.onrender.com'
        ].filter(Boolean); // Удаляем пустые значения
        
        // Логируем информацию о соединении
        console.log(`WebSocket connection attempt from origin: ${origin}`);
        console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
        
        // Если origin не указан или он в списке разрешенных, пропускаем клиента
        if (!origin || allowedOrigins.some(allowed => origin.includes(allowed))) {
          return true;
        }
        
        console.warn(`Отклонено WebSocket соединение с недопустимого источника: ${origin}`);
        return false;
      }
    });
    
    this.clients = new Map();
    this.initializeServer();
  }

  /**
   * Инициализация WebSocket сервера
   */
  initializeServer() {
    this.wss.on('connection', (ws) => {
      console.log('Новое WebSocket соединение')

      // Генерируем уникальный ID для клиента
      const clientId = this.generateClientId()
      this.clients.set(clientId, { ws, playerId: null })

      ws.on('message', (message) => {
        this.handleMessage(clientId, message)
      })

      ws.on('close', () => {
        this.handleDisconnect(clientId)
      })

      // Отправляем клиенту его ID
      this.sendToClient(clientId, WS_EVENTS.CONNECT, { clientId })
    })
  }

  /**
   * Генерация уникального ID для клиента
   * @returns {string} - Уникальный ID
   */
  generateClientId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2)
  }

  /**
   * Обработка сообщения от клиента
   * @param {string} clientId - ID клиента
   * @param {string} message - Сообщение
   */
  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message)
      const { type, data: payload } = data

      // Обрабатываем сообщение в зависимости от типа
      switch (type) {
        case WS_EVENTS.JOIN_ROOM:
          this.handleJoinRoom(clientId, payload)
          break
        case WS_EVENTS.LEAVE_ROOM:
          this.handleLeaveRoom(clientId)
          break
        case WS_EVENTS.START_GAME:
          this.handleStartGame(clientId, payload)
          break
        case WS_EVENTS.ATTACK:
          this.handleAttack(clientId, payload)
          break
        case WS_EVENTS.DEFEND:
          this.handleDefend(clientId, payload)
          break
        case WS_EVENTS.TAKE_CARDS:
          this.handleTakeCards(clientId)
          break
        case WS_EVENTS.PASS:
          this.handlePass(clientId)
          break
        case WS_EVENTS.CONFIRM_ATTACK:
          this.handleConfirmAttack(clientId, payload)
          break
        case WS_EVENTS.CONFIRM_DEFEND:
          this.handleConfirmDefend(clientId, payload)
          break
        case WS_EVENTS.CHAT_MESSAGE:
          this.handleChatMessage(clientId, payload)
          break
        default:
          console.warn(`Неизвестный тип сообщения: ${type}`)
      }
    } catch (error) {
      console.error('Ошибка обработки сообщения:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: 'Ошибка обработки сообщения' })
    }
  }

  /**
   * Обработка отключения клиента
   * @param {string} clientId - ID клиента
   */
  handleDisconnect(clientId) {
    const client = this.clients.get(clientId)
    if (!client) return

    // Если клиент был связан с игроком, удаляем его из комнаты
    if (client.playerId) {
      const result = roomService.removePlayerFromRoom(client.playerId)

      if (result) {
        const { room } = result

        // Уведомляем других игроков в комнате
        this.broadcastToRoom(room.id, WS_EVENTS.GAME_STATE, {
          room: room.toJSON(),
        })
      }
    }

    // Удаляем клиента
    this.clients.delete(clientId)
    console.log(`Клиент ${clientId} отключился`)
  }

  /**
   * Обработка входа в комнату
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleJoinRoom(clientId, payload) {
    const { roomId, playerName } = payload
    if (!roomId || !playerName) {
      return this.sendToClient(clientId, WS_EVENTS.ERROR, {
        message: 'Необходимо указать ID комнаты и имя игрока',
      })
    }

    try {
      // Получаем клиента
      const client = this.clients.get(clientId)
      if (!client) return

      // Если клиент уже связан с игроком, удаляем его из старой комнаты
      if (client.playerId) {
        roomService.removePlayerFromRoom(client.playerId)
      }

      // Добавляем игрока в комнату
      const { player, room } = roomService.addPlayerToRoom(roomId, playerName)

      // Связываем клиент с игроком
      client.playerId = player.id

      // Отправляем клиенту информацию о комнате и игроке
      this.sendToClient(clientId, WS_EVENTS.JOIN_ROOM, {
        room: room.toJSON(),
        player: {
          id: player.id,
          name: player.name,
        },
      })

      // Уведомляем других игроков в комнате
      this.broadcastToRoom(
        room.id,
        WS_EVENTS.JOIN_ROOM,
        {
          room: room.toJSON(),
        },
        clientId,
      )
    } catch (error) {
      console.error('Ошибка входа в комнату:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка выхода из комнаты
   * @param {string} clientId - ID клиента
   */
  handleLeaveRoom(clientId) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const result = roomService.removePlayerFromRoom(client.playerId)

      if (result) {
        const { room } = result

        // Удаляем связь клиента с игроком
        client.playerId = null

        // Отправляем клиенту подтверждение
        this.sendToClient(clientId, WS_EVENTS.LEAVE_ROOM, { success: true })

        // Уведомляем других игроков в комнате
        this.broadcastToRoom(room.id, WS_EVENTS.GAME_STATE, {
          room: room.toJSON(),
        })
      }
    } catch (error) {
      console.error('Ошибка выхода из комнаты:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка запуска игры
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleStartGame(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId } = payload

      // Запускаем игру
      const game = roomService.startGame(roomId, client.playerId)

      // Уведомляем игроков о начале игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка запуска игры:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка атаки
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleAttack(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId, cardId } = payload
      if (!roomId || !cardId) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Необходимо указать ID комнаты и ID карты',
        })
      }

      // Получаем игру
      const game = roomService.getGameByRoomId(roomId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем атаку
      const result = game.attackWithCard(client.playerId, cardId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно выполнить атаку этой картой',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка атаки:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка защиты
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleDefend(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId, attackCardId, defendCardId } = payload
      if (!roomId || !attackCardId || !defendCardId) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Необходимо указать ID комнаты, ID атакующей карты и ID защитной карты',
        })
      }

      // Получаем игру
      const game = roomService.getGameByRoomId(roomId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем защиту
      const result = game.defendWithCard(client.playerId, attackCardId, defendCardId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно выполнить защиту этой картой',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка защиты:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка подтверждения атаки
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleConfirmAttack(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId } = payload
      if (!roomId) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Необходимо указать ID комнаты',
        })
      }

      // Получаем игру
      const game = roomService.getGameByRoomId(roomId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем подтверждение атаки
      const result = game.confirmAttack(client.playerId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно подтвердить атаку',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка подтверждения атаки:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка подтверждения защиты
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleConfirmDefend(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId } = payload
      if (!roomId) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Необходимо указать ID комнаты',
        })
      }

      // Получаем игру
      const game = roomService.getGameByRoomId(roomId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем подтверждение защиты
      const result = game.confirmDefend(client.playerId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно подтвердить защиту',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка подтверждения защиты:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка взятия карт
   * @param {string} clientId - ID клиента
   */
  handleTakeCards(clientId) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      // Получаем игру
      const game = roomService.getGameByPlayerId(client.playerId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем взятие карт
      const result = game.takeCards(client.playerId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно взять карты',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка взятия карт:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка "Бито"
   * @param {string} clientId - ID клиента
   */
  handlePass(clientId) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      // Получаем игру
      const game = roomService.getGameByPlayerId(client.playerId)
      if (!game) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игра не найдена',
        })
      }

      // Выполняем "Бито"
      const result = game.pass(client.playerId)

      if (!result) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Невозможно выполнить "Бито"',
        })
      }

      // Уведомляем игроков об изменении состояния игры
      this.broadcastGameState(game)
    } catch (error) {
      console.error('Ошибка выполнения "Бито":', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Обработка сообщения чата
   * @param {string} clientId - ID клиента
   * @param {Object} payload - Данные
   */
  handleChatMessage(clientId, payload) {
    const client = this.clients.get(clientId)
    if (!client || !client.playerId) return

    try {
      const { roomId, message } = payload
      if (!roomId || !message) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Необходимо указать ID комнаты и текст сообщения',
        })
      }

      // Получаем комнату
      const room = roomService.getRoomById(roomId)
      if (!room) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Комната не найдена',
        })
      }

      // Получаем игрока
      const player = room.getPlayer(client.playerId)
      if (!player) {
        return this.sendToClient(clientId, WS_EVENTS.ERROR, {
          message: 'Игрок не найден в комнате',
        })
      }

      // Создаем сообщение чата
      const chatMessage = {
        id: Date.now().toString(),
        playerId: player.id,
        playerName: player.name,
        text: message,
        timestamp: Date.now(),
      }

      // Отправляем сообщение всем игрокам в комнате (включая отправителя)
      this.broadcastToRoom(roomId, WS_EVENTS.CHAT_MESSAGE, chatMessage)
    } catch (error) {
      console.error('Ошибка отправки сообщения чата:', error)
      this.sendToClient(clientId, WS_EVENTS.ERROR, { message: error.message })
    }
  }

  /**
   * Отправка сообщения клиенту
   * @param {string} clientId - ID клиента
   * @param {string} type - Тип сообщения
   * @param {Object} data - Данные
   */
  sendToClient(clientId, type, data) {
    const client = this.clients.get(clientId)
    if (!client) return

    const message = JSON.stringify({ type, data })

    if (client.ws.readyState === client.ws.OPEN) {
      client.ws.send(message)
    }
  }

  /**
   * Отправка сообщения всем клиентам в комнате
   * @param {string} roomId - ID комнаты
   * @param {string} type - Тип сообщения
   * @param {Object} data - Данные
   * @param {string} [excludeClientId] - ID клиента, которому не отправлять сообщение
   */
  broadcastToRoom(roomId, type, data, excludeClientId = null) {
    const room = roomService.getRoomById(roomId)
    if (!room) return

    const playerIds = room.players.map((player) => player.id)

    // Отправляем сообщение всем клиентам, связанным с игроками комнаты
    for (const [clientId, client] of this.clients.entries()) {
      if (client.playerId && playerIds.includes(client.playerId) && clientId !== excludeClientId) {
        this.sendToClient(clientId, type, data)
      }
    }
  }

  /**
   * Отправка состояния игры всем игрокам
   * @param {Game} game - Игра
   */
  broadcastGameState(game) {
    const room = roomService.getRoomById(game.roomId)
    if (!room) return

    // Отправляем состояние игры каждому игроку с его перспективой
    for (const player of room.players) {
      // Находим клиентов, связанных с этим игроком
      for (const [clientId, client] of this.clients.entries()) {
        if (client.playerId === player.id) {
          this.sendToClient(clientId, WS_EVENTS.GAME_STATE, {
            game: game.toJSON(player.id),
            room: room.toJSON(),
          })
        }
      }
    }
  }
}

export default WebSocketService
