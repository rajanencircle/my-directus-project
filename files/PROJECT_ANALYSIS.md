# BOTG (Tours/Travel Booking Platform) - Primarix to Directus Migration
## Project Context & Analysis Document

---

## 1. PROJECT OVERVIEW

### Objective
Migrate from **Primarix CMS** (legacy system for tours, travel, hotels, cruises) to **Directus CMS** with schema modernization, improved field naming, multi-language support, and client-requested optimizations.

### Current State
- **Primarix**: Legacy entry management system with outdated structure
- **Directus**: New target CMS providing modern data management, API-first approach, multi-language support

### Key Challenge
The migration is **NOT a 1:1 copy**. Client has requested:
- New field naming conventions (cleaner, more intuitive)
- Restructured relationships and collections
- Enhanced multi-language support (de-DE, de-CH, nl-NL only)
- Removal of deprecated fields
- New business logic integrations (e.g., Geographies, booking partners)

---

## 2. CURRENT WORKFLOW LIMITATIONS

### Manual Process (Current State)
1. Review Primarix structure manually for each product
2. Understand field mappings, data types, relationships
3. Create collections/fields manually in Directus
4. Apply multi-language labels (de-DE, de-CH, en-GB, nl-NL)
5. Set up field relationships and constraints
6. Handle client modifications mid-project
7. Repeat for next product (Hotels ✓, Collections/Karawane, then others...)

### Problems
- **Time-consuming**: Manual field-by-field creation
- **Error-prone**: Human mistakes in naming, relationships, translation labels
- **Inconsistent**: Field structure varies across products
- **Inflexible**: Difficult to handle client changes or iterations
- **Scalability**: Adding new products requires repeating entire manual process

---

## 3. TECHNICAL STACK & CONSTRAINTS

### Directus Setup
- **Version**: Modern Directus CMS
- **System Languages**: en-GB (default), de-DE, de-CH, nl-NL
- **Content Languages**: de-DE (primary), de-CH, nl-NL (en-GB NOT included in content)
- **Architecture**: Collections + Fields + Translations

### Key Directus Limitations & Workarounds
- Multi-language fields require separate translation tables
- Field naming must follow strict conventions (snake_case, singular/plural rules)
- Relationships (many-to-one, many-to-many) need explicit sub-collection setup
- No native support for complex business logic (requires flows, extensions, or workarounds)
- Field value mapping requires careful handling during import

### Naming Conventions (DEV GUIDANCE)
- **Tables**: Plural + product prefix if sub-collection
  - `hotels`, `cruises`, `hotels_activities`, `hotels_descriptions`
- **Fields**: 
  - Singular if one choice expected: `country`
  - Plural if many choices: `activities`
  - Snake_case: `booking_partner`, `internal_remarks`
- **Translations**: 
  - UI Labels: Proper case (e.g., "Hotel Classification")
  - Adverbs/Articles: lowercase (e.g., "of", "and", "for")
- **Field IDs**: Use "uid" column from Primarix (not "field id")
  - Example: Primarix `field_41_1` → Directus `name`

### Field Mapping Convention
| Primarix Concept | New Convention | Example |
|---|---|---|
| `oid` | `object_id` | Unique hotel identifier |
| `status (?)` | `status_primarix` | Link to status field list |
| `field_XXX_1` | Descriptive name | `booking_partner`, `phone_general` |
| Generic fieldlist reference | Sub-collection link | `countries`, `booking_partners` |

---

## 4. SOURCE DOCUMENTS ANALYSIS

### 4.1 DEVGuidance__KONO.pdf
**Purpose**: Directus setup standards for BOTG project

**Key Requirements**:
1. **Collection Structure**:
   - Main collection: Single language + metadata (e.g., `hotels`)
   - Translation collection: All translatable fields (e.g., `hotels_descriptions`)
   - Field IDs in translations must use "uid" from Primarix mapping

2. **Field Lists (px_feldlisten)**:
   - Store in sub-collections with Primarix metadata:
     - `primarix_label`: Original German label
     - `primarix_label_short`: Short code (e.g., country code)
     - `primarix_id`: Original Primarix ID
     - `primarix_fieldlist_group`: Group identifier (cid)
     - `primarix_status`: Active/inactive flag
   - Main collection references both label AND id

