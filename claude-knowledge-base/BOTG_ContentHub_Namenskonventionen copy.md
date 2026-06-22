# BOTG ContentHub – Namenskonventionen für Collections und Felder

Version 1.3 · 18-06-26 · Basis: Schema-Analyse Staging (194 Collections) + Festlegungen aus dem Set-up von `rental_companies` / `rental_depots` / `vehicles` (+ Camper-Sub-Collections)

> Änderungen ggü. v1.2: neue Gliederungsebene **`block_`** (Karten-Block, group-raw ohne Label) in §3; bisherige Regel „Kein Raw-in-Raw / kein Accordion" ersetzt durch „ein `tab_` + 0..n `block_` je Tab"; CSS-Anforderung (block_ rendert die Karte, enthaltene section_ verlieren ihre Karte) und Migrationshinweis (Accordion → `block_`) ergänzt.
> Änderungen ggü. v1.1: Sortier-/Reihenfolgefelder auf `_sort` festgelegt (§4.3, nicht `_rank`).
> Änderungen ggü. v1.0: neuer Abschnitt **5 (Labels / Mehrsprachigkeit)**; neue Abschnitte **4.5 (Datentypen)** und **4.6 (all/selected-Muster)**; präzisiert: §2 C4, §3, §4.3 (conditions, Kontaktkanäle, Repeater, Media); aktualisierte Entscheidungspunkte E1–E3.

## 1. Grundsätze

1. **snake_case, durchgängig klein**, Englisch, keine Umlaute.
2. **Ausgeschrieben statt abgekürzt** – keine Kürzel wie `px`, `ah`, `fk`, `nr`.
3. **Kein Deutsch** in Schlüsseln (auch nicht in Mischformen wie `haupt_id_…`).
4. **Keine Auto-Schlüssel** stehen lassen (`accordion-obvxyf`, `header-8onw1t`): Gruppen und Felder beim Anlegen sofort benennen.
5. Feldschlüssel müssen nur **collection-intern eindeutig** sein – identische Namen über Collections hinweg (z. B. `ui_tabs`, `name`, `prices`) sind ausdrücklich gewollt.
6. Schlüssel werden **vor der echten Datenlast** bereinigt; danach nur noch in Ausnahmefällen und per `schema apply`.

## 2. Collections

| Regel | Konvention | Beispiel |
|---|---|---|
| C1 | Mehrsatz-Collections im **Plural** | `hotels`, `countries`, `hotel_groups`, `rental_companies` |
| C2 | Singletons im Singular | `global_configuration` |
| C3 | Produktspezifische Kind-Tabellen: **Produkt-Präfix im Singular** + Inhalt im Plural | `hotel_prices`, `tour_routes`, `cruise_price_dates` |
| C4 | Junctions (M2M): `a_b`, beide Seiten Plural, alphabetisch a vor b wo keine fachliche Richtung besteht. **Gemeinsames Präfix nicht verdoppeln.** | `hotels_accommodation_types`; `camper_specs_equipment` (nicht `camper_specs_camper_equipment`) |
| C5 | Übersetzungstabellen: Suffix `_translations` (nie `_locale`); mehrere Felder dürfen sich eine Translation-Collection teilen | `hotels_translations`, `vehicles_translations` |
| C6 | Mehrwort-Produkte mit Unterstrich | `round_trips`, `day_trips`, `study_trips` |
| C7 | Quell-/Domänen-Präfixe einheitlich Singular | `erp_hotel_…`, `erp_round_trip_…` (nicht `erp_round_trips_…`) |
| C8 | Folder (Namensräume in der Navigation) ebenfalls snake_case klein; Folder-Key **nie gleich** einem Collection-Key | `global_data`, `hotels_metadata` |

**Verboten:** nummerierte Junction-Duplikate (`…_translations_1`), doppelte Präfixe (`cruises_cruises_…`), generische Namen ohne Kontext (`translations`, `mandatory`), Demo-Reste im Produktivschema.

## 3. Gliederungsfelder (Layout, ohne Daten)

`ui_` für Presentation-Felder und den Tab-Container (`ui_header`, `ui_tabs`), `tab_` für Tab-Klammern (group-raw), `block_` für Karten-Blöcke (group-raw, ohne Label), `section_` für Abschnitte (group-detail).

**Struktur (Pflicht-Verschachtelung):** `ui_tabs > tab_* (group-raw) > [block_* (group-raw, optional)] > section_* (group-detail) > Felder`. Genau **ein** `tab_` pro Tab; darin **0..n** `block_`. Keine verschachtelten `section_`, keine verschachtelten Details, kein Accordion – die Karten-Bündelung übernimmt jetzt `block_`. Die Hierarchie ergibt sich im Brief aus Spalte A (Tab-Navigation / Tab / Section / leer = Feld) + key-Präfix + Zeilenreihenfolge.

