<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* Глобальные стили */
body {
  font-family: 'Roboto', Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f9f9f9;
  color: #333;
  line-height: 1.6;
}

* {
  box-sizing: border-box;
}

button {
  cursor: pointer;
}

/* Стили для карт (если нужны глобально) */
.card-animation-enter-active,
.card-animation-leave-active {
  transition: all 0.5s ease;
}

.card-animation-enter-from,
.card-animation-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>
