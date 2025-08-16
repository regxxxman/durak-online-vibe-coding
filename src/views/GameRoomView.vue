<template>
  <div class="game-room">
    <div class="game-room__header">
      <h1 class="game-room__title">Комната: {{ room?.name }}</h1>
      <div class="game-room__status">{{ gameStatusText }}</div>
      <button class="game-room__leave-btn" @click="leaveRoom">Выйти</button>
    </div>

    <div class="game-room__content">
      <div class="game-room__opponents">
        <PlayerHand
          v-for="player in opponentPlayers"
          :key="player.id"
          :cards="player.cards"
          :name="player.name"
          :is-active="isPlayerTurn(player)"
          :selectable="false"
          :status="getPlayerStatus(player)"
        />
      </div>

      <div class="game-room__table">
        <GameTable
          v-if="gameState"
          :table="gameState.table"
          :deck-count="Number(gameState.deck || 0)"
          :trump-card="gameState.trumpCard"
          :trump-suit="gameState.trumpSuit"
          :is-attacker-turn="isCurrentPlayerAttacker"
          :is-defender-turn="isCurrentPlayerDefender"
          :is-player-turn="isCurrentPlayerActive"
          :can-pass="canPass"
          :status="tableStatus"
          :deck-empty="isDeckEmpty"
          @defend-card="defendCard"
          @take-cards="takeCards"
          @pass="pass"
          @select-attack-card="onSelectAttackCard"
          @select-defense-card="onSelectDefenseCard"
          @confirm-defend="onConfirmDefend"
          @confirm-attack="onConfirmAttack"
          @show-message="showMessage"
        />

        <div v-else class="game-room__waiting">
          <p>Ожидание начала игры...</p>
          <button v-if="canStartGame" class="game-room__start-btn" @click="startGame">
            Начать игру
          </button>
        </div>
      </div>

      <div class="game-room__current-player" v-if="currentPlayer">
        <PlayerHand
          :cards="currentPlayer.cards"
          :name="`${currentPlayer.name} (Вы)`"
          :is-active="isCurrentPlayerActive"
          :selectable="isCurrentPlayerActive"
          :status="getPlayerStatus(currentPlayer)"
          :trump-suit="gameState?.trumpSuit"
          @card-select="onCardSelect"
        />
      </div>
    </div>

    <div class="game-room__sidebar">
      <div class="game-room__players">
        <h3>Игроки</h3>
        <ul class="game-room__players-list">
          <li
            v-for="player in room?.players"
            :key="player.id"
            :class="{
              'game-room__player--current': isCurrentPlayerId(player.id),
              'game-room__player--active': isPlayerTurn(player),
              'game-room__player--disconnected': !player.connected,
            }"
          >
            {{ player.name }}
            <span v-if="isPlayerTurn(player)" class="game-room__player-turn">Ходит</span>
            <span v-if="!player.connected" class="game-room__player-disconnected">Отключен</span>
          </li>
        </ul>
      </div>

      <div class="game-room__chat">
        <h3>Чат</h3>
        <div class="game-room__chat-messages" ref="chatMessagesRef">
          <div
            v-for="message in chatMessages"
            :key="message.id"
            class="game-room__chat-message"
            :class="{ 'game-room__chat-message--own': isCurrentPlayerId(message.playerId) }"
          >
            <span class="game-room__chat-name">{{ message.playerName }}:</span>
            <span class="game-room__chat-text">{{ message.text }}</span>
            <span class="game-room__chat-time">
              {{ formatMessageTime(message.timestamp) }}
            </span>
          </div>
        </div>
        <div class="game-room__chat-input">
          <input
            v-model="chatMessage"
            @keyup.enter="sendChatMessage"
            placeholder="Введите сообщение..."
          />
          <button @click="sendChatMessage">Отправить</button>
        </div>
      </div>
    </div>

    <div class="game-room__result" v-if="gameResult">
      <div class="game-room__result-content">
        <h2>Игра завершена</h2>
        <p v-if="isWinner">Поздравляем! Вы победили!</p>
        <p v-else-if="isLoser">К сожалению, вы проиграли и стали "дураком".</p>
        <p v-else>Игра завершена.</p>
        <p class="game-room__result-rules">
          В классическом "Дураке" игра заканчивается, когда колода пуста и один из игроков избавился
          от всех карт. Последний игрок с картами считается "дураком".
        </p>
        <button @click="leaveRoom">Вернуться в лобби</button>
      </div>
    </div>

    <!-- Анимация для ходов -->
    <TurnAnimation ref="turnAnimationRef" />

    <!-- Всегда видимые кнопки подтверждения -->
    <ConfirmationButtons
      v-if="isCurrentPlayerActive && gameState"
      :is-attacker-turn="isCurrentPlayerAttacker"
      :is-defender-turn="isCurrentPlayerDefender"
      :pending-attack-cards="pendingAttackCards"
      :selected-attack-card="selectedAttackCard"
      :selected-defense-card="selectedDefenseCard"
      :can-pass="canPass"
      @confirm-attack="onConfirmAttack"
      @confirm-defense="onConfirmDefend"
      @take-cards="takeCards"
      @pass="pass"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { GameStatus } from '../models/types'
