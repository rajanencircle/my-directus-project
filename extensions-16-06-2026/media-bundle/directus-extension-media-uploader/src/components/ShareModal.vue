<script setup lang="ts">
import { inject, ref } from 'vue';
import type { ComputedRef } from 'vue';
import { useApi } from '@directus/extensions-sdk';
import { useT } from '../composables/useT';

type UploaderLabels = Record<string, string>;
const labels = inject<ComputedRef<UploaderLabels>>('uploaderLabels');
const lbl = (key: string, fallback: string) => labels?.value?.[key] ?? fallback;
const { t } = useT();

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
const emailsRaw = ref('');
const saving = ref(false);
const error = ref('');
const shareUrl = ref('');
const copied = ref(false);

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map(e => e.trim())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
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
    } catch (e: any) {
      console.error('[ShareModal] PATCH link failed', e?.response?.data ?? e);
    }

    shareUrl.value = url;

    const emails = parseEmails(emailsRaw.value);
    if (emails.length > 0) {
      try {
        await api.post('/media-share-validate/notify', { shareUrl: url, emails });
      } catch (e: any) {
        console.error('[ShareModal] notify failed', e?.response?.data ?? e);
      }
    }
  } catch (err: any) {
    error.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to create share link.';
  } finally {
    saving.value = false;
  }
}

async function copyUrl() {
  await navigator.clipboard.writeText(shareUrl.value).catch(() => {});
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<template>
  <v-dialog :model-value="true" @update:model-value="$emit('close')" :persistent="saving">
    <v-card style="max-width: 460px; width: 100%">
      <v-card-title>
        <v-icon name="share" left />
        {{ lbl('shareTitle', 'Share File') }}
      </v-card-title>

      <!-- Form phase -->
      <template v-if="!shareUrl">
        <v-card-text>
          <div class="fields">
            <div class="field">
              <div class="type-label label">
                {{ lbl('sharePasswordLabel', 'Password') }}
                <span class="subdued"> — {{ t('optional') }}</span>
              </div>
              <v-input
                v-model="password"
                type="password"
                :placeholder="lbl('sharePasswordPlaceholder', 'Leave blank for no password')"
                :disabled="saving"
                autocomplete="off"
                autofocus
              />
            </div>

            <div class="field">
              <div class="type-label label">
                {{ lbl('shareExpiryLabel', 'Expiry Date') }}
                <span class="subdued"> — {{ t('optional') }}</span>
              </div>
              <v-input
                v-model="expiryDate"
                type="datetime-local"
                :disabled="saving"
              />
            </div>

            <div class="field">
              <div class="type-label label">
                {{ lbl('shareEmailLabel', 'Notify via Email') }}
                <span class="subdued"> — {{ t('optional') }}</span>
              </div>
              <v-input
                v-model="emailsRaw"
                :placeholder="lbl('shareEmailPlaceholder', 'user@example.com, other@example.com')"
                :disabled="saving"
              />
              <span class="type-hint hint">{{ lbl('shareEmailHint', 'Comma-separated for multiple recipients') }}</span>
            </div>
          </div>

          <v-notice v-if="error" type="danger" class="notice">{{ error }}</v-notice>
        </v-card-text>

        <v-card-actions>
          <v-button secondary :disabled="saving" @click="$emit('close')">{{ t('cancel') }}</v-button>
          <v-button :loading="saving" @click="createLink">
            <v-icon name="link" left />
            {{ lbl('shareCreateBtn', 'Generate Link') }}
          </v-button>
        </v-card-actions>
      </template>

      <!-- Success phase -->
      <template v-else>
        <v-card-text>
          <div class="fields">
            <div class="field">
              <div class="type-label label">{{ lbl('shareUrlLabel', 'Share URL') }}</div>
              <v-input :model-value="shareUrl" readonly>
                <template #append>
                  <v-icon
                    :name="copied ? 'check_circle' : 'content_copy'"
                    clickable
                    :style="copied ? 'color: var(--theme--success)' : ''"
                    @click="copyUrl"
                  />
                </template>
              </v-input>
            </div>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-button @click="$emit('close')">{{ t('done') }}</v-button>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.fields {
  display: flex;
  flex-direction: column;
  gap: var(--theme--form--row-gap, 24px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  color: var(--theme--foreground);
}

.subdued {
  color: var(--theme--foreground-subdued);
  font-weight: 400;
}

.hint {
  color: var(--theme--foreground-subdued);
}

.notice {
  margin-top: var(--theme--form--row-gap, 24px);
}
</style>
