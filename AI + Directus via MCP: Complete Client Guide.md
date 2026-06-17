# 1. What is MCP?

---

**MCP (Model Context Protocol)** is an open standard developed by Anthropic that allows AI assistants like Claude to connect directly to external tools and systems, not just read about them, but actually interact with them in real-time.

Think of it as a **structured API bridge** between the AI and your Directus instance:

`Claude (AI) ←——— MCP Protocol ———→ Directus MCP Server ←——→ Directus Database`

Without MCP, you would have to:

- Copy-paste data from Directus into the chat
- Describe your schema manually
- Ask the AI to generate code you then execute yourself

With MCP, Claude can:

- Query your live database directly
- Read schema structures automatically
- Create, update, and manage content
- Build and modify automation flows
- Trigger existing workflows

---

## 2. How MCP Connects to Directus

The Directus MCP server is a Node.js process that runs alongside your Directus instance. It exposes a set of **tools** (functions) that Claude can call. The connection flow is:

`1. Claude Code / Claude Desktop starts
2. Reads .claude/mcp_settings.json (or settings.json)
3. Spawns the Directus MCP server process
4. MCP server authenticates to Directus using a Static Token
5. Claude can now call MCP tools as part of any conversation`

The MCP server we use is `@directus/mcp`, the official Directus MCP package.

---

## 3. How to Add MCP in Claude for Directus

### Step 1 — Install the Directus MCP Server

1. Go to directus settings
2. Select AI from the sidebar menu
3. Scroll down to **Model Context Protocol** section
4. Enable MCP
5. Save

### Step 2 — Generate a Directus Static Token (see Section 4)

### Step 3 — Configure Claude Code

In your project's .claude/settings.json (or `~/.claude/settings.json` for global), add an `mcpServers` block:

`{
  "mcpServers": {
    "directus-staging": {
      "command": "npx",
      "args": ["-y", "@directus/mcp"],
      "env": {
        "DIRECTUS_URL": "https://your-directus-instance.com",
        "DIRECTUS_TOKEN": "your-static-token-here"
      }
    }
  }
}`

The key (`"directus-staging"` here) becomes the prefix for all tool names. That's why our tools are named `mcp__directus-staging__schema`, `mcp__directus-staging__items`, etc.

### Step 4 — Restart Claude Code

Claude Code will detect the new MCP server, spawn it, and the tools become available immediately. You'll see them listed in the tool sidebar.

### Multiple Environments

You can connect multiple Directus instances simultaneously — one per project or environment:

`{
  "mcpServers": {
    "directus-staging": {
      "command": "npx",
      "args": ["-y", "@directus/mcp"],
      "env": {
        "DIRECTUS_URL": "https://staging.example.com",
        "DIRECTUS_TOKEN": "staging-token"
      }
    },
    "directus-production": {
      "command": "npx",
      "args": ["-y", "@directus/mcp"],
      "env": {
        "DIRECTUS_URL": "https://prod.example.com",
        "DIRECTUS_TOKEN": "production-token"
      }
    }
  }
}`

---

## 4. How to Issue a Directus MCP Token

The MCP server authenticates using a **Static Token** — a permanent, non-expiring credential tied to a specific Directus user account.

### Step-by-Step in the Directus Admin UI

1. Log into your Directus Admin panel
2. Navigate to **Settings → Users**
3. Open the user account you want the AI to act as (create a dedicated "AI Agent" user for best practice)
4. Scroll to the **Token** section
5. Click **Generate Token** (or type a custom value)
6. Copy the token — it is only shown once
7. Click **Save**

### Security Best Practices for the MCP Token

| Practice                                                     | Why                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| Create a **dedicated AI user** (e.g. `ai-agent@company.com`) | Audit trail shows "ai-agent" did it, not a human user  |
| Assign **minimum required permissions** via a Role           | AI can't accidentally delete things it shouldn't touch |
| **Never commit** the token to git                            | Use environment variables or a secrets manager         |
| Use **different tokens** per environment                     | Staging breach doesn't affect production               |
| Store in `.env` or a secrets vault                           | Not hardcoded in config files                          |

### Example Role Permissions for a Read-Heavy AI Agent

`Collections: Read (all)
 Files:        Read, Update (metadata only)
 Flows:        Read, Trigger (manual only)
 Schema:       Read only
 Users:        No access
 Settings:     No access`

---

## 5. What IS Possible via MCP (Verified Capabilities)

These are the **actual tools** available in our `directus-staging` MCP connection, with real examples from the live instance.

