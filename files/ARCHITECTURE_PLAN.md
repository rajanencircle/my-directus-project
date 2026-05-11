# BOTG Directus Migration Automation - Architecture & Implementation Plan

## EXECUTIVE SUMMARY

This document outlines the **agentic AI system** to automate the migration of BOTG (travel booking platform) from **Primarix CMS** to **Directus CMS**.

**Problem**: Manual collection/field creation = 1-2 hours per product × 4+ products = 4-8+ hours total  
**Solution**: Agentic system with specialized agents = <2-3 minutes per product  
**Scope**: Hotels, Cruises, Collections, and future products

---

## SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│              GLOBAL ORCHESTRATOR AGENT                          │
│  (Coordinates workflow, handles user interactions, reports)     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
        ┌───────▼────────┐    ┌──────▼─────────┐
        │ SCHEMA ANALYZER │    │ (All Agents in Parallel)
        │  - Parse Excel  │    │
        │  - Validate     │    │ ├─ Collection Setup
        │  - Flag issues  │    │ ├─ Relationship Setup
        └───────┬────────┘    │ ├─ Translation Setup
                │             │ └─ (Execute in sequence)
        ┌───────▼──────────────┴────────┐
        │                               │
        │ ┌──────────────────────────┐ │
        │ │ VALIDATION QA AGENT      │ │
        │ │ - Verify structure       │ │
        │ │ - Check relationships    │ │
        │ │ - Generate report        │ │
        │ └──────────────────────────┘ │
        │                               │
        │ ┌──────────────────────────┐ │
        │ │ DOCUMENTATION AGENT      │ │
        │ │ - Create implementation  │ │
        │ │   guide                  │ │
        │ │ - User documentation     │ │
        │ │ - Import instructions    │ │
        │ └──────────────────────────┘ │
        │                               │
        └───────┬───────────────────────┘
                │
        ┌───────▼──────────────┐
        │ OUTPUT: Ready-to-Use  │
        │ Directus Collection  │
        │ + Documentation      │
        └──────────────────────┘
