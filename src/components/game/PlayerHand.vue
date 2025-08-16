<template>
  <div class="player-hand" :class="{ 'player-hand--active': isActive }">
    <div class="player-hand__cards">
      <CardComponent
        v-for="(card, index) in cards"
        :key="card.id"
        :card="card"
        :trump-suit="trumpSuit"
        :selectable="isActive && selectable"
        :index="index"
        :total-cards="cards.length"
        :draggable="isActive && selectable"
        @select="onCardSelect"
        @dragstart="onDragStart"
        @drag="onDrag"
        @dragend="onDragEnd"
      />
    </div>
    <div class="player-hand__info">
      <div class="player-hand__name">{{ name }}</div>
      <div class="player-hand__status" v-if="status">{{ status }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { Card, Suit } from '../../models/types'

// Создаем тип для события перетаскивания
interface DragEvent extends MouseEvent {
  dataTransfer?: DataTransfer
}

// Импортируем компонент карты
const CardComponent = defineAsyncComponent(() => import('./CardComponent.vue'))

defineProps<{
  cards: Card[]
  name: string
  isActive: boolean
  selectable: boolean
  status?: string
  trumpSuit?: Suit
}>()

const emit = defineEmits<{
  (e: 'cardSelect', card: Card): void
}>()

function onCardSelect(card: Card) {
  emit('cardSelect', card)
}

// Обработчики для перетаскивания
function onDragStart(card: Card, event: DragEvent) {
  // Создаем объект dataTransfer для хранения данных о перетаскиваемой карте
  if (event.dataTransfer) {
    event.dataTransfer.setData('cardId', card.id)
    event.dataTransfer.setData('cardRank', card.rank)
    event.dataTransfer.setData('cardSuit', card.suit)
    event.dataTransfer.effectAllowed = 'move'
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onDrag(_card: Card, _data: { x: number; y: number; event: MouseEvent }) {
  // Дополнительная логика во время перетаскивания, если нужна
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function onDragEnd(_card: Card, _event: MouseEvent) {
  // Логика после окончания перетаскивания
  // Эффект отбоя уже реализован в CardComponent
}
</script>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.05);
  transition:
    box-shadow 0.3s,
    background-color 0.3s;
}

.player-hand--active {
  background-color: rgba(0, 120, 255, 0.1);
  box-shadow: 0 0 15px rgba(0, 120, 255, 0.5);
  position: relative;
}

.player-hand--active::before {
  content: 'Ваш ход';
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 120, 255, 0.8);
  color: white;
  padding: 5px 15px;
  border-radius: 15px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: translateX(-50%) scale(1);
  }
  50% {
    transform: translateX(-50%) scale(1.05);
  }
  100% {
    transform: translateX(-50%) scale(1);
  }
}

.player-hand__cards {
  display: flex;
  justify-content: center;
  position: relative;
  min-height: 200px;
  min-width: 1200px; /* Значительно увеличиваем минимальную ширину для размещения карт без перекрытия */
  margin-bottom: 10px;
  perspective: 1000px;
}

.player-hand__info {
  text-align: center;
}

.player-hand__name {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.player-hand__status {
  font-size: 14px;
  color: #555;
  font-style: italic;
}
</style>
