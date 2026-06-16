# directus-extension-ai-translations

A Directus **11.x** bundle extension that mirrors the native translations interface exactly, with one addition: an **AI Translate** button that batch-translates selected fields from the source language to the target language using any OpenAI-compatible API.

---

## File Structure

```
directus-extension-ai-translations/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── endpoint/
    │   └── index.ts                        ← Server-side AI proxy (translate + translate-batch routes)
    └── interface/
        ├── index.ts                        ← Interface registration & field options
        ├── translations.vue                ← Main split-pane UI + AI translate flow
        ├── translations-pane.vue           ← Left / right pane renderer
        ├── options.vue                     ← Field settings panel
        └── composables/
            └── use-relation-translations.ts ← Junction-table helpers
```

---

## Installation

### 1. Install via npm

```bash
npm install directus-extension-ai-translations
```

Or clone and build manually:

```bash
git clone https://github.com/your-org/directus-extension-ai-translations
cd directus-extension-ai-translations
npm install && npm run build
```

### 2. Add to Directus extensions folder

With Docker Compose, mount the extensions folder:

```yaml
volumes:
  - ./extensions:/directus/extensions
```

Or copy the built extension directly:

```bash
cp -r . /path/to/directus/extensions/directus-extension-ai-translations/
```

### 3. Set environment variables

Add the following to your Directus `.env` or `docker-compose.yml`. All three are required.

```env
TRANSLATION_API_KEY=your-api-key
TRANSLATION_API_URL=https://api.openai.com/v1/chat/completions
TRANSLATION_API_MODEL=gpt-4o-mini
```

Any provider that exposes an OpenAI-compatible `/chat/completions` endpoint works — see [Supported Providers](#swapping-ai-providers) below.

### 4. Restart Directus

```bash
docker compose restart directus
```

---

## Usage

1. Go to **Settings → Data Model → your collection**
2. Add a new **Alias** field with local type **Translations**
3. In the **Interface** tab, select **AI Translations**
4. Configure the interface options (see below)
5. Save — then open any item in your collection
6. In split view, check the fields you want to translate, then click **AI Translate**
7. Translations appear as a **preview** below each target field (highlighted in purple)
8. Click **Apply All** to accept, or **Cancel** to discard

---

## Interface Options

| Option | Description | Default |
|---|---|---|
| Languages Collection | The collection that stores available languages | auto-detected |
| Language Indicator Field | The field on the languages collection that holds the language code | `code` |
| Language Direction Field | Optional field that holds text direction (`ltr`/`rtl`) | auto-detected |
| Use Current User Language | Pre-select the logged-in user's language as source | `false` |
| Default Language | Fallback source language when user language is not set | — |
| Default Split View State | Open in split view by default | `false` |

---

## AI Translate Flow

```
User selects fields via checkboxes (split view must be open)
          │
          ▼
  Click [AI Translate]
          │
          ▼
  translations.vue groups selected fields:
    ├── plain text/string fields  → collected into a single batch object
    └── repeater (list) fields    → each item translated individually
          │
          ▼
  Batch: POST /ai-translations/translate-batch
    { fields: { fieldName: "source text", … }, sourceLanguage, targetLanguage }
          │
  Per-item: POST /ai-translations/translate
    { text, sourceLanguage, targetLanguage }
          │
          ▼
  endpoint/index.ts → configured AI provider (server-side, bypasses CSRF)
          │
          ▼
  Pending translations rendered below each target field (purple preview)
          │
          ▼
  Click [Apply All]  → setFieldValue() writes each field to the target row
  Click [Cancel]     → pending translations discarded, no changes made
          │
          ▼
  emit('input', updatedRows) → Directus saves on form submit
```

The endpoint proxy is **required** — Directus app extensions cannot make direct requests to external APIs due to CSRF protection. The endpoint runs server-side and is called via `useApi()`, which is an authenticated internal axios instance.

---

## API Endpoints

### `POST /ai-translations/translate`

Translates a single text value.

**Body**
```json
{
  "text": "Hello world",
  "sourceLanguage": "en-US",
  "targetLanguage": "nl-BE"
}
```

**Response**
```json
{ "translated": "Hallo wereld" }
```

---

### `POST /ai-translations/translate-batch`

Translates multiple fields in a single AI call. The AI is instructed to return a JSON object with the same keys and translated values.

**Body**
```json
{
  "fields": {
    "title": "Hotel overview",
    "description": "A charming boutique hotel in the city center."
  },
  "sourceLanguage": "en-US",
  "targetLanguage": "nl-BE"
}
```

**Response**
```json
{
  "translated": {
    "title": "Hoteloverzicht",
    "description": "Een charmant boetiekhotel in het stadscentrum."
  }
}
```

---

## Swapping AI Providers

No code changes are needed. The endpoint speaks the OpenAI chat-completions format. Just update your environment variables:

### OpenAI

```env
TRANSLATION_API_URL=https://api.openai.com/v1/chat/completions
TRANSLATION_API_KEY=sk-...
TRANSLATION_API_MODEL=gpt-4o-mini
```

### Anthropic (via a compatible proxy)

If you have an OpenAI-compatible proxy in front of Anthropic's API, point `TRANSLATION_API_URL` at it. Native Anthropic API uses a different request format and would require editing `src/endpoint/index.ts` to call `https://api.anthropic.com/v1/messages` directly.

### Azure OpenAI

```env
TRANSLATION_API_URL=https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2024-02-01
TRANSLATION_API_KEY=<azure-key>
TRANSLATION_API_MODEL=<deployment-name>
```

### Any local / self-hosted model (Ollama, LM Studio, etc.)

```env
TRANSLATION_API_URL=http://localhost:11434/v1/chat/completions
TRANSLATION_API_KEY=ollama
TRANSLATION_API_MODEL=llama3
```
