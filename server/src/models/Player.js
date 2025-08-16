/**
 * Класс игрока для игры "Дурак"
 */
import { v4 as uuidv4 } from 'uuid'

class Player {
  /**
   * Создание игрока
   * @param {string} name - Имя игрока
   * @param {string} [id] - ID игрока (опционально)
   */
  constructor(name, id = null) {
    this.id = id || uuidv4()
    this.name = name
    this.cards = []
    this.isAttacker = false
    this.isDefender = false
    this.connected = true
  }

  /**
   * Добавление карт в руку игрока
   * @param {Card[]} cards - Массив карт для добавления
   */
  addCards(cards) {
    this.cards = [...this.cards, ...cards]
  }

  /**
   * Удаление карты из руки игрока
   * @param {string} cardId - ID карты, которую нужно удалить
   * @returns {Card|null} - Удаленная карта или null, если карта не найдена
   */
  removeCard(cardId) {
    const index = this.cards.findIndex((card) => card.id === cardId)
    if (index === -1) return null

    const [removedCard] = this.cards.splice(index, 1)
    return removedCard
  }

  /**
   * Проверка, есть ли у игрока карта с указанным ID
   * @param {string} cardId - ID карты
   * @returns {boolean} - Есть ли карта у игрока
   */
  hasCard(cardId) {
    return this.cards.some((card) => card.id === cardId)
  }

  /**
   * Получение карты по ID
   * @param {string} cardId - ID карты
   * @returns {Card|undefined} - Карта или undefined, если карта не найдена
   */
  getCard(cardId) {
    return this.cards.find((card) => card.id === cardId)
  }

  /**
   * Установка статуса атакующего
   * @param {boolean} status - Статус атакующего
   */
  setAttacker(status) {
    this.isAttacker = status
    if (status) {
      this.isDefender = false
    }
  }

  /**
   * Установка статуса защищающегося
   * @param {boolean} status - Статус защищающегося
   */
  setDefender(status) {
    this.isDefender = status
    if (status) {
      this.isAttacker = false
    }
  }

  /**
   * Преобразование игрока в JSON
   * @param {boolean} hideCards - Скрывать ли карты игрока
   * @returns {Object} - JSON представление игрока
   */
  toJSON(hideCards = false) {
    return {
      id: this.id,
      name: this.name,
      cards: hideCards ? this.cards.map(() => ({ hidden: true })) : this.cards,
      cardsCount: this.cards.length,
      isAttacker: this.isAttacker,
      isDefender: this.isDefender,
      connected: this.connected,
    }
  }
}

export default Player
