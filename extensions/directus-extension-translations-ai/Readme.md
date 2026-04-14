# directus-extension-interface-translations-ai

A Directus interface extension that **fully re-implements the native Translations interface** and adds AI-powered translation via a Directus Flow you select from a dropdown — no external webhook URLs needed.

---

## What it does

### In **Settings → Data Model** (field configuration, done once)

- All native Translations interface options are present (Language Field, Default Language, User Created/Updated field exclusions)
- One extra field: **Translation Flow** — enter the ID of the Directus Flow that handles translation

### In the **item editor** (used by content editors every day)

The interface looks and works exactly like the native Translations interface, plus:

1. **Language tabs** — switch between languages, add new ones with the `+` button
2. **Split view** — left side is the editable active language; right side shows a reference language (read-only)
3. **Checkbox on every field** — editors tick which fields they want to translate
4. **AI Translate button** (top-right) — enabled once at least one field is checked
5. **Translation modal** with 3 columns:
   | Column | Contents |
   |--------|----------|
   | Source | Values from the "Translate from" language |
   | Current | Existing values in the target language |
   | AI Translation | Editable result returned by your Flow |
6. **Insert Translation** — applies the (optionally edited) results back into the form

---

## Installation

```bash
# 1. Copy into your Directus extensions folder
cp -r directus-extension-interface-translations-ai \
  /your-directus/extensions/interfaces/

# 2. Build
cd extensions/interfaces/directus-extension-interface-translations-ai
npm install
npm run build

# 3. Restart Directus (or use EXTENSIONS_AUTO_RELOAD=true)
```

---

## Setting up the Translation Flow

1. In Directus, go to **Settings → Flows → Create Flow**
2. Choose trigger: **Webhook / Request URL** (method: POST)
3. Note the flow's **ID** (visible in the URL bar: `/admin/settings/flows/<FLOW_ID>`)
4. Add your translation logic (HTTP Request to DeepL, OpenAI, etc.)
5. End with a **Return Data** operation that returns:

```json
{ "translation": "translated text here" }
```

The interface also accepts `{ "text": "…" }` or `{ "result": "…" }` as fallback response shapes.

### Payload your Flow receives

```json
{
  "sourceLanguage": "en-US",
  "targetLanguage": "de-DE",
  "field": "title",
  "text": "Hello, world!",
  "collection": "articles",
  "primaryKey": "abc-123"
}
```

---

## Field Configuration

In **Settings → Data Model**, when you add a translations field and pick this interface:

| Option               | Description                                                                        |
| -------------------- | ---------------------------------------------------------------------------------- |
| Language Field       | Field in junction collection that stores the language code (e.g. `languages_code`) |
| Default Language     | Active tab on first open (e.g. `en-US`)                                            |
| Use User Language    | If checked, defaults to current editor's language                                  |
| User Created Field   | Hidden from translation form                                                       |
| User Updated Field   | Hidden from translation form                                                       |
| **Translation Flow** | **Paste the Flow ID here**                                                         |

---

## Development

```bash
npm run dev    # watch mode — auto-rebuilds on save
npm run build  # production build
```
