# PROMPT: Generate Skills & Agent Instructions for BOTG Directus Migration Automation

## SYSTEM CONTEXT

You are assisting in automating the migration of a travel/booking platform from **Primarix CMS** to **Directus CMS**. The process involves transforming product schemas (Hotels, Cruises, Collections, etc.) from legacy structure to a modern, multi-language, relationship-based architecture.

**Current State**: Manual, time-consuming field-by-field creation in Directus (1-2 hours per collection).  
**Goal**: Agentic AI system that automates this completely, handling all variations and client modifications.

---

## PROJECT FUNDAMENTALS

### The Core Problem
Client has provided Excel blueprints (e.g., `BOTG_Brief_DEV_Setup_Hotels_260410.xlsx`) that define:
- What fields to create (name, type, translations)
- How to structure relationships (many-to-one, sub-collections)
- What multi-language labels to apply (de-DE, de-CH, en-GB, nl-NL)
- Which fields to skip, modify, or mark as deprecated

**Manual process**:
1. Open Excel → Read field definitions (50+ rows per product)
2. For each field: Create in Directus manually
3. Apply 4-language labels manually
4. Set up relationships manually
5. Test and validate
6. Document

**Automation goal**: Replace steps 1-5 with agentic system that reads Excel → Creates complete, validated Directus collection in <2 minutes.

### Key Constraints & Standards
1. **Directus Setup**:
   - System languages: en-GB (default), de-DE, de-CH, nl-NL
   - Content languages (translations): de-DE, de-CH, nl-NL (NO en-GB)
   - Collections: Plural naming (`hotels`, `cruises`, not `hotel`, `cruise`)
   - Fields: Snake_case English names

2. **Field Naming Rules**:
   - Use "uid" column from Primarix mapping (NOT "field id")
   - Changes: `oid` → `object_id`, `?` → `status_primarix`
   - Singular if one choice: `country`
   - Plural if many: `activities`

3. **Translation Handling**:
   - Translatable fields go to separate `{collection}_descriptions` table
   - Each field gets 4 UI labels (de-DE, de-CH, en-GB, nl-NL)
   - Label rules: Title case for nouns, lowercase for articles/adverbs

4. **Field Lists (px_feldlisten)**:
   - Store in separate sub-collections (e.g., `countries`, `booking_partners`)
   - Preserve Primarix metadata: `primarix_label`, `primarix_id`, `primarix_fieldlist_group`, `primarix_status`

5. **Import Strategy**:
   - Fields marked "-" in Excel → DO NOT create
   - Fields marked "?" → Flag for client review
   - Fields marked "Yes" → Create immediately

---

## EXCEL SHEET STRUCTURE (Reference: Hotels)

### Header Sections
- **Row 4**: Column headers (Status, DB, Directus, Mapping Table, Labels, Details, Remarks)
- **Row 5**: Sub-headers (Ready to implement?, Collection, Group/Accordion, Translatable?, Field ID, Labels in 4 languages, Field Type, etc.)
- **Row 7**: Collection name (e.g., `hotels`)

### Field Definition Rows (Row 9+)

