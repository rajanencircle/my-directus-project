<template>
  <div class="media-share-interface">

    <!-- Loading -->
    <div v-if="loading" class="state-loading">
      <v-progress-circular indeterminate small />
    </div>

    <!-- Error -->
    <v-notice v-else-if="loadError" type="danger">{{ loadError }}</v-notice>

    <!-- Shares list -->
    <template v-else>
      <div v-if="shares.length > 0" class="share-list">
        <div
          v-for="share in shares"
          :key="share.id"
          class="share-row"
        >
          <div class="share-row-main">
            <code class="share-url">{{ buildShareUrl(share.id) }}</code>
            <div class="share-meta">
              <span v-if="share[passwordField]" class="meta-badge">
                <v-icon name="lock" x-small />
                Password
              </span>
              <span
                v-if="share[expiryField]"
                class="meta-badge"
                :class="{ expired: isExpired(share[expiryField]) }"
              >
                <v-icon name="schedule" x-small />
                {{ formatDate(share[expiryField]) }}
              </span>
            </div>
          </div>
          <div class="share-row-actions">
            <v-icon
              :name="copiedId === share.id ? 'check_circle' : 'content_copy'"
              small
              clickable
              :style="copiedId === share.id ? 'color: var(--theme--success)' : ''"
              v-tooltip="copiedId === share.id ? 'Copied!' : 'Copy link'"
              @click="copyLink(share.id)"
            />
            <v-icon
              name="delete"
              small
              clickable
              class="icon-delete"
              v-tooltip="'Revoke'"
              @click="confirmRevoke(share)"
            />
          </div>
        </div>
      </div>

      <p v-else class="empty-state">No share links yet.</p>

      <div class="footer">
        <v-button small secondary @click="dialogOpen = true">
          <v-icon name="add" left small />
          Create Share Link
        </v-button>
      </div>
    </template>

    <!-- Create share dialog -->
    <v-dialog v-model="dialogOpen" @esc="closeDialog" :persistent="creating">
      <v-card style="max-width: 460px; width: 100%">
        <v-card-title>
          <v-icon name="share" left />
          Create Share Link
        </v-card-title>

        <v-card-text>
          <div class="fields">
            <div class="field">
              <div class="type-label label">
                Password
                <span class="subdued"> — optional</span>
              </div>
              <v-input
                v-model="newPassword"
                type="password"
                placeholder="Leave blank for no password"
                :disabled="creating"
                autocomplete="off"
                autofocus
              />
            </div>

            <div class="field">
              <div class="type-label label">
                Expires
                <span class="subdued"> — optional</span>
              </div>
              <v-input
                v-model="newExpiry"
                type="datetime-local"
                :disabled="creating"
              />
            </div>

            <div class="field">
              <div class="type-label label">
                Notify via Email
                <span class="subdued"> — optional</span>
              </div>
              <v-input
                v-model="newEmailsRaw"
                placeholder="user@example.com, other@example.com"
                :disabled="creating"
              />
              <span class="type-hint subdued">Comma-separated for multiple recipients</span>
            </div>
          </div>

          <v-notice v-if="createError" type="danger" class="notice">{{ createError }}</v-notice>
        </v-card-text>

        <v-card-actions>
          <v-button secondary :disabled="creating" @click="closeDialog">Cancel</v-button>
          <v-button :loading="creating" @click="createShare">
            <v-icon name="link" left />
            Generate Link
          </v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke confirm dialog -->
    <v-dialog v-model="revokeDialogOpen" @esc="revokeDialogOpen = false">
      <v-card>
        <v-card-title>Revoke Share Link?</v-card-title>
        <v-card-text>This will permanently delete the share link. Anyone with the link will lose access.</v-card-text>
        <v-card-actions>
          <v-button secondary :disabled="revoking" @click="revokeDialogOpen = false">Cancel</v-button>
          <v-button kind="danger" :loading="revoking" @click="revokeShare">Revoke</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const props = withDefaults(
  defineProps<{
    value?: string | null;
    primaryKey?: string | number | null;
    collection?: string;
    field?: string;
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

const api = useApi();

interface ShareRecord {
  id: string;
  [key: string]: unknown;
}

const shares = ref<ShareRecord[]>([]);
const loading = ref(false);
const loadError = ref('');

const dialogOpen = ref(false);
const newPassword = ref('');
const newExpiry = ref('');
const newEmailsRaw = ref('');
const creating = ref(false);
const createError = ref('');

const revokeDialogOpen = ref(false);
const revokeTarget = ref<ShareRecord | null>(null);
const revoking = ref(false);
const copiedId = ref<string | null>(null);

watch(
  () => [props.primaryKey, props.targetCollection, props.fileField] as const,
  ([key, col, field]) => {
    if (key && key !== '+' && col && field) loadShares();
  },
  { immediate: true }
);

async function loadShares() {
  const pk = props.primaryKey;
  if (!pk || pk === '+') return;
  loading.value = true;
  loadError.value = '';
  try {
    const fields = ['id', props.passwordField, props.expiryField].filter(Boolean).join(',');
    const { data } = await api.get(`/items/${props.targetCollection}`, {
      params: { filter: { [props.fileField!]: { _eq: pk } }, fields, limit: -1 },
    });
    shares.value = data.data ?? [];
  } catch (err: any) {
    loadError.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to load share links.';
  } finally {
    loading.value = false;
  }
}

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map(e => e.trim())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

async function createShare() {
  creating.value = true;
  createError.value = '';
  try {
    const payload: Record<string, unknown> = {
      [props.fileField!]: props.primaryKey,
      status: props.defaultStatus,
    };
    if (newPassword.value) payload[props.passwordField!] = newPassword.value;
    if (newExpiry.value) payload[props.expiryField!] = new Date(newExpiry.value).toISOString();

    const { data } = await api.post(`/items/${props.targetCollection}`, payload);
    const shareId = data.data.id;
    const url = buildShareUrl(shareId);

    try {
      await api.patch(`/items/${props.targetCollection}/${shareId}`, { [props.linkField!]: url });
    } catch (e: any) {
      console.error('[MediaShare] PATCH link failed', e?.response?.data ?? e);
    }

    const emails = parseEmails(newEmailsRaw.value);
    if (emails.length > 0) {
      try {
        await api.post('/media-share-validate/notify', { shareUrl: url, emails });
      } catch (e: any) {
        console.error('[MediaShare] notify failed', e?.response?.data ?? e);
      }
    }

    closeDialog();
    await loadShares();
  } catch (err: any) {
    createError.value = err?.response?.data?.errors?.[0]?.message ?? 'Failed to create share link.';
  } finally {
    creating.value = false;
  }
}

function confirmRevoke(share: ShareRecord) {
  revokeTarget.value = share;
  revokeDialogOpen.value = true;
}

async function revokeShare() {
  if (!revokeTarget.value) return;
  revoking.value = true;
  try {
    await api.delete(`/items/${props.targetCollection}/${revokeTarget.value.id}`);
  } catch {
    /* no-op */
  } finally {
    revokeDialogOpen.value = false;
    revokeTarget.value = null;
    revoking.value = false;
    await loadShares();
  }
}

function copyLink(shareId: string) {
  navigator.clipboard.writeText(buildShareUrl(shareId)).then(() => {
    copiedId.value = shareId;
    setTimeout(() => { copiedId.value = null; }, 2000);
  });
}

function closeDialog() {
  dialogOpen.value = false;
  newPassword.value = '';
  newExpiry.value = '';
  newEmailsRaw.value = '';
  createError.value = '';
}

function buildShareUrl(shareId: string): string {
  const base = props.shareBasePath!.replace(/\/?$/, '/');
  return `${window.location.origin}${base}${shareId}/`;
}

function formatDate(iso: unknown): string {
  if (!iso) return '';
  return new Date(iso as string).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isExpired(iso: unknown): boolean {
  if (!iso) return false;
  return new Date(iso as string) < new Date();
}
</script>

<style scoped>
.media-share-interface {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.state-loading {
  display: flex;
  justify-content: center;
  padding: 16px;
}

/* Share list */
.share-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
}

.share-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--theme--background);
  border-bottom: 1px solid var(--theme--border-color);
}

.share-row:last-child {
  border-bottom: none;
}

.share-row:hover {
  background: var(--theme--background-subdued);
}

.share-row-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
  flex: 1;
  min-width: 0;
}

.share-url {
  font-family: var(--theme--fonts--mono--font-family, monospace);
  font-size: 12px;
  color: var(--theme--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.share-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--theme--foreground-subdued);
}

.meta-badge.expired {
  color: var(--theme--danger);
}

.share-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.icon-delete {
  color: var(--theme--foreground-subdued);
  transition: color 0.15s;
}

.icon-delete:hover {
  color: var(--theme--danger);
}

/* Empty / footer */
.empty-state {
  font-size: 13px;
  color: var(--theme--foreground-subdued);
  margin: 0;
}

.footer {
  display: flex;
}

/* Dialog fields */
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

.notice {
  margin-top: var(--theme--form--row-gap, 24px);
}
</style>
