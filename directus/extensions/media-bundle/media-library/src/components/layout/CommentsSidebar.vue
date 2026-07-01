<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useApi } from '@directus/extensions-sdk'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import SidebarDetail from './SidebarDetail.vue'
import EmojiPickerButton from './EmojiPickerButton.vue'

const props = defineProps<{ fileId: string }>()

const api = useApi()
const baseUrl = (api.defaults.baseURL ?? '').replace(/\/$/, '')

// Matches @UUID anywhere in a string (no leading-space requirement for extraction)
const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const MENTION_EXTRACT_RE = new RegExp(`@(${UUID_PATTERN})`, 'gi')

interface CommentUser {
  id?: string
  first_name?: string | null
  last_name?: string | null
  avatar?: { id: string } | null
}

interface MentionUser {
  id: string
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

// ─── Comments ───────────────────────────────────────────────────────────────
const comments = ref<Comment[] | null>(null)
const commentsCount = ref(0)
const loadingCount = ref(false)
const loading = ref(false)
const hasLoaded = ref(false)
const userPreviews = ref<Record<string, string>>({})

// ─── New comment input ───────────────────────────────────────────────────────
const newComment = ref('')
const focused = ref(false)
const posting = ref(false)
const newCommentRef = ref<HTMLTextAreaElement | null>(null)
// Last known caret positions so emoji/@ insertion lands at the right spot
const lastCaretPos = ref<Record<MentionCtx, number>>({ new: 0, edit: 0 })

// ─── Inline edit ─────────────────────────────────────────────────────────────
const editingId = ref<string | null>(null)
const editingText = ref('')
const saving = ref(false)
const editCommentRef = ref<HTMLTextAreaElement | null>(null)

// ─── Delete ──────────────────────────────────────────────────────────────────
const confirmDeleteId = ref<string | null>(null)
const deleting = ref(false)

// ─── Mention autocomplete ─────────────────────────────────────────────────────
type MentionCtx = 'new' | 'edit'
const mentionCtx = ref<MentionCtx>('new')
const showMentions = ref(false)
const mentionStart = ref(-1)  // index of the @ character in the text
const mentionQuery = ref('')
const mentionUsers = ref<MentionUser[]>([])
const mentionLoading = ref(false)
const mentionIdx = ref(0)
let mentionTimer: ReturnType<typeof setTimeout> | null = null

// ─── Computed ─────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

function getAvatarUrl(user?: CommentUser | MentionUser | null): string | null {
  if (!user?.avatar?.id) return null
  return `${baseUrl}/assets/${user.avatar.id}?key=system-small-cover`
}

function getInitials(user?: CommentUser | null): string {
  if (!user) return '?'
  return ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || '?'
}

function formatTime(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// ─── Mention rendering ────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  if (!text) return ''
  // 1. Strip any raw HTML the user may have typed (preserves plain text + markdown syntax)
  const plain = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] })
  // 2. Replace @UUID with <mark>Name</mark> (same pattern as native Directus)
  const withMentions = plain.replace(
    new RegExp(`@(${UUID_PATTERN})`, 'gi'),
    (_, uuid: string) => `<mark>${userPreviews.value[uuid] ?? uuid}</mark>`,
  )
  // 3. Render Markdown (marked passes through HTML tags)
  const html = marked.parse(withMentions, { async: false }) as string
  // 4. Sanitize — DOMPurify allows <mark> by default
  return DOMPurify.sanitize(html)
}

async function loadUserPreviews(commentsList: Comment[]) {
  const ids = new Set<string>()
  for (const c of commentsList) {
    MENTION_EXTRACT_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = MENTION_EXTRACT_RE.exec(c.comment ?? '')) !== null) ids.add(m[1])
  }
  if (ids.size === 0) return
  try {
    const res = await api.get('/users', {
      params: {
        filter: { id: { _in: [...ids] } },
        fields: ['id', 'first_name', 'last_name'],
        limit: -1,
      },
    })
    for (const u of (res.data?.data ?? [])) {
      userPreviews.value[u.id] = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.id
    }
  } catch { /* non-critical */ }
}

// ─── Mention autocomplete ─────────────────────────────────────────────────────
function detectMention(text: string, pos: number, ctx: MentionCtx) {
  // Walk back from cursor: stop at space/newline or find @
  let atPos = -1
  for (let i = pos - 1; i >= 0; i--) {
    if (text[i] === '@') {
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\n') {
        atPos = i; break
      }
      break
    }
    if (text[i] === ' ' || text[i] === '\n') break
  }

  if (atPos >= 0) {
    const query = text.slice(atPos + 1, pos)
    // Don't re-trigger inside an already-completed UUID
    if (/^[0-9a-f-]{36}$/i.test(query)) { showMentions.value = false; return }
    mentionCtx.value = ctx
    mentionStart.value = atPos
    mentionQuery.value = query
    mentionIdx.value = 0
    showMentions.value = true
    scheduleMentionSearch(query)
  } else {
    showMentions.value = false
  }
}