```

---

## AGENT DEFINITIONS

### 1. GLOBAL ORCHESTRATOR AGENT ⭐
**Role**: Master coordinator and workflow manager

**Responsibilities**:
- Load Excel blueprint file
- Initialize Directus connection
- Delegate to specialized agents
- Handle client modifications & user interactions
- Aggregate results & generate final reports
- Error handling & recovery

**Success**: Complete workflow in <3 minutes, all agents synchronized

---

### 2. SCHEMA ANALYZER AGENT 🔍
**Role**: Parse and validate Excel blueprint

**Responsibilities**:
- Read Excel file (standardized BOTG format)
- Extract: collection name, fields, groups, relationships
- Validate: naming, labels, field types
- Identify: sub-collections needed, deprecated fields, NEW fields
- Generate: parsed JSON schema + validation report

**Success**: 100% accuracy, all fields parsed, issues highlighted

---

### 3. COLLECTION SETUP AGENT 🏗️
**Role**: Create Directus collection and fields

**Responsibilities**:
- Create main collection (e.g., `hotels`)
- Create all fields with correct types
- Apply 4-language UI labels
- Set field properties (required, unique, default, etc.)
- Apply info text and placeholders
- Create translation table if needed

**Success**: All "Yes" fields created in <1 minute, zero errors

---

### 4. RELATIONSHIP SETUP AGENT 🔗
**Role**: Create sub-collections and relationships

**Responsibilities**:
- Create sub-collections (e.g., `countries`, `booking_partners`)
- Add standard Primarix metadata fields
- Create foreign key relationships (many-to-one)
- Configure display options (autocomplete, dropdown, etc.)
- Verify no orphaned references

**Success**: All relationships functional, no broken links

---

### 5. TRANSLATION SETUP AGENT 🌐
**Role**: Configure multi-language support

**Responsibilities**:
- Apply 4-language labels to all fields (de-DE, de-CH, en-GB, nl-NL)
- Create translation table structure
- Configure system languages
- Set content languages (exclude en-GB)
- Verify translation completeness

**Success**: 100% label coverage, all 4 languages applied

---

### 6. VALIDATION QA AGENT ✅
**Role**: Verify complete structure and generate quality report

**Responsibilities**:
- Verify all fields present in Directus
- Check field types, properties, labels
- Validate relationships & naming conventions
- Compare against Excel blueprint
- Generate QA report (pass/fail, issues, checklist)
- Readiness assessment

**Success**: Clear pass/fail status, ready for next phase

---

### 7. DOCUMENTATION AGENT 📚
**Role**: Generate comprehensive setup documentation

**Responsibilities**:
- Create Implementation Report (what was created, deviations)
- Create Field Catalog (all fields with descriptions)
- Create API Schema (JSON for developers)
- Create User Guide (how to use the collection)
- Create Import Instructions (data migration guide)
- Generate multiple formats (Markdown, CSV, JSON, HTML)

**Success**: Professional documentation, ready for team & clients

---

## SKILL DEFINITIONS

### 1. GLOBAL_BOTG_DIRECTUS_FOUNDATION
**Comprehensive knowledge base** for all BOTG-Directus operations

**Includes**:
- Field type mapping (Primarix ↔ Directus)
- Naming conventions (collections, fields, sub-collections)
- Multi-language standards (4 languages, label rules)
- Directus API basics (authentication, endpoints, error handling)
- Primarix-to-Directus mapping rules (oid → object_id, etc.)
- Import strategies & validation rules
- Standard field definitions (object_id, status_primarix, etc.)
- Field list (px_feldlisten) handling
- Common patterns (relationships, repeaters, etc.)

**Used by**: All agents

---

### 2. EXCEL_SCHEMA_PARSER
**Specialized knowledge** for parsing Excel blueprints

**Includes**:
- Excel structure recognition (headers, collection name, field blocks)
- Field extraction logic (29 columns per field)
- Data validation (naming, field types, labels, relationships)
- Error detection (missing fields, inconsistencies, conflicts)
- Status interpretation (Yes, ?, -, no, yes) → normalized
- Reporting (summary, issues, suggestions, readiness)

**Used by**: Schema Analyzer Agent

---

### 3. DIRECTUS_COLLECTION_CREATOR
**Specialized knowledge** for creating collections and fields

**Includes**:
- Directus API: POST /collections
- Directus API: POST /fields/{collection}
- Field type configuration (text, number, date, many-to-one, etc.)
- Field properties setup (required, unique, default, validation)
- Multi-language label application
- Batch operations & transaction handling
- Error handling & rollback strategy

**Used by**: Collection Setup Agent

---

### 4. DIRECTUS_RELATIONSHIP_MANAGER
**Specialized knowledge** for managing relationships

**Includes**:
- Many-to-one relationship setup
- Many-to-many relationship setup
- Sub-collection creation (field lists)
- Standard fields for sub-collections (primarix_id, primarix_label, etc.)
- Dependency management (creation order)
- Relationship configuration (display template, cardinality, cascade rules)
- Directus API: POST /relations

**Used by**: Relationship Setup Agent

---

### 5. DIRECTUS_TRANSLATION_SETUP
**Specialized knowledge** for multi-language configuration

**Includes**:
- Translation table creation (`{collection}_descriptions`)
- 4-language label application (de-DE, de-CH, en-GB, nl-NL)
- System language configuration
- Content language rules (exclude en-GB from content)
- Translatable field identification
- Translation workflow setup (archive, publish, status)
- Directus API: Language configuration endpoints

**Used by**: Translation Setup Agent

---

### 6. DIRECTUS_VALIDATION_QA
**Specialized knowledge** for quality assurance

**Includes**:
- Structural validation (all fields present, correct types)
- Naming validation (snake_case, singular/plural rules)
- Relationship validation (no orphans, correct cardinality)
- Data integrity checks (required fields, unique constraints)
- Label completeness check (all 4 languages present)
- Comparison logic (Excel blueprint vs. Directus reality)
- Report generation (issues, checklist, readiness)

**Used by**: Validation QA Agent

---

### 7. DIRECTUS_DOCUMENTATION_GENERATOR
**Specialized knowledge** for documentation creation

**Includes**:
- Implementation Report structure (what created, deviations)
- Field Catalog format (name, type, description, labels)
- API Schema generation (JSON)
- User Guide structure (workflow, UI walkthrough)
- Import Instructions (data mapping, validation, etc.)
- Documentation templates (Markdown, CSV, JSON, HTML)
- Multi-format output generation

**Used by**: Documentation Agent

---

## WORKFLOW VISUALIZATION

```
INPUT: Excel File
  ↓
