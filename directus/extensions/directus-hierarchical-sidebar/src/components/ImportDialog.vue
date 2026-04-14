<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    @esc="$emit('update:modelValue', false)"
  >
    <v-card>
      <v-card-title>
        <v-icon name="upload" left />
        Import Hierarchy
      </v-card-title>

      <v-card-text>
        <v-notice type="info">
          Upload a previously exported hierarchy JSON file or paste the JSON
          content below.
        </v-notice>

        <div class="import-methods">
          <div class="method-tabs">
            <v-button
              :class="{ active: method === 'file' }"
              @click="method = 'file'"
              text
            >
              <v-icon name="upload_file" left />
              Upload File
            </v-button>
            <v-button
              :class="{ active: method === 'paste' }"
              @click="method = 'paste'"
              text
            >
              <v-icon name="content_paste" left />
              Paste JSON
            </v-button>
          </div>

          <!-- File Upload -->
          <div v-if="method === 'file'" class="upload-area">
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              @change="handleFileUpload"
              style="display: none"
            />

            <div
              class="dropzone"
              :class="{ dragover: isDragging }"
              @click="$refs.fileInput?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <v-icon name="cloud_upload" x-large />
              <p>Click to browse or drag & drop a JSON file</p>
              <p class="hint">Only .json files are accepted</p>
            </div>
          </div>

          <!-- Paste JSON -->
          <div v-if="method === 'paste'" class="paste-area">
            <v-textarea
              v-model="jsonContent"
              placeholder='{"name": "My Hierarchy", ...}'
              rows="12"
              font-family="monospace"
            />
          </div>
        </div>

        <!-- Preview -->
        <div v-if="previewData" class="preview-section">
          <h3>Preview</h3>
          <div class="preview-card">
            <div class="preview-row">
              <span class="label">Name:</span>
              <span class="value">{{ previewData.name }}</span>
            </div>
            <div class="preview-row">
              <span class="label">Parent Collection:</span>
              <span class="value">{{ previewData.parentCollection }}</span>
            </div>
            <div class="preview-row">
              <span class="label">Child Collections:</span>
              <span class="value">
                {{ previewData.childCollections.join(", ") }}
              </span>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <v-notice v-if="error" type="danger">
          {{ error }}
        </v-notice>
      </v-card-text>

      <v-card-actions>
        <v-button secondary @click="handleCancel"> Cancel </v-button>
        <v-button :disabled="!previewData || !!error" @click="handleImport">
          <v-icon name="check" left />
          Import Hierarchy
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "import", json: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const method = ref<"file" | "paste">("file");
const jsonContent = ref("");
const isDragging = ref(false);
const previewData = ref<any>(null);
const error = ref<string | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const validateJSON = (content: string) => {
  try {
    const parsed = JSON.parse(content);

    // Validate required fields
    if (
      !parsed.name ||
      !parsed.parentCollection ||
      !Array.isArray(parsed.childCollections)
    ) {
      throw new Error("Invalid hierarchy format. Missing required fields.");
    }

    if (parsed.childCollections.length === 0) {
      throw new Error("Hierarchy must have at least one child collection.");
    }

    error.value = null;
    previewData.value = parsed;
  } catch (err: any) {
    error.value = err.message || "Invalid JSON format";
    previewData.value = null;
  }
};

const handleFileUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) {
    readFile(file);
  }
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      readFile(file);
    } else {
      error.value = "Please upload a JSON file";
    }
  }
};

const readFile = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    jsonContent.value = content;
    validateJSON(content);
  };
  reader.onerror = () => {
    error.value = "Failed to read file";
  };
  reader.readAsText(file);
};

const handleImport = () => {
  if (previewData.value) {
    emit("import", jsonContent.value);
    handleCancel();
  }
};

const handleCancel = () => {
  emit("update:modelValue", false);
  jsonContent.value = "";
  previewData.value = null;
  error.value = null;
  method.value = "file";
};

watch(jsonContent, (newValue) => {
  if (newValue && method.value === "paste") {
    validateJSON(newValue);
  }
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (!newValue) {
      handleCancel();
    }
  },
);
</script>

<style scoped>
.import-methods {
  margin-top: 16px;
}

.method-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--border-subdued);
}

.method-tabs button {
  padding: 12px 16px;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
}

.method-tabs button.active {
  border-bottom-color: var(--primary);
  color: var(--primary);
}

.upload-area {
  padding: 16px 0;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  border: 2px dashed var(--border-normal);
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.dropzone:hover,
.dropzone.dragover {
  border-color: var(--primary);
  background: var(--primary-alt);
}

.dropzone p {
  margin: 8px 0 0;
}

.hint {
  font-size: 13px;
  color: var(--foreground-subdued);
}

.paste-area {
  padding: 16px 0;
}

.preview-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: var(--border-width) solid var(--border-subdued);
}

.preview-section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.preview-card {
  padding: 16px;
  background: var(--background-normal);
  border-radius: var(--border-radius);
}

.preview-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.preview-row .label {
  font-weight: 600;
  min-width: 140px;
  color: var(--foreground-subdued);
}

.preview-row .value {
  flex: 1;
}
</style>