import type { Card, Player } from '../models/types'

// Импортируем компоненты асинхронно
const PlayerHand = defineAsyncComponent(() => import('../components/game/PlayerHand.vue'))
const GameTable = defineAsyncComponent(() => import('../components/game/GameTable.vue'))
const TurnAnimation = defineAsyncComponent(() => import('../components/game/TurnAnimation.vue'))
const ConfirmationButtons = defineAsyncComponent(
  () => import('../components/game/ConfirmationButtons.vue'),
)

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const chatMessage = ref('')
const chatMessagesRef = ref<HTMLElement | null>(null)
const turnAnimationRef = ref<any>(null)
const selectedCard = ref<Card | null>(null)
const selectedAttackCard = ref<Card | null>(null)
const selectedDefenseCard = ref<Card | null>(null)
const pendingAttackCards = ref<Card[]>([])
const pendingDefenseMove = ref(false)

// Состояние подключения к WebSocket
const isConnected = computed(() => gameStore.connected)

// Получаем ID комнаты из маршрута
const roomId = computed(() => route.params.id as string)

// Получаем данные из хранилища
const room = computed(() => gameStore.currentRoom)
const gameState = computed(() => {
  // Вывести в консоль структуру gameState для отладки
  if (gameStore.gameState) {
    console.log('GameState structure:', gameStore.gameState)
  }
  return gameStore.gameState
})
const currentPlayer = computed(() => gameStore.currentPlayer)
const chatMessages = computed(() => gameStore.chatMessages)

// Вычисляемые свойства для игрового процесса
const isCurrentPlayerActive = computed(() => gameStore.canMakeMove)
const isCurrentPlayerAttacker = computed(() => gameStore.isAttacker)
const isCurrentPlayerDefender = computed(() => gameStore.isDefender)

const opponentPlayers = computed(() => {
  if (!gameState.value || !gameStore.playerId) return []

  return gameState.value.players.filter((player) => player.id !== gameStore.playerId)
})

const gameStatusText = computed(() => {
  if (!gameState.value) return 'Ожидание игроков'

  switch (gameState.value.status) {
    case GameStatus.WAITING:
      return 'Ожидание начала игры'
    case GameStatus.PLAYING:
      return 'Игра идет'
    case GameStatus.FINISHED:
      return 'Игра завершена'
    default:
      return ''
  }
})

const tableStatus = computed(() => {
  if (!gameState.value) return ''

  if (isCurrentPlayerAttacker.value) {
    return '🎮 Ваш ход! Выберите карты для атаки и нажмите яркую кнопку "ПОДТВЕРДИТЬ ХОД" внизу экрана.'
  } else if (isCurrentPlayerDefender.value) {
    if (selectedAttackCard.value) {
      return `🛡️ Защищайтесь! Выберите карту из руки, чтобы отбиться от ${selectedAttackCard.value.rank} ${selectedAttackCard.value.suit}, затем нажмите "ПОДТВЕРДИТЬ ЗАЩИТУ"`
    }
    return '🛡️ Сначала выберите карту атаки, затем карту защиты из руки, затем нажмите "ПОДТВЕРДИТЬ ЗАЩИТУ"'
  } else {
    const currentPlayerName = gameState.value.players.find(
      (p) => p.id === gameState.value?.currentPlayerId,
    )?.name

    return `👉 Ход игрока: ${currentPlayerName || 'Неизвестно'}`
  }
})

const isDeckEmpty = computed(() => {
  return Boolean(gameState.value && Number(gameState.value.deck) === 0)
})

const canStartGame = computed(() => {
  return (
    room.value &&
    room.value.players &&
    room.value.players.length >= 2 &&
    room.value.status === GameStatus.WAITING &&
    room.value.players[0]?.id === gameStore.playerId
  )
})