[ORCHESTRATOR: Initialize]
  ├─ Load Excel
  ├─ Connect to Directus
  ├─ Validate prerequisites
  ↓
[SCHEMA ANALYZER: Parse & Validate]
  ├─ Extract collection, fields, relationships
  ├─ Validate naming, labels, field types
  ├─ Identify sub-collections, deprecated fields
  ├─ Flag client modifications
  ↓ Parsed Schema + Validation Report
  ├─ If errors: Ask user for decisions
  ↓
[PARALLEL EXECUTION]
  ├─ [COLLECTION SETUP]: Create main collection + fields
  │   ├─ Create collection
  │   ├─ Create all fields with types
  │   ├─ Apply 4-language labels
  │   └─ Create translation table (if needed)
  │
  ├─ [RELATIONSHIP SETUP]: Create sub-collections + links
  │   ├─ Create sub-collections
  │   ├─ Create foreign keys
  │   └─ Configure relationships
  │
  └─ [TRANSLATION SETUP]: Configure multi-language
      ├─ Apply labels to all fields
      ├─ Configure languages
      └─ Verify completeness
  ↓
[VALIDATION QA]: Verify Structure
  ├─ Compare Excel vs. Directus
  ├─ Validate all fields, relationships, labels
  ├─ Generate QA report
  └─ Readiness assessment
  ↓
[DOCUMENTATION]: Generate Guides
  ├─ Implementation Report
  ├─ Field Catalog
  ├─ API Schema
  ├─ User Guide
  └─ Import Instructions
  ↓
