# Camper Product — Complete Directus Schema Mapping

> **Reference:** Hotels collection pattern  
> **Source:** Primarix SQL dump `camper_*` tables (decoded via `camper_mapping`)  
> **Languages:** `de-DE` · `en-GB` · `nl-NL`  
> **Last updated:** 2026-06-18

---

## Overview

The Camper product represents **rental companies** (not individual trips), each with vehicle categories, depots, pricing, and conditions. It is structurally similar to Hotels but with these key differences:

| Aspect | Hotels | **Campers** |
|---|---|---|
| Core entity | Hotel location | Rental company |
| "Product units" | Room categories | Vehicle categories |
| Price dimensions | Room × Date period | Vehicle × Date period × Rental period |
| Locations | 1 address | Multiple depot locations (O2M) |
| Unique section | — | Rental Conditions (driver, insurance, etc.) |
| Specials | JSON list | JSON list + Flex table |

---

## Collection Architecture

```
campers  (main)
├── campers_translations               ← descriptions (teaser, text_positive, text_negative)
├── campers_price_infos_translations   ← price info texts
├── campers_conditions_translations    ← rental conditions texts (14 fields)
├── campers_image_badge_translations   ← image badge texts
├── camper_vehicle_categories          ← O2M: vehicle types (= hotel room_categories)
│     └── camper_vehicle_categories_translations
├── camper_price_periods_list          ← O2M: date ranges for pricing
├── camper_rental_periods_list         ← O2M: min/max rental days
├── camper_seasons_list                ← O2M: season labels + date ranges
├── camper_surcharges                  ← O2M: surcharge items
│     └── camper_surcharges_translations
├── camper_depots                      ← O2M: pickup/dropoff depots
├── campers_partner                    ← M2M junction: campers ↔ partner
└── campers_directus_files             ← M2M junction: campers ↔ directus_files
```

---

## Tab Structure (Inspired by Hotels)

```
camper_tabs  (group-tabs)
├── master_data_group      → "Stammdaten"       / "Master Data"          / "Stamgegevens"
├── descriptons_group      → "Beschreibung"     / "Description"          / "Beschrijving"
├── price_infos_group      → "Preis-Infos"      / "Price Information"    / "Prijsinformatie"
├── conditions_group       → "Mietbedingungen"  / "Rental Conditions"    / "Huurvoorwaarden"
├── price_basic_group      → "Preisgrundlagen"  / "Calculation Basics"   / "Prijsgrondslagen"
├── prices_group           → "Preis-Kalkulator" / "Price Calculator"     / "Prijscalculator"
├── offers_group           → "Angebote"         / "Specials"             / "Aanbiedingen"
├── surcharges_group       → "Zuschläge"        / "Surcharges"           / "Toeslagen"
├── depots_group           → "Mietstationen"    / "Depots"               / "Verhuurdepots"
├── image_badge_group      → "Bild Hinweis"     / "Image Badge"          / "Afbeelding badge"
└── media_group            → "Medien"           / "Media"                / "Media"
```

---

## Main Collection: `campers`

### System Fields (hidden)

| Field | Type | Interface | Note |
|---|---|---|---|
| `id` | uuid | input | Primary key |
| `sort` | integer | input | Sort order |
| `user_created` | uuid | select-dropdown-m2o → directus_users | Hidden |
| `date_created` | timestamp | datetime | Hidden |
| `user_updated` | uuid | select-dropdown-m2o → directus_users | Hidden |
| `date_updated` | timestamp | datetime | Hidden |

---

### Tab: Master Data (`master_data_group`)

#### Group: Name & Publication (`default_group` → inside accordion)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `object_id` | integer | input | Objekt-ID | Object-ID | Object-ID | `oid` |
| `object_info_primarix` | string | input | Objekt Titel Primarix | Object Title Primarix | Objecttitel Primarix | `objectinfo` |
| `status_primarix` | string | select-dropdown | Status Primarix | Status Primarix | Status Primarix | `freigabe` |
| `season` | integer | select-dropdown-m2o → **seasons** | Saison-Gültigkeit | Season Validity | Seizoengeldigheid | — |
| `date_updated` | timestamp | datetime | Zuletzt aktualisiert | Last Update | Laatste update | `lastupdate` |
| `user_updated` | uuid | select-dropdown-m2o | von | by | door | — |
| `internal_remarks` | text | input-multiline | Interne Hinweise | Internal Remarks | Interne opmerking | `field_1330_1` |