const canPass = computed(() => {
  if (!gameState.value || !isCurrentPlayerAttacker.value) return false

  // Можно сказать "Бито", если есть хотя бы одна карта на столе
  // и все карты атаки защищены
  return (
    gameState.value.table.attackCards.length > 0 &&
    gameState.value.table.attackCards.length === gameState.value.table.defendCards.length
  )
})

const gameResult = computed(() => {
  return gameState.value?.status === GameStatus.FINISHED
})

const isWinner = computed(() => {
  return gameState.value?.winner === gameStore.playerId
})

const isLoser = computed(() => {
  return gameState.value?.loser === gameStore.playerId
})

// Следим за ошибками при входе в комнату
watch(() => gameStore.roomNotFound, (roomNotFound) => {
  if (roomNotFound) {
    console.error('Комната не найдена')
    showMessage('Комната не найдена. Возврат в лобби...', 'error')
    
    // Очищаем данные комнаты
    gameStore.currentRoomId = null
    gameStore.gameState = null
    
    // Автоматический выход на главную страницу
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }
})

// Следим за изменением состояния подключения
watch(isConnected, (connected) => {
  if (!connected && gameStore.webSocket) {
    console.error('WebSocket соединение потеряно')
    showMessage('Соединение с сервером потеряно. Возврат в лобби...', 'error')
    
    // Пытаемся восстановить соединение
    setTimeout(async () => {
      try {
        // Пробуем переподключиться
        await gameStore.initWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3000')
        
        // Если удалось восстановить соединение, пытаемся заново войти в комнату
        if (gameStore.connected && roomId.value && gameStore.playerName) {
          const success = await gameStore.joinRoom(roomId.value, gameStore.playerName)
          
          if (!success) {
            // Если не удалось войти в комнату, перенаправляем в лобби
            showMessage('Не удалось восстановить соединение с комнатой. Возврат в лобби...', 'error')
            setTimeout(() => leaveRoom(), 2000)
          }
        } else {
          // Если не удалось восстановить соединение, перенаправляем в лобби
          showMessage('Не удалось восстановить соединение. Возврат в лобби...', 'error')
          setTimeout(() => leaveRoom(), 2000)
        }
      } catch (error) {
        console.error('Ошибка при восстановлении соединения:', error)
        setTimeout(() => leaveRoom(), 2000)
      }
    }, 3000)
  }
})

// Жизненный цикл компонента
onMounted(async () => {
  // Проверяем, есть ли идентификатор комнаты в URL
  if (!roomId.value) {
    console.error('Отсутствует ID комнаты')
    showMessage('Неверный URL комнаты. Возврат в лобби...', 'error')
    
    setTimeout(() => {
      router.push('/')
    }, 2000)
    return
  }

  // Сначала проверяем, существует ли комната
  if (gameStore.roomNotFound) {
    console.error('Комната не найдена при монтировании компонента')
    showMessage('Комната не найдена. Возврат в лобби...', 'error')
    
    setTimeout(() => {
      router.push('/')
    }, 2000)
    return
  }

  // Проверяем, авторизован ли пользователь
  if (!gameStore.playerName) {
    const playerName = prompt('Введите ваше имя:', '')

    if (!playerName) {
      router.push('/')
      return
    }

    gameStore.playerName = playerName
  }

  // Загружаем список комнат для проверки существования
  await gameStore.loadRooms()
  const roomExists = gameStore.availableRooms.some(room => room.id === roomId.value)
  
  if (!roomExists) {
    console.error(`Комната с ID ${roomId.value} не найдена в списке`)
    showMessage('Комната не найдена в списке доступных комнат. Возврат в лобби...', 'error')
    
    setTimeout(() => {
      router.push('/')
    }, 2000)
    return
  }

  // Подключаемся к игровой комнате
  if (roomId.value) {
    const success = await gameStore.joinRoom(roomId.value, gameStore.playerName as string)
    
    // Если не удалось подключиться к комнате, переходим на главную страницу
    if (!success || gameStore.roomNotFound) {
      console.error('Не удалось подключиться к комнате')
      showMessage('Комната не найдена или недоступна. Возврат в лобби...', 'error')
      
      // Задержка перед переходом, чтобы пользователь увидел сообщение
      setTimeout(() => {
        router.push('/')
      }, 2000)
      return
    }
    
    // Дополнительная проверка - получили ли мы состояние игры и комнаты
    setTimeout(() => {
      if (!gameState.value && !room.value) {
        console.error('Не удалось получить данные комнаты после подключения')
        showMessage('Не удалось загрузить данные комнаты. Возврат в лобби...', 'error')
        
        setTimeout(() => {
          leaveRoom()
        }, 2000)
      }
    }, 5000) // Даем 5 секунд на получение данных комнаты
  }
})

