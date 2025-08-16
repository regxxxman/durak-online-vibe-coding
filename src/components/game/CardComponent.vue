<template>
  <div
    class="card"
    :data-card-id="card.id"
    :class="{
      'card--trump': isTrump,
      'card--selectable': selectable,
      'card--selected': selected,
      'card--dragging': isDragging,
    }"
    :style="cardStyle"
    :draggable="draggable"
    @click="handleClick"
    @mouseover="handleMouseOver"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
  >
    <div class="card__content" :class="[`card--${card.suit}`, `card--${card.rank}`]">
      <div class="card__corner card__corner--top">
        <span class="card__rank">{{ card.rank }}</span>
        <span class="card__suit" v-html="suitSymbol"></span>
      </div>

      <div class="card__center">
        <span class="card__suit-large" v-html="suitSymbol"></span>
      </div>

      <div class="card__corner card__corner--bottom">
        <span class="card__rank">{{ card.rank }}</span>
        <span class="card__suit" v-html="suitSymbol"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Card } from '../../models/types'
import { Suit } from '../../models/types'

const props = defineProps<{
  card: Card
  trumpSuit?: Suit
  selectable?: boolean
  draggable?: boolean
  index?: number
  totalCards?: number
}>()

const emit = defineEmits<{
  (e: 'select', card: Card): void
  (e: 'dragstart', card: Card, event: MouseEvent): void
  (e: 'drag', card: Card, data: { x: number; y: number; event: MouseEvent }): void
  (e: 'dragend', card: Card, event: MouseEvent): void
}>()

const selected = ref(false)
const hovered = ref(false)
const isDragging = ref(false)
const dragOffsetX = ref(0)
const dragOffsetY = ref(0)
const absolutePosition = ref({ x: 0, y: 0 })
const longPressTimer = ref<number | null>(null) // Таймер для определения длительного нажатия
const longPressDuration = 300 // Время в миллисекундах для определения длительного нажатия

// Получаем индекс карты в руке или используем значение по умолчанию
const cardIndex = computed(() => props.index || 0)
const totalCards = computed(() => props.totalCards || 1)

// Вычисляем стиль карты для эффекта "веером" в руке
const cardStyle = computed((): Record<string, string | number> => {
  if (totalCards.value <= 1) return {}

  // Уменьшаем угол поворота для более ровного расположения карт
  const rotation = -10 + (20 * cardIndex.value) / (totalCards.value - 1)

  // Значительно увеличиваем расстояние между картами, чтобы они не перекрывали друг друга на 90%
  // Устанавливаем расстояние так, чтобы карты были видны практически полностью
  const translateX = -300 + (600 * cardIndex.value) / (totalCards.value - 1)

  // Вычисляем вертикальное смещение для создания дуги (карты в середине выше)
  // Используем параболическую функцию для создания дугообразного расположения
  const normalizedIndex = cardIndex.value / (totalCards.value - 1) // значение от 0 до 1
  const arcHeight = 30 // максимальная высота дуги в пикселях
  // Функция параболы: 4 * h * (x - 0.5)^2 - h, где h - высота
  // Это даст -h в центре (x=0.5) и 0 по краям (x=0 и x=1)
  const verticalOffset = -arcHeight * (1 - 4 * Math.pow(normalizedIndex - 0.5, 2))

  let transform = `translate(${translateX}px, ${verticalOffset + (selected.value ? -30 : 0)}px) rotate(${rotation}deg)`

  if (isDragging.value) {
    // Если карта перетаскивается, используем абсолютное позиционирование
    const element = document.querySelector(`.card[data-card-id="${props.card.id}"]`) as HTMLElement
    if (element) {
      const parentRect = element.parentElement?.getBoundingClientRect()
      if (parentRect) {
        // Вычисляем позицию относительно родителя
        const left = absolutePosition.value.x - parentRect.left
        const top = absolutePosition.value.y - parentRect.top
        return {
          position: 'absolute' as const,
          left: `${left}px`,
          top: `${top}px`,
          transform: 'rotate(0deg) scale(1.1)',
          zIndex: 1000,
          transition: 'none',
          cursor: 'grabbing',
        }
      }
    }
  } else if (hovered.value && props.selectable) {
    // При наведении сохраняем дугообразное расположение, но поднимаем карту выше
    transform = `translate(${translateX}px, ${verticalOffset - 50}px) rotate(${rotation * 0.5}deg) scale(1.1)`
  } else if (selected.value) {
    // При выборе сохраняем дугообразное расположение, но поднимаем карту еще выше
    transform = `translate(${translateX}px, ${verticalOffset - 70}px) rotate(${rotation * 0.3}deg) scale(1.1)`
  }

  return {
    transform,
    transformOrigin: 'bottom center',
    zIndex: selected.value ? 20 : hovered.value ? 10 : cardIndex.value,
    transition: isDragging.value ? 'none' : 'all 0.3s ease',
  }
}) // Проверка, является ли карта козырной
const isTrump = computed(() => {
  return props.trumpSuit && props.card.suit === props.trumpSuit
})