function scheduleMentionSearch(query: string) {
  if (mentionTimer) clearTimeout(mentionTimer)
  mentionTimer = setTimeout(() => fetchMentionUsers(query), 200)
}

async function fetchMentionUsers(query: string) {
  mentionLoading.value = true
  try {
    const params: Record<string, any> = {
      fields: ['id', 'first_name', 'last_name', 'avatar.id'],
      limit: 8,
    }
    if (query) {
      params.filter = {
        _or: [
          { first_name: { _starts_with: query } },
          { last_name: { _starts_with: query } },
        ],
      }
    }
    const res = await api.get('/users', { params })
    mentionUsers.value = res.data?.data ?? []
  } catch {
    mentionUsers.value = []
  } finally {
    mentionLoading.value = false
  }
}

function selectMention(user: MentionUser) {
  const isEdit = mentionCtx.value === 'edit'
  const textModel = isEdit ? editingText : newComment
  const text = textModel.value
  const before = text.slice(0, mentionStart.value)
  const after = text.slice(mentionStart.value + 1 + mentionQuery.value.length)
  textModel.value = `${before}@${user.id} ${after}`
  showMentions.value = false

  nextTick(() => {
    const el = (isEdit ? editCommentRef : newCommentRef).value
    if (el) {
      const pos = before.length + 1 + user.id.length + 1
      el.setSelectionRange(pos, pos)
      el.focus()
    }
  })
}

function closeMentionsOnBlur(ctx: MentionCtx) {
  // Save caret before focus moves away (for emoji / @ insertion)
  const el = (ctx === 'new' ? newCommentRef : editCommentRef).value
  if (el) lastCaretPos.value[ctx] = el.selectionStart ?? 0
  // Give mousedown on mention items time to fire before closing
  setTimeout(() => { showMentions.value = false }, 150)
}

function trackCaret(e: Event, ctx: MentionCtx) {
  lastCaretPos.value[ctx] = (e.target as HTMLTextAreaElement).selectionStart ?? 0
}

// ─── @ and emoji insertion ────────────────────────────────────────────────────
function insertAtMention(ctx: MentionCtx) {
  const el = (ctx === 'new' ? newCommentRef : editCommentRef).value
  const textModel = ctx === 'new' ? newComment : editingText
  const pos = el ? el.selectionStart ?? lastCaretPos.value[ctx] : lastCaretPos.value[ctx]
  const before = textModel.value.slice(0, pos)
  const after = textModel.value.slice(pos)
  // Add a space before @ when cursor isn't already at a word boundary
  const needsSpace = before.length > 0 && !/[ \n]$/.test(before)
  const insert = needsSpace ? ' @' : '@'
  textModel.value = before + insert + after
  const newPos = pos + insert.length
  nextTick(() => {
    if (el) {
      el.focus()
      el.setSelectionRange(newPos, newPos)
      detectMention(textModel.value, newPos, ctx)
    }
  })
}

function insertText(text: string, ctx: MentionCtx) {
  const el = (ctx === 'new' ? newCommentRef : editCommentRef).value
  const textModel = ctx === 'new' ? newComment : editingText
  const pos = lastCaretPos.value[ctx]
  const before = textModel.value.slice(0, pos)
  const after = textModel.value.slice(pos)
  textModel.value = before + text + after
  const newPos = pos + text.length
  lastCaretPos.value[ctx] = newPos
  nextTick(() => {
    if (el) {
      el.focus()
      el.setSelectionRange(newPos, newPos)
    }
  })
}

// ─── Keyboard handlers ────────────────────────────────────────────────────────
function handleMentionKeys(e: KeyboardEvent): boolean {
  if (!showMentions.value) return false
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    mentionIdx.value = Math.min(mentionIdx.value + 1, mentionUsers.value.length - 1)
    return true
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    mentionIdx.value = Math.max(mentionIdx.value - 1, 0)
    return true
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    const u = mentionUsers.value[mentionIdx.value]
    if (u) selectMention(u)
    return true
  }
  if (e.key === 'Escape') {
    showMentions.value = false
    return true
  }
  return false
}