onUnmounted(() => {
  gameStore.leaveRoom()
})

// Прокрутка чата вниз при новых сообщениях
watch(
  chatMessages,
  () => {
    nextTick(() => {
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
      }
    })
  },
  { deep: true },
)

// Методы компонента
function isCurrentPlayerId(id: string): boolean {
  return id === gameStore.playerId
}

function isPlayerTurn(player: Player): boolean {
  return gameState.value?.currentPlayerId === player.id
}

function getPlayerStatus(player: Player): string {
  if (!gameState.value) return ''

  if (player.isAttacker) {
    return 'Атакует'
  } else if (player.isDefender) {
    return 'Защищается'
  }

  return ''
}

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

function sendChatMessage() {
  if (!chatMessage.value.trim()) return

  gameStore.sendChatMessage(chatMessage.value)
  chatMessage.value = ''
}

function onCardSelect(card: Card) {
  if (!isCurrentPlayerActive.value) return

  selectedCard.value = card

  if (isCurrentPlayerAttacker.value) {
    // Если атакующий, добавляем карту в ожидающие атаки
    // Проверка на одинаковый ранг карт
    if (pendingAttackCards.value.length > 0 && card.rank !== pendingAttackCards.value[0].rank) {
      if (turnAnimationRef.value) {
        turnAnimationRef.value.play('Можно выбирать только карты одного достоинства!', 'warning')
      }
      return
    }

    const index = pendingAttackCards.value.findIndex((c) => c.id === card.id)
    if (index >= 0) {
      pendingAttackCards.value.splice(index, 1)
    } else {
      pendingAttackCards.value.push(card)
    }
  } else if (isCurrentPlayerDefender.value) {
    // Новая логика: сначала выбираем карту для защиты
    selectedDefenseCard.value = card

    // Если уже выбрана карта атаки, то показываем, что защита готова
    if (selectedAttackCard.value) {
      pendingDefenseMove.value = true
    } else {
      // Иначе ждем выбора карты атаки
      // Показываем подсказку
      if (turnAnimationRef.value) {
        turnAnimationRef.value.play('Теперь выберите карту атаки, которую хотите отбить', 'success')
      }
    }
  }
}

// Обработчик выбора карты атаки для защиты
function onSelectAttackCard(attackCard: Card) {
  if (isCurrentPlayerDefender.value) {
    selectedAttackCard.value = attackCard

    // Если уже выбрана карта защиты, сразу готовим защиту
    if (selectedDefenseCard.value) {
      pendingDefenseMove.value = true
      // Автоматически подтверждаем защиту, если карты выбраны
      onConfirmDefend()
    } else {
      // Подсказка о выборе карты защиты
      if (turnAnimationRef.value) {
        turnAnimationRef.value.play('Выберите карту из руки для защиты', 'defend')
      }
    }
  } else if (isCurrentPlayerAttacker.value) {
    // Проверка, что выбранные карты имеют одинаковый ранг
    if (
      pendingAttackCards.value.length > 0 &&
      attackCard.rank !== pendingAttackCards.value[0].rank
    ) {
      // Показываем анимацию с предупреждением
      if (turnAnimationRef.value) {
        turnAnimationRef.value.play('Можно выбирать только карты одного достоинства!', 'warning')
      }
      return
    }

    // Для атакующего добавляем или удаляем карту из списка ожидающих
    const index = pendingAttackCards.value.findIndex((c) => c.id === attackCard.id)
    if (index >= 0) {
      pendingAttackCards.value.splice(index, 1)
    } else {
      pendingAttackCards.value.push(attackCard)
    }
  }
}

// Обработчик выбора карты защиты
function onSelectDefenseCard(defenseCard: Card) {
  if (isCurrentPlayerDefender.value && selectedAttackCard.value) {
    selectedDefenseCard.value = defenseCard
    pendingDefenseMove.value = true
  }
}

// Показать сообщение через анимацию
function showMessage(message: string, type: string) {
  if (turnAnimationRef.value) {
    turnAnimationRef.value.play(message, type)
  }
}

