/**
 * Сервис для управления игровыми комнатами
 */
import GameRoom from '../models/GameRoom.js'
import Player from '../models/Player.js'
import Game from '../models/Game.js'
import { GAME_STATUS } from '../models/constants.js'

class RoomService {
  constructor() {
    // Коллекция комнат
    this.rooms = new Map()

    // Коллекция игр
    this.games = new Map()

    // Маппинг игроков по комнатам
    this.playerRooms = new Map()
  }

  /**
   * Получение всех комнат
   * @returns {GameRoom[]} - Массив комнат
   */
  getAllRooms() {
    return Array.from(this.rooms.values())
  }

  /**
   * Получение комнаты по ID
   * @param {string} roomId - ID комнаты
   * @returns {GameRoom|undefined} - Комната или undefined, если комната не найдена
   */
  getRoomById(roomId) {
    return this.rooms.get(roomId)
  }

  /**
   * Создание новой комнаты
   * @param {string} name - Название комнаты
   * @param {number} maxPlayers - Максимальное количество игроков
   * @returns {GameRoom} - Созданная комната
   */
  createRoom(name, maxPlayers) {
    const room = new GameRoom(name, maxPlayers)
    this.rooms.set(room.id, room)
    return room
  }

  /**
   * Удаление комнаты
   * @param {string} roomId - ID комнаты
   * @returns {boolean} - Успешно ли удалена комната
   */
  removeRoom(roomId) {
    // Если в комнате есть игра, удаляем и её
    if (this.games.has(roomId)) {
      this.games.delete(roomId)
    }

    // Удаляем комнату
    const result = this.rooms.delete(roomId)

    // Удаляем игроков из этой комнаты
    for (const [playerId, roomId2] of this.playerRooms.entries()) {
      if (roomId2 === roomId) {
        this.playerRooms.delete(playerId)
      }
    }

    return result
  }

  /**
   * Добавление игрока в комнату
   * @param {string} roomId - ID комнаты
   * @param {string} playerName - Имя игрока
   * @param {string} [playerId] - ID игрока (опционально)
   * @returns {Object} - Результат добавления с игроком и комнатой
   */
  addPlayerToRoom(roomId, playerName, playerId = null) {
    const room = this.getRoomById(roomId)
    if (!room) {
      throw new Error(`Комната с ID ${roomId} не найдена`)
    }

    if (!room.canJoin()) {
      throw new Error('Нельзя присоединиться к этой комнате')
    }

    // Создаем игрока
    const player = new Player(playerName, playerId)

    // Добавляем игрока в комнату
    const result = room.addPlayer(player)
    if (!result) {
      throw new Error('Не удалось добавить игрока в комнату')
    }

    // Сохраняем связь игрока с комнатой
    this.playerRooms.set(player.id, roomId)

    return { player, room }
  }

  /**
   * Удаление игрока из комнаты
   * @param {string} playerId - ID игрока
   * @returns {Object|null} - Результат удаления с игроком и комнатой или null
   */
  removePlayerFromRoom(playerId) {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) {
      return null
    }

    const room = this.getRoomById(roomId)
    if (!room) {
      this.playerRooms.delete(playerId)
      return null
    }

    // Удаляем игрока из комнаты
    const player = room.removePlayer(playerId)
    if (!player) {
      return null
    }

    // Удаляем связь игрока с комнатой
    this.playerRooms.delete(playerId)

    // Если комната пуста, удаляем её
    if (room.players.length === 0) {
      this.removeRoom(roomId)
    }

    // Если игра уже идет, помечаем игрока как отключенного
    const game = this.getGameByRoomId(roomId)
    if (game && game.status === GAME_STATUS.PLAYING) {
      const gamePlayer = game.getPlayer(playerId)
      if (gamePlayer) {
        gamePlayer.connected = false
      }
    }

    return { player, room }
  }

  /**
   * Получение комнаты игрока
   * @param {string} playerId - ID игрока
   * @returns {GameRoom|null} - Комната игрока или null
   */
  getPlayerRoom(playerId) {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) {
      return null
    }

    return this.getRoomById(roomId)
  }

  /**
   * Запуск игры в комнате
   * @param {string} roomId - ID комнаты
   * @param {string} playerId - ID игрока, запускающего игру
   * @returns {Game} - Созданная игра
   */
  startGame(roomId, playerId) {
    const room = this.getRoomById(roomId)
    if (!room) {
      throw new Error(`Комната с ID ${roomId} не найдена`)
    }

    if (room.status !== GAME_STATUS.WAITING) {
      throw new Error('Игра уже запущена или завершена')
    }

    if (room.players.length < 2) {
      throw new Error('Недостаточно игроков для начала игры')
    }

    // Проверяем, что запускающий игрок находится в комнате
    if (!room.getPlayer(playerId)) {
      throw new Error('Только игрок комнаты может запустить игру')
    }

    // Создаем игру
    const game = new Game(roomId, room.players)

    // Запускаем игру
    game.start()

    // Обновляем статус комнаты
    room.setStatus(GAME_STATUS.PLAYING)

    // Сохраняем игру
    this.games.set(roomId, game)

    return game
  }

  /**
   * Получение игры по ID комнаты
   * @param {string} roomId - ID комнаты
   * @returns {Game|undefined} - Игра или undefined, если игра не найдена
   */
  getGameByRoomId(roomId) {
    return this.games.get(roomId)
  }

  /**
   * Получение игры по ID игрока
   * @param {string} playerId - ID игрока
   * @returns {Game|null} - Игра или null, если игра не найдена
   */
  getGameByPlayerId(playerId) {
    const roomId = this.playerRooms.get(playerId)
    if (!roomId) {
      return null
    }

    return this.getGameByRoomId(roomId)
  }
}

// Создаем единственный экземпляр сервиса
const roomService = new RoomService()

export default roomService