OUTPUT: Complete, Validated Collection + Documentation
```

---

## IMPLEMENTATION TIMELINE

### Phase 1: Skills Documentation (Current)
**Deliverables**: 7 skill .md files with comprehensive knowledge

1. **GLOBAL_BOTG_DIRECTUS_FOUNDATION.md**
   - Field type mapping reference
   - Naming conventions & standards
   - Multi-language rules
   - API basics
   - Standard definitions

2. **EXCEL_SCHEMA_PARSER.md**
   - Excel structure rules
   - Field extraction logic
   - Validation rules
   - Error detection patterns

3. **DIRECTUS_COLLECTION_CREATOR.md**
   - API endpoints
   - Field configuration
   - Label application
   - Error handling

4. **DIRECTUS_RELATIONSHIP_MANAGER.md**
   - Relationship setup logic
   - Sub-collection patterns
   - Dependency management

5. **DIRECTUS_TRANSLATION_SETUP.md**
   - Translation table structure
   - Multi-language label rules
   - Language configuration

6. **DIRECTUS_VALIDATION_QA.md**
   - Validation criteria
   - Comparison logic
   - Report generation

7. **DIRECTUS_DOCUMENTATION_GENERATOR.md**
   - Documentation templates
   - Output formats
   - Content structure

**Timeline**: 3-4 hours  
**Owner**: Technical Writer + Architects

---

### Phase 2: Agent Instructions (Next)
**Deliverables**: 7 agent .md files with clear specifications

1. **SCHEMA_ANALYZER_AGENT.md**
2. **COLLECTION_SETUP_AGENT.md**
3. **RELATIONSHIP_SETUP_AGENT.md**
4. **TRANSLATION_SETUP_AGENT.md**
5. **VALIDATION_QA_AGENT.md**
6. **DOCUMENTATION_AGENT.md**
7. **GLOBAL_ORCHESTRATOR_AGENT.md**

**Timeline**: 2-3 hours  
**Owner**: Technical Architects

---

### Phase 3: Agent Implementation (Future)
**Deliverables**: Working agents integrated with Directus API

- Implement each agent in Python/JavaScript
- Test with Hotels collection
- Test with Cruises collection
- Validate against QA criteria
- Document edge cases

**Timeline**: 1-2 weeks  
**Owner**: Backend Developers

---

### Phase 4: Production Integration (Future)
**Deliverables**: Agents deployed, team trained, ready for all products

- Deploy to production Directus
- Integration testing with actual data
- Client acceptance testing
- Team training & documentation
- Monitor and optimize

**Timeline**: 1 week  
**Owner**: DevOps + Project Manager

---

## EXPECTED IMPACT

### Time Savings
| Task | Manual | Automated | Savings |
|---|---|---|---|
| Single Collection | 1-2 hours | <3 minutes | 95%+ |
| 4 Collections | 4-8 hours | <15 minutes | 95%+ |
| Field Documentation | 1-2 hours | <5 minutes | 95%+ |
| Validation & QA | 1-2 hours | <5 minutes | 95%+ |

### Quality Improvements
✅ 100% accuracy (no manual typos/mistakes)  
✅ Consistent naming conventions  
✅ Complete multi-language support  
✅ All relationships validated  
✅ Professional documentation  

### Scalability
✅ Works for any product (Hotels, Cruises, Collections, future products)  
✅ Handles product variations seamlessly  
✅ Client modifications processed automatically  
✅ Repeatable, standardized process  

---

## REFERENCE DOCUMENTS

### Source Material
- **DEVGuidance__KONO.pdf**: Directus setup standards
- **Manual_PRIMARIX_2024_EN.pdf**: Primarix system overview
- **BOTG_Brief_DEV_Setup_Hotels_260410.xlsx**: Hotels collection blueprint
- **BOTG_Brief_DEV_Setup_Collections_Karawane.xlsx**: Cruises collection blueprint

### Generated Documentation
- **PROJECT_ANALYSIS.md**: Complete project context & analysis
- **SKILL_AGENT_PROMPT.md**: Detailed specifications for skill/agent creation
- **ARCHITECTURE_PLAN.md**: This document

---

## KEY SUCCESS FACTORS

1. **Clear Specifications**: Each skill and agent must have precise responsibilities
2. **Robust Error Handling**: Gracefully handle edge cases, client modifications
3. **User Interactions**: Ask for decisions when needed (client changes, uncertain data)
4. **Validation Throughout**: Verify at each step, comprehensive QA at end
5. **Professional Documentation**: Auto-generated, client-ready output
6. **Team Adoption**: Clear process, training, ongoing support

---

## NEXT STEPS

### Immediate (This Session)
✅ Analyze all source documents  
✅ Create PROJECT_ANALYSIS.md  
✅ Create SKILL_AGENT_PROMPT.md  
✅ Create ARCHITECTURE_PLAN.md  

### Short-term (Next 24 hours)
⬜ Create 7 skill .md files (foundation knowledge)  
⬜ Create 7 agent instruction .md files (specifications)  
⬜ Review and refine with team  

### Medium-term (1-2 weeks)
⬜ Implement agents in code  
⬜ Test with Hotels collection  
⬜ Test with Cruises collection  
⬜ Validate against QA criteria  

### Long-term (2-4 weeks)
⬜ Production deployment  
⬜ Client acceptance testing  
⬜ Team training  
⬜ Ongoing optimization  

---

## QUESTIONS TO ADDRESS

### For Clarification with Client
1. Geographies logic: Current status? Timeline?
2. NEW fields (booking_partner, bord_languages, etc.): Approved for all products?
3. Custom field types (repeater with builder): Detailed specification?
4. Translation workflow: Approval process for 3 languages?
5. Data import: Timeline? Primarix API availability?

### For Team Alignment
1. Directus API access: Connection details, rate limits, authentication?
2. Testing environment: Separate Directus instance for validation?
3. Deployment process: Manual review? Automated checks?
4. Documentation standards: Company templates? Approval process?
5. Support model: Who handles agent failures? Escalation process?

---

## CONCLUSION

This automation system transforms the BOTG migration from a **manual, error-prone, time-consuming process** into a **fast, accurate, repeatable workflow** that saves 95%+ of implementation time while improving quality and consistency.

The system is **extensible** (works for any new products), **flexible** (handles client modifications), and **professional** (auto-generates comprehensive documentation).

Ready to proceed with skill & agent specification development.