// Обработчик подтверждения атаки
function onConfirmAttack() {
  if (!isCurrentPlayerAttacker.value || pendingAttackCards.value.length === 0) return

  // Отправляем все выбранные карты на сервер
  pendingAttackCards.value.forEach((card) => {
    gameStore.attackWithCard(card.id)
  })

  // Вызываем метод подтверждения атаки
  gameStore.confirmAttack()

  // Показываем анимацию атаки
  if (turnAnimationRef.value) {
    turnAnimationRef.value.play(`Атака: ${pendingAttackCards.value.length} карт!`, 'attack')
  }

  // Очищаем список ожидающих карт
  pendingAttackCards.value = []
}

// Обработчик подтверждения защиты
function onConfirmDefend() {
  if (!isCurrentPlayerDefender.value || !selectedAttackCard.value || !selectedDefenseCard.value)
    return

  // Отправляем защиту на сервер
  gameStore.defendWithCard(selectedAttackCard.value.id, selectedDefenseCard.value.id)

  // Вызываем метод подтверждения защиты
  gameStore.confirmDefend()

  // Показываем анимацию защиты
  if (turnAnimationRef.value) {
    turnAnimationRef.value.play('Карта отбита!', 'defend')
  }

  // Сбрасываем выбранные карты
  selectedAttackCard.value = null
  selectedDefenseCard.value = null
  pendingDefenseMove.value = false
}

function defendCard(attackCardId: string, defendCardId: string) {
  gameStore.defendWithCard(attackCardId, defendCardId)
}

function takeCards() {
  gameStore.takeCards()
}

function pass() {
  gameStore.pass()
}

function startGame() {
  gameStore.startGame()
}

function leaveRoom() {
  gameStore.leaveRoom()
  router.push('/')
}
</script>

<style scoped>
.game-room {
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    'header header'
    'content sidebar';
  height: 100vh;
  padding: 20px;
  gap: 20px;
}

.game-room__header {
  grid-area: header;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

.game-room__title {
  font-size: 24px;
  margin: 0;
}

.game-room__status {
  font-style: italic;
  color: #666;
}

.game-room__leave-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.game-room__leave-btn:hover {
  background-color: #d32f2f;
}

.game-room__content {
  grid-area: content;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.game-room__opponents {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
}

.game-room__table {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.game-room__waiting {
  text-align: center;
  padding: 30px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.game-room__start-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 10px;
  transition: background-color 0.2s;
}

.game-room__start-btn:hover {
  background-color: #388e3c;
}

.game-room__current-player {
  margin-top: auto;
}

.game-room__sidebar {
  grid-area: sidebar;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
}

.game-room__players,
.game-room__chat {
  background-color: #f5f5f5;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.game-room__players h3,
.game-room__chat h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 18px;
}

.game-room__players-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.game-room__players-list li {
  padding: 8px;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-room__players-list li:last-child {
  border-bottom: none;
}

.game-room__player--current {
  font-weight: bold;
}

.game-room__player--active {
  background-color: rgba(76, 175, 80, 0.1);
}

.game-room__player--disconnected {
  color: #999;
  font-style: italic;
}

.game-room__player-turn {
  color: #4caf50;
  font-size: 12px;
  font-weight: bold;
}

.game-room__player-disconnected {
  color: #f44336;
  font-size: 12px;
}

.game-room__chat {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.game-room__chat-messages {
  flex: 1;
  overflow-y: auto;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  padding: 10px;
  background-color: white;
  max-height: 300px;
}

.game-room__chat-message {
  margin-bottom: 8px;
  padding: 5px;
  border-radius: 5px;
  background-color: #f0f0f0;
}

.game-room__chat-message--own {
  background-color: #e3f2fd;
  text-align: right;
}

.game-room__chat-name {
  font-weight: bold;
  margin-right: 5px;
}

.game-room__chat-text {
  word-break: break-word;
}

.game-room__chat-time {
  font-size: 11px;
  color: #999;
  margin-left: 5px;
}

.game-room__chat-input {
  display: flex;
  gap: 10px;
}

.game-room__chat-input input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.game-room__chat-input button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.game-room__chat-input button:hover {
  background-color: #1976d2;
}

.game-room__result {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.game-room__result-content {
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.game-room__result-content h2 {
  margin-top: 0;
}

.game-room__result-rules {
  margin-top: 20px;
  font-size: 14px;
  color: #666;
  font-style: italic;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.game-room__result-content button {
  background-color: #2196f3;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  margin-top: 20px;
  transition: background-color 0.2s;
}

.game-room__result-content button:hover {
  background-color: #1976d2;
}
</style>
