<template>
  <div class="media-share-interface">

    <!-- Loading -->
    <div v-if="loading" class="share-loading">
      <v-progress-circular indeterminate small />
    </div>

    <!-- Error -->
    <v-notice v-else-if="loadError" type="danger">{{ loadError }}</v-notice>

    <!-- Shares table -->
    <template v-else>
      <div v-if="shares.length > 0" class="share-table">
        <div class="share-table-header">
          <span class="col-link">Share Link</span>
          <span class="col-pwd">Password</span>
          <span class="col-expiry">Expires</span>
          <span class="col-actions"></span>
        </div>

        <div
          v-for="share in shares"
          :key="share.id"
          class="share-table-row"
        >
          <span class="col-link share-url-cell">
            <span class="share-url-text" :title="buildShareUrl(share.id)">
              {{ buildShareUrl(share.id) }}
            </span>
          </span>

          <span class="col-pwd">
            <v-icon
              v-if="share[passwordField]"
              name="lock"
              small
              class="icon-lock"
              v-tooltip="'Password protected'"
            />
            <span v-else class="no-value">—</span>
          </span>

          <span class="col-expiry">
            <span v-if="share[expiryField]" :class="{ expired: isExpired(share[expiryField]) }">
              {{ formatDate(share[expiryField]) }}
            </span>
            <span v-else class="no-value">Never</span>
          </span>

          <span class="col-actions">
            <v-icon
              name="content_copy"
              small
              clickable
              class="action-icon"
              :class="{ 'icon-copied': copiedId === share.id }"
              v-tooltip="copiedId === share.id ? 'Copied!' : 'Copy link'"
              @click="copyLink(share.id)"
            />
            <v-icon
              name="delete"
              small
              clickable
              class="action-icon icon-revoke"
              v-tooltip="'Revoke share'"
              @click="confirmRevoke(share)"
            />
          </span>
        </div>
      </div>

      <div v-else class="share-empty">
        No share links yet.
      </div>

      <div class="share-footer">
        <v-button small secondary @click="dialogOpen = true">
          <v-icon name="add" left small />
          Create Share Link
        </v-button>
      </div>
    </template>

    <!-- Create share dialog -->
    <v-dialog v-model="dialogOpen" @esc="closeDialog">
      <v-card>
        <v-card-title>Create Share Link</v-card-title>

        <v-card-text>
          <div class="form-field">
            <div class="form-label">Password <span class="optional">(optional)</span></div>
            <v-input
              v-model="newPassword"
              type="password"
              placeholder="Leave blank for no password"
              :disabled="creating"
            />
          </div>

          <div class="form-field">
            <div class="form-label">Expires <span class="optional">(optional)</span></div>
            <v-input
              v-model="newExpiry"
              type="datetime-local"
              :disabled="creating"
            />
          </div>

          <div class="form-field">
            <div class="form-label">Share via Email <span class="optional">(optional)</span></div>
            <div class="chip-input-wrap" :class="{ disabled: creating }" @click="emailInputEl?.focus()">
              <span v-for="(email, i) in newEmails" :key="email" class="chip">
                {{ email }}
                <button class="chip-remove" @click.stop="removeChip(i)" :disabled="creating">×</button>
              </span>
              <input
                ref="emailInputEl"
                v-model="emailInput"
                class="chip-text-input"
                placeholder="Type email and press Enter"
                :disabled="creating"
                @keydown="onEmailKeydown"
                @blur="onEmailBlur"
              />
            </div>
          </div>

          <v-notice v-if="createError" type="danger">{{ createError }}</v-notice>
        </v-card-text>

        <v-card-actions>
          <v-button secondary @click="closeDialog" :disabled="creating">Cancel</v-button>
          <v-button @click="createShare" :loading="creating">Create</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Revoke confirm dialog -->
    <v-dialog v-model="revokeDialogOpen" @esc="revokeDialogOpen = false" small>
      <v-card>
        <v-card-title>Revoke Share Link?</v-card-title>
        <v-card-text>
          This will permanently delete the share link. Anyone with the link will lose access.
        </v-card-text>
        <v-card-actions>
          <v-button secondary @click="revokeDialogOpen = false" :disabled="revoking">Cancel</v-button>
          <v-button danger @click="revokeShare" :loading="revoking">Revoke</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

// Email chip helpers (module scope, no reactivity needed)
function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

// value, primaryKey, collection, field — injected by Directus, not user-configurable
// targetCollection, fileField, passwordField, expiryField — come from interface options (index.ts)
// withDefaults ensures the component works even if an option wasn't saved yet
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
const creating = ref(false);
const createError = ref('');

// Email chips
const newEmails = ref<string[]>([]);
const emailInput = ref('');
const emailInputEl = ref<HTMLInputElement | null>(null);

function addEmailChip() {
  const val = emailInput.value.trim().replace(/[,;]$/, '');
  if (val && isValidEmail(val) && !newEmails.value.includes(val)) {
    newEmails.value.push(val);
  }
  emailInput.value = '';
}

function removeChip(index: number) {
  newEmails.value.splice(index, 1);
}

