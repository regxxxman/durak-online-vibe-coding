<template>
  <div class="lobby">
    <div class="lobby__header">
      <h1>Дурак онлайн</h1>
      <div class="lobby__user" v-if="playerName">
        <span>{{ playerName }}</span>
        <button class="lobby__logout-btn" @click="logout">Выйти</button>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div class="lobby__error-message" v-if="gameStore.error">
      {{ gameStore.error }}
      <button class="lobby__error-close" @click="clearError">×</button>
    </div>

    <div class="lobby__content">
      <div class="lobby__rooms">
        <div class="lobby__rooms-header">
          <h2>Доступные комнаты</h2>
          <button class="lobby__refresh-btn" @click="loadRooms">
            <span class="lobby__refresh-icon">↻</span> Обновить
          </button>
        </div>

        <div class="lobby__rooms-list" v-if="!loading">
          <div
            v-for="room in availableRooms"
            :key="room.id"
            class="lobby__room-card"
            :class="{ 'lobby__room-card--playing': room.status === 'playing' }"
            @click="joinRoom(room.id)"
          >
            <div class="lobby__room-name">{{ room.name }}</div>
            <div class="lobby__room-players">
              Игроки: {{ room.players.length }} / {{ room.maxPlayers }}
            </div>
            <div class="lobby__room-status" :class="`lobby__room-status--${room.status}`">
              {{ getRoomStatusText(room.status) }}
            </div>
            <div class="lobby__room-time">Создана: {{ formatTime(room.createdAt) }}</div>
          </div>

          <div v-if="availableRooms.length === 0" class="lobby__no-rooms">
            Нет доступных комнат. Создайте новую комнату!
          </div>
        </div>

        <div v-else class="lobby__loading">Загрузка комнат...</div>
      </div>

      <div class="lobby__actions">
        <button class="lobby__create-btn" @click="showCreateRoomDialog = true">
          Создать комнату
        </button>
      </div>
    </div>

    <!-- Диалог для создания новой комнаты -->
    <div class="lobby__dialog-overlay" v-if="showCreateRoomDialog">
      <div class="lobby__dialog">
        <h3>Создание новой комнаты</h3>
        <div class="lobby__dialog-content">
          <div class="lobby__dialog-field">
            <label for="roomName">Название комнаты:</label>
            <input
              id="roomName"
              v-model="newRoomName"
              placeholder="Введите название комнаты"
              @keyup.enter="createRoom"
            />
          </div>

          <div class="lobby__dialog-field">
            <label for="maxPlayers">Максимальное количество игроков:</label>
            <select id="maxPlayers" v-model="newRoomMaxPlayers">
              <option value="2">2 игрока</option>
              <option value="3">3 игрока</option>
              <option value="4">4 игрока</option>
              <option value="6">6 игроков</option>
            </select>
          </div>
        </div>

        <div class="lobby__dialog-actions">
          <button class="lobby__dialog-cancel" @click="showCreateRoomDialog = false">Отмена</button>
          <button class="lobby__dialog-confirm" @click="createRoom" :disabled="!newRoomName.trim()">
            Создать
          </button>
        </div>
      </div>
    </div>

    <!-- Диалог для ввода имени -->
    <div class="lobby__dialog-overlay" v-if="showNameDialog">
      <div class="lobby__dialog">
        <h3>Добро пожаловать в игру "Дурак"</h3>
        <div class="lobby__dialog-content">
          <div class="lobby__dialog-field">
            <label for="playerName">Ваше имя:</label>
            <input
              id="playerName"
              v-model="nameInput"
              placeholder="Введите ваше имя"
              @keyup.enter="setPlayerName"
            />
          </div>
        </div>

        <div class="lobby__dialog-actions">
          <button
            class="lobby__dialog-confirm"
            @click="setPlayerName"
            :disabled="!nameInput.trim()"
          >
            Начать
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { GameStatus } from '../models/types'
import type { GameRoom } from '../models/types'

const router = useRouter()
const gameStore = useGameStore()

// Состояние компонента
const showCreateRoomDialog = ref(false)
const showNameDialog = ref(false)
const newRoomName = ref('')
const newRoomMaxPlayers = ref(4)
const nameInput = ref('')

// Получаем данные из хранилища
const availableRooms = computed(() => gameStore.availableRooms)
const loading = computed(() => gameStore.loading)
const playerName = computed(() => gameStore.playerName)
const refreshInterval = ref<number | null>(null)
const isConnected = computed(() => gameStore.connected)

// Следим за изменением состояния подключения
watch(isConnected, (connected) => {
  if (!connected && gameStore.webSocket) {
    // Если соединение разорвано, выводим сообщение и пытаемся переподключиться
    console.error('WebSocket соединение потеряно')
    // Показываем сообщение пользователю
    alert('Соединение с сервером потеряно. Пожалуйста, обновите страницу.')

    // Попытка переподключения через несколько секунд
    setTimeout(async () => {
      // Добавляем логирование WebSocket URL для отладки
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
      console.log('Connecting to WebSocket server at:', wsUrl)
      await gameStore.initWebSocket(wsUrl)
      if (gameStore.connected) {
        // Если подключение восстановлено, обновляем список комнат
        await loadRooms()
      }
    }, 5000)
  }
})

