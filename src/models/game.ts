import { Rank, Suit } from './types'
import type { Card } from './types'

/**
 * Класс для управления колодой карт
 */
export class DeckService {
  // Создает колоду карт
  static createDeck(): Card[] {
    const deck: Card[] = []
    const suits = Object.values(Suit)
    const ranks = Object.values(Rank)

    // Назначаем числовые значения картам
    const rankValues: Record<Rank, number> = {
      [Rank.SIX]: 6,
      [Rank.SEVEN]: 7,
      [Rank.EIGHT]: 8,
      [Rank.NINE]: 9,
      [Rank.TEN]: 10,
      [Rank.JACK]: 11,
      [Rank.QUEEN]: 12,
      [Rank.KING]: 13,
      [Rank.ACE]: 14,
    }

    // Создаем карты всех мастей и рангов
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: `${rank}_${suit}`,
          suit: suit as Suit,
          rank: rank as Rank,
          value: rankValues[rank as Rank],
        })
      }
    }

    return deck
  }

  // Перемешивает колоду
  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }

  // Определяет козырную карту
  static selectTrumpCard(deck: Card[]): Card | undefined {
    if (deck.length === 0) return undefined
    return deck[deck.length - 1]
  }

  // Раздает карты игрокам (в начале игры по 6 карт)
  static dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
    if (deck.length === 0) return { cards: [], remainingDeck: [] }

    const cards = deck.slice(0, count)
    const remainingDeck = deck.slice(count)

    return { cards, remainingDeck }
  }
}

/**
 * Класс для проверки правил игры
 */
export class GameRules {
  // Может ли карта побить другую карту
  static canBeat(attackCard: Card, defendCard: Card, trumpSuit: Suit): boolean {
    // Если у карт одинаковая масть, то побеждает карта с большим значением
    if (attackCard.suit === defendCard.suit) {
      return defendCard.value > attackCard.value
    }

    // Если у защитной карты козырная масть, а у атакующей нет, то защита побеждает
    return defendCard.suit === trumpSuit
  }

  // Может ли игрок подкинуть карту
  static canAddCard(tableCards: Card[], cardToAdd: Card): boolean {
    if (tableCards.length === 0) return true

    // Можно подкинуть карту того же ранга, который уже есть на столе
    return tableCards.some((card) => card.rank === cardToAdd.rank)
  }

  // Определяет следующего игрока (по часовой стрелке)
  static getNextPlayer(currentPlayerIndex: number, totalPlayers: number): number {
    return (currentPlayerIndex + 1) % totalPlayers
  }
}
