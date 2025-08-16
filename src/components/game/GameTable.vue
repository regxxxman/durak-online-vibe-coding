<template>
  <div class="game-table">
    <!-- Изменяем структуру стола, перемещаем колоду влево -->
    <div class="game-table__layout">
      <!-- Колода слева -->
      <div class="game-table__deck-area">
        <div class="game-table__deck" v-if="deckCount > 0">
          <div class="game-table__deck-pattern"></div>
        </div>
        <div class="game-table__trump" v-if="trumpCard">
          <CardComponent :card="trumpCard" :trump-suit="trumpSuit" />
        </div>
        <div v-if="deckEmpty" class="game-table__deck-empty">
          Колода пуста
          <div class="game-table__deck-empty-note">Игра продолжается до выхода первого игрока</div>
        </div>

        <div
          v-if="deckCount > 0"
          class="game-table__deck-counter"
          :class="{
            'game-table__deck-counter--low': deckCount <= 5,
            'game-table__deck-counter--medium': deckCount > 5 && deckCount <= 15,
            'game-table__deck-counter--high': deckCount > 15,
          }"
        >
          <span>{{ deckCount }}</span> карт в колоде
        </div>
      </div>

      <!-- Основная область стола теперь занимает больше места -->
      <div class="game-table__battle-area">
        <div v-if="table" class="game-table__cards">
          <div
            v-for="(pair, index) in attackDefendPairs"
            :key="index"
            class="game-table__card-pair"
          >
            <div class="game-table__attack-card">
              <CardComponent
                v-if="pair.attackCard"
                :card="pair.attackCard"
                :trump-suit="trumpSuit"
              />
            </div>
            <div class="game-table__defend-card">
              <CardComponent
                v-if="pair.defendCard"
                :card="pair.defendCard"
                :trump-suit="trumpSuit"
              />
            </div>
          </div>

          <!-- Незащищенные карты атаки -->
          <div v-for="card in undefendedCards" :key="card.id" class="game-table__card-pair">
            <div
              class="game-table__attack-card"
              :data-card-id="card.id"
              :class="{
                'game-table__attack-card--selected':
                  isSelectedForDefend(card) || isSelectedForAttack(card),
              }"
              @click="isAttackerTurn ? toggleAttackCard(card) : selectDefendTarget(card)"
              @dragover.prevent
              @drop="handleCardDrop($event, card)"
            >
              <CardComponent :card="card" :trump-suit="trumpSuit" />
              <div class="card-action-label" v-if="isAttackerTurn">
                {{ isSelectedForAttack(card) ? 'Отменить' : 'Атаковать' }}
              </div>
              <div class="card-action-label card-action-label--defend" v-else>
                {{ isSelectedForDefend(card) ? 'Выбрана' : 'Защищаться' }}
              </div>
            </div>
            <div class="game-table__defend-card">
              <div
                v-if="isDefenderTurn"
                class="game-table__drop-zone"
                :class="{ 'game-table__drop-zone--active': isSelectedForDefend(card) }"
                @dragover.prevent
                @drop="handleCardDrop($event, card)"
              >
                <span v-if="isSelectedForDefend(card)">Перетащите карту сюда для защиты</span>
                <span v-else>Нажмите на карту для защиты</span>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="game-table__empty">Стол пуст</div>
      </div>
    </div>

    <div class="game-table__instructions" v-if="isPlayerTurn">
      <div class="game-table__instructions-icon">
        <span>💡</span>
      </div>
      <div class="game-table__instructions-text">
        <template v-if="isAttackerTurn">
          <p>
            <strong>Ваш ход!</strong> Выберите одну или несколько карт для атаки и нажмите на яркую
            кнопку <span class="highlight-text">"Подтвердить ход"</span> внизу экрана.
          </p>
          <p class="game-table__instructions-tip">
            <small>Совет: Вы можете выбрать несколько карт одного достоинства для атаки.</small>
          </p>
        </template>
      </div>
    </div>

    <!-- Статус таблицы отображается только если нет инструкций -->
    <div class="game-table__status" v-if="status && !isPlayerTurn">
      {{ status }}
    </div>

    <div
      class="game-table__selection-status"
      v-if="isAttackerTurn && selectedAttackCards.length > 0"
    >
      Выбрано карт для атаки: {{ selectedAttackCards.length }}
      <div class="game-table__selection-hint" v-if="selectedAttackCards.length > 1">
        Вы можете атаковать несколькими картами одного достоинства
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue'
import type { Card, Suit, Table } from '../../models/types'