3. **Multi-Language Support**:
   - **System languages**: en-GB, de-DE, de-CH, nl-NL
   - **Content languages** (for translations): de-DE, de-CH, nl-NL (NO en-GB)
   - **Label mapping**:
     - de-DE: "label" column from Primarix mapping table
     - de-CH: "de-CH" column
     - en-GB: "GB" column
     - nl-NL: "NL" column

4. **Naming Standards**:
   - Tables: Plural (NOT singular)
   - Field names: English, snake_case
   - Changes from Primarix: `oid` → `object_id`, `?` → `status_primarix`

5. **Import Strategy**:
   - Only 3 content languages: de-DE, de-CH, nl-NL
   - Other language columns can be ignored

---

### 4.2 Manual_PRIMARIX_2024_EN.pdf
**Purpose**: Documentation of Primarix system operation

**Key Insights**:
1. Primarix manages travel products with complex metadata:
   - Object IDs for products
   - Field lists for controlled vocabulary (countries, regions, partners, etc.)
   - Translation/marking system for content changes
   - Price periods with validity windows

2. Product Management Flow:
   - Tours/Hotels/Cruises defined with object_id
   - Multiple price periods (seasonal)
   - Service descriptions with translatable content
   - Partner/supplier relationships

3. Workspace Management:
   - Multiple workspaces (2024, 2025, etc.)
   - Copying objects between workspaces
   - Marking for translator notifications
   - Seasonal changes and product structure modifications

4. Lessons for Directus Migration:
   - Price periods need careful handling (temporal data)
   - Marking/flagging system for translation workflow
   - Multi-language content is critical
   - Object relationships are complex (tours ↔ hotels, suppliers, services)

---

### 4.3 BOTG_Brief_DEV_Setup_Hotels_260410.xlsx
**Purpose**: Field mapping blueprint for Hotels collection (reference implementation)

**Sheet Structure** (Hotels):
- Row 4-5: Header structure (Status, DB, Directus, Labels, Setup Details)
- Row 7: Collection name (`hotels`)
- Row 9+: Field definitions

**Field Definition Columns**:
| Col | Purpose | Example |
|---|---|---|
| A | Status | "Yes", "?", "No", "-" |
| B | - | (metadata) |
| C | Collection | `hotels` |
| D | UI Group | "Master Data", "Reservation", "Partner Filter" |
| E | Right Accordion | (sub-grouping) |
| F | Translatable? | "Yes", "No", "(*)" |
| G | (reserved) | |
| H | Mapping # | Sequence number |
| I | Primarix Field ID | `field_41_1`, `oid`, `status (?)` |
| J | Parent Table (PX) | `hotels` |
| K | **NEW Field ID** | **Directus field name** (PRIMARY) |
| L-O | **Labels** | de-DE, de-CH, en-GB, nl-NL |
| P | (divider) | |
| Q | Rank | Display order |
| R | Relation | Sub-collection link (if applicable) |
| S | Field Type | text, text area, rich text editor, many-to-one, etc. |
| T | Max Chars (PX) | Character limit |
| U | Info Text | Help text below field |
| V | (divider) | |
| W | Remarks for DEV | Implementation notes |
| X | Remarks Internal | Task notes, issues |

**Hotels Key Fields** (sample):
- `object_id`: Primary ID (numerical)
- `status_primarix`: Many-to-one link to status values
- `internal_remarks`: Text area (NOT translatable, import all languages into single field)
- `name`: Hotel name (translatable)
- `hotel_group`: Many-to-one link to `hotel_groups` sub-collection
- `country`: Many-to-one link to `countries` sub-collection
- `state`, `region`: New geography logic implementation
- `booking_partner`: Radio/many-to-one for booking method (NEW field)
- Separate "Reservation" section for booking information

**Key Observations**:
1. Fields marked "Yes" are ready to implement
2. Fields marked "-" are deprecated (NOT to be imported)
3. Translatable fields have labels in 4 languages
4. Many-to-one relationships to sub-collections
5. Some fields are NEW (not in Primarix) - client additions
6. "Remarks for DEV" column contains implementation instructions
7. Complex repeater fields (e.g., booking info with "Headline" + "Text")

---