#### Group: Partner Filter (`partner_group`)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `partner_type` | string | select-radio | — (no label) | — | — | — |
| `partner` | alias M2M | list-m2m → **partner** | — (no label) | — | — | `field_1105_1` |

#### Group: Address / Master Data (`master_data`)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `name` | string | input | Name (Firma) | Company Name | Naam (bedrijf) | `field_268_1` |
| `street` | string | input | Straße | Street | Straat | `field_269_1` |
| `street_number` | string | input | Hausnummer | Street Number | Huisnummer | `field_270_1` |
| `zip_code` | string | input | PLZ | Postal Code | Postcode | `field_272_1` |
| `place` | integer | cascading-individual-select → **places** | Ort | City/Town | Stad | `field_274_1` |
| `location_tour32` | integer | cascading-individual-select → **locations_tour32** | Suchort Tour User | Search Location (Tour User) | Suchort Tour User | `field_1343_1` |
| `state` | integer | cascading-individual-select → **states** | Bundesland | Province | Staat | `field_275_1` |
| `country` | integer | cascading-individual-select → **countries** | Land | Country | Land | `field_276_1` |
| `phone_general` | string | input | Telefon (allgemein) | Phone (General) | Telefoon (algemeen) | `field_277_1` |
| `phone_ah` | string | input | Telefon (after hours) | Phone (after hours) | Telefoon (na kantooruren) | `field_386_1` |
| `email_general` | string | input | Email (allgemein) | E-mail (General) | Email (algemeen) | `field_279_1` |
| `website` | string | input | Webseite | Web Site | Homepage | `field_280_1` |

#### Group: Reservation (`reservation_group`)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `booking_partner` | string | select-radio | — | — | — | — |
| `booking` | uuid | select-dropdown-m2o → **booking_details** | Buchung | Booking via | Boeken | `field_974_1` |
| `res_phone` | string | input | Telefon (Reservierung) | Phone (Reservation) | Telefoon (Reservering) | `field_296_1` |
| `res_email` | string | input | Email (Reservierung) | E-mail (Reservation) | Email (Reservering) | `field_298_1` |
| `id_tour_user` | string | input | — | Service Provider (Tour32 only) | — | — |
| `haupt_id_tour_user` | string | input | — | Main Service Provider (Tour32 only) | — | — |
| `booking_info` | text | input-multiline | Zusätzliche Reservierungsinfos | Internal Reservation Infos / Remarks | Extra reserveringsinfo | `field_393_1` |

---

### Tab: Description (`descriptons_group`)

> Translatable content stored in **`campers_translations`**

**Alias field in `campers`:** `translations` (interface: `ai-translations`, special: `translations`)

Translation fields in `campers_translations`:

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `teaser` | text | input-multiline | Einleitungstext | Introductory Text | Inleiding | `field_388_1` |
| `text_positive` | text | input-multiline | Auf einen Blick POSITIV | At a Glance POSITIVE | In een oogopslag POSITIEF | `field_389_1` |
| `text_negative` | text | input-multiline | Auf einen Blick NEGATIV | At a Glance NEGATIVE | In een oogopslag NEGATIEF | `field_798_1` |
| `description_supplementary` | json (list) | list (repeater) | Ergänzende Beschreibungen | Supplementary Descriptions | Aanvullende beschrijvingen | `field_1274–1277_1` |

> `description_supplementary` repeater fields: `headline` (text) + `text` (text)

---

### Tab: Price Information (`price_infos_group`)

> Translatable content stored in **`campers_price_infos_translations`**

**Alias field in `campers`:** `price_infos_translations` (interface: `ai-translations`, special: `translations`)

