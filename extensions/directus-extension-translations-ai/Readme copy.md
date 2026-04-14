# Directus Translations AI Interface Extension

A custom Directus interface that enhances the native translations experience with **AI-powered translation** via Directus Flows webhooks.

---

## Features

- ✅ **Checkbox selection** on every translation field
- 🤖 **AI Translate button** — triggers your Directus Translation Flow
- 🪄 **Translation preview modal** with 3-column layout:
  - **Column 1**: Source language values
  - **Column 2**: Current translation values
  - **Column 3**: New AI-translated values (editable before inserting)
- ✏️ Edit AI translations in-modal before applying
- ✅ **Insert Translation** / **Cancel** buttons in the modal footer

---

## Directory Structure

```
directus-extension-translations-ai/
├── index.js          ← Extension registration
├── interface.vue     ← Main Vue component
├── preview.svg       ← Extension preview icon
└── package.json      ← Extension manifest
```

---

## Installation

### Option A: Manual (Development)

1. Copy this folder to your Directus `extensions/interfaces/` directory:

   ```
   cp -r directus-extension-translations-ai /your-directus/extensions/interfaces/
   ```

2. Build the extension:

   ```bash
   cd extensions/interfaces/directus-extension-translations-ai
   npm install
   npm run build
   ```

3. Restart Directus — the interface will appear in the interface picker.

### Option B: NPM Package (Production)

```bash
cd /your-directus
npm install directus-extension-translations-ai
```

---

## Configuration

When assigning this interface to a translations field, configure:

| Option                      | Description                                                      |
| --------------------------- | ---------------------------------------------------------------- |
| **Language Field**          | The field that stores the language code (e.g., `languages_code`) |
| **Default Language**        | Default active language tab (e.g., `en-US`)                      |
| **Translation Webhook URL** | The Directus Flow webhook URL for your translation trigger       |
| **User Created Field**      | (Optional) Hidden from UI                                        |
| **User Updated Field**      | (Optional) Hidden from UI                                        |

---

## Setting Up the Translation Flow

In Directus, create a **Webhook Trigger Flow**:

1. **Trigger**: Webhook / Request URL (POST)
2. **Operation**: Run Script or HTTP Request to your translation API
3. **Return**: `{ "translation": "translated text here" }`

### Webhook Payload (sent by this interface)

```json
{
  "sourceLanguage": "en-US",
  "targetLanguage": "fr-FR",
  "field": "description",
  "text": "Hello, world!",
  "collection": "articles",
  "primaryKey": "some-uuid"
}
```

### Expected Response

```json
{
  "translation": "Bonjour le monde!"
}
```

---

## How to Use

1. Open any item with a translations field using this interface
2. Select a language tab
3. **Check** the fields you want to translate
4. Click **AI Translate** button (top right of the tabs)
5. In the popup:
   - Choose the **source language** to translate from
   - Click **Fetch AI Translations**
   - Review the 3-column preview (source | current | new)
   - Optionally **edit** the AI-generated translations
   - Click **Insert Translation** to apply
6. Save the item as usual

---

## Development

```bash
npm run dev   # Watch mode
npm run build # Production build
```
