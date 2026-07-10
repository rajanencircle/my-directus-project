# BOTG ContentHub – Namenskonventionen für Collections und Felder

Version 1.8 · 26-06-23 · Basis: Schema-Analyse Staging + Festlegungen aus dem excursions-Schema-Rebuild (Daytrips → Excursions, Kalkulator-Lookups, Operator-Block)

> Änderungen ggü. v1.7: §3 — **Tabs erst ab 2 Tabs**: `ui_tabs`/`tab_*` werden nur definiert, wenn **mehr als ein** Tab existiert (≥ 2). Bei genau einem Tab entfällt die Tab-Ebene; die `section_*` liegen direkt auf oberster Ebene. Verallgemeinert die bisherige flache-Lookup-Ausnahme.
> Änderungen ggü. v1.6: §2 — **Supplementary** auf übersetzbaren **JSON-Repeater in der `_translations`-Tabelle** umgestellt (keine eigene Sub-Collection mehr); §2/§4 — Lookup-/M2O-**Beispiele** von `excursion_categories`/`excursion_category` auf den real existierenden `excursion_price_categories_names`/`price_category` umgestellt (excursion-**Produkt**-Kategorien sind self-contained, kein Lookup).
> Änderungen ggü. v1.5: §2 — **Schnell-Entscheidung Singular/Plural** ergänzt (Kurzregel über C1/C3/C4/C5/C9: Inhaltswort immer Plural, nur das Produkt-Präfix wechselt). **Korrektur** — `_names`-Stammdaten-Lookups sind **Singular** (`excursion_price_categories_names`, `tour_occupancies_names`), nicht Plural.
> Änderungen ggü. v1.4: §2 **C9 (neu)** — Surcharge-Collection-Trio (`<produkt>_surcharges` / `_surcharges_translations` / `_surcharges_calculation_translations`); §2 **C3-Präzisierung** — Stammdaten-Lookup (Produkt-Präfix **Singular**) vs. Per-Produkt-Child (Produkt-Präfix **Plural**), Supplementary-Sub-Collections im **Singular**; §4.5 **Korrektur** — M2O-FK-Typ folgt dem **Ziel-PK** (nicht „integer durchgängig"), uuid-Ziel-Liste s. Build Spec §1.
> Änderungen ggü. v1.3: §1 — Schreibvarianten auf **en-GB** festgelegt (`postcode`/`colour`/`programme`/`catalogue`), Tippfehler-Korrektur kanonisch; §2 C5 — mehrere Translation-Collections werden **themen-qualifiziert** nach Tab-/Section-Label (statt `_translations_1`); §4.1 — primäres Namensfeld verbindlich als **`name_<entity>`**; §4.3 — neuer Suffix **`_from`** (Ab-Preis), **`_sort`** als eingebautes System-Sortierfeld präzisiert (im DEV-Brief nur als Comment); §4.4 — Beispiele aktualisiert (`service_provider_id_tour32`); §4.6 — **Toggle-zeigt-Eingabe**-Muster (`_linked`) und **Kanal-Radio / Partner-M2O** (`_channel`/`_partner`) ergänzt.
> Änderungen ggü. v1.2: neue Gliederungsebene **`block_`** (Karten-Block, group-raw ohne Label) in §3; bisherige Regel „Kein Raw-in-Raw / kein Accordion" ersetzt durch „ein `tab_` + 0..n `block_` je Tab"; CSS-Anforderung und Migrationshinweis (Accordion → `block_`) ergänzt.
> Änderungen ggü. v1.1: Sortier-/Reihenfolgefelder auf `_sort` festgelegt (§4.3, nicht `_rank`).
> Änderungen ggü. v1.0: neuer Abschnitt **5 (Labels / Mehrsprachigkeit)**; neue Abschnitte **4.5 (Datentypen)** und **4.6 (all/selected-Muster)**; präzisiert: §2 C4, §3, §4.3; aktualisierte Entscheidungspunkte E1–E3.

> **Begleitdokumente:** `BOTG_ContentHub_Navigation_EN` (Navigations-Hierarchie) und `BOTG_ContentHub_Schema_Build_Spec_EN` (PK/FK-Typen, Relations-Wahl, Hidden-Standards, Deploy-Prozedur). Diese Konventionen besitzen **Key/Label**, die Build Spec besitzt **Typ/Struktur**.

## 1. Grundsätze

1. **snake_case, durchgängig klein**, Englisch, keine Umlaute.
2. **Ausgeschrieben statt abgekürzt** – keine Kürzel wie `px`, `ah`, `fk`, `nr`.
3. **Kein Deutsch** in Schlüsseln (auch nicht in Mischformen wie `haupt_id_…` oder `touren_…_katalog`).
4. **Keine Auto-Schlüssel** stehen lassen (`accordion-obvxyf`, `header-8onw1t`): Gruppen und Felder beim Anlegen sofort benennen.
5. Feldschlüssel müssen nur **collection-intern eindeutig** sein – identische Namen über Collections hinweg (z. B. `ui_tabs`, `name`, `prices`) sind ausdrücklich gewollt.
6. Schlüssel werden **vor der echten Datenlast** bereinigt; danach nur noch in Ausnahmefällen und per `schema apply`.
7. **Schreibvarianten en-GB** (konsistent mit den Labels, §5): bei britisch/amerikanisch abweichenden Wörtern gilt im Schlüssel die britische Form – `colour`, `programme`, `catalogue`, `postcode` (nicht `color`/`program`/`catalog`/`zip_code`). Tippfehler aus dem Ist-Schema werden auf die kanonische Schreibweise korrigiert: `cancellation`, `accommodation`, `occupancies`, `departures`.

## 2. Collections

| Regel | Konvention | Beispiel |
|---|---|---|
| C1 | Mehrsatz-Collections im **Plural** | `hotels`, `countries`, `hotel_groups`, `rental_companies` |
| C2 | Singletons im Singular | `global_configuration` |
| C3 | Produktspezifische Kind-Tabellen: **Produkt-Präfix im Singular** + Inhalt im Plural | `hotel_prices`, `tour_routes`, `cruise_price_dates` |
| C4 | Junctions (M2M): `a_b`, beide Seiten Plural, alphabetisch a vor b wo keine fachliche Richtung besteht. **Gemeinsames Präfix nicht verdoppeln.** | `hotels_accommodation_types`; `camper_specs_equipment` (nicht `camper_specs_camper_equipment`) |
| C5 | Übersetzungstabellen: Suffix `_translations` (nie `_locale`); mehrere Felder dürfen sich eine Translation-Collection teilen. **Mehrere Translation-Collections je Collection → themen-qualifiziert (s. u.), nie nummeriert.** | `hotels_translations`, `vehicles_translations`, `excursions_description_translations` |
| C6 | Mehrwort-Produkte mit Unterstrich | `round_trips`, `day_trips`, `study_trips` |
| C7 | Quell-/Domänen-Präfixe einheitlich Singular | `erp_hotel_…`, `erp_round_trip_…` (nicht `erp_round_trips_…`) |
| C8 | Folder (Namensräume in der Navigation) ebenfalls snake_case klein; Folder-Key **nie gleich** einem Collection-Key | `global_data`, `hotels_metadata` |
| C9 | **Surcharge-Trio:** Items `<produkt>_surcharges`; Item-Übersetzungen `<produkt>_surcharges_translations`; produktweite Kalkulation `<produkt>_surcharges_calculation_translations`. Trennt Item-Übersetzung von der Calc-Translation (sonst Namenskollision). | `excursions_surcharges` / `…_surcharges_translations` / `…_surcharges_calculation_translations` |

**C5 – Mehrere Translation-Collections pro Collection:** Braucht eine Collection **mehr als eine** Translation-Companion, wird jede **themen-qualifiziert** statt nummeriert: `<produkt>_<thema>_translations`. Das `<thema>` ist das **englische Label des zugehörigen Tabs** (z. B. Tab „Description" → `excursions_description_translations`). Würde **ein Tab mehrere** Translation-Tabellen brauchen (oder kollidiert das Tab-Label mit einer bestehenden Sub-Collection-Translation), wird stattdessen das **englische Label der zugehörigen Section** verwendet. **Nie** `…_translations_1`.

> Abgrenzung zu §4.3: Das genannte `<thema>` betrifft den **Collection-Namen** (mit Produkt-Präfix). Das themenspezifische **Feld-Alias** innerhalb einer Collection trägt **kein** Produkt-Präfix (`price_infos_translations` als Feld).

**Stammdaten-Lookup vs. Per-Produkt-Child (Präzisierung zu C3):** Bei gleichnamigem Inhalt unterscheidet die Produkt-Präfix-Form die Rolle:
- **Stammdaten-Lookup** (geteilt, eigene Pflege): Produkt-Präfix **Singular** — `excursion_price_categories_names`.
- **Per-Produkt-Child** (Repeater am Produkt): Produkt-Präfix **Plural** — `excursions_price_categories`.
- **M2O-Feld** auf den Lookup: **Singular** der Ziel-Collection — `price_category` (s. §4.1).

> *Hinweis:* Nicht jede Liste braucht einen Lookup. Excursion-**Produkt-Kategorien** sind bewusst **self-contained** (`excursions_categories` mit freiem Lieferantentext, kein Lookup); ein geteilter Lookup lohnt nur bei kontrollierten, mehrfach genutzten Namenslisten (Preis-Kategorie-Namen, Belegungs-Namen).

**Schnell-Entscheidung Singular/Plural (Kurzregel zu C1/C3/C4/C5/C9):** Das **Inhaltswort bleibt immer Plural** (`dates`, `categories`, `surcharges`); es wechselt nur das **Produkt-Präfix** davor.

| Was ist es? | Präfix | Beispiel |
|---|---|---|
| Das Produkt selbst (oberste Ebene) | *kein Präfix*, Plural | `hotels`, `excursions`, `tours`, `countries` |
| Liste, die zu **einem** Produkt gehört (Repeater/Child, inkl. `_translations` & Surcharges) | **Plural** | `excursions_surcharges`, `tours_occupancies`, `excursions_price_categories`, `excursions_description_translations` |
| **Geteilte** Stammdaten-Liste (ein Lookup, mehrfach genutzt) | **Singular** | `excursion_price_categories_names`, `tour_occupancies_names` |
| **M2O-Feld** auf so einen Lookup | **Singular + Einzahl** | `price_category`, `tour_date` |
| **M2M-Junction** (verbindet zwei Listen) | **beide Seiten Plural**, `liste_a_liste_b` | `hotels_accommodation_types`, `camper_specs_equipment` |

> **Die eine Frage:** Gehört die Liste zu genau **einem** Produkt → **Plural**-Präfix. Ist es eine **zentrale, geteilte** Liste → **Singular**-Präfix. Ein **einzelner Verweis** → M2O-Feld (Singular). **Viele-zu-viele** zwischen zwei eigenständigen Listen → M2M-Junction (beide Plural, s. C4).

> *Offener Punkt:* Reine Daten-Kind-Tabellen ohne Lookup-/Repeater-Charakter führt C3 noch im **Singular** (`hotel_prices`, `tour_routes`, `cruise_price_dates`) — der einzige verbleibende Präfix-Widerspruch in dieser MD; separat zu klären.

**Supplementary (übersetzbarer JSON-Repeater, keine Sub-Collection):** Frei wiederholbare Headline/Text-Blöcke werden **nicht** als eigene O2M-Collection modelliert, sondern als **JSON-Repeater-Spalte in der jeweiligen `_translations`-Tabelle**: `description_supplementary` → `<produkt>_description_translations`, `price_info_supplementary` → `<produkt>_price_info_translations` — eine JSON-Zeile je Sprache, Felder `headline`/`text`. Spart die separaten Supplementary-Sub-Collections (Trade-off s. Build Spec §3).

**Verboten:** nummerierte Junction-Duplikate (`…_translations_1`), doppelte Präfixe (`cruises_cruises_…`), generische Namen ohne Kontext (`translations`, `mandatory`), Demo-Reste im Produktivschema.

## 3. Gliederungsfelder (Layout, ohne Daten)

`ui_` für Presentation-Felder und den Tab-Container (`ui_header`, `ui_tabs`), `tab_` für Tab-Klammern (group-raw), `block_` für Karten-Blöcke (group-raw, ohne Label), `section_` für Abschnitte (group-detail).

**Struktur (Soll-Verschachtelung, ab 2 Tabs):** `ui_tabs > tab_* (group-raw) > [block_* (group-raw, optional)] > section_* (group-detail) > Felder`. Genau **ein** `tab_` pro Tab; darin **0..n** `block_`. Keine verschachtelten `section_`, keine verschachtelten Details, kein Accordion – die Karten-Bündelung übernimmt jetzt `block_`. Die Hierarchie ergibt sich im Brief aus Spalte A (Tab-Navigation / Tab / Block / Section / leer = Feld) + key-Präfix + Zeilenreihenfolge.

**Tabs erst ab 2 Tabs.** `ui_tabs` + `tab_*` werden **nur definiert, wenn mehr als ein Tab** existiert (≥ 2 Tabs). Bei genau **einem** Tab entfällt die Tab-Ebene komplett: die `section_*` (ggf. gebündelt in `block_*`) liegen direkt auf oberster Ebene (`group: null`). Damit ist die obige Verschachtelung ab 2 Tabs verbindlich; mit einem Tab wird weder `ui_tabs` noch `tab_*` angelegt. Im DEV-Brief bedeutet das: **keine** `Tab-Navigation`/`Tab`-Zeile, solange nur ein Tab vorläge — direkt mit der ersten `Section`-Zeile beginnen. (Verallgemeinert die flache-Lookup-Ausnahme weiter unten; Beispiel: die Geo-Collections im Sheet `geografies`.)

**`block_` – Karten-Block:** technisch dieselbe group-raw wie `tab_`, hierarchisch eine Ebene tiefer. Bündelt **mehrere** `section_` auf **eine** weiße Karte und grenzt sie vom nächsten Block ab.
- `block_` nur bei **≥ 2** zu bündelnden `section_`. Eine allein stehende `section_` liegt direkt unter `tab_` (kein leeres `block_`).
- `block_` trägt **kein Label** – die sichtbaren Überschriften kommen ausschließlich von den enthaltenen `section_` (analog zu `tab_`).
- **CSS-Anforderung:** `block_` rendert die weiße Karte, die enthaltenen `section_` verlieren ihre eigene Karte (sonst Karte-in-Karte). Eine `section_` direkt unter `tab_` behält ihre Karte.

**Kanonische keys** (gleich über alle Produkte, da nur collection-intern eindeutig):
- Erster Tab `tab_master_data`; erste Section darin `section_publication` (Status & Publication).
- Weitere Beispiele: `section_address`, `section_descriptions`, `tab_description`, `tab_calculator_inputs`, `tab_prices`, `tab_media`, `section_images`; Karten-Block z. B. `block_identity`, `block_contacts`.
- **Doppeldeutige Wiederholungen kontextualisieren** (collection-interne Eindeutigkeit ist Pflicht): wiederholt sich dieselbe Section über zwei Tabs, mit Tab-Kontext qualifizieren – z. B. `section_units_margins` vs. `section_units_margins_surcharge_calculation`; `section_price_units` vs. `section_surcharge_units`.

Flache Lookup-/Junction-Collections (z. B. `camper_equipment`, `price_categories`) dürfen ohne Tab-Layout auskommen – eine einzelne `section_*` genügt. Dies ist der Sonderfall der allgemeinen **Tabs-erst-ab-2-Tabs**-Regel oben.

**Migration (Ist → Soll):** automatisch benannte Accordion-Gruppen (`accordion-obvxyf`) werden zu `block_*`; uneinheitliche Tab-Klammern (`master_data_group`) werden zu `tab_*`. Die key-Zuordnung ist vor der Umbenennung im Team zu verifizieren.

## 4. Datenfelder

### 4.1 Produktname im Feldnamen

**Grundsatz: nein.** Der Feldname beschreibt die Rolle des Werts; den Kontext liefert die Collection. Innerhalb von `rental_depots` heißt es `street`, `postcode` – nicht `depot_street`.

**Ausnahmen:**
- **Primäres Namensfeld:** Das Haupt-Name-/Titelfeld einer Produkt-Collection trägt verbindlich das Entitäts-Suffix **`name_<entity>`** (`name_hotel`, `name_excursion`, `name_operator`). Der Name ist zu zentral, um als generisches `name` unterzugehen. Generisches `name`/`title` nur für eindeutig untergeordnete Namensfelder.
- **M2O-Felder, deren Rolle die referenzierte Entität selbst ist:** Feldname = Singular der Ziel-Collection (`rental_company`, `hotel_group`, `price_category`).
- **Felder, die auf ein anderes Produkt/eine andere Entität verweisen** (dann ist das Produkt der notwendige Kontext).

### 4.2 Singular / Plural – die Kardinalität entscheidet

| Fall | Regel | Beispiel |
|---|---|---|
| M2O (genau eine Referenz) | **Singular** | `country`, `season`, `price_category` |
| O2M / M2M / Files / Repeater (Liste) | **Plural** | `surcharges`, `depots_selected`, `media` |
| Skalar | Singular | `name_operator`, `street`, `postcode` |

### 4.3 Typ- und Themen-Suffixe

| Thema | Konvention | Beispiel |
|---|---|---|
| Zeitstempel | Suffix `_at` | `sell_prices_updated_at` |
| Reines Datum | Suffix `_date` | `image_badge_start_date` |
| Status/Enum | Suffix `_status` | `image_badge_status` |
| **Ab-/Startpreis-Marker** (Boolean „dies ist ein Ab-Preis") | Suffix `_from`, kontext-skaliert | `category_from`, `price_period_from`, `price_category_from` |
| Sortierung / Reihenfolge | Suffix `_sort` = das **eingebaute Directus-`sort`-Feld** der (Sub-)Collection. Für die Standard-Ordnung wird **kein eigenes** `<x>_sort`-Feld angelegt; ein benanntes `<x>_sort` nur für eine **zweite, unabhängige** Ordnung. (`_rank` nur bei echter fachlicher Wertung.) | eingebautes `sort`; Ausnahme z. B. `media_sort` als Zweit-Ordnung |
| Boolean | Präfix `is_` / `has_` / `use_` | `is_map`, `has_multi_rental_discount`, `use_tour32` |
| Quellsystem-Bezug | Quelle ausgeschrieben als Suffix | `status_primarix`, `location_tour32`, `source_id_primarix` |
| Übersetzungen (Feld-Alias) | Standardfeld `translations`; themenspezifisch `<thema>_translations` **ohne Produkt-Präfix** (Collection-Name trägt Präfix, s. C5) | `price_infos_translations` |
| Mietbedingungen | Themen-Familie `conditions_*`; `terms` bleibt zulässig, wo vertraglich passend | `conditions_driver`, `conditions_oneway`; `deviating_cancellation_terms` |
| Kontaktkanäle | Basisname ohne Qualifier, solange collection-intern eindeutig; bei **mehreren** Kanälen desselben Typs **alle** mit Suffix qualifizieren (Kanal first) | `email` (einzeln); `email_general` + `email_booking`, `phone_general` + `phone_after_hours` |
| Media-Block | Präfix `media_*` für Block-Felder; Flags als `is_`/`use_` | `media_filename_fotoweb`, `media_copyright`, `is_map`, `use_tour32` |
| Repeater-Sub-Felder | lokale keys aus dem Label (nie `-`); leben in den repeater-options | `headline`, `text` |
| FK-Felder in Junctions | `<ziel_collection>_id` (Directus-Default) | `camper_specs_id`, `camper_equipment_id` |

> **`_sort` im DEV-Brief:** Die Sortier-Anforderung wird in den Brief-Excels **nicht** als eigene Feldzeile geführt, sondern als **Comment** vermerkt (Spalte A = `COMMENT`), z. B. „Reihenfolge = Directus-System-Feld `sort` (kein eigenes Feld)". So entstehen keine redundanten `<x>_sort`-Felder im Schema.

### 4.4 Identifikatoren

`object_id` ist die fachliche Objekt-ID des ContentHub (gesetzt aus Primarix). Weitere Fremd-IDs folgen `<rolle>_id_<quelle>` bzw. `<rolle>_<quelle>`: `service_provider_id_tour32`, `main_service_provider_id_tour32`, `source_id_primarix`. **Kein `id_<quelle>`-Muster** (id-first, z. B. `id_service_provider_tour32`).

### 4.5 Datentypen

| Fall | Typ | Hinweis |
|---|---|---|
| M2O-Fremdschlüssel | **Typ = PK-Typ der Ziel-Collection** (Default `integer`) | uuid nur bei uuid-PK-Zielen; vollständige Liste in **Build Spec §1** (`translations`, `directus_files`, `directus_users`, `booking_partners`, `partner`, `travel_categories`, `trips_frequencies`, `mobility_advice_text`) |
| `user_created` / `user_updated` | `uuid` | verweisen auf `directus_users` (System-Collection) |
| Maße / Abmessungen | `decimal` | `length_m`, `width_m`, `interior_height_m` |
| Zähler / Kapazitäten / Volumina | `integer` | `berths_adults`, `fuel_tank_l`, `persons_max` |
| `status_primarix` | `string` + `dropdown` (kein M2O) | Quelle ist `freigabe` (0/1), keine Referenz-Collection |

### 4.6 Relations-Muster (Radio steuert Auswahl/Sichtbarkeit)

**„all / selected":** Ein **Radio** (`all` / `selected`) steuert die Sichtbarkeit einer **conditional M2M-Liste** mit Suffix `_selected`.
- Das Substantiv des Radios richtet sich nach der **Semantik**, nicht nach dem Muster: `partner_visibility` (für wen sichtbar) ≠ `depot_availability` (wo verfügbar).
- Die Auswahl-Liste trägt `_selected`: `partner_selected`, `depots_selected`. M2M nur sichtbar, wenn Radio ≠ `all`.
- Standard-Partner-Filter (welchen BOTG-Partnern Zugriff gewährt wird): **`partner_visibility` / `partner_selected`** (verbindlich; `partner_type`/`partner` daran angleichen).

**„Toggle zeigt eine von zwei Eingaben":** Schaltet ein binärer Radio zwischen einem **verknüpften Datensatz** (M2O) und **Inline-Feldern** um, trägt der M2O das Suffix **`_linked`**, der Radio wird nach Semantik benannt.
- `operator_direct` (Radio) ↔ `operator_linked` (M2O auf `booking_partners`) + Inline-Adressblock. Die Inline-Felder und der M2O werden per Directus-`conditions` gegenseitig ein-/ausgeblendet.

**„Kanal-Radio + Partner-M2O":** Wählt ein Radio einen **Kanal/Modus** und ein M2O den **Datensatz**, heißt der Radio **`_channel`**, der M2O **`_partner`**.
- `booking_channel` (Radio) ↔ `booking_partner` (M2O).

## 5. Labels / Mehrsprachigkeit

Labels sind die in der UI sichtbaren, übersetzten Feld-/Gruppenbezeichnungen (Directus `meta.translations`, Sprachen `de-DE` / `en-GB` / `nl-NL`). Sie sind unabhängig vom (englischen, snake_case) Feldschlüssel.

### 5.1 Schreibweise je Sprache

| Sprache | Regel | Beispiel |
|---|---|---|
| **Englisch (en-GB)** | **Title Case** – jedes bedeutungstragende Wort groß | „Street Number", „Rental Company", „Vehicle Category" |
| **Deutsch (de-DE)** | nach Duden – Substantive groß, Rest klein | „Hausnummer", „Vermieter", „Status & Veröffentlichung" |
| **Niederländisch (nl-NL)** | **Sentence case** – nur erstes Wort groß, Substantive klein; Ausnahme Eigennamen | „Huisnummer", „Verhuurder", „Status & publicatie" |

Englisches Title Case ins Niederländische zu übertragen („Beschikbaar Op Alle Depots") ist falsch.

### 5.2 Kontext-Suffix

Wo der reine Feldname mehrdeutig wäre, Kontext in Klammern ergänzen – in allen drei Sprachen: „Name (Rental Company)" / „Name (Vermieter)" / „Naam (verhuurder)".

### 5.3 Konsistenz

Gleiche Begriffe werden überall identisch übersetzt – durchgängig „Object-ID", „Status Primarix", „Last Update", „by". Wiederkehrende Struktur-Labels einheitlich über alle Produkte, z. B. erste Section stets „Status & Publication" / „Status & Veröffentlichung" / „Status & publicatie".

## 6. Entscheidungspunkte

| # | Status | Festlegung |
|---|---|---|
| E1 | **überholt** | Statt `rentalcars`/`rental_cars` gilt: `rental_companies` + `rental_depots` + **`vehicles`** (Mietwagen und Camper in einer Collection, diskriminiert über `rental_type`). |
| E2 | **geklärt** | Konflikt `booking` vs. `booking_partner`: **`booking_partner` gewinnt** (M2O-Record). Der zugehörige Kanal-Radio heißt `booking_channel` (s. §4.6). |
| E3 | **offen** | `erp_`/`mp_`-Familien auf Singular-Produkt vereinheitlichen – noch zu klären. |

### Produkt-spezifische Notiz

`rental_period_zone` (Kalkulator-Dimension statt „room_category") gilt **nur in `vehicles`**, nicht global.
