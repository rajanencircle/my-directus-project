<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { ComputedRef } from 'vue';
import { useApi, useStores } from '@directus/extensions-sdk';
import { useT } from '../composables/useT';
import FormFieldLabel from './FormFieldLabel.vue';
import {
  buildShareExpiryFormField,
  normalizeShareExpiryValue,
} from '../utils/shareExpiry';

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
const { useFieldsStore } = useStores();
const fieldsStore = useFieldsStore();

const password = ref('');
const expiryDate = ref<string | null>(null);
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

const expiryFormFields = computed(() => [
  buildShareExpiryFormField(
    props.targetCollection,
    props.expiryField,
    lbl('shareExpiryLabel', 'Expiry Date'),
    fieldsStore.getField(props.targetCollection, props.expiryField),
  ),
]);

const expiryFormValue = computed(() => ({
  [props.expiryField]: expiryDate.value,
}));

function onExpiryFormUpdate(value: Record<string, unknown>) {
  const next = value?.[props.expiryField];
  expiryDate.value =
    next == null || next === ''
      ? null
      : typeof next === 'string'
        ? next
        : next instanceof Date
          ? next.toISOString()
          : String(next);
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
    const normalizedExpiry = normalizeShareExpiryValue(expiryDate.value);
    if (normalizedExpiry) payload[props.expiryField] = normalizedExpiry;

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
    <v-card class="share-create-card">
      <v-card-title class="dialog-title">
        <v-icon name="share" small />
        <span>{{ lbl('shareTitle', 'Share File') }}</span>
      </v-card-title>

      <template v-if="!shareUrl">
        <v-card-text>
          <div class="share-fields">
            <div class="share-field">
              <FormFieldLabel :label="lbl('sharePasswordLabel', 'Password')" />
              <div class="interface">
                <div class="interface-input">
                  <v-input
                    v-model="password"
                    type="password"
                    :placeholder="lbl('sharePasswordPlaceholder', 'Leave blank for no password')"
                    :disabled="saving"
                    autocomplete="off"
                    autofocus
                  />
                </div>
              </div>
            </div>

            <div class="share-field share-expiry-field">
              <v-form
                :model-value="expiryFormValue"
                :fields="expiryFormFields"
                primary-key="+"
                :disabled="saving"
                @update:model-value="onExpiryFormUpdate"
              />
            </div>

            <div class="share-field">
              <FormFieldLabel :label="lbl('shareEmailLabel', 'Notify via Email')" />
              <div class="interface">
                <div class="interface-input">
                  <v-input
                    v-model="emailsRaw"
                    :placeholder="lbl('shareEmailPlaceholder', 'user@example.com, other@example.com')"
                    :disabled="saving"
                  />
                </div>
              </div>
              <small class="type-note">
                {{ lbl('shareEmailHint', 'Comma-separated for multiple recipients') }}
              </small>
            </div>
          </div>

          <v-notice v-if="error" type="danger" class="share-notice">{{ error }}</v-notice>
        </v-card-text>

        <v-card-actions>
          <v-button secondary :disabled="saving" @click="$emit('close')">{{ t('cancel') }}</v-button>
          <v-button :loading="saving" @click="createLink">
            <v-icon name="link" left small />
            {{ lbl('shareCreateBtn', 'Generate Link') }}
          </v-button>
        </v-card-actions>
      </template>

      <template v-else>
        <v-card-text>
          <div class="share-field">
            <FormFieldLabel :label="lbl('shareUrlLabel', 'Share URL')" />
            <div class="interface">
              <div class="interface-input">
                <v-input :model-value="shareUrl" readonly>
                  <template #append>
                    <v-icon
                      :name="copied ? 'check_circle' : 'content_copy'"
                      small
                      clickable
                      :style="copied ? 'color: var(--theme--success)' : ''"
                      @click="copyUrl"
                    />
                  </template>
                </v-input>
              </div>
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
.share-create-card {
  max-width: 460px;
  width: 100%;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.share-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
}

.share-field :deep(.interface),
.share-field :deep(.interface-input) {
  width: 100%;
  min-width: 0;
}

.share-expiry-field :deep(.v-form) {
  width: 100%;
}

.share-expiry-field :deep(.v-form > .field) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
}

.share-notice {
  margin-top: 12px;
}
</style>