| Col | Header | Purpose | Example |
|---|---|---|---|
| **A** | Status | Import readiness | "Yes", "?", "-", "no" |
| **B** | - | Metadata | (usually empty) |
| **C** | Collection | Target collection name | `hotels`, `cruises` |
| **D** | Group/Accordion | UI grouping | "Master Data", "Reservation", "Partner Filter" |
| **E** | Right Accordion | Secondary grouping | (often empty) |
| **F** | Translatable | Is field translatable? | "Yes", "No", "(*)" |
| **G** | - | Reserved | (usually empty) |
| **H** | # | Mapping sequence | 1, 2, 3, ... |
| **I** | fieldid Primarix | Source field in legacy | `field_41_1`, `oid`, `status (?)` |
| **J** | parent table | Primarix collection | `hotels`, `cruises` |
| **K** | **field id (NEW)** | **Directus field name** | **USE THIS COLUMN** |
| **L** | de-DE | German label | "Hotelname" |
| **M** | de-CH | Swiss German label | "Hotelname" |
| **N** | en-GB | English label | "Hotel Name" |
| **O** | nl-NL | Dutch label | "Hotelnaam" |
| **P** | - | Divider | (usually empty) |
| **Q** | Rank | Display order | 1, 2, 3, ... |
| **R** | Relation | Sub-collection link | `hotel_groups`, `countries`, `booking_partners` |
| **S** | Field type | Directus field type | text, text area, many-to-one, etc. |
| **T** | Max Chars (PX) | Character limit | 255, 1000, (empty) |
| **U** | Info-Text | Help text below field | Description for users |
| **V** | - | Divider | (usually empty) |
| **W** | Remarks for DEV | Implementation instructions | "NOT to be imported!", "needs validation", etc. |
| **X** | Remarks internal | Internal task notes | Team notes, issues |

### Data Row Example
```
Row 25: 
  A: Yes                    (Status: Ready to implement)
  C: hotels                 (Collection)
  D: Master Data            (Group)
  F: No                     (Not translatable)
  H: 2                      (Sequence)
  I: field_41_1             (Primarix field ID)
  J: hotels                 (Parent in Primarix)
  K: name                   (NEW Directus field name)
  L-O: "Hotelname", "Hotelname", "Hotel Name", "Hotelnaam" (Labels)
  Q: 1                      (Rank/Order)
  R: (empty)                (No sub-collection)
  S: text input             (Field type)
  W: (empty)                (No special remarks)
```

---

## SKILL DEFINITIONS

### Skill 1: GLOBAL_BOTG_DIRECTUS_FOUNDATION
**Purpose**: Central knowledge base for all BOTG-Directus operations

**Content to Include**:
1. **Field Type Mapping**:
   - All Primarix/Excel field types → Directus field type conversions
   - Configuration parameters for each type (max length, validation, etc.)

2. **Naming Conventions**:
   - Collection naming rules (plural, product prefixes)
   - Field naming rules (snake_case, singular/plural logic)
   - Sub-collection naming patterns
   - Translation table naming

3. **Multi-Language Standards**:
   - Language codes: en-GB, de-DE, de-CH, nl-NL
   - Label formatting rules (title case, article/adverb lowercase, etc.)
   - Content language exclusions (en-GB for content, only for UI)

4. **Directus API Basics**:
   - Authentication & connection
   - Common endpoints (collections, fields, relations, translations)
   - Error handling patterns
   - Rate limiting considerations

5. **Primarix-to-Directus Mapping**:
   - Standard field name changes (oid → object_id, ? → status_primarix)
   - Common field definitions (object_id, status_primarix, internal_remarks, etc.)
   - Field list (px_feldlisten) handling rules
   - Primarix metadata preservation (primarix_label, primarix_id, etc.)

6. **Import Strategies**:
   - Which languages to include (de-DE, de-CH, nl-NL only)
   - Handling deprecated fields ("-" status)
   - Handling uncertain fields ("?" status)
   - Data validation and quality checks

7. **Common Patterns**:
   - Many-to-one relationships
   - Many-to-many relationships
   - Repeater/JSON fields
   - Translation table structure
   - Field list sub-collection structure

---

### Skill 2: EXCEL_SCHEMA_PARSER
**Purpose**: Parse and validate Excel blueprints

**Content to Include**:
1. **Excel Sheet Structure Recognition**:
   - Identify header rows (4-5)
   - Locate collection name (row 7, col C)
   - Detect accordion/group definitions
   - Recognize field definition blocks

2. **Field Extraction Logic**:
   - Parse field row → Extract all 29 columns
   - Validate required fields (at minimum: Col K, S, L-O)
   - Handle empty cells and special values ("-", "?", "(*)")
   - Extract sub-collections from "Relation" column

