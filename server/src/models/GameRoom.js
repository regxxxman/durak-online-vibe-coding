/**
 * Класс игровой комнаты для игры "Дурак"
 */
import { v4 as uuidv4 } from 'uuid'
import { GAME_STATUS } from './constants.js'

class GameRoom {
  /**
   * Создание игровой комнаты
   * @param {string} name - Название комнаты
   * @param {number} maxPlayers - Максимальное количество игроков (от 2 до 6)
   * @param {string} [id] - ID комнаты (опционально)
   */
  constructor(name, maxPlayers = 6, id = null) {
    this.id = id || uuidv4()
    this.name = name
    this.maxPlayers = Math.min(Math.max(2, maxPlayers), 6) // Ограничиваем от 2 до 6 игроков
    this.players = []
    this.status = GAME_STATUS.WAITING
    this.createdAt = Date.now()
  }

  /**
   * Добавление игрока в комнату
   * @param {Player} player - Игрок для добавления
   * @returns {boolean} - Успешно ли добавлен игрок
   */
  addPlayer(player) {
    if (this.players.length >= this.maxPlayers) {
      return false
    }

    if (this.players.some((p) => p.id === player.id)) {
      return false // Игрок уже в комнате
    }

    this.players.push(player)
    return true
  }

  /**
   * Удаление игрока из комнаты
   * @param {string} playerId - ID игрока для удаления
   * @returns {Player|null} - Удаленный игрок или null, если игрок не найден
   */
  removePlayer(playerId) {
    const index = this.players.findIndex((player) => player.id === playerId)
    if (index === -1) return null

    const [removedPlayer] = this.players.splice(index, 1)
    return removedPlayer
  }

  /**
   * Получение игрока по ID
   * @param {string} playerId - ID игрока
   * @returns {Player|undefined} - Игрок или undefined, если игрок не найден
   */
  getPlayer(playerId) {
    return this.players.find((player) => player.id === playerId)
  }

  /**
   * Проверка, может ли комната принять нового игрока
   * @returns {boolean} - Может ли комната принять нового игрока
   */
  canJoin() {
    return this.status === GAME_STATUS.WAITING && this.players.length < this.maxPlayers
  }

  /**
   * Установка статуса комнаты
   * @param {string} status - Новый статус комнаты
   */
  setStatus(status) {
    this.status = status
  }

  /**
   * Преобразование комнаты в JSON
   * @returns {Object} - JSON представление комнаты
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        cardsCount: p.cards.length,
        connected: p.connected,
      })),
      maxPlayers: this.maxPlayers,
      status: this.status,
      createdAt: this.createdAt,
    }
  }
}

export default GameRoom