Translation fields in `campers_price_infos_translations`:

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `services_included` | text | input-multiline | Leistungen | Included Services | Inclusief | `field_304_1` |
| `services_not_included` | text | input-multiline | Nicht eingeschlossen | Services not Included | Exclusief | `field_305_1` |
| `additional_bookable` | text | input-multiline | Zusätzlich buchbar | Additionally Bookable | Extra te boeken | `field_306_1` |
| `deviating_cancelation_terms` | text | input-multiline | Stornobedingungen | Deviating Cancellation Conditions | Annuleringsvoorwaarden | `field_390_1` |
| `note` | text | input-multiline | Hinweis | Remark | Opmerking | `field_307_1` |
| `mobility_advice_text` | text | input-multiline | Mobilitätshinweis | Mobility Advice | Mobiliteitsadvies | `field_1531_1` |

---

### Tab: Rental Conditions (`conditions_group`)

> Non-translatable fields stored in **`campers`**; translatable text stored in **`campers_conditions_translations`**

**Alias field in `campers`:** `conditions_translations` (interface: `ai-translations`, special: `translations`)

#### Non-translatable fields in `campers`:

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `minimum_rental_days` | integer | input | Mindestmietdauer (Zahl) | Minimum Rental Period (Number) | Minimum huur (getal) | `field_1064_1` |
| `price_type` | string | select-dropdown | Preisart | Price Type | Type prijs | `field_1066_1` |
| `camper_calculation_day` | string | input | Berechnungsvorgabe Tag | Calculation Guideline Day | Uitleg calculatie Dag | `field_1333_1` |
| `camper_calculation_season` | string | input | Berechnungsvorgabe Saison | Calculation Guideline Season | Uitleg calculatie Seizoen | `field_1336_1` |

#### Translation fields in `campers_conditions_translations`:

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `cond_driver` | text | input-multiline | Fahrer | Drivers | Bestuurder | `field_308_1` |
| `cond_licence` | text | input-multiline | Führerschein | Driving Licence | Rijbewijs | `field_800_1` |
| `cond_minimum_rental` | text | input-multiline | Mindestmietdauer | Minimum Rental Period | Minimum huurperiode | `field_309_1` |
| `cond_calculation` | text | input-multiline | Mietpreisberechnung | Rental Price Calculation | Berekening huurprijs | `field_310_1` |
| `cond_oneway` | text | input-multiline | Einwegmieten | One-way Rentals | One way rentals | `field_311_1` |
| `cond_cumulate` | text | input-multiline | Mehrfachmieten | Multiple Rentals | Gecumuleerde huur | `field_420_1` |
| `cond_restricted_area` | text | input-multiline | Fahrtgebiete | Permitted Roads | Rijgebieden | `field_313_1` |
| `cond_border_crossing` | text | input-multiline | Grenzüberschreitungen | Border Crossings | Grensoverschrijdingen | `field_1422_1` |
| `cond_insurance` | text | input-multiline | Versicherung | Insurance | Verzekering | `field_421_1` |
| `cond_additional_insurance` | text | input-multiline | Zusatzversicherung | Additional Insurance | Bijkomende verzekering | `field_314_1` |
| `cond_allinclusive` | text | input-multiline | All Inclusive–Paket | All Inclusive Package | All Inclusive pakket | `field_1207_1` |
| `cond_not_covered_insurance` | text | input-multiline | Nicht versichert sind | Not Covered by Insurance | Er is geen verzekeringsdekking bij | `field_1423_1` |
| `cond_bond` | text | input-multiline | Kaution | Bond / Security Deposit | Waarborg | `field_422_1` |
| `cond_towaway` | text | input-multiline | Abschleppkosten | Towing Costs | Sleepkosten | `field_315_1` |

---

### Tab: Calculation Basics (`price_basic_group`)

**Alias field:** `accordion_price_basics` (group-detail) — "Price Basics"

#### Vehicle Categories (O2M)

**Alias field in `campers`:** `vehicle_categories` (interface: `list-o2m` → `camper_vehicle_categories`)

#### Price Periods (O2M)

**Alias field in `campers`:** `price_periods` (interface: `list-o2m` → `camper_price_periods_list`)

#### Rental Periods (O2M)

**Alias field in `campers`:** `rental_periods` (interface: `list-o2m` → `camper_rental_periods_list`)

#### Seasons (O2M)