3. **Data Validation**:
   - Check Status values (Yes, ?, -, no, yes) → Normalize
   - Validate field names (snake_case, no spaces)
   - Verify all 4 language labels present (or flag missing)
   - Ensure field types are recognized (map to Directus)
   - Check for duplicate field names
   - Validate Rank/Order sequence

4. **Error Detection**:
   - Missing critical fields (field name, field type, labels)
   - Inconsistent field types vs. field names
   - Orphaned relationships (Relation column references non-existent collection)
   - Conflicts with Directus naming rules
   - Deprecated fields being created

5. **Reporting**:
   - Field count summary
   - Validation issues (warnings vs. errors)
   - Suggested fixes for common issues
   - Import readiness assessment

---

### Skill 3: DIRECTUS_COLLECTION_CREATOR
**Purpose**: Create Directus collections and fields

**Content to Include**:
1. **Collection Creation**:
   - API call: POST /collections
   - Field naming validation before creation
   - Primary key setup (usually `id`)
   - Collection metadata (display, icon, etc.)

2. **Field Creation**:
   - API call: POST /fields/{collection}
   - Field type configuration (text, number, date, many-to-one, etc.)
   - Field properties: required, unique, default value, validation
   - Field display options (placeholder, hidden, read-only, etc.)
   - Multi-language label application
   - Info text (help text below field)

3. **Batch Operations**:
   - Create multiple fields in sequence
   - Handle dependencies (create parent field before foreign key)
   - Rollback on error
   - Transaction-like behavior

4. **Field Type Configuration**:
   - Text: max length, regex, placeholder
   - Number: min/max, decimal places, step
   - Date: default value, include time?
   - Many-to-one: target collection, display template
   - Many-to-many: junction table, display template
   - Rich Text: toolbar options, max length
   - JSON/Repeater: schema validation

5. **Error Handling**:
   - Duplicate field names → Skip or update?
   - Invalid field types → Log error, suggest fix
   - Missing relationships → Create placeholder
   - API rate limits → Implement backoff/retry

---

### Skill 4: DIRECTUS_RELATIONSHIP_MANAGER
**Purpose**: Create and manage field relationships

**Content to Include**:
1. **Many-to-One Relationships**:
   - Create foreign key field
   - Link to target collection
   - Set up display template (what to show: name, label, etc.)
   - Configure as autocomplete, dropdown, or radio

2. **Many-to-Many Relationships**:
   - Create junction table
   - Set up M2M relationship on both sides
   - Configure checkboxes or multi-select display
   - Set sort order for related items

3. **Sub-Collection Creation** (for field lists):
   - Create collection: e.g., `countries`, `booking_partners`
   - Standard fields: `id`, `primarix_id`, `primarix_label`, `primarix_label_short`, `primarix_fieldlist_group`, `primarix_status`
   - Multi-language support (if needed)
   - Link back to main collection

4. **Dependency Management**:
   - Identify which sub-collections need to exist
   - Create sub-collections in correct order
   - Create main collection fields with relationships
   - Validate all links work

5. **Relationship Configuration**:
   - Cascade delete rules
   - Allow null values?
   - Required field vs. optional
   - Display template (what shows in dropdown)
   - Sorting options

---

### Skill 5: DIRECTUS_TRANSLATION_SETUP
**Purpose**: Configure multi-language fields and labels

**Content to Include**:
1. **Translation Table Creation**:
   - Create `{collection}_descriptions` table
   - Foreign key to main collection
   - Fields: All translatable fields from main collection
   - Configuration: Translatable = Yes

2. **Multi-Language Label Application**:
   - Apply 4-language labels to each field:
     - de-DE, de-CH, en-GB, nl-NL
   - Apply to both main and translation tables
   - Validation: Ensure all 4 languages present

3. **Language Configuration**:
   - System languages: Set up en-GB (default), de-DE, de-CH, nl-NL
   - Content languages: de-DE, de-CH, nl-NL (exclude en-GB)
   - Direction: LTR for all