**`block_` – Karten-Block (neu):** technisch dieselbe group-raw wie `tab_`, hierarchisch eine Ebene tiefer. Bündelt **mehrere** `section_` auf **eine** weiße Karte und grenzt sie vom nächsten Block ab.
- `block_` nur bei **≥ 2** zu bündelnden `section_`. Eine allein stehende `section_` liegt direkt unter `tab_` (kein leeres `block_`, sonst Karte-in-Karte bzw. leere Hülse).
- `block_` trägt **kein Label** – die sichtbaren Überschriften kommen ausschließlich von den enthaltenen `section_` (analog zu `tab_`, das ebenfalls kein eigenes Label rendert).
- **CSS-Anforderung:** `block_` rendert die weiße Karte, die enthaltenen `section_` verlieren ihre eigene Karte (sonst Karte-in-Karte; analog zur bestehenden Ausnahme „Raw-Gruppe innerhalb eines Accordions verliert ihre Karte"). Eine `section_` direkt unter `tab_` behält ihre Karte.

**Kanonische keys** (gleich über alle Produkte, da nur collection-intern eindeutig):
- Erster Tab `tab_master_data`; erste Section darin `section_publication` (Status & Publication).
- Weitere Beispiele: `section_address`, `section_descriptions`, `tab_description`, `tab_calculator_inputs`, `tab_prices`, `tab_media`, `section_images`; Karten-Block z. B. `block_identity`.
- Bei doppeldeutigen Wiederholungen kontextualisieren: `section_price_units` vs. `section_surcharge_units`.

Flache Lookup-/Junction-Collections (z. B. `camper_equipment`, `camper_specs_equipment`) dürfen ohne Tab-Layout auskommen – eine einzelne `section_*` genügt.

**Migration (Ist → Soll):** automatisch benannte Accordion-Gruppen (`accordion-obvxyf`, `accordion-cob52j`) übernehmen bereits die `block_`-Funktion und werden zu `block_*` umbenannt; uneinheitliche Tab-Klammern (`master_data_group`, `reservation_main_group`) werden zu `tab_*`. Die key-Zuordnung ist vor der Umbenennung im Team zu verifizieren.

## 4. Datenfelder

### 4.1 Produktname im Feldnamen

**Grundsatz: nein.** Der Feldname beschreibt die Rolle des Werts; den Kontext liefert die Collection. Innerhalb von `vehicles` heißt es `title`/`name`, `equipment`, `category` – nicht `vehicle_title`. Innerhalb von `rental_depots` `street`, `zip_code` – nicht `depot_street`.

**Zwei Ausnahmen:**
- M2O-Felder, deren Rolle die referenzierte Entität selbst ist: Feldname = Singular der Ziel-Collection (`rental_company`, `hotel_group`).
- Felder, die auf ein **anderes** Produkt verweisen (dann ist das Produkt der notwendige Kontext).

### 4.2 Singular / Plural – die Kardinalität entscheidet

| Fall | Regel | Beispiel |
|---|---|---|
| M2O (genau eine Referenz) | **Singular** | `country`, `season`, `rental_company` |
| O2M / M2M / Files / Repeater (Liste) | **Plural** | `surcharges`, `depots_selected`, `media` |
| Skalar | Singular | `name`, `street`, `zip_code` |

### 4.3 Typ- und Themen-Suffixe

| Thema | Konvention | Beispiel |
|---|---|---|
| Zeitstempel | Suffix `_at` | `sell_prices_updated_at` |
| Reines Datum | Suffix `_date` | `image_badge_start_date` |
| Status/Enum | Suffix `_status` | `image_badge_status` |
| Sortierung / Reihenfolge | Suffix `_sort` (Directus-Standard-Sortierfeld; **nicht** `_rank`) – `_rank` nur bei echter fachlicher Wertung | `price_period_sort`, `rental_period_sort`, `media_sort` |
| Boolean | Präfix `is_` / `has_` / `use_` | `is_map`, `has_multi_rental_discount`, `use_tour32` |
| Quellsystem-Bezug | Quelle ausgeschrieben als Suffix | `status_primarix`, `location_tour32`, `source_id_primarix` |
| Übersetzungen | Standardfeld `translations`; themenspezifisch `<thema>_translations` ohne Produkt-Präfix | `price_infos_translations` |
| **Mietbedingungen** | Themen-Familie `conditions_*`; `terms` bleibt zulässig, wo vertraglich passend | `conditions_driver`, `conditions_calculation`, `conditions_oneway`; `deviating_cancellation_terms` |
| **Kontaktkanäle** | Basisname ohne Qualifier, solange collection-intern eindeutig; bei **mehreren** Kanälen desselben Typs **alle** mit Suffix qualifizieren (Kanal first) | `email` (einzeln); `email_general` + `email_booking`, `phone_general` + `phone_after_hours` |
| **Media-Block** | Präfix `media_*` für Block-Felder; Flags als `is_`/`use_` | `media_filename_fotoweb`, `media_copyright`, `is_map`, `use_tour32` |
| **Repeater-Sub-Felder** | lokale keys aus dem Label (nie `-`); leben in den repeater-options | `headline`, `text` |
| FK-Felder in Junctions | `<ziel_collection>_id` (Directus-Default) | `camper_specs_id`, `camper_equipment_id` |

### 4.4 Identifikatoren

`object_id` ist die fachliche Objekt-ID des ContentHub (gesetzt aus Primarix). Weitere Fremd-IDs folgen `<rolle>_id_<quelle>` bzw. `<rolle>_<quelle>`: `main_id_tour_user`, `source_id_primarix`. Kein `id_<quelle>`-Muster mehr.

### 4.5 Datentypen (neu)

| Fall | Typ | Hinweis |
|---|---|---|
| M2O-Fremdschlüssel | **`integer`** durchgängig | passend zu den Integer-PKs der Ziel-Collections |
| Ausnahme `user_updated` | `uuid` | verweist auf `directus_users` (System-Collection) |
| Maße / Abmessungen | `decimal` | `length_m`, `width_m`, `interior_height_m` |
| Zähler / Kapazitäten / Volumina | `integer` | `berths_adults`, `fuel_tank_l`, `persons_max` |
| `status_primarix` | `string` + `dropdown` (kein M2O) | Quelle ist `freigabe` (0/1), keine Referenz-Collection |

### 4.6 „all / selected"-Muster (neu)

Wiederkehrendes Muster für „gilt für alle vs. ausgewählte": ein **Radio** (`all` / `selected`) steuert die Sichtbarkeit einer **conditional M2M-Liste**, deren key das Suffix `_selected` trägt.

- Das Substantiv des Radios richtet sich nach der **Semantik**, nicht nach dem Muster: `partner_visibility` (für wen sichtbar) ≠ `depot_availability` (wo verfügbar).
- Die Auswahl-Liste trägt `_selected`: `partner_selected`, `depots_selected`.
- M2M nur sichtbar, wenn Radio ≠ `all` (conditional).

Standard-Benennung des Partner-Filters (steuert, welchen BOTG-Partnern Zugriff auf das Objekt gewährt wird): **`partner_visibility` / `partner_selected`** (verbindlich; `partner_type`/`partner` daran angleichen).

## 5. Labels / Mehrsprachigkeit (neu)

Labels sind die in der UI sichtbaren, übersetzten Feld-/Gruppenbezeichnungen (Directus `meta.translations`, Sprachen `de-DE` / `en-GB` / `nl-NL`). Sie sind unabhängig vom (englischen, snake_case) Feldschlüssel.

### 5.1 Schreibweise je Sprache

| Sprache | Regel | Beispiel |
|---|---|---|
| **Englisch (en-GB)** | **Title Case** – jedes bedeutungstragende Wort groß | „Street Number", „Rental Company", „Vehicle Category" |
| **Deutsch (de-DE)** | nach Duden – Substantive groß, Rest klein | „Hausnummer", „Vermieter", „Status & Veröffentlichung" |
| **Niederländisch (nl-NL)** | **Sentence case** – nur erstes Wort groß, Substantive klein; Ausnahme Eigennamen | „Huisnummer", „Verhuurder", „Status & publicatie", „Beschikbaar op alle depots" |

Englisches Title Case ins Niederländische zu übertragen („Beschikbaar Op Alle Depots") ist falsch.

### 5.2 Kontext-Suffix

Wo der reine Feldname mehrdeutig wäre, Kontext in Klammern ergänzen – in allen drei Sprachen: „Name (Rental Company)" / „Name (Vermieter)" / „Naam (verhuurder)".

### 5.3 Konsistenz

Gleiche Begriffe werden überall identisch übersetzt – durchgängig „Object-ID", „Status Primarix", „Last Update", „by". Wiederkehrende Struktur-Labels einheitlich über alle Produkte, z. B. erste Section stets „Status & Publication" / „Status & Veröffentlichung" / „Status & publicatie".

## 6. Entscheidungspunkte

| # | Status | Festlegung |
|---|---|---|
| E1 | **überholt** | Statt `rentalcars`/`rental_cars` gilt das neue Modell: `rental_companies` + `rental_depots` + **`vehicles`** (Mietwagen und Camper in einer Collection, diskriminiert über `rental_type`). |
| E2 | **geklärt** | Konflikt `booking` vs. `booking_partner`: **`booking_partner` gewinnt** (Standard). |
| E3 | **offen** | `erp_`/`mp_`-Familien auf Singular-Produkt vereinheitlichen – noch zu klären. |

### Produkt-spezifische Notiz

`rental_period_zone` (Kalkulator-Dimension statt „room_category") gilt **nur in `vehicles`**, nicht global.