**Alias field in `campers`:** `camper_seasons` (interface: `list-o2m` → `camper_seasons_list`)

---

### Tab: Price Calculator (`prices_group`)

> To be implemented later (complex price matrix: vehicle × date period × rental period)

**Alias field in `campers`:** `camper_prices` (translations interface → `camper_prices_translations`)

---

### Tab: Specials (`offers_group`)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `camper_specials` | json | list (repeater) | Angebote / Specials | Specials | Aanbiedingen | `field_391_1` |
| `flex_head` | text | input-multiline | Flexüberschrift | Flex Heading | Flextitel | `field_870_1` |
| `flex_explanation` | text | input-multiline | Flexpreis Erklärung | Flex Price Explanation | Flexprijs uitleg | `field_913_1` |
| `flex_table` | text | input-multiline | Flextabelle | Flex Table | Flextabel | `field_830_1` |
| `flex_prices_supplier_code` | string | input | Supplier Code | Supplier Code | Supplier Code | `field_1367_1` |
| `price_sample_camper` | text | input-multiline | Preisbeispiel | Price Example | Prijsvoorbeeld | `field_1436_1` |
| `price_sample_1_date_from` | date | datetime | Preisbeispiel 1 Datum von | Price Example 1 Date from | Prijsvoorbeeld 1 datum van | `field_1437_1` |
| `price_sample_1_date_to` | date | datetime | Preisbeispiel 1 Datum bis | Price Example 1 Date to | Prijsvoorbeeld 1 datum tot | `field_1437_2` |
| `price_sample_2_date_from` | date | datetime | Preisbeispiel 2 Datum von | Price Example 2 Date from | Prijsvoorbeeld 2 datum van | `field_1446_1` |
| `price_sample_2_date_to` | date | datetime | Preisbeispiel 2 Datum bis | Price Example 2 Date to | Prijsvoorbeeld 2 datum tot | `field_1446_2` |
| `price_sample_footnote` | text | input-multiline | Preisbeispiel Fusstext | Price Example Footnote | Prijsvoorbeeld voetnoot | `field_1438_1` |

---

### Tab: Surcharges (`surcharges_group`)

**Alias field in `campers`:** `surcharges` (interface: `list-o2m` → `camper_surcharges`)

---

### Tab: Depots (`depots_group`)

**Alias field in `campers`:** `depots` (interface: `list-o2m` → `camper_depots`)

---

### Tab: Image Badge (`image_badge_group`)

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `image_badge_start_date` | date | datetime | Startdatum | Start Date | Startdatum | `field_1509_1` |
| `image_badge_end_date` | date | datetime | Enddatum | End Date | Einddatum | `field_1509_2` |
| `image_badge_status` | string | select-dropdown | Status | Status | Status | `field_1492_1` |
| `image_badge_translations` (alias) | translations | translations | — | — | — | — |

Translation fields in `campers_image_badge_translations`:

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `image_badge_teaser` | text | input | Feld 1 Teaser | Text Overview Pages | Tekst overzichtspagina's | `field_1491_1` |
| `image_badge_details` | text | input-multiline | Feld 2 Detailseite | Text Detail Page | Tekst detailpagina | `field_1493_1` |

---

### Tab: Media (`media_group`)

**Alias field in `campers`:** `media` (interface: `media-uploader`, M2M → `directus_files` via `campers_directus_files`)

---

## Sub-Collection: `camper_vehicle_categories`

> Equivalent of `room_categories` in Hotels  
> Source: Primarix `camper_vehicle` + `camper_vehicles`

### Non-translatable fields

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | uuid | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper Rental Company | Camperverhuurder | `parentid` |
| `headline` | string | input | Headline | Headline | Headline | `field_259_1` |
| `subline` | string | input | Subline | Sub-line | Subline | `field_260_1` |
| `number_persons_max` | integer | input | Anzahl Personen maximal | Max. Number of Persons | Max. personen | `field_1053_1` |
| `camping_equipment` | text | input-multiline | Campingausstattung | Camping Equipment | Campinguitrusting | `field_1454_1` |
| `mode_of_drive` | string | select-dropdown | Antriebsart | Type of Drive | Aandrijving | `field_1054_1` |
| `depots_available` | text | input-multiline | Verfügbar an folgenden Stationen | Available at Following Depots | Beschikbaar bij depots | `field_1068_1` |
| `supplier_product_code` | string | input | Supplier Buchungscode | Supplier Booking Code | Supplier Boekingscode | `field_877_1` |
| `url_alias` | string | input | URL Alias | URL Alias | URL Alias | `field_1460_1` |
| `px_source_id` | integer | input | — | — | — | `oid` |

