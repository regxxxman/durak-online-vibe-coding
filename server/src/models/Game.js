/**
 * Класс игры "Дурак"
 */
import { v4 as uuidv4 } from 'uuid'
import Card from './Card.js'
import { SUITS, RANKS, GAME_STATUS } from './constants.js'

class Game {
  /**
   * Создание игры
   * @param {string} roomId - ID игровой комнаты
   * @param {Player[]} players - Массив игроков
   */
  constructor(roomId, players) {
    this.id = uuidv4()
    this.roomId = roomId
    this.players = [...players]
    this.deck = this.createDeck()
    this.table = {
      attackCards: [],
      defendCards: [],
    }
    this.discardPile = []
    this.trumpCard = null
    this.trumpSuit = null
    this.currentPlayerIndex = -1
    this.status = GAME_STATUS.WAITING
    this.winner = null
    this.loser = null
  }

  /**
   * Создание и перемешивание колоды карт
   * @returns {Card[]} - Колода карт
   */
  createDeck() {
    const deck = []

    // Создаем по одной карте каждого ранга и масти
    Object.values(SUITS).forEach((suit) => {
      Object.values(RANKS).forEach((rank) => {
        deck.push(new Card(suit, rank))
      })
    })

    // Перемешиваем колоду
    return this.shuffleDeck(deck)
  }

  /**
   * Перемешивание колоды
   * @param {Card[]} deck - Колода для перемешивания
   * @returns {Card[]} - Перемешанная колода
   */
  shuffleDeck(deck) {
    const shuffled = [...deck]

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }

  /**
   * Инициализация игры
   */
  start() {
    if (this.players.length < 2) {
      throw new Error('Недостаточно игроков для начала игры')
    }

    console.log(`Начало игры: ${this.id} в комнате ${this.roomId}`)
    console.log(`Игроки (${this.players.length}): ${this.players.map((p) => p.name).join(', ')}`)

    this.status = GAME_STATUS.PLAYING

    // Выбираем козырную карту - оставляем ее в колоде, но запоминаем
    this.trumpCard = this.deck[this.deck.length - 1]
    this.trumpSuit = this.trumpCard.suit
    console.log(`Козырь: ${this.trumpCard.rank} ${this.trumpSuit}`)

    // Раздаем по 6 карт каждому игроку
    this.dealCards()

    // Определяем, кто ходит первым (игрок с наименьшим козырем)
    this.determineFirstPlayer()

    console.log(`Первый ход: ${this.getCurrentPlayer().name} (индекс: ${this.currentPlayerIndex})`)
    console.log(`Атакующий: ${this.players.find((p) => p.isAttacker)?.name}`)
    console.log(`Защищающийся: ${this.players.find((p) => p.isDefender)?.name}`)
  }

  /**
   * Раздача карт игрокам
   */
  dealCards() {
    // Каждому игроку по 6 карт
    this.players.forEach((player) => {
      const cards = []

      for (let i = 0; i < 6; i++) {
        if (this.deck.length > 0) {
          cards.push(this.deck.shift())
        }
      }

      player.addCards(cards)
    })
  }

  /**
   * Определение первого игрока (с наименьшим козырем)
   */
  determineFirstPlayer() {
    let minTrumpValue = Infinity
    let firstPlayerIndex = 0

    this.players.forEach((player, index) => {
      // Находим козыри в руке игрока
      const trumpCards = player.cards.filter((card) => card.suit === this.trumpSuit)

      if (trumpCards.length > 0) {
        // Находим наименьший козырь
        const minValue = Math.min(...trumpCards.map((card) => card.value))

        if (minValue < minTrumpValue) {
          minTrumpValue = minValue
          firstPlayerIndex = index
        }
      }
    })

    // Если ни у кого нет козырей, первый игрок выбирается случайно
    if (minTrumpValue === Infinity) {
      firstPlayerIndex = Math.floor(Math.random() * this.players.length)
    }

    this.currentPlayerIndex = firstPlayerIndex
    this.setPlayerRoles()
  }

