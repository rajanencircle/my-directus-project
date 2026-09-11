<script setup lang="ts">
/**
 * Right-sidebar section toggle — styled to match Directus default SidebarDetail
 * (icon column, theme toggle colors, v-badge on icon, title typography).
 */
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
	icon: string
	title: string
	startOpen?: boolean
	badge?: string | number | boolean
}>()

const emit = defineEmits<{ toggle: [open: boolean] }>()

const isOpen = ref(props.startOpen ?? false)
const sidebarCollapsed = ref(false)

const showBadge = computed(() => {
	if (props.badge === true) return true
	if (props.badge === false || props.badge == null || props.badge === '') return false
	return true
})

const badgeValue = computed(() => {
	if (props.badge === true) return true
	return props.badge
})

function readCollapsed() {
	try {
		sidebarCollapsed.value = JSON.parse(localStorage.getItem('sidebar-collapsed') ?? 'false') === true
	} catch {
		sidebarCollapsed.value = false
	}
}

function expandSidebar() {
	const oldValue = localStorage.getItem('sidebar-collapsed')
	localStorage.setItem('sidebar-collapsed', 'false')
	sidebarCollapsed.value = false
	try {
		window.dispatchEvent(
			new StorageEvent('storage', {
				key: 'sidebar-collapsed',
				newValue: 'false',
				oldValue,
				storageArea: window.localStorage,
			}),
		)
	} catch {
		/* ignore */
	}
}

function onStorage(e: StorageEvent) {
	if (e.key === 'sidebar-collapsed' && e.storageArea === window.localStorage) readCollapsed()
}

onMounted(() => {
	readCollapsed()
	window.addEventListener('storage', onStorage)
})

onUnmounted(() => {
	window.removeEventListener('storage', onStorage)
})

function toggle() {
	if (sidebarCollapsed.value) {
		expandSidebar()
		isOpen.value = true
	} else {
		isOpen.value = !isOpen.value
	}
	emit('toggle', isOpen.value)
}
</script>

<template>
	<div class="sidebar-detail" :class="{ collapsed: sidebarCollapsed, open: isOpen && !sidebarCollapsed }">
		<button
			v-tooltip.left="sidebarCollapsed ? title : undefined"
			type="button"
			class="toggle"
			:class="{ open: isOpen && !sidebarCollapsed }"
			@click="toggle"
		>
			<span class="icon">
				<v-badge
					v-if="showBadge"
					:value="badgeValue"
					:disabled="!showBadge"
				>
					<v-icon :name="icon" />
				</v-badge>
				<v-icon v-else :name="icon" />
			</span>

			<span class="title">{{ title }}</span>

			<v-icon class="expand-icon" name="chevron_right" />
		</button>

		<div v-if="isOpen && !sidebarCollapsed" class="content">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.sidebar-detail {
	--v-badge-offset-x: 3px;
	--v-badge-offset-y: 4px;
	--v-badge-border-color: var(--theme--sidebar--section--toggle--background);
	--v-badge-background-color: var(--theme--primary);
	--v-badge-color: var(--theme--background-normal);

	display: block;
	flex-shrink: 0;
}

.toggle {
	--focus-ring-offset: var(--focus-ring-offset-inset);

	position: relative;
	display: flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: space-between;
	inline-size: 100%;
	block-size: calc(60px + var(--theme--sidebar--section--toggle--border-width, 1px));
	padding: 0;
	border: none;
	color: var(--theme--sidebar--section--toggle--foreground);
	background-color: var(--theme--sidebar--section--toggle--background);
	border-block-end: var(--theme--sidebar--section--toggle--border-width, 1px) solid
		var(--theme--sidebar--section--toggle--border-color);
	cursor: pointer;
	text-align: start;
}

.toggle .icon {
	/* Match icon color to the section title */
	--v-icon-color: currentColor;
	color: inherit;

	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	inline-size: 60px;
	block-size: 100%;
}

/* No hover / open color shift — keep same subdued text + icon as default Directus look */
.toggle:hover,
.toggle.open {
	color: var(--theme--sidebar--section--toggle--foreground);
	background-color: var(--theme--sidebar--section--toggle--background);
}

.title {
	position: absolute;
	inset-block-start: 50%;
	inset-inline-start: 52px;
	inset-inline-end: 2.5rem;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	transform: translateY(-50%);
	font-family: var(--theme--sidebar--section--toggle--font-family, var(--theme--fonts--sans--font-family));
	font-size: var(--theme--sidebar--section--toggle--font-size, inherit);
	font-weight: var(--theme--sidebar--section--toggle--font-weight, inherit);
	transition: opacity var(--fast) var(--transition);
	pointer-events: none;
}

.sidebar-detail.collapsed .title {
	opacity: 0;
}

.expand-icon {
	position: absolute;
	inset-inline-end: 0.75rem;
	inset-block-start: 50%;
	transform: translateY(-50%) rotate(0deg);
	color: var(--theme--foreground-subdued);
	transition:
		transform var(--fast) var(--transition),
		opacity var(--fast) var(--transition);
	pointer-events: none;
}

.sidebar-detail.collapsed .expand-icon {
	opacity: 0;
}

.toggle.open .expand-icon {
	transform: translateY(-50%) rotate(90deg);
}

.content {
	padding: 16px;
	border-block-end: var(--theme--sidebar--section--toggle--border-width, 1px) solid
		var(--theme--sidebar--section--toggle--border-color);
}
</style>