4. **Translatable Field Identification**:
   - Read "Translatable" column (F) from Excel
   - Move "Yes" fields to translation table
   - Keep "No" fields in main collection
   - Handle "(*)" special cases (multi-lingual sub-collections)

5. **Translation Workflow Setup**:
   - Archive/publish settings for translations
   - Status tracking (draft, published)
   - Translation completion percentage
   - User role permissions (translator access)

---

### Skill 6: DIRECTUS_VALIDATION_QA
**Purpose**: Validate collection structure and generate reports

**Content to Include**:
1. **Structural Validation**:
   - All fields present in Directus
   - Field types match Excel specification
   - All 4-language labels applied
   - All relationships functional
   - Translation table structure correct

2. **Naming Validation**:
   - Field names follow snake_case
   - Singular/plural rules enforced
   - No reserved Directus field names
   - Collection naming conventions met

3. **Relationship Validation**:
   - All "Relation" column references exist (or flag)
   - No circular relationships
   - Foreign keys point to valid collections
   - Cardinality correct (many-to-one vs. many-to-many)

4. **Data Integrity Checks**:
   - Required fields are marked as required
   - Unique constraints where needed
   - Default values set correctly
   - Field display order matches Rank column

5. **Reporting**:
   - Summary: X fields created, Y relationships, Z translations
   - Issues: Critical (blocking), Warnings (review), Info (FYI)
   - Field-by-field checklist
   - Comparison: Excel blueprint vs. Directus reality
   - Readiness assessment (ready for import? ready for clients?)

---

### Skill 7: DIRECTUS_DOCUMENTATION_GENERATOR
**Purpose**: Auto-generate setup documentation

**Content to Include**:
1. **Collection Documentation**:
   - Collection overview (name, purpose, usage)
   - Field catalog (name, type, description, labels)
   - Relationships diagram
   - Translation structure

2. **Implementation Notes**:
   - Deviations from standard (mark as custom)
   - Client-requested changes
   - Known issues or caveats
   - Future work (e.g., "Geography logic pending")

3. **Import Instructions**:
   - Data mapping guide (Primarix → Directus)
   - Field lists to pre-populate (countries, booking_partners, etc.)
   - Language handling (3 languages only)
   - Validation checks pre-import

4. **User Guide**:
   - How to add new records
   - UI walkthrough (groups, accordions, fields)
   - Multi-language workflow
   - Common issues & troubleshooting

5. **Output Formats**:
   - Markdown (.md) for docs
   - JSON schema (for API documentation)
   - CSV summary (field list)
   - HTML report (for clients/stakeholders)

---

## AGENT SPECIFICATIONS

### Agent 1: SCHEMA_ANALYZER_AGENT
**Role**: Read Excel blueprint, validate, identify gaps

**Responsibilities**:
1. Load Excel file (hotels, cruises, collections, etc.)
2. Parse structure (collection name, field definitions, groups)
3. Validate each field:
   - Required columns present (name, type, labels)
   - Status interpretation (Yes/No/?/-)
   - Naming conventions
   - Label completeness
4. Identify sub-collections needed
5. Flag client changes (NEW fields, modified field types)
6. Generate validation report (errors, warnings, info)

**Input**: Excel file path  
**Output**: 
- Parsed schema JSON (collection + fields + relationships)
- Validation report (issues + suggestions)
- Sub-collections list
- Import readiness assessment

**Skills Used**: EXCEL_SCHEMA_PARSER, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- 100% field parsing accuracy
- All validation rules applied
- Clear error/warning messages
- Client changes highlighted

---

### Agent 2: COLLECTION_SETUP_AGENT
**Role**: Create Directus collection structure

**Responsibilities**:
1. Receive parsed schema from Schema Analyzer
2. Create main collection (e.g., `hotels`)
3. Create all non-translatable fields:
   - Apply field type mapping
   - Set properties (required, unique, default)
   - Apply multi-language UI labels
   - Apply info text
4. Create translatable fields in translation table (if needed)
5. Verify all fields created successfully
6. Report creation status