// Импортируем компонент карты
const CardComponent = defineAsyncComponent(() => import('./CardComponent.vue'))

// Состояние для хранения выбранной карты атаки для защиты
const selectedAttackCard = ref<Card | null>(null)
// Состояние для хранения выбранной карты защиты
const selectedDefenseCard = ref<Card | null>(null)
// Массив выбранных карт для атаки
const selectedAttackCards = ref<Card[]>([])

const props = defineProps<{
  table: Table
  deckCount: number
  trumpCard?: Card
  trumpSuit?: Suit
  isAttackerTurn: boolean
  isDefenderTurn: boolean
  isPlayerTurn: boolean
  canPass: boolean
  status?: string
  deckEmpty?: boolean
}>()

const emit = defineEmits<{
  (e: 'defendCard', attackCardId: string, defendCardId: string): void
  (e: 'takeCards'): void
  (e: 'pass'): void
  (e: 'selectAttackCard', attackCard: Card): void
  (e: 'confirmDefend', attackCard: Card, defendCard: Card): void
  (e: 'confirmAttack', attackCards: Card[]): void
  (e: 'selectDefenseCard', defenseCard: Card): void
  (e: 'showMessage', message: string, type: string): void
}>()

// Сгруппируем карты атаки и защиты в пары
const attackDefendPairs = computed(() => {
  const pairs = []
  const attackCards = props.table.attackCards
  const defendCards = props.table.defendCards

  for (let i = 0; i < attackCards.length; i++) {
    if (defendCards[i]) {
      pairs.push({
        attackCard: attackCards[i],
        defendCard: defendCards[i],
      })
    }
  }

  return pairs
})

// Получаем карты атаки без защиты
const undefendedCards = computed(() => {
  const attackCards = props.table.attackCards
  const defendCards = props.table.defendCards

  return attackCards.filter((_, index) => !defendCards[index])
})

// Выбор карты атаки для защиты
function selectDefendTarget(attackCard: Card) {
  selectedAttackCard.value = attackCard
  emit('selectAttackCard', attackCard)
}

// Проверка, выбрана ли карта для защиты
function isSelectedForDefend(card: Card) {
  return selectedAttackCard.value?.id === card.id
}

// Проверка, выбрана ли карта для атаки
function isSelectedForAttack(card: Card) {
  return selectedAttackCards.value.some((c) => c.id === card.id)
}

// Обработчик перетаскивания карты для защиты
// Реализуем в клиенте проверку, может ли карта побить другую карту
function canCardBeat(defendCard: Card, attackCard: Card, trumpSuit?: Suit) {
  // Импортируем значения рангов
  const RANK_VALUES: Record<string, number> = {
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
  }

  // Если защитная карта козырь, а атакующая нет, то козырь всегда бьёт
  if (defendCard.suit === trumpSuit && attackCard.suit !== trumpSuit) {
    return true
  }

  // Если обе карты козыри или обе карты одной масти,
  // то побеждает карта с большим значением
  if (defendCard.suit === attackCard.suit) {
    return RANK_VALUES[defendCard.rank as string] > RANK_VALUES[attackCard.rank as string]
  }

  // Если масти разные и защитная карта не козырь, то нельзя побить
  return false
}

