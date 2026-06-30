<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SidebarDetail from './SidebarDetail.vue'

const props = defineProps<{ fileId: string }>()

const api = useApi()
const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '')

interface CommentUser {
  id?: string
  first_name?: string | null
  last_name?: string | null
  avatar?: { id: string } | null
}

interface Comment {
  id: string
  comment: string
  date_created: string
  user_created?: CommentUser | null
}

interface CommentGroup {
  date: Date
  dateFormatted: string
  comments: Comment[]
}

const comments = ref<Comment[] | null>(null)
const commentsCount = ref(0)
const loadingCount = ref(false)
const loading = ref(false)
const hasLoaded = ref(false)

const newComment = ref('')
const focused = ref(false)
const posting = ref(false)

const editingId = ref<string | null>(null)
const editingText = ref('')
const saving = ref(false)

const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

const showDeleteConfirm = computed({
  get: () => confirmDeleteId.value !== null,
  set: (v) => { if (!v) confirmDeleteId.value = null },
})

const badge = computed(() => {
  if (loadingCount.value || commentsCount.value === 0) return undefined
  return commentsCount.value > 999
    ? `${Math.floor(commentsCount.value / 1000)}k`
    : String(commentsCount.value)
})

const groupedComments = computed<CommentGroup[]>(() => {
  if (!comments.value) return []
  const map = new Map<string, CommentGroup>()
  for (const c of comments.value) {
    const dateKey = new Date(new Date(c.date_created).toDateString()).toISOString()
    if (!map.has(dateKey)) {
      const d = new Date(dateKey)
      map.set(dateKey, { date: d, dateFormatted: formatGroupDate(d), comments: [] })
    }
    map.get(dateKey)!.comments.push(c)
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime())
})