**Input**: Parsed schema JSON (from Schema Analyzer)  
**Output**: 
- Directus collection created ✓
- Field creation report (success/fail for each)
- Field IDs in Directus (for relationship linking)

**Skills Used**: DIRECTUS_COLLECTION_CREATOR, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- All "Yes" status fields created
- No "-" status fields created (deprecated)
- All field types correct
- All 4-language labels applied
- <2 minutes total execution

---

### Agent 3: RELATIONSHIP_SETUP_AGENT
**Role**: Create sub-collections and relationships

**Responsibilities**:
1. Receive parsed schema from Schema Analyzer
2. Identify all sub-collections (from "Relation" column)
3. For each sub-collection:
   - Create collection with standard fields (primarix_id, primarix_label, etc.)
   - Multi-language support if needed
4. For each relationship in main collection:
   - Create many-to-one foreign key
   - Set up relationship configuration
   - Configure display options (autocomplete, dropdown, etc.)
5. Verify all relationships functional
6. Report creation status

**Input**: Parsed schema JSON (from Schema Analyzer)  
**Output**: 
- Sub-collections created ✓
- Relationships established ✓
- Relationship configuration report

**Skills Used**: DIRECTUS_RELATIONSHIP_MANAGER, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- All sub-collections created
- All relationships functional
- No orphaned references
- Display options set correctly

---

### Agent 4: TRANSLATION_SETUP_AGENT
**Role**: Configure multi-language content

**Responsibilities**:
1. Receive parsed schema from Schema Analyzer
2. Identify translatable fields (from "Translatable" column)
3. Create translation table structure (if needed)
4. Apply 4-language UI labels to all fields:
   - de-DE, de-CH, en-GB, nl-NL
5. Configure system languages
6. Set content languages (de-DE, de-CH, nl-NL, exclude en-GB)
7. Verify label completeness
8. Report translation setup status

**Input**: Parsed schema JSON (from Schema Analyzer)  
**Output**: 
- Translation table created ✓
- All 4-language labels applied ✓
- Language configuration complete ✓
- Label coverage report

**Skills Used**: DIRECTUS_TRANSLATION_SETUP, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- All fields have 4-language labels
- Content language rules enforced
- Translation table structure correct
- No missing translations

---

### Agent 5: VALIDATION_QA_AGENT
**Role**: Verify complete collection structure

**Responsibilities**:
1. Receive completed collection from previous agents
2. Run comprehensive validation:
   - All fields present in Directus?
   - Field types correct?
   - All 4-language labels present?
   - All relationships functional?
   - Naming conventions met?
   - No deprecated fields?
   - Data integrity checks
3. Generate detailed QA report:
   - Summary (fields, relationships, translations)
   - Issues (critical, warnings, info)
   - Checklist (field-by-field)
   - Readiness assessment
4. Compare against Excel blueprint
5. Flag any deviations

**Input**: 
- Original Excel blueprint
- Completed Directus collection

**Output**: 
- QA Report (pass/fail for each criterion)
- Issues list with severity
- Readiness for next phase (import, client review, etc.)

**Skills Used**: DIRECTUS_VALIDATION_QA, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- 100% field verification
- All relationships validated
- All naming rules enforced
- Clear pass/fail status

---

### Agent 6: DOCUMENTATION_AGENT
**Role**: Generate setup documentation

**Responsibilities**:
1. Receive original Excel blueprint + completed Directus collection
2. Generate documentation in multiple formats:
   - Implementation Report (Markdown)
   - Field Catalog (Markdown + CSV)
   - Relationship Diagram
   - API Schema (JSON)
   - User Guide (Markdown)
   - Import Instructions (Markdown)
3. Include:
   - What was created (and why)
   - Any deviations from blueprint
   - Client changes/customizations
   - Known issues or caveats
   - Next steps (import, data validation, etc.)
4. Generate summary for stakeholders

**Input**: 
- Original Excel blueprint
- Completed Directus collection metadata
- QA Report

