<template>
  <div v-if="show" class="defend-animation">
    <div class="defend-animation__content">
      <div class="defend-animation__shield">
        <span class="defend-animation__icon">🛡️</span>
      </div>
      <div class="defend-animation__text">{{ displayMessage }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  message?: string
}>()

const show = ref(false)

// Используем переданное сообщение или сообщение по умолчанию
const displayMessage = computed(() => props.message || 'Карта отбита!')

function play() {
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
.defend-animation {
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

.defend-animation__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: appear 1.5s ease-out forwards;
}

.defend-animation__shield {
  font-size: 80px;
  animation: pulse 0.5s ease-out 3;
}

.defend-animation__text {
  font-size: 24px;
  font-weight: bold;
  color: #4caf50;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  margin-top: 20px;
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