function handleCardDrop(event: DragEvent, attackCard: Card) {
  event.preventDefault()

  // Получаем id и информацию о карте из данных перетаскивания
  const defendCardId = event.dataTransfer?.getData('cardId')
  const defendCardRank = event.dataTransfer?.getData('cardRank')
  const defendCardSuit = event.dataTransfer?.getData('cardSuit')

  if (defendCardId && props.isDefenderTurn) {
    // Создаем объект карты защиты
    const defendCard = {
      id: defendCardId,
      rank: defendCardRank,
      suit: defendCardSuit,
    } as Card

    // Проверяем, может ли карта побить атакующую
    if (!canCardBeat(defendCard, attackCard, props.trumpSuit)) {
      // Показываем сообщение, что карта не может отбить атаку
      const dropZone = event.currentTarget as HTMLElement
      if (dropZone) {
        dropZone.classList.add('game-table__drop-zone--error')
        setTimeout(() => {
          dropZone.classList.remove('game-table__drop-zone--error')
        }, 800)
      }

      // Отправляем событие в родительский компонент для анимации
      emit('showMessage', 'Эта карта не может отбить атаку!', 'warning')
      return
    }

    // Сохраняем выбранные карты
    selectedAttackCard.value = attackCard
    selectedDefenseCard.value = defendCard

    // Отправляем события выбора
    emit('selectAttackCard', attackCard)
    emit('selectDefenseCard', defendCard)

    // Автоматически подтверждаем защиту
    emit('confirmDefend', attackCard, defendCard)

    // Добавляем визуальный эффект успешного перетаскивания
    const dropZone = event.currentTarget as HTMLElement
    if (dropZone) {
      dropZone.classList.add('game-table__drop-zone--success')

      // Добавляем анимацию для визуального подтверждения успешного действия
      emit('showMessage', 'Карта успешно отбита!', 'defend')

      setTimeout(() => {
        dropZone.classList.remove('game-table__drop-zone--success')
      }, 800)
    }
  }
}

// Вычисляемое свойство для проверки наличия выбранной карты защиты
// Удалены неиспользуемые функции onConfirmDefend, onConfirmAttack, onTakeCards, onPass

// Функция для добавления/удаления карты из списка выбранных для атаки
function toggleAttackCard(card: Card) {
  const index = selectedAttackCards.value.findIndex((c) => c.id === card.id)
  if (index >= 0) {
    // Если карта уже выбрана, удаляем её
    selectedAttackCards.value.splice(index, 1)
  } else {
    // Иначе добавляем
    selectedAttackCards.value.push(card)

    // Добавляем небольшую анимацию для обратной связи
    const element = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement
    if (element) {
      element.classList.add('card-selected-animation')
      setTimeout(() => {
        element.classList.remove('card-selected-animation')
      }, 500)
    }
  }
}

// Удалены неиспользуемые функции onTakeCards и onPass
</script>

<style scoped>
.game-table {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 400px;
  padding: 15px;
  background-color: #2e7d32;
  border-radius: 10px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
}

/* Новый макет стола с колодой слева */
.game-table__layout {
  display: flex;
  width: 100%;
  margin-bottom: 20px;
  position: relative;
  min-width: 0;
}

.game-table__deck-area {
  flex: 0 0 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  position: relative;
  margin-right: 15px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.2);
  overflow: visible;
  padding-top: 12rem; /* Добавляем отступ сверху для компенсации отрицательного top у колоды */
  height: auto; /* Позволяем области расширяться по высоте */
}

.game-table__deck {
  width: 110px;
  height: 160px;
  background-color: #1b5e20;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  margin-bottom: 15px;
  position: relative;
  top: -10rem; /* Добавляем смещение колоды вверх */
  z-index: 50; /* Более высокий z-index для колоды, чтобы она перекрывала козырную карту */
}

.game-table__deck-pattern {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.1) 10px,
    transparent 10px,
    transparent 20px
  );
  border-radius: 10px;
}

.game-table__deck::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.1) 10px,
    transparent 10px,
    transparent 20px
  );
  border-radius: 10px;
}

.game-table__deck-empty {
  color: white;
  font-size: 16px;
  font-weight: bold;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 10px 15px;
  border-radius: 10px;
  text-align: center;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.5);
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
  position: relative;
  top: -10rem; /* Применяем такое же смещение, как для колоды */
  z-index: 30; /* Высокий z-index */
}

.game-table__deck-empty-note {
  font-size: 12px;
  font-weight: normal;
  margin-top: 5px;
  opacity: 0.8;
}

.game-table__trump {
  transform: rotate(90deg);
  margin-bottom: 15px;
  filter: drop-shadow(0 0 10px rgba(255, 255, 0, 0.4));
  animation: trump-glow 3s infinite;
  scale: 0.9;
  position: relative;
  top: -15rem; /* Применяем такое же смещение, как и для колоды */
  left: 7rem;
  z-index: 30; /* Меньший z-index, чтобы колода перекрывала козырную карту */
}

@keyframes trump-glow {
  0% {
    filter: drop-shadow(0 0 5px rgba(255, 255, 0, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 15px rgba(255, 255, 0, 0.6));
  }
  100% {
    filter: drop-shadow(0 0 5px rgba(255, 255, 0, 0.3));
  }
}

.game-table__battle-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  position: relative;
  border-radius: 15px;
  background-color: rgba(0, 0, 0, 0.1);
  box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.2);
  padding: 15px;
  min-width: 0;
  overflow: auto;
}