**Output**: 
- Implementation Report (.md)
- Field Catalog (.md + .csv)
- API Schema (.json)
- User Guide (.md)
- Import Guide (.md)
- All docs organized in folder

**Skills Used**: DIRECTUS_DOCUMENTATION_GENERATOR, GLOBAL_BOTG_DIRECTUS_FOUNDATION

**Success Criteria**:
- Comprehensive documentation
- Multiple formats provided
- Clear and accurate information
- Ready for team handoff

---

### Agent 7: GLOBAL_ORCHESTRATOR_AGENT
**Role**: Coordinate entire workflow

**Responsibilities**:
1. **Initialization**:
   - Receive Excel file + configuration
   - Set up Directus connection
   - Validate prerequisites

2. **Orchestration**:
   - Call Schema Analyzer → Get parsed schema + validation
   - If validation issues: Flag & ask user
   - Call Collection Setup Agent
   - Call Relationship Setup Agent (parallel)
   - Call Translation Setup Agent (parallel)
   - Call Validation QA Agent
   - If QA fails: Log issues & ask user
   - Call Documentation Agent

3. **Error Handling**:
   - Catch failures from any agent
   - Decide: Proceed with workaround? Escalate to user? Retry?
   - Log all errors for troubleshooting

4. **Client Modification Handling**:
   - If Excel contains NEW fields (not in Primarix):
     - Ask user: "Should we create this new field?"
     - Create if approved
   - If Excel contains modified field types:
     - Flag for review
   - If Excel has uncertain status ("?"):
     - Ask user for decision

5. **Progress Reporting**:
   - Real-time status updates
   - Milestone achievements
   - Time tracking
   - Issue summary

6. **Final Handoff**:
   - Summary: X fields created, Y relationships, Z collections
   - All documents generated
   - Readiness confirmation
   - Next steps

**Input**: Excel file + Directus connection  
**Output**: 
- Complete, validated Directus collection
- Full documentation package
- QA report
- Ready for import/production

**Skills Used**: All skills above + coordination logic

**Success Criteria**:
- Entire workflow completes <2-3 minutes
- All agents work together seamlessly
- User interrupts handled gracefully
- Professional handoff to next phase

---

## SHARED KNOWLEDGE & CONVENTIONS

### Standard Field Definitions
These should be in every Directus collection (unless product-specific):

```json
{
  "object_id": {
    "field": "object_id",
    "type": "integer",
    "required": true,
    "unique": true,
    "label_de": "Objekt-ID",
    "label_en": "Object-ID",
    "description": "Unique identifier from Primarix"
  },
  "status_primarix": {
    "field": "status_primarix",
    "type": "many-to-one",
    "relation": "status_values",
    "label_de": "Status Primarix",
    "label_en": "Status Primarix"
  },
  "internal_remarks": {
    "field": "internal_remarks",
    "type": "text",
    "translatable": false,
    "label_de": "Interne Hinweise",
    "label_en": "Internal Remarks",
    "description": "Import all language versions here"
  },
  "data_updated": {
    "field": "data_updated",
    "type": "date",
    "label_de": "Letzte Aktualisierung",
    "label_en": "Last Update"
  },
  "editor": {
    "field": "editor",
    "type": "text",
    "label_de": "Redakteur",
    "label_en": "Editor",
    "description": "Last editor (show 'unknown' if not available)"
  }
}
```

### Field Type Mapping Reference
```json
{
  "text input": { "directus": "text", "config": { "maxLength": 255 } },
  "text area": { "directus": "textarea", "config": {} },
  "rich text editor": { "directus": "rich_text", "config": {} },
  "numerical": { "directus": "integer", "config": {} },
  "date": { "directus": "date", "config": {} },
  "phone number": { "directus": "phone", "config": {} },
  "mail": { "directus": "email", "config": {} },
  "url": { "directus": "url", "config": {} },
  "many to one": { "directus": "many-to-one", "config": { "type": "many-to-one" } },
  "many to many": { "directus": "many-to-many", "config": { "type": "many-to-many" } },
  "radio": { "directus": "radio", "config": { "choices": [] } },
  "check + multi select": { "directus": "checkbox", "config": {} },
  "drop down json": { "directus": "dropdown", "config": { "choices": [] } },
  "repeater (json)": { "directus": "json", "config": {} },
  "auto complete": { "directus": "many-to-one", "config": { "type": "auto-complete" } }
}
```

