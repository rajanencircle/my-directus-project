<script setup lang="ts">
import { ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = defineProps<{ fileId: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const api = useApi();

const password = ref('');
const expiryDate = ref('');
const saving = ref(false);
const error = ref('');
const shareUrl = ref('');

async function createLink() {
  saving.value = true;
  error.value = '';

  try {
    const payload: Record<string, any> = {
      status: 'published',
      file: props.fileId,
    };
    if (password.value) payload.password = password.value;
    if (expiryDate.value) payload.expired_date = expiryDate.value;

    const { data } = await api.post('/items/media_share_link', payload);
    shareUrl.value = `${window.location.origin}/media-share-validate/view/${data.data.id}`;
  } catch {
    error.value = 'Failed to create share link. Please try again.';
  } finally {
    saving.value = false;
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
  } catch {
    // fallback for non-https
    const el = document.getElementById('share-url-input') as HTMLInputElement;
    el?.select();
    document.execCommand('copy');
  }
}

function close() {
  emit('close');
}
</script>

<template>
  <v-dialog :model-value="true" @update:model-value="close" :persistent="saving">
    <v-card class="share-card">
      <v-card-title class="share-title">
        <v-icon name="share" class="title-icon" />
        Share File
      </v-card-title>

      <!-- Phase 1: form -->
      <template v-if="!shareUrl">
        <v-card-text class="share-body">
          <p class="share-hint">
            The link will be generated after you save. Optionally protect it with a password or set an expiry date.
          </p>

          <div class="field-group">
            <label class="field-label">Password <span class="optional">(optional)</span></label>
            <v-input
              v-model="password"
              type="password"
              placeholder="Leave blank for no password"
              :disabled="saving"
              autocomplete="off"
            />
          </div>

          <div class="field-group">
            <label class="field-label">Expiry Date <span class="optional">(optional)</span></label>
            <v-input
              v-model="expiryDate"
              type="datetime-local"
              :disabled="saving"
            />
          </div>

          <v-notice v-if="error" type="danger">{{ error }}</v-notice>
        </v-card-text>

        <v-card-actions class="share-actions">
          <v-button secondary :disabled="saving" @click="close">Cancel</v-button>
          <v-button :loading="saving" @click="createLink">
            <v-icon name="link" left />
            Create Link
          </v-button>
        </v-card-actions>
      </template>

      <!-- Phase 2: link ready -->
      <template v-else>
        <v-card-text class="share-body">
          <v-notice type="success" class="success-notice">
            Share link created successfully!
          </v-notice>

          <div class="field-group">
            <label class="field-label">Share URL</label>
            <div class="url-row">
              <input
                id="share-url-input"
                :value="shareUrl"
                readonly
                class="url-input"
              />
              <v-button small icon @click="copyUrl" title="Copy URL">
                <v-icon name="content_copy" />
              </v-button>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="share-actions">
          <v-button @click="close">Close</v-button>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.share-card {
  width: 100%;
  max-width: 480px;
}

.share-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  color: var(--theme--primary);
}

.share-body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 4px;
}

.share-hint {
  font-size: 14px;
  color: var(--theme--foreground-subdued);
  line-height: 1.5;
  margin: 0;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--theme--foreground);
}

.optional {
  font-weight: 400;
  color: var(--theme--foreground-subdued);
}

.share-actions {
  justify-content: flex-end;
  gap: 8px;
}

.success-notice {
  display: flex;
  align-items: center;
  gap: 8px;
}

.url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.url-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--theme--fonts--monospace--font-family, monospace);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background-subdued);
  color: var(--theme--foreground);
  outline: none;
  cursor: text;
}
</style>
