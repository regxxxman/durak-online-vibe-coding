<template>
  <div v-if="show" class="turn-animation">
    <div class="turn-animation__content">
      <div class="turn-animation__icon">
        <span v-if="currentType === 'attack'">⚔️</span>
        <span v-else-if="currentType === 'defend'">🛡️</span>
        <span v-else-if="currentType === 'warning'">⚠️</span>
        <span v-else-if="currentType === 'info'">ℹ️</span>
        <span v-else>✅</span>
      </div>
      <div class="turn-animation__text" :class="`turn-animation__text--${currentType}`">
        {{ currentMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  defaultMessage?: string
  defaultType?: 'attack' | 'defend' | 'success' | 'warning' | 'info'
}>()

const show = ref(false)
const currentMessage = ref(props.defaultMessage || 'Успешно!')
const currentType = ref(props.defaultType || 'success')

function play(message?: string, type?: 'attack' | 'defend' | 'success' | 'warning' | 'info') {
  if (message) {
    currentMessage.value = message
  }
  if (type) {
    currentType.value = type
  }

  show.value = true
  setTimeout(() => {
    show.value = false
  }, 1500)
}

defineExpose({
  play,
})
</script>

<style scoped>
.turn-animation {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  z-index: 1000;
}

.turn-animation__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: appear 1.5s ease-out forwards;
}

.turn-animation__icon {
  font-size: 80px;
  animation: pulse 0.5s ease-out 3;
}

.turn-animation__text {
  font-size: 24px;
  font-weight: bold;
  margin-top: 20px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.turn-animation__text--attack {
  color: #f44336;
}

.turn-animation__text--defend {
  color: #4caf50;
}

.turn-animation__text--success {
  color: #2196f3;
}

.turn-animation__text--info {
  color: #42a5f5;
}

.turn-animation__text--warning {
  color: #ff9800;
}

@keyframes appear {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