// Получение символа масти
const suitSymbol = computed(() => {
  switch (props.card.suit) {
    case Suit.HEARTS:
      return '♥'
    case Suit.DIAMONDS:
      return '♦'
    case Suit.CLUBS:
      return '♣'
    case Suit.SPADES:
      return '♠'
    default:
      return ''
  }
})

// Обработка клика по карте
function handleClick() {
  if (!props.selectable) return

  // Если перетаскивание не начато, переключаем состояние выбора
  if (!isDragging.value) {
    selected.value = !selected.value
    emit('select', props.card)
  }
}

// Обработка наведения мыши
function handleMouseOver() {
  if (props.selectable) {
    hovered.value = true
  }
}

// Обработка ухода мыши
function handleMouseLeave() {
  hovered.value = false
}

// Обработка нажатия мыши для начала перетаскивания
function handleMouseDown(event: MouseEvent) {
  if (!props.selectable && !props.draggable) return

  // Предотвращаем стандартное поведение браузера
  event.preventDefault()

  // Вычисляем смещение курсора относительно элемента
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  dragOffsetX.value = event.clientX - rect.left
  dragOffsetY.value = event.clientY - rect.top

  // Запоминаем начальное положение
  absolutePosition.value = { x: rect.left, y: rect.top }

  // Установим таймер для определения длительного нажатия
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value)
  }

  longPressTimer.value = setTimeout(() => {
    // Запускаем перетаскивание только после длительного нажатия
    startDragging(event)
  }, longPressDuration) as unknown as number

  // Добавляем обработчики для отмены перетаскивания при быстром отпускании
  document.addEventListener('mouseup', cancelDragStart)
  document.addEventListener('mousemove', checkMouseMove)
}

// Функция для запуска перетаскивания
function startDragging(event: MouseEvent) {
  // Устанавливаем флаг перетаскивания
  isDragging.value = true

  // Добавляем обработчики событий перемещения и отпускания мыши
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)

  // Устанавливаем выбранное состояние
  selected.value = true

  // Генерируем событие выбора карты
  emit('select', props.card)

  // Генерируем событие начала перетаскивания
  emit('dragstart', props.card, event)

  // Очищаем обработчики предварительных событий
  document.removeEventListener('mouseup', cancelDragStart)
  document.removeEventListener('mousemove', checkMouseMove)
}

// Функция для отмены начала перетаскивания при быстром отпускании
function cancelDragStart() {
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  document.removeEventListener('mouseup', cancelDragStart)
  document.removeEventListener('mousemove', checkMouseMove)

  // Если мышь отпущена до истечения таймера, обрабатываем это как клик
  if (!isDragging.value) {
    handleClick()
  }
}