### 4.4 BOTG_Brief_DEV_Setup_Collections_Karawane.xlsx
**Purpose**: Field mapping for Collections/Cruises product

**Differences from Hotels**:
- Different collection name: `cruises` (vs `hotels`)
- Different field set (e.g., `bord_languages`, `ship description`)
- Partner filter logic: All Karawane data assigned to partner ID 4747
- New fields not in Primarix (e.g., `bord_languages`, `onboard_gratuities`)
- Geographies not yet implemented (marked "No (after Geographies solved)")
- Complex price information section

**Pattern**: Similar structure to Hotels Excel, but customized field sets per product type.

---

## 5. DATA TRANSFORMATION REQUIREMENTS

### 5.1 Collection Creation Logic

**Input**: Excel sheet with field definitions  
**Output**: Directus collection with fields, translations, relationships

**Process**:
1. Parse Excel sheet (standardized structure)
2. Extract collection name (from Column C, Row 7)
3. For each field row:
   - Check Status (Col A) → Skip if "-", mark if "?", proceed if "Yes"
   - Extract field metadata:
     - NEW field ID (Col K) → Field name
     - Labels (Col L-O) → Multi-language UI labels
     - Field Type (Col S) → Directus field type mapping
     - Relationship (Col R) → Link to sub-collection
     - Rank (Col Q) → Sort order
     - Translatable (Col F) → Include in translation table?
   - Create or update field in Directus

4. Set up relationships:
   - For each "many-to-one" or "many-to-many" field:
     - Ensure target sub-collection exists
     - Create foreign key relationship
     - Set display options (autocomplete, radio, dropdown, etc.)

5. Create translation table if needed:
   - Name: `{collection}_descriptions`
   - Fields: All translatable fields from main collection
   - Foreign key: Link back to main collection
   - Translations: de-DE, de-CH, nl-NL

### 5.2 Field Type Mapping (Primarix → Directus)

| Primarix / Excel | Directus Field Type | Notes |
|---|---|---|
| `text input` | Text | Simple string field |
| `text area` | Text Area / Textarea | Multi-line text |
| `rich text editor` | Rich Text Editor | HTML/formatted content |
| `numerical` | Number | Integer/decimal |
| `date` | Date | Date picker |
| `phone number` | Phone Number | Formatted phone |
| `mail` | Email | Email validation |
| `url` | URL | URL validation |
| `many to one` | Many-to-One Relationship | Dropdown/autocomplete |
| `many to many` | Many-to-Many Relationship | Multi-select |
| `radio` | Radio / Dropdown | Single choice |
| `check + multi select` | Checkboxes / Multi-select | Multiple choices |
| `drop down json` | Dropdown (JSON) | Pre-defined options (needs manual setup) |
| `repeater (json)` | JSON / Repeater | Complex nested data |
| `auto complete` | Autocomplete | Search + select from collection |
| `-` | (DO NOT CREATE) | Deprecated field |

### 5.3 Translation Handling

**Translatable Fields**:
- Stored in separate `{collection}_descriptions` table
- Foreign key to main collection
- Fields: All columns from L-O (Labels) in Excel

**Non-Translatable Fields**:
- Stored in main collection
- Example: `internal_remarks` (with note: import all language versions into single field)

**Multi-Language Labels** (UI):
- Each field has 4-language label set
- de-DE, de-CH, en-GB, nl-NL
- Applied during field creation in Directus

**Label Format Rules**:
- de-DE/en-GB: Title case for nouns (e.g., "Hotel Classification")
- Adverbs/Articles: lowercase (e.g., "of", "and", "for")
- nl-NL: May vary (AI-generated, less strict rules)

---

## 6. IDENTIFIED CHALLENGES & EDGE CASES

### 6.1 Excel Sheet Inconsistencies
- Some "Status" values ambiguous: "?", "-", "Yes", "No", "yes"
- Some fields missing critical information (e.g., "editor" field has no source in Primarix)
- Some columns unclear (e.g., "Right-side accordion", "Notes" columns vary)

### 6.2 Client-Driven Changes
- New fields NOT in Primarix (e.g., `booking_partner`, `bord_languages`)
- Field structure changes (e.g., `res_phone` + `res_fax` → consolidated `booking_info`)
- Complex new field types (e.g., repeater with builder for "Headline" + "Text")
- Geography logic not finalized but referenced ("Geographies" solution pending)