function onEmailKeydown(e: KeyboardEvent) {
  if (['Enter', ',', ';', 'Tab'].includes(e.key)) {
    e.preventDefault();
    addEmailChip();
  } else if (e.key === 'Backspace' && !emailInput.value) {
    newEmails.value.pop();
  }
}

function onEmailBlur() {
  if (emailInput.value.trim()) addEmailChip();
}

const revokeDialogOpen = ref(false);
const revokeTarget = ref<ShareRecord | null>(null);
const revoking = ref(false);

const copiedId = ref<string | null>(null);

watch(
  () => [props.primaryKey, props.targetCollection, props.fileField] as const,
  ([key, col, field]) => {
    console.log('[MediaShare] watch fired', { key, col, field });
    if (key && key !== '+' && col && field) loadShares();
  },
  { immediate: true }
);

async function loadShares() {
  const pk = props.primaryKey;
  console.log('[MediaShare] loadShares called', {
    pk,
    targetCollection: props.targetCollection,
    fileField: props.fileField,
  });

  if (!pk || pk === '+') {
    console.log('[MediaShare] aborted — no valid pk');
    return;
  }

  loading.value = true;
  loadError.value = '';

  try {
    const fields = ['id', props.passwordField, props.expiryField].filter(Boolean).join(',');
    console.log('[MediaShare] GET', `/items/${props.targetCollection}`, { filter: { [props.fileField!]: { _eq: pk } }, fields });
    const { data } = await api.get(`/items/${props.targetCollection}`, {
      params: {
        filter: { [props.fileField!]: { _eq: pk } },
        fields,
        limit: -1,
      },
    });
    console.log('[MediaShare] response', data);
    shares.value = data.data ?? [];
  } catch (err: any) {
    const msg = err?.response?.data?.errors?.[0]?.message ?? 'Failed to load share links.';
    console.error('[MediaShare] error', msg, err);
    loadError.value = msg;
  } finally {
    loading.value = false;
  }
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
    } catch (patchErr: any) {
      console.error('[MediaShare] PATCH link failed', patchErr?.response?.data ?? patchErr);
    }

    if (newEmails.value.length > 0) {
      try {
        await api.post('/media-share-validate/notify', { shareUrl: url, emails: newEmails.value });
      } catch (mailErr: any) {
        console.error('[MediaShare] notify failed', mailErr?.response?.data ?? mailErr);
      }
    }

    closeDialog();
    await loadShares();
  } catch (err: any) {
    console.error('[MediaShare] POST failed', err?.response?.data ?? err);
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
    revokeDialogOpen.value = false;
    revokeTarget.value = null;
    await loadShares();
  } catch {
    revokeDialogOpen.value = false;
    await loadShares();
  } finally {
    revoking.value = false;
  }
}

function copyLink(shareId: string) {
  const url = buildShareUrl(shareId);
  console.log('[MediaShare] copying URL', url);
  navigator.clipboard.writeText(url).then(() => {
    copiedId.value = shareId;
    setTimeout(() => (copiedId.value = null), 2000);
  });
}

function closeDialog() {
  dialogOpen.value = false;
  newPassword.value = '';
  newExpiry.value = '';
  createError.value = '';
  newEmails.value = [];
  emailInput.value = '';
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

.share-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

/* Table */
.share-table {
  border: 1px solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  overflow: hidden;
}

.share-table-header,
.share-table-row {
  display: grid;
  grid-template-columns: 1fr 80px 160px 64px;
  align-items: center;
  padding: 0 12px;
  gap: 8px;
}

.share-table-header {
  background: var(--theme--background-subdued);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--theme--foreground-subdued);
  height: 36px;
}

.share-table-row {
  height: 44px;
  border-top: 1px solid var(--theme--border-color);
  font-size: 13px;
}

.share-table-row:hover {
  background: var(--theme--background-subdued);
}

.share-url-cell {
  overflow: hidden;
}

.share-url-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--theme--foreground);
  font-family: var(--theme--fonts--mono--font-family);
  font-size: 12px;
}

.col-pwd,
.col-expiry,
.col-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.col-actions {
  justify-content: flex-end;
}

.no-value {
  color: var(--theme--foreground-subdued);
}

.icon-lock {
  color: var(--theme--warning);
}

.expired {
  color: var(--theme--danger);
}

.action-icon {
  color: var(--theme--foreground-subdued);
  transition: color 0.15s;
}

.action-icon:hover {
  color: var(--theme--foreground);
}

.icon-revoke:hover {
  color: var(--theme--danger);
}

.icon-copied {
  color: var(--theme--success) !important;
}

/* Empty / footer */
.share-empty {
  color: var(--theme--foreground-subdued);
  font-size: 13px;
}

.share-footer {
  display: flex;
  align-items: center;
}

/* Dialog form */
.form-field {
  margin-bottom: 20px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--theme--foreground-subdued);
}

.optional {
  font-weight: 400;
  color: var(--theme--foreground-subdued);
}

/* Chip input */
.chip-input-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 42px;
  padding: 6px 10px;
  border: 1px solid var(--theme--border-color);
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
  color: rgba(255, 255, 255, 0.8);
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
