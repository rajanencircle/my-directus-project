import { onMounted, onUnmounted, type Ref } from 'vue'

export function useClickOutside(el: Ref<Element | null>, cb: () => void) {
  function handleClick(event: MouseEvent) {
    if (!event.target || !el.value) {
      return
    }
    if (!el.value.contains(event.target as Node) && el.value !== event.target) {
      cb()
    }
  }
  onMounted(() => {
    document.addEventListener('click', handleClick)
  })
  onUnmounted(() => {
    document.removeEventListener('click', handleClick)
  })
}
