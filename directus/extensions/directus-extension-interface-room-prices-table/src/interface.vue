<template>
  <InterfaceTranslations v-if="mode === 'junction'" v-bind="$attrs" />
  <InterfaceDirect v-else v-bind="$attrs" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import InterfaceTranslations from "./InterfaceTranslations.vue";
import InterfaceDirect from "./InterfaceDirect.vue";

export default defineComponent({
  components: { InterfaceTranslations, InterfaceDirect },
  inheritAttrs: false,
  props: {
    mode: { type: String, default: "junction" },
  },
  emits: ["input"],
});
</script>
