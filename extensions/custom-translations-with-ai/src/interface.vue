<!-- <template>
	<input :value="value" @input="handleChange($event.target.value)" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
	},
	emits: ['input'],
	setup(props, { emit }) {
		return { handleChange };

		function handleChange(value: string): void {
			emit('input', value);
		}
	},
});
</script> -->

<template>
  <div>
    <!-- Render native translations UI (you can copy logic from core or use nested fields) -->
    <div v-for="lang in languages" :key="lang.code" class="language-group">
      <h3>{{ lang.name }}</h3>

      <!-- Example fields – replace with dynamic field rendering using useCollection / useItems -->
      <div
        v-for="field in translatableFields"
        :key="field.field"
        class="field-row"
      >
        <component
          :is="field.interface"
          v-model="values[lang.code][field.field]"
          :disabled="disabled"
        />

        <!-- Checkbox at the end of each field -->
        <v-checkbox
          v-model="selected[lang.code][field.field]"
          label="Select for translation"
        />
      </div>
    </div>

    <!-- Translation Button -->
    <v-button
      icon="translate"
      @click="triggerTranslation"
      :disabled="noSelections"
    >
      Translate Selected Fields
    </v-button>

    <!-- Popup Modal -->
    <v-dialog v-model="showPopup" persistent>
      <v-card title="AI Translation Preview">
        <v-table>
          <thead>
            <tr>
              <th>Source (Selected Language)</th>
              <th>Current Translation</th>
              <th>New Translation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in previewData" :key="item.key">
              <td>{{ item.source }}</td>
              <td>{{ item.current }}</td>
              <td><input v-model="item.new" /></td>
            </tr>
          </tbody>
        </v-table>

        <template #footer>
          <v-button @click="showPopup = false">Cancel</v-button>
          <v-button primary @click="insertTranslations"
            >Insert Translation</v-button
          >
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi, useStores } from "@directus/extensions-sdk";

const props = defineProps({
  value: Object, // translations data
  collection: String,
  field: String,
  primaryKey: String,
  disabled: Boolean,
});

const emit = defineEmits(["input"]);

const api = useApi();
const { useCollectionsStore, useFieldsStore } = useStores();
const collectionsStore = useCollectionsStore();
const fieldsStore = useFieldsStore();

// State
const languages = ref([]); // populated from languages collection
const translatableFields = ref([]); // fields that are translatable
const values = ref(props.value || {});
const selected = ref({}); // { langCode: { fieldKey: true } }
const showPopup = ref(false);
const previewData = ref([]);

// Load languages & fields (onMounted)
onMounted(async () => {
  // Get languages collection config from your translations field settings
  const langCollection = await collectionsStore.getCollection("languages"); // or your configured one
  languages.value = langCollection.items || [];

  // Get translatable fields from parent collection
  const parentFields = await fieldsStore.getFields(props.collection);
  translatableFields.value = parentFields.filter(
    (f) => f.meta?.translations === true,
  );
});

// Trigger button
async function triggerTranslation() {
  // Collect selected
  const payload = {
    itemId: props.primaryKey,
    selections: selected.value, // { en: { title: true, body: true }, ... }
    sourceLanguage: "en", // or make selectable
  };

  try {
    const response = await api.post(`/flows/trigger/YOUR_FLOW_ID`, { payload });
    previewData.value = response.data.translations || [];
    showPopup.value = true;
  } catch (err) {
    // Use native toast if needed
    console.error(err);
  }
}

// Insert into values
function insertTranslations() {
  // Merge new values back into the translations object
  previewData.value.forEach((item) => {
    values.value[item.language][item.field] = item.new;
  });
  emit("input", values.value);
  showPopup.value = false;
}

const noSelections = computed(() =>
  Object.values(selected.value).every((lang) =>
    Object.values(lang).every((v) => !v),
  ),
);
</script>