---

### 5.1 Schema Discovery (`mcp__directus-staging__schema`)

The AI can fully explore and understand the database structure without any human explanation.

**What it does:**

- Lists all collections (our staging instance has **170+ collections** including `hotels`, `tours`, `cruises`, `campers`, `roundtrips`, etc.)
- Lists collection folders (`batch_products`, `Cruises_Metadata`, `Hotels_Metadata`, etc.)
- Returns field types, validation rules, relationships, interfaces
- Reads M2O, O2M, M2M, M2A relationship maps

**Example prompt → action:**

> "What fields does the `hotels` collection have?"
> → AI calls `schema` tool with `keys: ["hotels"]`, reads all field definitions, and answers accurately without guessing.

---

### 5.2 Data Operations — Items (`mcp__directus-staging__items`)

Full CRUD on any collection the token has access to.

| Operation  | Capability                                                             |
| ---------- | ---------------------------------------------------------------------- |
| **Read**   | Filter, sort, paginate, search, aggregate, deep-query nested relations |
| **Create** | Single or batch, with nested relation creation                         |
| **Update** | Single or batch, partial updates                                       |
| **Delete** | By primary key(s)                                                      |

**Supported filter operators:** `_eq`, `_neq`, `_in`, `_nin`, `_icontains`, `_starts_with`, `_between`, `_lt`, `_gt`, `_null`, `_nnull`, `_some` (O2M), `_none` (O2M), `_and`, `_or`

**Deep queries:** Can filter and sort nested relationships in a single call.

**Aggregation:** `count`, `sum`, `avg`, `min`, `max` — with `groupBy` support.

**Example prompts:**

- "Show me all hotels in Germany with status = published"
- "Create a new tour with translations for DE, EN, FR"
- "Update the sell_price on all batch_hotel items for locale DE"
- "Count how many tours_prices records exist per destination"

---

### 5.3 Collections Management (`mcp__directus-staging__collections`)

The AI can design and create the entire database structure.

- Create new collections with full metadata (icon, color, note, sort field, archive config, display templates)
- Configure singleton collections (for settings/globals)
- Set up soft-delete (archive) behavior
- Enable content versioning
- Create collection folders for UI grouping
- Update or delete collections

**Example:** "Create a `blog_posts` collection with UUID primary key, title, slug, content, published_at, and a status field with archive support."

---

### 5.4 Fields Management (`mcp__directus-staging__fields`)

Full field CRUD with complete interface and display configuration.

**All field types supported:**

- Text: `string`, `text`, `uuid`, `hash`
- Numeric: `integer`, `bigInteger`, `float`, `decimal`
- Date/Time: `timestamp`, `datetime`, `date`, `time`
- Boolean, JSON, CSV
- Geospatial: `point`, `lineString`, `polygon`
- Alias (virtual): for relationship display

**Full interface configuration** — the AI can set the correct Directus interface (e.g. `input-rich-text-md`, `select-dropdown-m2o`, `list-o2m`, `map`) and display options.

---

### 5.5 Relations Management (`mcp__directus-staging__relations`)

The AI can design and create all Directus relationship types:

| Type             | Description               | Example in our system                     |
| ---------------- | ------------------------- | ----------------------------------------- |
| **M2O**          | Many-to-One               | `hotels → hotel_group`                    |
| **O2M**          | One-to-Many               | `hotel → room_categories`                 |
| **M2M**          | Many-to-Many (junction)   | `hotels ↔ activities`                     |
| **M2A**          | Many-to-Any (polymorphic) | Content blocks pointing to multiple types |
| **Translations** | Built-in i18n junction    | `hotels_translations`                     |

---

### 5.6 Files & Media (`mcp__directus-staging__files`, `mcp__directus-staging__assets`, `mcp__directus-staging__folders`)

**Files tool:**

- Read file metadata (title, type, filesize, dimensions, folder, upload date, tags)
- Filter files by type, folder, size, date
- Update metadata in bulk (titles, tags, descriptions, focal points)
- **Import files from external URLs** directly into Directus
- Delete files by ID

**Assets tool:**

- Retrieve the actual file content as base64 (images and audio)
- Enables the AI to **visually analyze images** that are stored in Directus
- Useful for: checking image quality, reading text in images, validating content

**Folders tool:**

- Create, read, update, delete virtual folders
- Build folder hierarchy for media organization

**Real files in staging:** JPEG images, PNG icons, SVG logos, MP4 videos — all accessible for metadata operations.

