<template>
  <div class="gate-wrapper">
    <div v-if="checking" class="gate-checking">
      <span class="spinner spinner--dark"></span>
    </div>

    <div v-else class="gate-card">
      <h2 class="gate-title">Protected File</h2>
      <p class="gate-subtitle">Enter the password to view this shared file.</p>

      <form @submit.prevent="handleSubmit" class="gate-form">
        <input
          v-model="password"
          type="password"
          placeholder="Password"
          class="gate-input"
          :disabled="loading"
          autocomplete="current-password"
        />

        <button type="submit" class="gate-button" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          <span v-else>View File</span>
        </button>
      </form>

      <p v-if="errorMessage" class="gate-error">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const shareId = route.params.shareId as string;
const password = ref('');
const loading = ref(false);
const checking = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  sessionStorage.removeItem(`share_${shareId}`);

  try {
    const res = await fetch(`/media-share-validate/${shareId}`);
    const data = await res.json();

    if (res.status === 404) {
      router.replace('/media-share-viewer/error/not_found');
      return;
    }
    if (res.status === 403) {
      router.replace('/media-share-viewer/error/expired');
      return;
    }

    if (!data.requiresPassword) {
      sessionStorage.setItem(`share_${shareId}`, JSON.stringify({ fileId: data.fileId, fileType: data.fileType, fileName: data.fileName ?? null }));
      router.replace(`/media-share-viewer/${shareId}/view`);
      return;
    }
  } catch {
    // network error — fall through and show the form; submit will surface any real errors
  }

  checking.value = false;
});

async function handleSubmit() {
  if (!password.value) return;

  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await fetch(`/media-share-validate/${shareId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value }),
    });

    const data = await response.json();

    if (response.status === 404) {
      router.push('/media-share-viewer/error/not_found');
      return;
    }

    if (response.status === 403) {
      router.push('/media-share-viewer/error/expired');
      return;
    }

    if (response.status === 401) {
      errorMessage.value = 'Incorrect password. Please try again.';
      return;
    }

    if (response.ok && data.fileId) {
      sessionStorage.setItem(`share_${shareId}`, JSON.stringify({ fileId: data.fileId, fileType: data.fileType, fileName: data.fileName ?? null }));
      router.push(`/media-share-viewer/${shareId}/view`);
    }
  } catch {
    errorMessage.value = 'An unexpected error occurred. Please try again.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.gate-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  font-family: sans-serif;
}

.gate-checking {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gate-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.gate-title {
  margin: 0 0 8px 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.gate-subtitle {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #666;
}

.gate-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gate-input {
  width: 100%;
  padding: 10px 14px;
  font-size: 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.gate-input:focus {
  border-color: #6644dd;
}

.gate-input:disabled {
  background-color: #f9f9f9;
  color: #aaa;
}

.gate-button {
  width: 100%;
  padding: 11px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background-color: #6644dd;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.gate-button:hover:not(:disabled) {
  background-color: #5533cc;
}

.gate-button:disabled {
  background-color: #aaa;
  cursor: not-allowed;
}

.gate-error {
  margin: 14px 0 0 0;
  font-size: 13px;
  color: #d32f2f;
  text-align: center;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

.spinner--dark {
  width: 32px;
  height: 32px;
  border-color: rgba(0, 0, 0, 0.15);
  border-top-color: #6644dd;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