function onNewKeydown(e: KeyboardEvent) {
  if (handleMentionKeys(e)) return
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); postComment(); return }
  if (e.key === 'Escape') cancelNew()
}

function onEditKeydown(e: KeyboardEvent, id: string) {
  if (handleMentionKeys(e)) return
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveEdit(id); return }
  if (e.key === 'Escape') cancelEdit()
}

// ─── API ──────────────────────────────────────────────────────────────────────
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
    const data: Comment[] = res.data?.data ?? []
    await loadUserPreviews(data)
    comments.value = data
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

onMounted(loadCount)
watch(() => props.fileId, reload)
</script>

<template>
  <SidebarDetail icon="chat_bubble_outline" title="Comments" :badge="badge" @toggle="onToggle">

    <!-- ── New comment input ── -->
    <div class="comment-input-wrap">
      <div class="mention-anchor">
        <textarea
          ref="newCommentRef"
          v-model="newComment"
          class="comment-input"
          placeholder="Leave a comment…"
          :rows="focused || newComment.trim() ? 3 : 1"
          @focus="focused = true"
          @blur="closeMentionsOnBlur('new')"
          @click="(e) => trackCaret(e, 'new')"
          @keyup="(e) => trackCaret(e, 'new')"
          @select="(e) => trackCaret(e, 'new')"
          @input="(e) => { trackCaret(e, 'new'); detectMention((e.target as HTMLTextAreaElement).value, (e.target as HTMLTextAreaElement).selectionStart ?? 0, 'new') }"
          @keydown="onNewKeydown"
        />

        <!-- Mention dropdown for new comment -->
        <div v-if="showMentions && mentionCtx === 'new'" class="mention-dropdown" role="listbox">
          <div v-if="mentionLoading" class="mention-loading">
            <v-progress-circular x-small indeterminate />
          </div>
          <template v-else-if="mentionUsers.length">
            <button
              v-for="(u, i) in mentionUsers"
              :key="u.id"
              type="button"
              role="option"
              class="mention-item"
              :class="{ active: i === mentionIdx }"
              @mousedown.prevent="selectMention(u)"
              @mousemove="mentionIdx = i"
            >
              <v-avatar x-small class="mention-avatar">
                <img v-if="getAvatarUrl(u)" :src="getAvatarUrl(u)!" :alt="getUserName(u)" />
                <v-icon v-else name="person_outline" />
              </v-avatar>
              <span>{{ getUserName(u) }}</span>
            </button>
          </template>
          <div v-else class="mention-empty">No users found</div>
        </div>
      </div>

      <div v-if="focused || newComment.trim()" class="input-actions">
        <v-button x-small secondary icon class="action-btn" title="Mention a user" @mousedown.prevent="insertAtMention('new')">
          <v-icon name="alternate_email" />
        </v-button>
        <EmojiPickerButton @emoji-selected="insertText($event, 'new')" />
        <span class="spacer" />
        <v-button x-small secondary @click="cancelNew">Cancel</v-button>
        <v-button x-small :loading="posting" :disabled="!newComment.trim()" @click="postComment">Submit</v-button>
      </div>
    </div>

    <!-- ── Loading / empty ── -->
    <v-progress-linear v-if="loading" indeterminate class="loading-bar" />

    <div v-else-if="commentsCount === 0 && !loading" class="empty">No comments</div>

    <!-- ── Comment list ── -->
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
              <v-menu show-arrow placement="bottom-end">
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

          <!-- Inline edit with mention support -->
          <div v-if="editingId === c.id" class="edit-wrap">
            <div class="mention-anchor">
              <textarea
                ref="editCommentRef"
                v-model="editingText"
                class="comment-input"
                rows="3"
                @blur="closeMentionsOnBlur('edit')"
                @click="(e) => trackCaret(e, 'edit')"
                @keyup="(e) => trackCaret(e, 'edit')"
                @select="(e) => trackCaret(e, 'edit')"
                @input="(e) => { trackCaret(e, 'edit'); detectMention((e.target as HTMLTextAreaElement).value, (e.target as HTMLTextAreaElement).selectionStart ?? 0, 'edit') }"
                @keydown="(e) => onEditKeydown(e, c.id)"
              />
              <!-- Mention dropdown for edit -->
              <div v-if="showMentions && mentionCtx === 'edit'" class="mention-dropdown" role="listbox">
                <div v-if="mentionLoading" class="mention-loading">
                  <v-progress-circular x-small indeterminate />
                </div>
                <template v-else-if="mentionUsers.length">
                  <button
                    v-for="(u, i) in mentionUsers"
                    :key="u.id"
                    type="button"
                    role="option"
                    class="mention-item"
                    :class="{ active: i === mentionIdx }"
                    @mousedown.prevent="selectMention(u)"
                    @mousemove="mentionIdx = i"
                  >
                    <v-avatar x-small class="mention-avatar">
                      <img v-if="getAvatarUrl(u)" :src="getAvatarUrl(u)!" :alt="getUserName(u)" />
                      <v-icon v-else name="person_outline" />
                    </v-avatar>
                    <span>{{ getUserName(u) }}</span>
                  </button>
                </template>
                <div v-else class="mention-empty">No users found</div>
              </div>
            </div>
            <div class="input-actions">
              <v-button x-small secondary icon class="action-btn" title="Mention a user" @mousedown.prevent="insertAtMention('edit')">
                <v-icon name="alternate_email" />
              </v-button>
              <EmojiPickerButton @emoji-selected="insertText($event, 'edit')" />
              <span class="spacer" />
              <v-button x-small secondary @click="cancelEdit">Cancel</v-button>
              <v-button x-small :loading="saving" :disabled="!editingText.trim()" @click="saveEdit(c.id)">Save</v-button>
            </div>
          </div>

          <!-- Rendered Markdown + mentions -->
          <div
            v-else
            class="comment-body"
            v-html="renderMarkdown(c.comment)"
          />
        </div>
      </template>
    </template>

    <!-- ── Delete confirmation ── -->
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
/* ── Input ──────────────────────────────────────────────────────────────────── */
.comment-input-wrap {
  padding: 0.5rem 1rem 0.625rem;
  border-block-end: 1px solid var(--theme--border-color-subdued);
}