---

### 5.7 Automation Flows (`mcp__directus-staging__flows`, `mcp__directus-staging__operations`)

The AI can fully read, create, and modify the automation system.

**Our staging instance has 60+ active flows** covering:

- Price calculation and synchronization
- AI-powered translation triggers
- Image badge expiry checks (scheduled daily at 08:00)
- IPTC metadata auto-fill on file upload
- Video metadata auto-fill on upload
- Margin preset application across products
- Publication date monitoring and editor notifications
- MAT (Mobility Advice Text) sync across tour translations

**Flow trigger types the AI can work with:**

| Trigger     | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `event`     | Fires on database events (create/update/delete on specific collections) |
| `schedule`  | Cron-based scheduling (daily, weekly, etc.)                             |
| `webhook`   | External HTTP trigger                                                   |
| `manual`    | Button in the Directus UI or triggered via API                          |
| `operation` | Sub-flow called by another flow                                         |

**Operation types available:**

- `condition` — branching logic
- `exec` — run arbitrary JavaScript (Node.js)
- `request` — HTTP requests to external APIs
- `log` — debug logging
- `send-email` — email notifications
- `send-notification` — in-app Directus notifications
- Read/write/update/delete items within a flow

---

### 5.8 Triggering Flows (`mcp__directus-staging__trigger-flow`)

The AI can execute **manual flows** programmatically, passing data payloads and collection context.

**Example:** Trigger the "MULTIPLE Translate" flow on a selection of hotel IDs, or trigger the margin preset application flow to recalculate sell prices for all batch products.

---

## 6. What is NOT Possible via MCP or AI

Understanding limitations is just as important as understanding capabilities.

---

### 6.1 NOT Possible via MCP

| Limitation                                | Explanation                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Upload binary files**                   | The `files` tool can only import from a URL or update metadata. It cannot accept a file upload directly from the AI session. You must upload files through the Directus UI or REST API.          |
| **Access to Directus UI**                 | MCP interacts with the API layer only. It cannot see, click, or screenshot the admin interface.                                                                                                  |
| **User management (create/delete users)** | The MCP tools do not expose `directus_users` CRUD — this is intentionally kept out for security.                                                                                                 |
| **Role and permission editing**           | `directus_roles` and `directus_permissions` are system-level resources not exposed by the MCP tools.                                                                                             |
| **Extension code execution**              | The AI can read and write extension source code files on the local filesystem, but cannot install, build, or hot-reload extensions through MCP — that requires shell access and a build process. |
| **Database migrations**                   | Raw SQL or schema migrations are not directly accessible. Schema changes go through the collections/fields/relations tools, which use Directus's own migration system.                           |
| **Webhooks configuration**                | The MCP tools do not expose `directus_webhooks` for direct management.                                                                                                                           |
| **Settings (global)**                     | `directus_settings` (project name, logo, auth settings) is not exposed.                                                                                                                          |
| **Dashboard/Panel creation**              | Insights dashboards and panels are not manageable via MCP.                                                                                                                                       |
| **Real-time subscriptions**               | MCP is request-response based; it cannot subscribe to live data changes.                                                                                                                         |

---

### 6.2 What AI Cannot Do Reliably (Even With MCP)

| Limitation                                     | Explanation                                                                                                                                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Guarantee correctness without schema check** | AI should always read the schema before writing. If it skips this, it risks guessing field names incorrectly. Our workflow enforces schema-first.                                              |
| **Handle high-volume bulk operations safely**  | Modifying thousands of records in a single instruction is risky. Large bulk ops should be reviewed, batched, and confirmed by a human.                                                         |
| **Make business logic decisions**              | AI can implement logic it is told, but cannot decide *what the right pricing rule is* or *which destination should have which margin*. Those decisions stay with the business.                 |
| **Recover from bad deletes**                   | If a delete is confirmed and executed, MCP cannot undo it. Directus has revisions, but reconstruction from revisions requires manual steps. This is why we **always confirm before deleting**. |
| **Work offline or in air-gapped environments** | Claude requires an internet connection to the Anthropic API. MCP connections to Directus are local, but the AI itself is cloud-based.                                                          |
| **Read encrypted/hashed field values**         | Fields with type `hash` (passwords) are one-way and can never be read back — not by AI, not by anyone.                                                                                         |
| **Guarantee translation quality**              | AI translation flows (like the ones in staging) produce drafts. Human review is required for market-facing copy, legal text, and brand-sensitive content.                                      |
| **Replace human judgement on content**         | AI can draft, suggest, fill, and organize content, but editorial decisions, brand voice validation, and legal accuracy must be verified by humans.                                             |