### Translation fields in `camper_vehicle_categories_translations`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `text_introduction` | text | input-multiline | Einleitungstext | Introductory Text | Inleiding | `field_261_1` |
| `description` | text | input-multiline | Fahrzeugbeschreibung | Vehicle Description | Beschrijving voertuig | `field_262_1` |
| `bedsize` | text | input-multiline | Bettenmaße | Bed Size | Bedden | `field_263_1` |
| `equipment` | text | input-multiline | Fahrzeugausstattung | Vehicle Equipment | Voertuiguitrusting | `field_264_1` |
| `note` | text | input-multiline | Hinweis | Remark | Opmerking | `field_266_1` |

---

## Sub-Collection: `camper_price_periods_list`

> Source: Primarix `camper_price_periods`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | integer | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper | Camperverhuurder | `parentid` |
| `price_period_start` | date | datetime | Preiszeit von | Price Period From | Prijsperiode van | `field_392_1` |
| `price_period_end` | date | datetime | Preiszeit bis | Price Period To | Prijsperiode tot | `field_392_2` |
| `price_start` | boolean | boolean | Ab-Preis | From Price | Vanaf prijs | — |

---

## Sub-Collection: `camper_rental_periods_list`

> Source: Primarix `camper_rental_period` + `camper_period`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | integer | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper | Camperverhuurder | `parentid` |
| `min_days` | integer | input | Minimum (Tage) | Minimum (days) | Minimum (dagen) | `field_423_1` |
| `max_days` | integer | input | Maximum (Tage) | Maximum (days) | Maximum (dagen) | `field_424_1` |

---

## Sub-Collection: `camper_seasons_list`

> Source: Primarix `camper_seasons`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | integer | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper | Camperverhuurder | `parentid` |
| `season` | integer | select-dropdown-m2o → **seasons** | Saison | Season | Seizoen | `field_1206_1` |
| `season_start` | date | datetime | Saison von | Season From | Seizoen van | `field_392_1` |
| `season_end` | date | datetime | Saison bis | Season To | Seizoen tot | `field_392_2` |

---

## Sub-Collection: `camper_surcharges`

> Source: Primarix `camper_surcharges`

### Non-translatable fields

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | integer | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper | Camperverhuurder | `parentid` |
| `title_booking_name` | string | input | Bezeichnung (original/booking code) | Original / Booking Name | Originele / boekingsnaam | `field_1475_1` |
| `mandatory_optional` | string | select-dropdown | Obligatorisch–Optional | Mandatory–Optional | Verplicht–Optioneel | `field_1392_1` |
| `surcharge_calc_type` | string | select-dropdown | Berechnungsart | Calculation Method (IT) | Berekeningswijze | `field_1448_1` |

### Translation fields in `camper_surcharges_translations`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `description` | text | input-multiline | Beschreibung (Katalogtext) | Description (Catalogue Text) | Beschrijving (Brochuretekst) | `field_971_1` |

---

## Sub-Collection: `camper_depots`

> Source: Primarix `camper_depots`