.game-table__deck-counter {
  position: relative;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 15px;
  border-radius: 30px;
  font-size: 14px;
  font-weight: bold;
  z-index: 55; /* Ещё более высокий z-index для счетчика, чтобы он был поверх колоды */
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
  letter-spacing: 0.5px;
  margin-top: 10px;
  text-align: center;
  width: 85%;
  /* top: -10rem; Применяем такое же смещение, как для колоды */
}

.game-table__deck-counter--low {
  background-color: rgba(244, 67, 54, 0.7);
  border-color: rgba(244, 67, 54, 0.8);
}

.game-table__deck-counter--medium {
  background-color: rgba(255, 235, 59, 0.6);
  border-color: rgba(255, 193, 7, 0.8);
  color: #333;
}

.game-table__deck-counter--high {
  background-color: rgba(76, 175, 80, 0.7);
  border-color: rgba(76, 175, 80, 0.8);
}

.game-table__deck-counter span {
  font-size: 22px;
  margin-right: 5px;
  animation: pulse-count 2s infinite;
  display: inline-block;
  min-width: 25px;
  text-align: center;
}

@keyframes pulse-count {
  0% {
    transform: scale(1);
    text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
  }
  50% {
    transform: scale(1.2);
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 3px rgba(255, 255, 255, 0.5);
  }
}

@keyframes card-selected-pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.card-selected-animation {
  animation: card-selected-pulse 0.5s ease;
}

@keyframes shine {
  0% {
    transform: scale(1);
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
  50% {
    transform: scale(1.1);
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  }
  100% {
    transform: scale(1);
    text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
}

.game-table__cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  position: relative;
  z-index: 15; /* Базовый z-index для контейнера карт */
}

.game-table__battle-area::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0.6),
    rgba(255, 255, 255, 0.4),
    rgba(255, 255, 255, 0.2),
    transparent
  );
}

.game-table__card-pair {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  margin: 0 5px;
  perspective: 1000px;
  z-index: 15; /* Базовый z-index для пары карт */
}

.game-table__attack-card {
  margin-bottom: 10px;
  transition: transform 0.3s;
  position: relative;
  z-index: 20; /* Добавляем z-index для карт атаки */
}

.card-action-label {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(255, 60, 0, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
  white-space: nowrap;
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: 25; /* Выше, чем карты */
}

.card-action-label--defend {
  background-color: rgba(0, 176, 80, 0.9);
}

.game-table__attack-card:hover .card-action-label {
  opacity: 1;
}

.game-table__attack-card--selected .card-action-label {
  opacity: 1;
}

.game-table__defense-card--selected {
  transform: scale(1.1);
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
  z-index: 25; /* Выше обычных карт */
  border: 3px solid lime;
}

.game-table__defend-card {
  margin-top: -100px; /* Накладываем карту защиты на карту атаки */
  transform: rotate(15deg) translateY(20px); /* Поворачиваем карту защиты */
  transition: transform 0.3s;
  z-index: 21; /* Чуть выше чем карты атаки */
}

.game-table__drop-zone {
  width: 120px;
  height: 80px;
  border: 2px dashed rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  text-align: center;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  z-index: 22; /* Выше чем карты защиты */
}

.game-table__drop-zone--active {
  background-color: rgba(50, 205, 50, 0.3);
  box-shadow: 0 0 15px rgba(50, 205, 50, 0.7);
}

.game-table__drop-zone--success {
  animation: dropSuccess 0.8s ease;
}

.game-table__drop-zone--error {
  animation: dropError 0.8s ease;
}

@keyframes dropSuccess {
  0% {
    background-color: rgba(50, 205, 50, 0.3);
    box-shadow: 0 0 15px rgba(50, 205, 50, 0.7);
  }
  50% {
    background-color: rgba(50, 205, 50, 0.8);
    box-shadow: 0 0 30px rgba(50, 205, 50, 1);
  }
  100% {
    background-color: rgba(50, 205, 50, 0.3);
    box-shadow: 0 0 15px rgba(50, 205, 50, 0.7);
  }
}

@keyframes dropError {
  0% {
    background-color: rgba(255, 50, 50, 0.3);
    box-shadow: 0 0 15px rgba(255, 50, 50, 0.7);
  }
  50% {
    background-color: rgba(255, 50, 50, 0.8);
    box-shadow: 0 0 30px rgba(255, 50, 50, 1);
  }
  100% {
    background-color: rgba(255, 50, 50, 0.3);
    box-shadow: 0 0 15px rgba(255, 50, 50, 0.7);
  }
}

.game-table__drop-zone:hover {
  background-color: rgba(255, 255, 255, 0.3);
  border-color: white;
  transform: scale(1.05);
}

.game-table__empty {
  color: rgba(255, 255, 255, 0.6);
  font-size: 18px;
  font-style: italic;
}

.game-table__controls {
  display: flex;
  gap: 20px;
  margin-top: 20px;
}

.game-table__button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition:
    background-color 0.2s,
    transform 0.2s;
}

