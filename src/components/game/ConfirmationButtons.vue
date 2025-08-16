<template>
  <div class="confirmation-buttons">
    <button
      v-if="isAttackerTurn"
      @click="confirmAttack"
      class="confirmation-button confirmation-button--attack"
      :disabled="pendingAttackCards.length === 0"
    >
      Подтвердить ход
      <span class="shine"></span>
    </button>
    <button
      v-if="isDefenderTurn"
      @click="confirmDefense"
      class="confirmation-button confirmation-button--defense"
      :disabled="!selectedAttackCard || !selectedDefenseCard"
    >
      Подтвердить защиту
      <span class="shine"></span>
    </button>
    <button
      v-if="isDefenderTurn"
      @click="takeCards"
      class="confirmation-button confirmation-button--take"
    >
      Взять карты
      <span class="shine"></span>
    </button>
    <button
      v-if="isAttackerTurn && canPass"
      @click="pass"
      class="confirmation-button confirmation-button--pass"
    >
      Бито
      <span class="shine"></span>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '../../models/types'

defineProps<{
  isAttackerTurn: boolean
  isDefenderTurn: boolean
  pendingAttackCards: Card[]
  selectedAttackCard: Card | null
  selectedDefenseCard: Card | null
  canPass: boolean
}>()

const emit = defineEmits<{
  (e: 'confirmAttack'): void
  (e: 'confirmDefense'): void
  (e: 'takeCards'): void
  (e: 'pass'): void
}>()

const confirmAttack = () => {
  emit('confirmAttack')
}

const confirmDefense = () => {
  emit('confirmDefense')
}

const takeCards = () => {
  emit('takeCards')
}

const pass = () => {
  emit('pass')
}
</script>

<style scoped>
.confirmation-buttons {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 15px;
  z-index: 100;
  padding: 15px 20px;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 15px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
}

.confirmation-button {
  position: relative;
  padding: 15px 30px;
  font-size: 1.2rem;
  font-weight: bold;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.confirmation-button:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
}

.confirmation-button:active:not(:disabled) {
  transform: translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.confirmation-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirmation-button--attack {
  background: linear-gradient(135deg, #ff512f, #dd2476);
}

.confirmation-button--defense {
  background: linear-gradient(135deg, #11998e, #38ef7d);
}

.confirmation-button--take {
  background: linear-gradient(135deg, #4b6cb7, #182848);
}

.confirmation-button--pass {
  background: linear-gradient(135deg, #673ab7, #512da8);
}

.shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  transform: skewX(-20deg);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }
  20% {
    left: 100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes attention {
  0% {
    transform: scale(1);
  }
  85% {
    transform: scale(1);
  }
  90% {
    transform: scale(1.15);
  }
  95% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.confirmation-button:not(:disabled) {
  animation: attention 3s infinite;
}
</style>