| Field | Type | Interface | de-DE | en-GB | nl-NL | PX Source |
|---|---|---|---|---|---|---|
| `id` | integer | input | — | — | — | PK |
| `sort` | integer | input | — | — | — | `sort` |
| `campers_id` | uuid | select-dropdown-m2o → campers | Wohnmobil-Vermieter | Camper | Camperverhuurder | `parentid` |
| `name` | string | input | Name (Depot) | Name (Depot) | Name (Depot) | `field_409_1` |
| `street` | string | input | Straße | Street | Straat | `field_410_1` |
| `street_number` | string | input | Hausnummer | Street Number | Huisnummer | `field_411_1` |
| `zip_code` | string | input | PLZ | Postal Code | Postcode | `field_412_1` |
| `town` | integer | cascading-individual-select → **places** | Ort | City/Town | Stad | `field_413_1` |
| `state` | integer | cascading-individual-select → **states** | Bundesland | Province | Staat | `field_414_1` |
| `country` | integer | cascading-individual-select → **countries** | Land | Country | Land | `field_415_1` |
| `phone` | string | input | Telefon (allgemein) | Phone (General) | Telefoon (algemeen) | `field_416_1` |
| `fax` | string | input | Fax (allgemein) | Fax (General) | Fax (algemeen) | `field_417_1` |
| `email` | string | input | E-mail (allgemein) | E-mail (General) | Emailadres (algemeen) | `field_418_1` |
| `depot_surcharge` | text | input-multiline | Depot-Zuschlag | Depot Surcharge | Depottoeslag | `field_1091_1` |
| `office_hours` | text | input-multiline | Öffnungszeiten | Opening Times | Openingstijden | `field_1403_1` |
| `px_source_id` | integer | input | — | — | — | `oid` |

---

## Fields NOT Imported (Primarix-only)

| Primarix Field | UID | Reason |
|---|---|---|
| `field_271_1`, `field_273_1`, `field_385_1` | PO Box number/zip/town | Legacy — not used |
| `field_278_1` | fax_general | Fax removed (matches other products) |
| `field_394_1` – `field_408_1` | bank_* (12 fields) | Bank data — not in CMS |
| `field_667_1` | colour (Farbwahl) | Primarix UI only |
| `field_805_1` | brox_category (Rubrik) | Legacy category |
| `field_1461_1` | camper_url_alias | URL managed in Directus separately |
| `field_1460_1` | vehicle url_alias | Mapped to `url_alias` field in vehicle_categories |
| `camper_price_options` (500K rows) | — | Computed matrix — not directly imported |
| `camper_mapping` table | — | Metadata only |
| `camper_options` table | `field_1150_1` | Options merged into vehicle_categories |
| `field_299_1`, `field_300_1`–`field_303_1` | res_email_2, contact details | Not imported (matches hotels pattern) |
| `field_1282_1`–`field_1287_1` | Extra headline/text 1–3 sets | Covered by `description_supplementary` repeater |
| `field_1278_1`–`field_1281_1` | PKT headline/text | Covered by `description_supplementary` repeater |

---

## Relations Map

| From | Field | Type | To |
|---|---|---|---|
| `campers` | `season` | M2O | `seasons` |
| `campers` | `partner` | M2M | `partner` (via `campers_partner`) |
| `campers` | `place` | M2O | `places` |
| `campers` | `location_tour32` | M2O | `locations_tour32` |
| `campers` | `state` | M2O | `states` |
| `campers` | `country` | M2O | `countries` |
| `campers` | `booking` | M2O | `booking_details` |
| `campers` | `vehicle_categories` | O2M | `camper_vehicle_categories` |
| `campers` | `price_periods` | O2M | `camper_price_periods_list` |
| `campers` | `rental_periods` | O2M | `camper_rental_periods_list` |
| `campers` | `camper_seasons` | O2M | `camper_seasons_list` |
| `campers` | `surcharges` | O2M | `camper_surcharges` |
| `campers` | `depots` | O2M | `camper_depots` |
| `campers` | `media` | M2M | `directus_files` (via `campers_directus_files`) |
| `campers` | `translations` | Translations | `campers_translations` (languages via `translations`) |
| `campers` | `price_infos_translations` | Translations | `campers_price_infos_translations` |
| `campers` | `conditions_translations` | Translations | `campers_conditions_translations` |
| `campers` | `image_badge_translations` | Translations | `campers_image_badge_translations` |
| `camper_vehicle_categories` | `translations` | Translations | `camper_vehicle_categories_translations` |
| `camper_surcharges` | `translations` | Translations | `camper_surcharges_translations` |
| `camper_seasons_list` | `season` | M2O | `seasons` |
| `camper_depots` | `town` | M2O | `places` |
| `camper_depots` | `state` | M2O | `states` |
| `camper_depots` | `country` | M2O | `countries` |