### Sub-Collection Standard Schema
Every field list sub-collection should have:
```json
{
  "id": { "type": "integer", "primary": true },
  "primarix_id": { "type": "text", "required": true, "unique": true, "label": "Primarix ID" },
  "primarix_label": { "type": "text", "required": true, "label": "Primarix Label" },
  "primarix_label_short": { "type": "text", "label": "Primarix Label (Short)" },
  "primarix_fieldlist_group": { "type": "text", "label": "Fieldlist Group (cid)" },
  "primarix_status": { "type": "text", "label": "Status in Primarix" },
  "name": { "type": "text", "translatable": true },
  "... other fields as needed ..."
}
```

---

## DOCUMENTATION REQUIREMENTS

Each skill and agent should have:
1. Clear purpose statement
2. Input/output specification
3. Detailed responsibilities
4. Error handling approach
5. Success criteria
6. Example usage scenarios

---

## IMPLEMENTATION ROADMAP

### Phase 1: Core Skills (.md files)
1. Create GLOBAL_BOTG_DIRECTUS_FOUNDATION.md
2. Create EXCEL_SCHEMA_PARSER.md
3. Create DIRECTUS_COLLECTION_CREATOR.md
4. Create DIRECTUS_RELATIONSHIP_MANAGER.md
5. Create DIRECTUS_TRANSLATION_SETUP.md
6. Create DIRECTUS_VALIDATION_QA.md
7. Create DIRECTUS_DOCUMENTATION_GENERATOR.md

### Phase 2: Agent Instructions (.md files)
1. Create SCHEMA_ANALYZER_AGENT.md
2. Create COLLECTION_SETUP_AGENT.md
3. Create RELATIONSHIP_SETUP_AGENT.md
4. Create TRANSLATION_SETUP_AGENT.md
5. Create VALIDATION_QA_AGENT.md
6. Create DOCUMENTATION_AGENT.md
7. Create GLOBAL_ORCHESTRATOR_AGENT.md

### Phase 3: Agent Implementation & Testing
1. Implement each agent using APIs
2. Test with Hotels collection
3. Test with Cruises collection
4. Validate against QA criteria
5. Document edge cases & fixes

### Phase 4: Client Integration
1. Deploy to production Directus
2. Test with actual client data
3. Handle client modifications
4. Train team on workflow
5. Monitor and optimize

---

## EXPECTED OUTCOMES

✅ **Skills .md files**: Comprehensive knowledge bases for agents  
✅ **Agent Instructions**: Clear, actionable specifications  
✅ **Automation**: Collections created in <2-3 minutes vs. 1-2 hours manual  
✅ **Quality**: 100% accuracy, no manual errors  
✅ **Scalability**: Works for any product (Hotels, Cruises, Collections, future products)  
✅ **Documentation**: Auto-generated, professional-grade  
✅ **Client-Ready**: Full handoff package with implementation guide  

---

## ADDITIONAL CONSIDERATIONS

### Handling Client Modifications
- NEW fields in Excel (not in Primarix) → Ask before creating
- Modified field names/types → Flag for review
- Uncertain status ("?") → Escalate to user
- Complex field types (repeater, json) → Validate configuration

### Handling Variations Across Products
- Hotel-specific fields (e.g., `hotel_group`, `room_types`)
- Cruise-specific fields (e.g., `ship`, `bord_languages`)
- Collection-specific logic
- Common core fields (object_id, status_primarix, etc.)
- Geography logic (currently under development)

### Future Enhancements
- API migration workflow (data import from Primarix)
- Automated testing framework
- Performance optimization
- Multi-workspace support
- Directus extension integration