---

## 7. Our Actual AI + Directus Workflow

Here is how AI and Directus work together in this project:

`┌─────────────────────────────────────────────────────────────┐
│                    HUMAN INITIATES TASK                      │
│  "Set up margin presets for Italy destinations"              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLAUDE + MCP                               │
│  1. schema tool → reads margin_presets, destinations fields  │
│  2. items tool  → reads existing margin_presets              │
│  3. Proposes the change to human for approval                │
└─────────────────────┬───────────────────────────────────────┘
                      │  Human approves
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              CLAUDE EXECUTES (via MCP)                       │
│  4. items tool → creates/updates margin_preset records       │
│  5. trigger-flow → fires "Apply Margin Presets" flow        │
│  6. flows tool → verifies flow ran successfully              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              DIRECTUS AUTOMATION                             │
│  Flows propagate changes across all batch_hotel,             │
│  batch_tours, batch_rental_car records automatically         │
└─────────────────────────────────────────────────────────────┘`

**Real examples from this project:**

- **IPTC Metadata Auto-Fill** — flow triggers on `files.upload`, AI reads IPTC data and writes photographer, copyright, keywords, alt text automatically
- **Video Metadata Auto-Fill** — same as above but for video files (which Directus doesn't natively parse)
- **AI Translations** — the "MULTIPLE Translate" flow uses AI to generate draft translations across all languages for a hotel or tour
- **Price Sync** — flows chain together to regenerate `room_prices` and `tours_prices` whenever a category, occupancy, or price date changes
- **Image Badge Expiry** — scheduled flow at 08:00 daily checks expiry dates and sends in-app notifications to editors

---

## 8. Summary Table

| Capability                        | MCP                  | AI (without MCP)                |
| --------------------------------- | -------------------- | ------------------------------- |
| Read live database content        | ✅                   | ❌                              |
| Understand schema automatically   | ✅                   | ❌ (must be described manually) |
| Create/update content             | ✅                   | ❌                              |
| Build automation flows            | ✅                   | ❌                              |
| Trigger existing flows            | ✅                   | ❌                              |
| Manage file metadata              | ✅                   | ❌                              |
| Analyze image content visually    | ✅ (via assets tool) | ❌                              |
| Upload binary files               | ❌                   | ❌                              |
| Manage users/roles/permissions    | ❌                   | ❌                              |
| Make editorial/business decisions | ❌                   | Advisory only                   |
| Guarantee translation quality     | ❌                   | Draft quality only              |
| Access Directus UI directly       | ❌                   | ❌                              |

---

## 9. Custom Extensions: How They're Built and Why AI Cannot Update Them at Runtime

### 9.1 What Extensions Are

Directus extensions are the mechanism for adding custom UI and server-side behaviour that does not exist in core Directus. They are **compiled JavaScript bundles** that Directus loads when it starts. Everything custom in the admin interface the price tables, the AI translation button, the media library, the cascading dropdowns is a custom extension.

---

### 9.2 How Extensions Are Built

Extensions are full **TypeScript + Vue 3** projects. They do not run as interpreted scripts — they are compiled applications.

**Technology stack:**

- **Vue 3 Composition API** (`<script setup lang="ts">`) for all UI components
- **TypeScript** for all logic and type safety
- **`@directus/extensions-sdk`** — provides `useApi()`, `useStores()`, and the build toolchain
- **Vite** as the underlying bundler (handled by the SDK)
- **Directus native components** (`<v-button>`, `<v-icon>`, `<v-notice>`, `<v-dialog>`, etc.) for consistent UI
- **Directus CSS variables** for theming (`var(--theme--primary)`, `var(--theme--background)`, etc.)

**The build pipeline:**

`Source Code (TypeScript + Vue)          Build Output (served by Directus)
─────────────────────────────           ────────────────────────────────
src/
  index.ts          ─────────────────→  dist/
  interface.vue      npm run build          app.js    ← frontend bundle
  components/        (Vite/SDK)             api.js    ← backend bundle (endpoints/hooks)
  composables/
  types.ts`

The SDK produces two output files per extension:

- **`dist/app.js`** — the compiled Vue component tree, loaded into the browser by the Directus admin app
- **`dist/api.js`** — the compiled server-side code (only for endpoints and hooks), loaded by the Directus Node.js process

Bundles (like `media-bundle` and `directus-extension-ai-translations`) contain multiple sub-extensions compiled into a single output pair, reducing load time and dependency duplication.

**To develop an extension:**

`# Inside the extension directory
cd extensions/media-bundle

npm install # install dependencies
npm run dev # watch mode — rebuilds dist/ on every file save
npm run build # production build — minified, optimised output`

---

### 9.3 How Extensions Are Served by Directus

Extensions are **not installed** into Directus they are **mounted into the Docker container** via a volume:

`# docker-compose.yaml
services:
  directus:
    volumes:
      - ./extensions:/directus/extensions   # ← entire extensions folder`

This means:

- The `extensions/` directory on the host machine is mapped directly into `/directus/extensions` inside the running container
- Directus scans this directory at **startup** and loads every extension it finds
- What Directus reads is the **compiled `dist/` output**, not the TypeScript source files

The loading sequence at container start:

`Docker starts Directus container
        │
        ▼
Directus scans /directus/extensions/*/package.json
        │
        ▼
Reads "directus:extension" manifest → finds type, path, entries
        │
        ▼
Frontend extensions → loaded into admin app bundle at boot
Backend extensions  → imported into Node.js process at boot
        │
        ▼
Directus is ready — extensions are live`

---

### 9.4 Why MCP and AI Cannot Update Extensions at Runtime

This is the fundamental limitation of the extension architecture: **extensions are compiled, statically loaded artefacts, not dynamic scripts**.

**Reason 1 — MCP has no shell access**

MCP tools operate entirely through the Directus REST API. They can read and write to the database, manage content, and trigger flows. They have no ability to:

- Execute shell commands (`npm run build`)
- Write to the filesystem inside the Docker container
- Restart or reload the Directus process

Even if Claude edits the TypeScript source files on the host machine (which it can do via the filesystem tools in Claude Code), MCP cannot trigger the build step.

**Reason 2 — Source edits have zero effect without a build**

`Claude edits src/interface.vue  →  dist/app.js is UNCHANGED  →  Directus serves OLD code`

Directus never reads `.vue` or `.ts` source files. It only reads the compiled `dist/app.js` and `dist/api.js`. Editing source without rebuilding has no effect on the running system.

**Reason 3 — Extensions are loaded once at startup**

Even if the `dist/app.js` file is replaced on disk (e.g. after a manual build), the running Directus instance has already loaded the old version into memory. There is no hot-reload mechanism for extensions in production. The container must be **restarted** for the new bundle to take effect:

`docker-compose restart directus`

**Reason 4 — Frontend bundles are served statically to the browser**

The admin app's frontend is a single-page application. When the browser loads Directus, it downloads the compiled extension bundles once and caches them. Even a server restart requires the browser to perform a hard refresh (or cache bust) to receive the updated bundle.

**The complete, unavoidable deployment cycle for any extension change:**

`1. Developer edits source (.vue / .ts files)      ← AI can assist here
          │
          ▼
2. npm run build  (inside extension directory)     ← must run on host machine
          │                                           MCP CANNOT DO THIS
          ▼
3. dist/app.js + dist/api.js are updated on disk  ← build output is ready
          │
          ▼
4. docker-compose restart directus                 ← must restart container
          │                                           MCP CANNOT DO THIS
          ▼
5. Browser hard refresh                            ← client must clear cache
          │
          ▼
6. Extension change is live`

---

### 9.5 What AI Can and Cannot Do for Extensions

| Task                                           | AI + Claude Code              | MCP            |
| ---------------------------------------------- | ----------------------------- | -------------- |
| Read and understand existing extension source  | ✅                            | ❌             |
| Write new Vue components / TypeScript logic    | ✅                            | ❌             |
| Refactor, fix bugs, add features to extensions | ✅                            | ❌             |
| Design the data model an extension reads       | ✅ (with schema tool)         | ✅ (read-only) |
| Run `npm run build`                            | ✅ (via shell in Claude Code) | ❌             |
| Restart the Docker container                   | ✅ (via shell in Claude Code) | ❌             |
| Update `dist/app.js` through the Directus API  | ❌                            | ❌             |
| Hot-reload a running extension without restart | ❌                            | ❌             |
| Register a new extension without restarting    | ❌                            | ❌             |

**In summary:** AI is a powerful collaborator for designing and writing extension code, but deploying that code requires the standard local build-and-restart cycle. There is no shortcut through MCP or any API. It is a constraint of how Directus loads and serves compiled bundles.
