/**
 * Класс карты для игры "Дурак"
 */
import { v4 as uuidv4 } from 'uuid'
import { RANK_VALUES } from './constants.js'

class Card {
  /**
   * Создание карты
   * @param {string} suit - Масть карты
   * @param {string} rank - Ранг карты
   */
  constructor(suit, rank) {
    this.id = `${rank}_${suit}_${uuidv4().substring(0, 8)}`
    this.suit = suit
    this.rank = rank
    this.value = RANK_VALUES[rank]
  }

  /**
   * Может ли текущая карта побить другую карту
   * @param {Card} card - Карта, которую нужно побить
   * @param {string} trumpSuit - Козырная масть
   * @returns {boolean} - Может ли карта побить другую
   */
  canBeat(card, trumpSuit) {
    // Если текущая карта козырь, а атакующая нет, то козырь всегда бьёт
    if (this.suit === trumpSuit && card.suit !== trumpSuit) {
      return true
    }

    // Если обе карты козыри или обе карты одной масти,
    // то побеждает карта с большим значением
    if (this.suit === card.suit) {
      return this.value > card.value
    }

    // Если масти разные и текущая карта не козырь, то нельзя побить
    return false
  }

  /**
   * Преобразование карты в JSON
   * @returns {Object} - JSON представление карты
   */
  toJSON() {
    return {
      id: this.id,
      suit: this.suit,
      rank: this.rank,
      value: this.value,
    }
  }
}

export default Card