function formatGroupDate(d: Date): string {
  const now = new Date()
  const today = new Date(now.toDateString())
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const thisYear = d.getFullYear() === now.getFullYear()
  return d.toLocaleDateString(undefined, thisYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
}

function getUserName(user?: CommentUser | null): string {
  if (!user) return 'Unknown'
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown'
}

function getAvatarUrl(user?: CommentUser | null): string | null {
  if (!user?.avatar?.id) return null
  return `${baseUrl}/assets/${user.avatar.id}?key=system-small-cover`
}

function getInitials(user?: CommentUser | null): string {
  if (!user) return '?'
  const first = user.first_name?.[0] ?? ''
  const last = user.last_name?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function renderMarkdown(text: string): string {
  if (!text) return ''
  const raw = marked.parse(text, { async: false }) as string
  return DOMPurify.sanitize(raw)
}

async function loadCount() {
  loadingCount.value = true
  try {
    const res = await api.get('/comments', {
      params: {
        filter: {
          _and: [
            { collection: { _eq: 'directus_files' } },
            { item: { _eq: props.fileId } },
          ],
        },
        aggregate: { count: 'id' },
      },
    })
    commentsCount.value = Number(res.data?.data?.[0]?.count?.id ?? 0)
  } catch {
    commentsCount.value = 0
  } finally {
    loadingCount.value = false
  }
}

async function loadComments() {
  loading.value = true
  try {
    const res = await api.get('/comments', {
      params: {
        filter: {
          _and: [
            { collection: { _eq: 'directus_files' } },
            { item: { _eq: props.fileId } },
          ],
        },
        sort: 'date_created',
        fields: [
          'id',
          'comment',
          'date_created',
          'user_created.id',
          'user_created.first_name',
          'user_created.last_name',
          'user_created.avatar.id',
        ],
        limit: -1,
      },
    })
    comments.value = res.data?.data ?? []
    hasLoaded.value = true
  } catch {
    comments.value = []
  } finally {
    loading.value = false
  }
}

function onToggle(open: boolean) {
  if (open && !hasLoaded.value) loadComments()
}

async function reload() {
  hasLoaded.value = false
  comments.value = null
  await loadCount()
}

async function postComment() {
  const text = newComment.value.trim()
  if (!text || posting.value) return
  posting.value = true
  try {
    await api.post('/comments', {
      collection: 'directus_files',
      item: props.fileId,
      comment: text,
    })
    newComment.value = ''
    focused.value = false
    await Promise.all([loadComments(), loadCount()])
  } catch (err) {
    console.error('[CommentsSidebar] post error:', err)
  } finally {
    posting.value = false
  }
}

function cancelNew() {
  newComment.value = ''
  focused.value = false
}

function startEdit(c: Comment) {
  editingId.value = c.id
  editingText.value = c.comment
}

function cancelEdit() {
  editingId.value = null
  editingText.value = ''
}

async function saveEdit(id: string) {
  const text = editingText.value.trim()
  if (!text || saving.value) return
  saving.value = true
  try {
    await api.patch(`/comments/${id}`, { comment: text })
    editingId.value = null
    editingText.value = ''
    await loadComments()
  } catch (err) {
    console.error('[CommentsSidebar] patch error:', err)
  } finally {
    saving.value = false
  }
}

async function deleteComment() {
  const id = confirmDeleteId.value
  if (!id || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/comments/${id}`)
    confirmDeleteId.value = null
    await Promise.all([loadComments(), loadCount()])
  } catch (err) {
    console.error('[CommentsSidebar] delete error:', err)
  } finally {
    deleting.value = false
  }
}

function onNewKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    postComment()
  }
  if (e.key === 'Escape') cancelNew()
}

function onEditKeydown(e: KeyboardEvent, id: string) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    saveEdit(id)
  }
  if (e.key === 'Escape') cancelEdit()
}

onMounted(loadCount)
watch(() => props.fileId, reload)
</script>

<template>
  <SidebarDetail icon="chat_bubble_outline" title="Comments" :badge="badge" @toggle="onToggle">
    <!-- New comment input -->
    <div class="comment-input-wrap" :class="{ expanded: focused || newComment.trim() }">
      <textarea
        v-model="newComment"
        class="comment-input"
        placeholder="Leave a comment…"
        :rows="focused || newComment.trim() ? 3 : 1"
        @focus="focused = true"
        @keydown="onNewKeydown"
      />
      <div v-if="focused || newComment.trim()" class="input-actions">
        <v-button x-small secondary @click="cancelNew">Cancel</v-button>
        <v-button
          x-small
          :loading="posting"
          :disabled="!newComment.trim()"
          @click="postComment"
        >
          Submit
        </v-button>
      </div>
    </div>

    <v-progress-linear v-if="loading" indeterminate class="loading-bar" />

    <div v-else-if="commentsCount === 0 && !loading" class="empty">No comments</div>

    <template v-else-if="comments">
      <template v-for="group in groupedComments" :key="group.date.toISOString()">
        <v-divider class="date-divider">{{ group.dateFormatted }}</v-divider>

        <div v-for="c in group.comments" :key="c.id" class="comment-item">
          <div class="comment-header">
            <v-avatar x-small class="avatar">
              <img
                v-if="getAvatarUrl(c.user_created)"
                :src="getAvatarUrl(c.user_created)!"
                :alt="getUserName(c.user_created)"
              />
              <v-icon v-else name="person_outline" />
            </v-avatar>

            <span class="comment-name">{{ getUserName(c.user_created) }}</span>

            <div class="header-right">
              <span class="comment-time">{{ formatTime(c.date_created) }}</span>
              <v-menu show-arrow placement="bottom-end" class="options-menu">
                <template #activator="{ toggle }">
                  <v-icon
                    name="more_horiz"
                    class="options-icon"
                    small
                    clickable
                    @click.stop="toggle"
                  />
                </template>
                <v-list>
                  <v-list-item clickable @click="startEdit(c)">
                    <v-list-item-icon><v-icon name="edit" /></v-list-item-icon>
                    <v-list-item-content>Edit</v-list-item-content>
                  </v-list-item>
                  <v-list-item clickable @click="confirmDeleteId = c.id">
                    <v-list-item-icon><v-icon name="delete" /></v-list-item-icon>
                    <v-list-item-content>Delete</v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>

          <!-- Inline edit -->
          <div v-if="editingId === c.id" class="edit-wrap">
            <textarea
              v-model="editingText"
              class="comment-input"
              rows="3"
              @keydown="(e) => onEditKeydown(e, c.id)"
            />
            <div class="input-actions">
              <v-button x-small secondary @click="cancelEdit">Cancel</v-button>
              <v-button x-small :loading="saving" :disabled="!editingText.trim()" @click="saveEdit(c.id)">Save</v-button>
            </div>
          </div>

          <!-- Rendered comment body -->
          <div
            v-else
            class="comment-body"
            v-html="renderMarkdown(c.comment)"
          />
        </div>
      </template>
    </template>

    <!-- Delete confirmation dialog -->
    <v-dialog v-model="showDeleteConfirm" @esc="confirmDeleteId = null">
      <v-card>
        <v-card-title>Delete Comment</v-card-title>
        <v-card-text>Are you sure you want to delete this comment?</v-card-text>
        <v-card-actions>
          <v-button secondary @click="confirmDeleteId = null">Cancel</v-button>
          <v-button kind="danger" :loading="deleting" @click="deleteComment">Delete</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </SidebarDetail>
</template>

<style scoped>
.comment-input-wrap {
  padding: 0.5rem 1rem 0.625rem;
  border-block-end: 1px solid var(--theme--border-color-subdued);
}

.comment-input {
  display: block;
  inline-size: 100%;
  padding: 0.5rem 0.625rem;
  resize: none;
  font-size: 0.8125rem;
  font-family: inherit;
  line-height: 1.5;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  color: var(--theme--foreground);
  outline: none;
  transition: border-color var(--fast) var(--transition);
  box-sizing: border-box;
  overflow: hidden;
}

.comment-input:focus {
  border-color: var(--theme--primary);
  overflow: auto;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.375rem;
  margin-block-start: 0.375rem;
}

.loading-bar {
  margin-block: 0.5rem;
}

.empty {
  padding: 0.875rem 1rem;
  color: var(--theme--foreground-subdued);
  font-size: 0.8125rem;
  font-style: italic;
}

.date-divider {
  margin-block: 0.5rem;
}

.comment-item {
  padding: 0.5rem 1rem;
  border-radius: var(--theme--border-radius);
  transition: background-color var(--fast) var(--transition);
}

.comment-item:hover {
  background-color: var(--theme--background-subdued);
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-block-end: 0.375rem;
}

.avatar {
  flex-shrink: 0;
}

.comment-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--theme--foreground);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  position: relative;
}

.comment-time {
  font-size: 0.75rem;
  color: var(--theme--foreground-subdued);
  white-space: nowrap;
  transition: opacity var(--fast) var(--transition);
}

.options-icon {
  opacity: 0;
  transition: opacity var(--fast) var(--transition);
  color: var(--theme--foreground-subdued);
}

.comment-item:hover .options-icon {
  opacity: 1;
}

.comment-item:hover .comment-time {
  opacity: 0;
}

.comment-body {
  font-size: 0.8125rem;
  color: var(--theme--foreground);
  line-height: 1.5;
  max-block-size: 16.875rem;
  overflow-y: auto;
  word-break: break-word;
}

.comment-body :deep(p) {
  margin: 0 0 0.5em;
}

.comment-body :deep(p:last-child) {
  margin-bottom: 0;
}

.comment-body :deep(mark) {
  background-color: var(--theme--primary-background);
  color: var(--theme--primary);
  padding: 0 0.125rem;
  border-radius: 0.1875rem;
}

.comment-body :deep(code) {
  font-family: var(--theme--fonts--mono--font-family);
  font-size: 0.75rem;
  background-color: var(--theme--background-accent);
  padding: 0.0625rem 0.25rem;
  border-radius: 0.1875rem;
}

.comment-body :deep(pre) {
  background-color: var(--theme--background-accent);
  padding: 0.5rem 0.75rem;
  border-radius: var(--theme--border-radius);
  overflow-x: auto;
  font-size: 0.75rem;
}

.edit-wrap {
  margin-block-start: 0.25rem;
}
</style>
