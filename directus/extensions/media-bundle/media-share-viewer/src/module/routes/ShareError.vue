<template>
  <div class="error-wrapper">
    <div class="error-card">
      <div class="error-icon">⚠</div>
      <h2 class="error-title">Access Denied</h2>
      <p class="error-message">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const reason = route.params.reason as string;

const message = computed(() => {
  if (reason === 'not_found') return 'This share link is invalid or does not exist.';
  if (reason === 'expired') return 'This share link has expired.';
  return 'Something went wrong. Please try again.';
});
</script>

<style scoped>
.error-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  font-family: sans-serif;
}

.error-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 48px 40px;
  width: 100%;
  max-width: 400px;
  text-align: center;
}

.error-icon {
  font-size: 40px;
  margin-bottom: 16px;
  color: #d32f2f;
}

.error-title {
  margin: 0 0 12px 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.error-message {
  margin: 0;
  font-size: 15px;
  color: #555;
  line-height: 1.5;
}
</style>