.mention-anchor {
  position: relative;
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
  align-items: center;
  gap: 0.25rem;
  margin-block-start: 0.375rem;
}

.spacer {
  flex: 1;
}

.action-btn {
  --v-button-background-color: transparent;
  --v-button-color: var(--theme--foreground-subdued);
  --v-button-color-hover: var(--theme--primary);
  --v-button-background-color-hover: transparent;
}

/* ── Mention dropdown ───────────────────────────────────────────────────────── */
.mention-dropdown {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline: 0;
  z-index: 100;
  background: var(--theme--background-normal);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: var(--theme--border-radius);
  box-shadow: var(--theme--shadow);
  overflow: hidden;
  max-block-size: 14rem;
  overflow-y: auto;
}

.mention-loading,
.mention-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem;
  font-size: 0.8125rem;
  color: var(--theme--foreground-subdued);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  inline-size: 100%;
  padding: 0.4375rem 0.75rem;
  font-size: 0.8125rem;
  text-align: start;
  background: none;
  border: none;
  color: var(--theme--foreground);
  cursor: pointer;
  transition: background-color var(--fast) var(--transition);
}

.mention-item:hover,
.mention-item.active {
  background-color: var(--theme--background-accent);
}

.mention-avatar {
  flex-shrink: 0;
}

/* ── Loading / empty ────────────────────────────────────────────────────────── */
.loading-bar {
  margin-block: 0.5rem;
}

.empty {
  padding: 0.875rem 1rem;
  color: var(--theme--foreground-subdued);
  font-size: 0.8125rem;
  font-style: italic;
}

/* ── Date dividers ──────────────────────────────────────────────────────────── */
.date-divider {
  margin-block: 0.5rem;
}

/* ── Comment items ──────────────────────────────────────────────────────────── */
.comment-item {
  padding: 0.4375rem 0.75rem;
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

/* ── Comment body (rendered Markdown) ───────────────────────────────────────── */
.comment-body {
  font-size: 0.8125rem;
  color: var(--theme--foreground);
  line-height: 1.5;
  max-block-size: 16.875rem;
  overflow-y: auto;
  word-break: break-word;
}

.comment-body :deep(p) { margin: 0 0 0.5em; }
.comment-body :deep(p:last-child) { margin-bottom: 0; }

.comment-body :deep(mark) {
  display: inline-block;
  padding: 0.125rem 0.25rem;
  color: var(--theme--primary);
  line-height: 1;
  background: var(--theme--primary-background);
  border-radius: var(--theme--border-radius);
  pointer-events: none;
}

.comment-body :deep(a) { color: var(--theme--primary); }

.comment-body :deep(blockquote) {
  margin: 0.4375rem 0;
  padding-inline-start: 0.5rem;
  color: var(--theme--foreground-subdued);
  font-style: italic;
  border-inline-start: 2px solid var(--theme--border-color);
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

/* ── Inline edit ────────────────────────────────────────────────────────────── */
.edit-wrap {
  margin-block-start: 0.25rem;
}
</style>
