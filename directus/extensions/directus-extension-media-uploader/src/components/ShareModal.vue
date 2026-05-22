<script setup lang="ts">
import { ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = withDefaults(
  defineProps<{
    fileId: string;
    targetCollection?: string;
    fileField?: string;
    passwordField?: string;
    expiryField?: string;
    linkField?: string;
    shareBasePath?: string;
    defaultStatus?: string;
  }>(),
  {
    targetCollection: 'media_share_link',
    fileField: 'file',
    passwordField: 'password',
    expiryField: 'expired_date',
    linkField: 'link',
    shareBasePath: '/media-share-validate/view/',
    defaultStatus: 'published',
  }
);
const emit = defineEmits<{ (e: 'close'): void }>();

const api = useApi();

const password = ref('');
const expiryDate = ref('');
const saving = ref(false);
const error = ref('');
const shareUrl = ref('');

// Email chips
const emails = ref<string[]>([]);
const emailInput = ref('');
const emailInputEl = ref<HTMLInputElement | null>(null);

function addEmailChip() {
  const val = emailInput.value.trim().replace(/,|;$/, '');
  if (val && isValidEmail(val) && !emails.value.includes(val)) {
    emails.value.push(val);
  }
  emailInput.value = '';
}

function removeChip(index: number) {
  emails.value.splice(index, 1);
}

function onEmailKeydown(e: KeyboardEvent) {
  if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
    e.preventDefault();
    addEmailChip();
  } else if (e.key === 'Backspace' && !emailInput.value) {
    emails.value.pop();
  }
}

function onEmailBlur() {
  if (emailInput.value.trim()) addEmailChip();
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function createLink() {
  saving.value = true;
  error.value = '';

  try {
    const payload: Record<string, any> = {
      status: props.defaultStatus,
      [props.fileField]: props.fileId,
    };
    if (password.value) payload[props.passwordField] = password.value;
    if (expiryDate.value) payload[props.expiryField] = expiryDate.value;

    const { data } = await api.post(`/items/${props.targetCollection}`, payload);
    const shareId = data.data.id;
    const base = props.shareBasePath.replace(/\/?$/, '/');
    const url = `${window.location.origin}${base}${shareId}/`;

    try {
      await api.patch(`/items/${props.targetCollection}/${shareId}`, { [props.linkField]: url });
    } catch (patchErr: any) {
      console.error('[ShareModal] PATCH link failed', patchErr?.response?.data ?? patchErr);
    }

    shareUrl.value = url;

    if (emails.value.length > 0) {
      try {
        await api.post('/media-share-validate/notify', { shareUrl: url, emails: emails.value });
      } catch (mailErr: any) {
        console.error('[ShareModal] notify failed', mailErr?.response?.data ?? mailErr);
      }
    }
  } catch (err: any) {
    console.error('[ShareModal] POST failed', err?.response?.data ?? err);
    error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to create share link.';
  } finally {
    saving.value = false;
  }
}

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
  } catch {
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

          <div class="field-group">
            <label class="field-label">Share via Email <span class="optional">(optional)</span></label>
            <div class="chip-input-wrap" :class="{ disabled: saving }" @click="emailInputEl?.focus()">
              <span
                v-for="(email, i) in emails"
                :key="email"
                class="chip"
              >
                {{ email }}
                <button class="chip-remove" @click.stop="removeChip(i)" :disabled="saving">×</button>
              </span>
              <input
                ref="emailInputEl"
                v-model="emailInput"
                class="chip-text-input"
                placeholder="Type email and press Enter"
                :disabled="saving"
                @keydown="onEmailKeydown"
                @blur="onEmailBlur"
              />
            </div>
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
            <template v-if="emails.length > 0"> Email sent to {{ emails.length }} recipient{{ emails.length > 1 ? 's' : '' }}.</template>
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

/* Chip input */
.chip-input-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 42px;
  padding: 6px 10px;
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  background: var(--theme--background);
  cursor: text;
  transition: border-color 0.2s;
}

.chip-input-wrap:focus-within {
  border-color: var(--theme--primary);
}

.chip-input-wrap.disabled {
  background: var(--theme--background-subdued);
  cursor: not-allowed;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 10px;
  background: var(--theme--primary);
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.6;
}

.chip-remove {
  background: none;
  border: none;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
}

.chip-remove:hover {
  color: #fff;
}

.chip-text-input {
  flex: 1;
  min-width: 160px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--theme--foreground);
}

.chip-text-input::placeholder {
  color: var(--theme--foreground-subdued);
}
</style>