  /**
   * Установка ролей игроков (атакующий и защищающийся)
   */
  setPlayerRoles() {
    // Сбрасываем предыдущие роли
    this.players.forEach((player) => {
      player.setAttacker(false)
      player.setDefender(false)
    })

    // Устанавливаем текущего игрока как атакующего
    this.players[this.currentPlayerIndex].setAttacker(true)

    // Следующий игрок - защищающийся
    const defenderIndex = (this.currentPlayerIndex + 1) % this.players.length
    this.players[defenderIndex].setDefender(true)

    console.log('Установлены новые роли игроков:')
    console.log(
      `Атакующий (индекс ${this.currentPlayerIndex}): ${this.players[this.currentPlayerIndex].name}`,
    )
    console.log(`Защищающийся (индекс ${defenderIndex}): ${this.players[defenderIndex].name}`)
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
   * Получение текущего игрока
   * @returns {Player} - Текущий игрок
   */
  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  /**
   * Получение защищающегося игрока
   * @returns {Player} - Защищающийся игрок
   */
  getDefendingPlayer() {
    return this.players.find((player) => player.isDefender)
  }

  /**
   * Проверка, может ли игрок сделать ход
   * @param {string} playerId - ID игрока
   * @returns {boolean} - Может ли игрок сделать ход
   */
  canPlayerMove(playerId) {
    const player = this.getPlayer(playerId)
    if (!player) return false

    return player.isAttacker || player.isDefender
  }

  /**
   * Атака картой
   * @param {string} playerId - ID атакующего игрока
   * @param {string} cardId - ID карты для атаки
   * @returns {boolean} - Успешна ли атака
   */
  attackWithCard(playerId, cardId) {
    // Проверяем, может ли игрок атаковать
    const player = this.getPlayer(playerId)
    if (!player || !player.isAttacker) return false

    // Проверяем, есть ли у игрока нужная карта
    if (!player.hasCard(cardId)) return false

    // Получаем карту для атаки
    const card = player.getCard(cardId)

    // Проверяем, можно ли подкинуть эту карту
    if (this.table.attackCards.length > 0) {
      // Можно подкинуть только карту того же ранга, что уже есть на столе
      const validRanks = [
        ...new Set([
          ...this.table.attackCards.map((c) => c.rank),
          ...this.table.defendCards.filter(Boolean).map((c) => c.rank),
        ]),
      ]

      if (!validRanks.includes(card.rank)) {
        return false
      }
    }

    // Проверяем, не превышает ли количество атакующих карт количество карт защищающегося
    const defenderCardsCount = this.getDefendingPlayer().cards.length
    if (
      this.table.attackCards.length - this.table.defendCards.filter(Boolean).length >=
      defenderCardsCount
    ) {
      return false
    }

    // Удаляем карту из руки игрока и добавляем на стол
    const attackCard = player.removeCard(cardId)
    this.table.attackCards.push(attackCard)

    // Логируем информацию об атаке
    console.log(`Игрок ${player.name} атаковал картой ${attackCard.rank} ${attackCard.suit}`)
    console.log(
      `На столе ${this.table.attackCards.length} атакующих карт и ${this.table.defendCards.filter(Boolean).length} защитных карт`,
    )

    return true
  }

  /**
   * Защита картой
   * @param {string} playerId - ID защищающегося игрока
   * @param {string} attackCardId - ID атакующей карты
   * @param {string} defendCardId - ID защитной карты
   * @returns {boolean} - Успешна ли защита
   */
  defendWithCard(playerId, attackCardId, defendCardId) {
    // Проверяем, может ли игрок защищаться
    const player = this.getPlayer(playerId)
    if (!player || !player.isDefender) return false

    // Проверяем, есть ли у игрока нужная карта
    if (!player.hasCard(defendCardId)) return false

    // Находим атакующую карту на столе
    const attackCardIndex = this.table.attackCards.findIndex((card) => card.id === attackCardId)
    if (attackCardIndex === -1) return false

    // Проверяем, не защищена ли уже эта карта
    if (this.table.defendCards[attackCardIndex]) return false

    // Получаем карты
    const attackCard = this.table.attackCards[attackCardIndex]
    const defendCard = player.getCard(defendCardId)

    // Проверяем, может ли защитная карта побить атакующую
    if (!defendCard.canBeat(attackCard, this.trumpSuit)) {
      return false
    }

    // Удаляем карту из руки игрока и добавляем на стол
    player.removeCard(defendCardId)

    // Добавляем защитную карту на соответствующую позицию
    while (this.table.defendCards.length <= attackCardIndex) {
      this.table.defendCards.push(null)
    }
    this.table.defendCards[attackCardIndex] = defendCard

    // Логируем информацию о защите
    console.log(
      `Игрок ${player.name} защитился картой ${defendCard.rank} ${defendCard.suit} от карты ${attackCard.rank} ${attackCard.suit}`,
    )
    console.log(
      `На столе ${this.table.attackCards.length} атакующих карт и ${this.table.defendCards.filter(Boolean).length} защитных карт`,
    )

    // Проверяем, все ли атаки отбиты
    const allDefended =
      this.table.attackCards.length === this.table.defendCards.filter(Boolean).length
    console.log(`Все атаки отбиты: ${allDefended}`)

    return true
  }

  /**
   * Взятие карт со стола (когда защищающийся не может отбиться)
   * @param {string} playerId - ID игрока
   * @returns {boolean} - Успешно ли взяты карты
   */
  takeCards(playerId) {
    // Проверяем, может ли игрок взять карты
    const player = this.getPlayer(playerId)
    if (!player || !player.isDefender) return false

    // Проверяем, есть ли карты на столе для взятия
    if (this.table.attackCards.length === 0) {
      console.log('Нельзя взять карты, стол пуст!')
      return false
    }

    // Все карты со стола переходят к защищающемуся
    const allCards = [...this.table.attackCards, ...this.table.defendCards.filter(Boolean)]
    player.addCards(allCards)

    console.log(`Игрок ${player.name} взял ${allCards.length} карт со стола`)

    // Очищаем стол
    this.table.attackCards = []
    this.table.defendCards = []

    // Переход хода к следующему игроку
    this.nextTurn(true)

    return true
  }

  /**
   * Подтверждение атаки (когда атакующий закончил атаковать)
   * @param {string} playerId - ID игрока
   * @returns {boolean} - Успешно ли подтверждена атака
   */
  confirmAttack(playerId) {
    // Проверяем, может ли игрок подтвердить атаку
    const player = this.getPlayer(playerId)
    if (!player || !player.isAttacker) {
      console.log(`Игрок ${playerId} не может подтвердить атаку, не является атакующим!`)
      return false
    }

    // Проверяем, есть ли атакующие карты на столе
    if (this.table.attackCards.length === 0) {
      console.log('Нельзя подтвердить атаку, нет атакующих карт на столе!')
      return false
    }

    console.log(`Игрок ${player.name} подтвердил свою атаку, ход переходит к защищающемуся`)

    // Принудительно передаем ход защищающемуся, но не меняем атакующих и защищающихся
    this.currentPlayerIndex = this.players.findIndex((p) => p.isDefender)

    return true
  }

  /**
   * Подтверждение защиты (когда защищающийся закончил защищаться)
   * @param {string} playerId - ID игрока
   * @returns {boolean} - Успешно ли подтверждена защита
   */
  confirmDefend(playerId) {
    // Проверяем, может ли игрок подтвердить защиту
    const player = this.getPlayer(playerId)
    if (!player || !player.isDefender) {
      console.log(`Игрок ${playerId} не может подтвердить защиту, не является защищающимся!`)
      return false
    }

    // Проверяем, есть ли на столе все защищённые карты
    const undefendedCount =
      this.table.attackCards.length - this.table.defendCards.filter(Boolean).length
    if (undefendedCount > 0) {
      console.log(
        `На столе остались незащищенные карты (${undefendedCount}), нельзя подтвердить защиту!`,
      )
      return false
    }

    // Все карты со стола переходят в сброс
    const allCards = [...this.table.attackCards, ...this.table.defendCards.filter(Boolean)]
    this.discardPile.push(...allCards)

    // Очищаем стол
    this.table.attackCards = []
    this.table.defendCards = []

    console.log(`Игрок ${player.name} подтвердил свою защиту. Ход переходит к следующему игроку`)

    // Переход хода (как при pass, но инициатор защищающийся)
    this.nextTurn(false)

    return true
  }

  /**
   * Бито (когда все атаки отбиты)
   * @param {string} playerId - ID игрока
   * @returns {boolean} - Успешно ли выполнено "Бито"
   */
  pass(playerId) {
    // Проверяем, может ли игрок сказать "Бито"
    const player = this.getPlayer(playerId)
    if (!player || !player.isAttacker) return false

    // Проверяем, все ли атаки отбиты
    if (
      this.table.attackCards.length === 0 ||
      this.table.attackCards.length !== this.table.defendCards.filter(Boolean).length
    ) {
      console.log("Нельзя сказать 'Бито', не все атаки отбиты!")
      console.log(
        `Атаки: ${this.table.attackCards.length}, Защиты: ${this.table.defendCards.filter(Boolean).length}`,
      )
      return false
    }

    // Все карты со стола переходят в сброс
    const allCards = [...this.table.attackCards, ...this.table.defendCards.filter(Boolean)]
    this.discardPile.push(...allCards)

    // Очищаем стол
    this.table.attackCards = []
    this.table.defendCards = []

    console.log(`Игрок ${player.name} сказал 'Бито'! Ход переходит к следующему игроку.`)

    // Переход хода
    this.nextTurn(false)

    return true
  }

  /**
   * Переход хода к следующему игроку
   * @param {boolean} tookCards - Взял ли текущий защищающийся карты
   */
  nextTurn(tookCards) {
    // Раздаем карты игрокам
    this.replenishCards()

    // Проверяем условия окончания игры
    if (this.checkGameEnd()) {
      return
    }

    // Определяем нового атакующего и защищающегося
    if (tookCards) {
      // Если защищающийся взял карты, то атакует следующий после него игрок
      const defenderIndex = this.players.findIndex((p) => p.isDefender)
      this.currentPlayerIndex = (defenderIndex + 1) % this.players.length
    } else {
      // Если защита была успешной, то защищающийся становится атакующим
      const defenderIndex = this.players.findIndex((p) => p.isDefender)
      this.currentPlayerIndex = defenderIndex
    }

    // Устанавливаем новые роли
    this.setPlayerRoles()

    // Логируем информацию о новом ходе для отладки
    console.log(
      `Ход перешел к игроку: ${this.getCurrentPlayer().name} (индекс: ${this.currentPlayerIndex})`,
    )
    console.log(`Атакующий: ${this.players.find((p) => p.isAttacker)?.name}`)
    console.log(`Защищающийся: ${this.players.find((p) => p.isDefender)?.name}`)
  }

  /**
   * Пополнение карт у игроков (до 6 карт каждому)
   */
  replenishCards() {
    // Проверяем, есть ли карты в колоде
    if (this.deck.length === 0) {
      console.log('Колода пуста! Карты не раздаются.')
      return
    }

    // Сначала атакующий берет карты
    const attacker = this.players.find((p) => p.isAttacker)
    if (attacker) {
      this.giveCardsToPlayer(attacker)
    }

    // Затем защищающийся берет карты
    const defender = this.players.find((p) => p.isDefender)
    if (defender) {
      this.giveCardsToPlayer(defender)
    }

    // Затем остальные игроки в порядке хода
    for (let i = 0; i < this.players.length; i++) {
      const playerIndex = (this.currentPlayerIndex + i) % this.players.length
      const player = this.players[playerIndex]

      // Пропускаем атакующего и защищающегося, так как они уже получили карты
      if (!player.isAttacker && !player.isDefender) {
        this.giveCardsToPlayer(player)
      }
    }

    // Логируем количество оставшихся карт в колоде
    console.log(`В колоде осталось ${this.deck.length} карт`)

    // Если козырь еще не был взят, и колода пуста кроме козыря, берем козырь в колоду
    if (this.trumpCard && this.deck.length === 0) {
      console.log(`Козырная карта ${this.trumpCard.rank} ${this.trumpCard.suit} взята в колоду`)
      this.trumpCard = null
    }
  }

  /**
   * Выдача карт игроку до 6 штук
   * @param {Player} player - Игрок, которому выдаются карты
   */
  giveCardsToPlayer(player) {
    const cardsNeeded = Math.max(0, 6 - player.cards.length)

    if (cardsNeeded > 0 && this.deck.length > 0) {
      // Определяем, сколько карт можно выдать
      const cardsToGive = Math.min(cardsNeeded, this.deck.length)

      // Если козырь еще в игре и колода заканчивается, козырь идет последним
      let cards = []
      if (this.trumpCard && this.deck.length <= cardsToGive) {
        // Берем все карты кроме козыря
        cards = this.deck.splice(0, this.deck.length)

        // Добавляем козырь
        cards.push(this.trumpCard)
        this.trumpCard = null

        console.log(`Козырь взят в руку игрока ${player.name}`)
      } else {
        // Обычная раздача карт
        cards = this.deck.splice(0, cardsToGive)
      }

      player.addCards(cards)
      console.log(
        `Игрок ${player.name} получил ${cards.length} карт, теперь у него ${player.cards.length}`,
      )
    }
  }

  /**
   * Проверка условий окончания игры
   * @returns {boolean} - Закончилась ли игра
   */
  checkGameEnd() {
    // По правилам дурака, игра заканчивается только когда колода пуста И у кого-то нет карт
    const isDeckEmpty = this.deck.length === 0 && !this.trumpCard
    const playersWithoutCards = this.players.filter((p) => p.cards.length === 0)

    // Игра заканчивается только когда колода пуста И у кого-то закончились карты
    if (isDeckEmpty && playersWithoutCards.length > 0) {
      this.status = GAME_STATUS.FINISHED

      // Игроки без карт - победители
      playersWithoutCards.forEach((p) => {
        p.isWinner = true
        this.winner = p.id // Устанавливаем ID победителя для передачи клиенту
        console.log(`Игрок ${p.name} победил, избавившись от всех карт!`)
      })

      // Если остался только один игрок с картами, он - "дурак"
      const playersWithCards = this.players.filter((p) => p.cards.length > 0)
      if (playersWithCards.length === 1) {
        const loser = playersWithCards[0]
        loser.isLoser = true
        this.loser = loser.id
        console.log(`Игрок ${loser.name} проиграл и стал "дураком"!`)
      }

      // Если у нескольких игроков остались карты - все они проиграли
      if (playersWithCards.length > 1) {
        console.log(`Несколько игроков остались с картами:`)
        playersWithCards.forEach((p) => {
          p.isLoser = true
          console.log(`- ${p.name}: ${p.cards.length} карт`)
        })
      }

      return true
    }

    // Игра продолжается, если колода не пуста или у всех есть карты
    return false
  }

  /**
   * Преобразование игры в JSON
   * @param {string} [forPlayerId] - ID игрока, для которого подготавливаются данные
   * @returns {Object} - JSON представление игры
   */
  toJSON(forPlayerId = null) {
    return {
      id: this.id,
      roomId: this.roomId,
      players: this.players.map((player) => {
        // Если это данные для конкретного игрока, то его карты видны, а чужие - скрыты
        const hideCards = forPlayerId && player.id !== forPlayerId
        return player.toJSON(hideCards)
      }),
      currentPlayerId: this.getCurrentPlayer()?.id,
      trumpCard: this.trumpCard,
      trumpSuit: this.trumpSuit,
      deck: this.deck.length, // Отправляем только количество карт в колоде
      deckEmpty: this.deck.length === 0 && !this.trumpCard, // Флаг, что колода пуста
      table: this.table,
      status: this.status,
      winner: this.winner,
      loser: this.loser,
      discardPileCount: this.discardPile.length, // Количество карт в отбое
    }
  }
}

export default Game