### 6.3 Field List (px_feldlisten) Complexity
- Primarix field lists are controlled vocabularies (countries, regions, partners, etc.)
- Need to create separate Directus sub-collections
- Must preserve Primarix metadata for future harmonization
- Some lists are multi-lingual, others are single-language

### 6.4 Data Import Gaps
- Some Primarix fields marked "NOT to be imported" in Excel (e.g., `state_short`, `fax_general`)
- Some fields require manual post-import work (e.g., "place" field needs text-to-reference matching)
- Price periods with validity windows need careful temporal handling
- Editor field needs default value ("unknown") if missing in Primarix

### 6.5 Product Variations
- Hotels, Cruises, Collections have different field sets
- Each product has unique business logic and relationships
- Geographies logic differs between products
- Partner/booking logic varies

---

## 7. AUTOMATION OPPORTUNITY

### Current Bottleneck
- **Manual field creation**: 50+ fields per collection × 4+ products = 200+ fields manually
- **Label management**: 4 languages × 50 fields = 200 label entries per collection
- **Relationship setup**: Manual foreign key creation
- **Iteration handling**: Client changes require manual re-work

### Automation Solution
**Agentic AI system** with specialized agents:

1. **Schema Analyzer Agent**
   - Parse Excel sheet
   - Validate field definitions
   - Identify gaps and inconsistencies
   - Flag client changes vs. standard mapping

2. **Collection Creator Agent**
   - Create Directus collection
   - Set up fields with correct types
   - Configure field properties (required, unique, etc.)

3. **Relationship Manager Agent**
   - Create sub-collections for field lists
   - Set up foreign key relationships
   - Configure display options (autocomplete, dropdown, etc.)

4. **Translation Setup Agent**
   - Create translation table structure
   - Apply multi-language labels
   - Configure language-specific content fields

5. **Validation & QA Agent**
   - Verify collection structure against Excel blueprint
   - Check naming conventions
   - Validate relationships and dependencies
   - Generate implementation report

6. **Global Coordinator Agent**
   - Orchestrate workflow
   - Handle client modifications
   - Manage product variations
   - Generate documentation

---

## 8. SUCCESS CRITERIA

### For Automation
✅ Parse Excel sheet correctly (100% accuracy)  
✅ Create Directus collection in <2 minutes (vs. manual 1-2 hours)  
✅ All fields created with correct names, types, labels  
✅ All relationships established correctly  
✅ All 4-language labels applied  
✅ Validation report generated  
✅ Handle client modifications gracefully  

### For Quality
✅ Field naming follows conventions (snake_case, singular/plural rules)  
✅ Multi-language labels consistent and complete  
✅ No deprecated fields created  
✅ All relationships functional (no broken links)  
✅ Field types match data requirements  

### For Scalability
✅ Automation applies to any product (Hotels, Cruises, Collections, etc.)  
✅ Handles field variations and new fields  
✅ Client modifications don't break automation  
✅ Documentation auto-generated  

---

## 9. WORKFLOW SUMMARY

```
Input Excel Sheet (e.g., Hotels)
    ↓
[Schema Analyzer] Validate & Parse
    ↓
[Collection Creator] Create main collection + fields
    ↓
[Relationship Manager] Create sub-collections + links
    ↓
[Translation Setup] Create translation table + labels
    ↓
[Validation Agent] QA + Report
    ↓
[Documentation Generator] Create setup docs
    ↓
Output: Ready-to-use Directus Collection ✓
```

---

## 10. NEXT STEPS FOR AGENTS

1. **Global Skill**: Directus API connectivity, multi-language handling, naming conventions
2. **Agent-specific Skills**:
   - Schema Analyzer: Excel parsing, validation rules
   - Collection Creator: Directus field creation APIs
   - Relationship Manager: Directus relationship APIs
   - Translation Setup: Directus translation APIs, language mapping
   - Validation Agent: Rule checking, consistency validation
   - Documentation: Report generation, error logging

3. **Shared Knowledge**:
   - Field type mapping (Primarix ↔ Directus)
   - Naming conventions & rules
   - Multi-language label rules
   - Field list (px_feldlisten) handling
   - Common field definitions (object_id, status_primarix, etc.)