.game-table__button:hover {
  transform: translateY(-3px);
}

.game-table__button--take {
  background-color: #f44336;
  color: white;
  position: relative;
  overflow: hidden;
}

.game-table__button--take:hover {
  background-color: #d32f2f;
}

.game-table__button--take::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: takeButtonShimmer 2s infinite;
}

@keyframes takeButtonShimmer {
  100% {
    left: 100%;
  }
}

.game-table__button--pass {
  background-color: #4caf50;
  color: white;
}

.game-table__button--pass:hover {
  background-color: #388e3c;
}

.game-table__button--confirm {
  background-color: #2196f3;
  color: white;
  position: relative;
  overflow: hidden;
  font-weight: bold;
  font-size: 16px;
  min-width: 160px;
  border: 2px solid #1976d2;
}

.game-table__button--confirm:hover {
  background-color: #0d8bf2;
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.game-table__button--confirm::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: confirmButtonShimmer 2s infinite;
}

@keyframes confirmButtonShimmer {
  100% {
    left: 100%;
  }
}

.game-table__status {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 16px;
  text-shadow: 0 0 3px rgba(0, 0, 0, 0.8);
  background-color: rgba(0, 0, 0, 0.5);
  padding: 8px 15px;
  border-radius: 20px;
  max-width: 90%;
  text-align: center;
  font-weight: bold;
  z-index: 100; /* Высокий z-index для отображения поверх карт */
}

.game-table__selection-status {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  z-index: 100;
  display: flex;
  align-items: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  animation: fadeIn 0.3s ease-in-out;
}

.game-table__selection-hint {
  font-size: 12px;
  font-weight: normal;
  color: #ffcc00;
  margin-top: 5px;
  font-style: italic;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes shield-pulse {
  0% {
    transform: scale(1);
    filter: drop-shadow(0 0 3px rgba(33, 150, 243, 0.5));
  }
  50% {
    transform: scale(1.15);
    filter: drop-shadow(0 0 8px rgba(33, 150, 243, 0.8));
  }
  100% {
    transform: scale(1);
    filter: drop-shadow(0 0 3px rgba(33, 150, 243, 0.5));
  }
}

.game-table__instructions {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.25); /* Более яркий фон */
  border-radius: 10px;
  padding: 12px 18px; /* Немного увеличиваем отступы */
  margin: 10px 0;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); /* Более заметная тень */
  border-left: 5px solid #ffc107; /* Более яркая и широкая боковая полоса */
  max-width: 80%;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  z-index: 100; /* Очень высокий z-index, чтобы отображаться поверх всех карт */
}

.game-table__instructions-icon {
  font-size: 26px; /* Увеличиваем размер */
  margin-right: 15px;
  animation: pulse 1.5s infinite; /* Ускоряем анимацию */
  color: #ffc107; /* Яркий золотистый цвет */
  text-shadow: 0 0 8px rgba(255, 193, 7, 0.6); /* Добавляем свечение */
}

.game-table__instructions-text {
  color: white;
  font-size: 16px;
  line-height: 1.4;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7); /* Добавляем тень для текста */
}

.game-table__instructions-text p {
  margin: 0;
  font-weight: 500; /* Немного увеличиваем толщину шрифта */
}

.game-table__instructions-tip {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 5px;
  font-style: italic;
}

.shield-icon {
  display: inline-block;
  animation: shield-pulse 2s infinite;
  margin-right: 4px;
}

.highlight-text {
  background-color: rgba(255, 215, 0, 0.3);
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
  font-weight: bold;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.5px;
}
</style>