// Функция для отслеживания движения мыши и отмены таймера, если пользователь двигает мышь
function checkMouseMove(event: MouseEvent) {
  // Если мышь двигается слишком далеко от начальной точки, отменяем таймер
  const moveThreshold = 5 // пороговое значение в пикселях
  const dx = Math.abs(event.clientX - (absolutePosition.value.x + dragOffsetX.value))
  const dy = Math.abs(event.clientY - (absolutePosition.value.y + dragOffsetY.value))

  if (dx > moveThreshold || dy > moveThreshold) {
    // Если пользователь двигает мышь, начинаем перетаскивание сразу
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value)
      longPressTimer.value = null
    }

    startDragging(event)
  }
}

// Обработка перемещения мыши во время перетаскивания
function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value) return

  // Обновляем положение элемента
  const element = event.currentTarget as HTMLElement
  if (element) {
    // Вычисляем новое положение
    const x = event.clientX - dragOffsetX.value
    const y = event.clientY - dragOffsetY.value

    // Обновляем абсолютное положение
    absolutePosition.value = { x, y }

    // Генерируем событие перемещения
    emit('drag', props.card, { x, y, event })
  }
}

// Обработка отпускания мыши для завершения перетаскивания
function handleMouseUp(event: MouseEvent) {
  // Очищаем таймер длительного нажатия, если он был установлен
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }

  if (!isDragging.value) return

  // Сбрасываем флаг перетаскивания
  isDragging.value = false

  // Добавляем анимацию возврата (отбоя)
  // Устанавливаем плавный переход для отбоя карты
  const element = document.querySelector(`.card[data-card-id="${props.card.id}"]`) as HTMLElement
  if (element) {
    element.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'

    // Через небольшую задержку убираем абсолютное позиционирование
    setTimeout(() => {
      // Возвращаем стандартное позиционирование
      if (element) {
        element.classList.add('card--bounce-back')

        // Удаляем класс анимации через 300мс
        setTimeout(() => {
          element.classList.remove('card--bounce-back')
        }, 300)
      }
    }, 10)
  }

  // Удаляем обработчики событий
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)

  // Генерируем событие завершения перетаскивания
  emit('dragend', props.card, event)
}
</script>

<style scoped>
.card {
  width: 120px;
  height: 170px;
  border-radius: 10px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin: 0 5px; /* Положительный отступ, чтобы карты НЕ перекрывали друг друга */
  position: absolute;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  border: 1px solid #ddd;
  will-change: transform, box-shadow; /* Оптимизация для анимаций */
  user-select: none; /* Запрещаем выделение текста на карте */
}

.card:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
}

.card--selectable {
  cursor: pointer;
}

.card--selected {
  box-shadow: 0 10px 25px rgba(0, 70, 255, 0.7);
  border: 3px solid #4a8fff;
  animation: card-pulse 1.5s infinite;
}

.card--dragging {
  box-shadow: 0 15px 30px rgba(0, 70, 255, 0.9);
  border: 3px solid #4a8fff;
  transform: scale(0.8);
  z-index: 9999;
}

.card--bounce-back {
  animation: bounce-back 0.3s ease-out;
}

@keyframes bounce-back {
  0% {
    transform: scale(0.8);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes card-pulse {
  0% {
    box-shadow: 0 10px 25px rgba(0, 70, 255, 0.5);
  }
  50% {
    box-shadow: 0 15px 30px rgba(0, 70, 255, 0.8);
  }
  100% {
    box-shadow: 0 10px 25px rgba(0, 70, 255, 0.5);
  }
}

.card--trump::before {
  content: '♛';
  position: absolute;
  top: 5px;
  right: 5px;
  font-size: 18px;
  color: gold;
  z-index: 5;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.card__content {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px;
}

.card--hearts,
.card--diamonds {
  color: red;
}

.card--clubs,
.card--spades {
  color: black;
}

.card__corner {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card__corner--bottom {
  transform: rotate(180deg);
}

.card__rank {
  font-size: 20px;
  font-weight: bold;
}

.card__suit {
  font-size: 20px;
}

.card__center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.card__suit-large {
  font-size: 48px;
}
</style>