onMounted(async () => {
  // Инициализируем WebSocket соединение
  // Добавляем логирование WebSocket URL для отладки
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
  console.log('Connecting to WebSocket server at:', wsUrl)
  await gameStore.initWebSocket(wsUrl)

  // Загружаем список комнат
  await loadRooms()

  // Настраиваем автоматическое обновление списка комнат каждые 10 секунд
  refreshInterval.value = window.setInterval(() => {
    loadRooms()
  }, 10000)

  // Если нет имени игрока, показываем диалог ввода имени
  if (!playerName.value) {
    showNameDialog.value = true
  }
})

// Очищаем интервал при уничтожении компонента
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

// Методы компонента
async function loadRooms() {
  await gameStore.loadRooms()
}

function getRoomStatusText(status: string): string {
  switch (status) {
    case GameStatus.WAITING:
      return 'Ожидание игроков'
    case GameStatus.PLAYING:
      return 'Игра идет'
    case GameStatus.FINISHED:
      return 'Игра завершена'
    default:
      return 'Неизвестный статус'
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

async function createRoom() {
  if (!newRoomName.value.trim()) return

  const room = await gameStore.createRoom(newRoomName.value, Number(newRoomMaxPlayers.value))

  if (room) {
    showCreateRoomDialog.value = false
    router.push(`/room/${room.id}`)
  }

  // Сбрасываем поля формы
  newRoomName.value = ''
  newRoomMaxPlayers.value = 4
}

async function joinRoom(roomId: string) {
  if (!playerName.value) {
    showNameDialog.value = true
    return
  }

  router.push(`/room/${roomId}`)
}

function setPlayerName() {
  if (!nameInput.value.trim()) return

  gameStore.playerName = nameInput.value
  showNameDialog.value = false
}

function logout() {
  gameStore.playerName = null
  showNameDialog.value = true
}

// Очищаем сообщение об ошибке
function clearError() {
  gameStore.error = null
}
</script>

<style scoped>
.lobby {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.lobby__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.lobby__header h1 {
  margin: 0;
  font-size: 32px;
  color: #333;
}

.lobby__error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 10px 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lobby__error-close {
  background: none;
  border: none;
  color: #c62828;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
}

.lobby__user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.lobby__user span {
  font-weight: bold;
}

.lobby__logout-btn {
  background-color: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.lobby__logout-btn:hover {
  background-color: #d32f2f;
}

.lobby__content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lobby__rooms {
  background-color: #f5f5f5;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.lobby__rooms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.lobby__rooms-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.lobby__refresh-btn {
  background-color: #e0e0e0;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background-color 0.2s;
}

.lobby__refresh-btn:hover {
  background-color: #d0d0d0;
}

.lobby__refresh-icon {
  font-size: 16px;
}

.lobby__rooms-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.lobby__room-card {
  background-color: white;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.lobby__room-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.lobby__room-card--playing {
  border-left: 4px solid #4caf50;
}

.lobby__room-name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.lobby__room-players,
.lobby__room-time {
  color: #666;
  margin-bottom: 5px;
  font-size: 14px;
}

.lobby__room-status {
  font-weight: bold;
  margin-bottom: 10px;
}

.lobby__room-status--waiting {
  color: #2196f3;
}

.lobby__room-status--playing {
  color: #4caf50;
}

.lobby__room-status--finished {
  color: #f44336;
}

.lobby__no-rooms {
  grid-column: 1 / -1;
  text-align: center;
  padding: 30px;
  color: #666;
  font-style: italic;
}

.lobby__loading {
  text-align: center;
  padding: 30px;
  color: #666;
  font-style: italic;
}

.lobby__actions {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.lobby__create-btn {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.lobby__create-btn:hover {
  background-color: #388e3c;
}

.lobby__dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lobby__dialog {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
}

.lobby__dialog h3 {
  margin-top: 0;
  margin-bottom: 20px;
  text-align: center;
}

.lobby__dialog-content {
  margin-bottom: 20px;
}

.lobby__dialog-field {
  margin-bottom: 15px;
}

.lobby__dialog-field label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.lobby__dialog-field input,
.lobby__dialog-field select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.lobby__dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.lobby__dialog-cancel,
.lobby__dialog-confirm {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.lobby__dialog-cancel {
  background-color: #e0e0e0;
}

.lobby__dialog-cancel:hover {
  background-color: #d0d0d0;
}

.lobby__dialog-confirm {
  background-color: #2196f3;
  color: white;
}

.lobby__dialog-confirm:hover {
  background-color: #1976d2;
}

.lobby__dialog-confirm:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}
</style>
