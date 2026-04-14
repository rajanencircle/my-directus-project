<template>
  <div class="wrapper" :class="{ disabled, 'non-editable': nonEditable }">
    <div class="it-calendar" ref="datepicker">
      <input @input="handleChange($event as InputEvent)" data-input :disabled="disabled || nonEditable" />

      <template v-if="!disabled && !nonEditable">
        <a class="calendar-button" title="Seleccionar fecha" v-show="!value" @click="toggleOpen()">
          <VIcon name="today" />
        </a>
        <a class="x-button" title="Vaciar campo" v-show="value" @click="instance?.clear()">
          <VIcon name="close" />
        </a>
      </template>
    </div>
  </div>
  <Teleport :to="instance?.calendarContainer" v-if="instance">
    <button class="it-now-button" @click="setNow">
      {{ props.type === 'date' ? 'Ajustar a hoy' : 'Ajustar a ahora mismo' }}
    </button>
  </Teleport>
</template>

<script lang="ts" setup>
import flatpickr from 'flatpickr'
import { ref, toRefs, watch } from 'vue'
import { Spanish } from 'flatpickr/dist/l10n/es.js'
import type { Instance } from 'flatpickr/dist/types/instance'
import { useClickOutside } from './useClickOutside'

let props = defineProps({
  value: {
    type: String,
    default: null,
  },
  type: {
    type: String,
    required: true,
  },
  disabled: Boolean,
  nonEditable: Boolean,
})

let emit = defineEmits(['input'])

let datepicker = ref<HTMLDivElement | null>(null)
let wrapper = ref<HTMLDivElement | null>(null)
let instance = ref<Instance>()
watch([toRefs(props).value, datepicker], () => {
  if (instance.value && !props.value) {
    instance.value.clear()
  } else if (datepicker.value && (!instance.value || !instance.value.isOpen)) {
    instance.value = flatpickr(datepicker.value, {
      static: true,
      inline: true,
      defaultDate: props.value ? props.value : undefined,
      wrap: true,
      prevArrow:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"></path></svg>',
      nextArrow:
        '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"></path></svg>',
      locale: Spanish,
      altInput: true,
      altFormat: props.type === 'date' ? 'j M Y' : 'j M Y H:i',
      enableTime: props.type === 'dateTime',
      onOpen: (_date, _str, instance) => {
        instance.calendarContainer.style.minWidth = instance.altInput?.clientWidth + 'px'
      },
      clickOpens: !props.disabled,
    })
    instance.value.altInput!.onclick = toggleOpen
    wrapper.value = datepicker.value.parentNode as HTMLDivElement
  }
})

function toggleOpen() {
  instance.value?.calendarContainer.classList.toggle('open')
}
function close() {
  instance.value?.calendarContainer.classList.remove('open')
}

function setNow() {
  if (instance.value) {
    instance.value.setDate(new Date(), true)
    close()
  }
}

function handleChange(event: InputEvent) {
  let input = event.target as HTMLInputElement
  emit('input', input.value ? input.value : null)
  close()
}

useClickOutside(wrapper, close)
</script>

<style lang="scss">
.wrapper {
  position: relative;

  &.non-editable > .flatpickr-wrapper > .input {
    cursor: not-allowed;

    &:hover {
      border-color: var(--theme--form--field--input--border-color);
    }
  }

  &.disabled:not(.non-editable) > .flatpickr-wrapper > .input {
    color: var(--theme--foreground-subdued);
    background-color: var(--theme--form--field--input--background-subdued);
    border-color: var(--theme--form--field--input--border-color);
    cursor: not-allowed;

    &:hover {
      border-color: var(--theme--form--field--input--border-color);
    }
    &:focus {
      border-color: var(--theme--form--field--input--border-color);
    }
  }

  .flatpickr-wrapper {
    .flatpickr-calendar.animate {
      display: none;

      &.open {
        display: block;
        position: absolute;
        width: 100%;
        top: 60px;
        -webkit-animation: fpFadeInDown 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        animation: fpFadeInDown 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        box-shadow:
          0 10px 15px -3px rgb(0 0 0 / 0.1),
          0 4px 6px -4px rgb(0 0 0 / 0.1);
      }
    }

    .it-calendar {
      display: flex;
      align-items: center;
      position: relative;
      width: 100%;
    }

    .input {
      height: var(--theme--form--field--input--height);
      padding: var(--theme--form--field--input--padding);
      font-family: var(--v-input-font-family, var(--theme--fonts--sans--font-family));
      border-radius: var(--v-input-border-radius, var(--theme--border-radius));
      border: var(--theme--border-width) solid var(--v-input-border-color, var(--theme--form--field--input--border-color));
      border-width: var(--theme--border-width);
      background-color: var(--theme--form--field--input--background);
      transition: var(--fast) var(--transition);
      cursor: pointer;
      width: 100%;

      &:hover {
        border-color: var(--v-input-border-color-hover, var(--theme--form--field--input--border-color-hover));
      }

      &:focus {
        border-color: var(--v-input-border-color-focus, var(--theme--form--field--input--border-color-focus));
      }
    }

    .calendar-button,
    .x-button {
      position: absolute;
      top: 0;
      right: 0;
      width: var(--theme--form--field--input--height);
      height: var(--theme--form--field--input--height);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--theme--foreground-subdued);
      cursor: pointer;
    }
    .calendar-button .v-icon:hover {
      color: var(--theme--primary);
    }
    .x-button .v-icon:hover {
      color: var(--theme--danger);
    }

    .it-now-button {
      width: 100%;
      display: flex;
      justify-content: center;
      border-top: var(--theme--border-width) solid var(--theme--border-color-subdued);
      line-height: 40px;
      overflow: hidden;
      color: var(--theme--foreground);
      text-align: center;
      transition: var(--fast) var(--transition);
      transition-property: background, border-color, color;

      &:hover {
        background-color: var(--background-highlight);
      }
    }
  }
}
</style>
