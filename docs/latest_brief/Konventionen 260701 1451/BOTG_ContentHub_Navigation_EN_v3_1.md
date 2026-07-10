# BOTG ContentHub — Navigation Tree (EN) · v3.1

**Changelog v3 → v3.1:** Tier 1 (top level) aligned to the live DEV state. Folders renamed to the `<Product> Settings` convention, ordered to follow the blue products, each carrying the product's icon in grey (`Global Settings` = `settings`). Product labels translated per this document and pushed to DEV — **except `vehicles`, which keeps its DEV-Ist label** (Cars & Camper). `companies` and `media` kept as separate entries (not folded into Global Settings). Sub-levels below Tier 1 are carried over from the v3 plan and are **not** verified against DEV.

```text
PRODUCTS  (Tier 1 — blue icon #0DA4DE)
├─ hotels        hotel            (Hotels)
├─ tours         tour             (Tours / Rundreisen)
├─ excursions    hiking           (Excursions / Tagestouren)
├─ vehicles      directions_car   (Cars & Camper — DEV-Ist kept; 🔖 Rental Cars / 🔖 Campers)
└─ cruises       directions_boat  (Cruises)

SETTINGS  (Tier 1 — grey #6B7785, in product order; folder icon = product icon, Global = settings)
├─ Global Settings         settings         (DEV key: Global_Data)
│   ├─ geographies                                   (DEV sub-folder ✓)
│   ├─ margin / exchange / batch presets             (DEV sub-folder: margin_preset ✓)   ⚠ plan: own restricted "Pricing Presets" area
│   ├─ currencies · rates · seasons                  ⚠ sub = plan, not DEV-verified
│   └─ global_configuration · mobility_advice_text   ⚠ sub = plan
├─ Hotels Settings         hotel            (DEV key: Hotels_Metadata)
│   ├─ accommodation_types · room_categories · occupancies
│   ├─ hotel_groups · hotel_classifications · activities
│   └─ room_prices · price_dates · surcharges        ⚠ sub = plan
├─ Tours & Trips Settings  tour             (DEV key: trips_meta)
│   ├─ travel_categories · trips_frequencies · excursion_categories
│   └─ tour_prices · tour_room_occupancies · tour_price_dates   ⚠ sub = plan
│   ⚠ "Tour Surcharges": own collection vs. field repeater — open
├─ Cars & Camper Settings  directions_car   (DEV key: Rentals)
│   ├─ rental_companies · rental_depots · rental_zones
│   ├─ rental_companies_price_periods · rental_companies_rental_periods   ⚠ periods modeling open
│   └─ camper_specs · camper_equipment      ⚠ sub = plan
└─ Cruises Settings        directions_boat  (DEV key: Cruises_Metadata)
    ├─ cruise_types · departure_frequencies
    ├─ cruise_prices · cruise_price_dates
    └─ cabin_categories · cruise_occupancies   ⚠ sub = plan

SEPARATE  (Tier 1 — kept standalone, not under Global Settings)
├─ companies          partners · booking_partners · booking_details   ⚠ plan — no DEV folder yet
├─ media              perm_media   albums · media_library_settings · media_share_links   (DEV: hidden top-level folder)
└─ Field Dictionary   menu_book    (unchanged)

hidden, unchanged:        input_lists · day_trips · all *_translations + junctions · directus_*
remove before go-live:    Demo_Collections (geo_location, partner_filter, status_color, …)
```

---

## Folder naming & icon convention

- Every folder that holds sub-collections is named **`<Product> Settings`** (e.g. *Hotels Settings*, *Cruises Settings*).
- Settings folders are ordered to **follow the blue products** (Hotels → Tours → Excursions → Cars & Camper → Cruises), with **Global Settings first**.
- Each settings folder carries the **same icon as its product**, rendered in grey **`#6B7785`**. **Global Settings** uses the `settings` (cog) icon.
- Products keep blue **`#0DA4DE`**. `Field Dictionary` is excluded from the convention and stays last.

---

## Display labels (DE / EN / NL)

### Tier 1 — DEV-Ist (verified)

| Technical name (DEV key) | Label DE | Label EN | Label NL | Icon |
|---|---|---|---|---|
| `hotels` | Hotels | Hotels | Hotels | `hotel` |
| `tours` | Rundreisen | Tours | Rondreizen | `tour` |
| `excursions` | Tagestouren | Excursions | Excursies | `hiking` |
| `vehicles` | Mietwagen & Camper | Cars & Camper | Huurauto's & Campers | `directions_car` |
| `cruises` | Kreuzfahrten | Cruises | Cruises | `directions_boat` |
| `Global_Data` | Global Einstellungen | Global Settings | Global instellingen | `settings` |
| `Hotels_Metadata` | Hotels Einstellungen | Hotels Settings | Hotels instellingen | `hotel` |
| `trips_meta` | Tours & Trips Einstellungen | Tours & Trips Settings | Tours & Trips instellingen | `tour` |
| `Rentals` | Cars & Camper Einstellungen | Cars & Camper Settings | Cars & Camper instellingen | `directions_car` |
| `Cruises_Metadata` | Cruises Einstellungen | Cruises Settings | Cruises instellingen | `directions_boat` |
| `field_dictionary` | Field Dictionary | Field Dictionary | Field Dictionary | `menu_book` |
| `Media` | Medien | Media | Media | `perm_media` |
| `companies` *(plan)* | Unternehmen | Companies | Bedrijven | — |

### Sub-collections — plan (not DEV-verified)

| Technical name | Label DE | Label EN | Label NL |
|---|---|---|---|
| `geographies` | Geografie | Geographies | Geografie |
| `continents` | Kontinente | Continents | Continenten |
| `regions` | Regionen | Regions | Regio's |
| `countries` | Länder | Countries | Landen |
| `states` | Bundesstaaten | States | Staten |
| `destination_clusters` | Zielgebietsgruppen | Destination Clusters | Bestemmingsclusters |
| `destinations` | Reiseziele | Destinations | Bestemmingen |
| `places` | Orte | Places | Plaatsen |
| `locations_tour32` | Orte (Tour32) | Locations (Tour32) | Locaties (Tour32) |
| `partners` | Partner | Partners | Partners |
| `booking_partners` | Buchungsstellen | Booking Partners | Boekingspartners |
| `booking_details` | Buchungsdetails | Booking Details | Boekingsgegevens |
| `rental_companies` | Vermieter | Rental Companies | Verhuurbedrijven |
| `rental_depots` | Mietstationen | Rental Depots | Depots |
| `rental_zones` | Mietzonen | Rental Zones | Verhuurzones |
| `rental_companies_price_periods` | Preiszeiträume | Price Periods | Prijsperiodes |
| `rental_companies_rental_periods` | Mietzeiträume | Rental Periods | Huurperiodes |
| `camper_specs` | Camper-Spezifikationen | Camper Specs | Camperspecificaties |
| `camper_equipment` | Camper-Ausstattung | Camper Equipment | Camperuitrusting |
| `accommodation_types` | Unterkunftsarten | Accommodation Types | Accommodatietypes |
| `room_categories` | Zimmerkategorien | Room Categories | Kamercategorieën |
| `occupancies` | Belegungen | Occupancies | Bezettingen |
| `hotel_groups` | Hotelgruppen | Hotel Groups | Hotelgroepen |
| `hotel_classifications` | Hotelklassifizierungen | Hotel Classifications | Hotelclassificaties |
| `activities` | Aktivitäten | Activities | Activiteiten |
| `room_prices` | Zimmerpreise | Room Prices | Kamerprijzen |
| `price_dates` | Preiszeiten | Price Periods | Prijsperiodes |
| `surcharges` | Zuschläge | Surcharges | Toeslagen |
| `cruise_types` | Kreuzfahrt-Typen | Cruise Types | Cruisetypes |
| `departure_frequencies` | Abfahrtsfrequenzen | Departure Frequencies | Vertrekfrequenties |
| `cruise_prices` | Kreuzfahrtpreise | Cruise Prices | Cruiseprijzen |
| `cruise_price_dates` | Preiszeiten (Cruise) | Cruise Price Periods | Prijsperiodes (Cruise) |
| `cabin_categories` | Kabinenkategorien | Cabin Categories | Hutcategorieën |
| `cruise_occupancies` | Belegungen (Cruise) | Cruise Occupancies | Bezettingen (Cruise) |
| `travel_categories` | Reisekategorien | Travel Categories | Reiscategorieën |
| `trips_frequencies` | Reisefrequenzen | Trip Frequencies | Reisfrequenties |
| `excursion_categories` | Tagestour-Kategorien | Excursion Categories | Excursiecategorieën |
| `tour_prices` | Preise | Prices | Prijzen |
| `tour_room_occupancies` | Belegungen | Room Occupancies | Bezettingen |
| `tour_price_dates` | Preiszeiten | Price Periods | Prijsperiodes |
| `(tour_surcharges?)` | Zuschläge | Surcharges | Toeslagen |
| `currencies` | Währungen | Currencies | Valuta's |
| `rates` | Wechselkurse | Exchange Rates | Wisselkoersen |
| `seasons` | Saisons | Seasons | Seizoenen |
| `global_configuration` | Globale Konfiguration | Global Configuration | Globale configuratie |
| `mobility_advice_text` | Mobilitätshinweise | Mobility Advice | Mobiliteitsadvies |
| `albums` | Alben | Albums | Albums |
| `media_library_settings` | Medienbibliothek | Media Library Settings | Mediabibliotheek-instellingen |
| `media_share_links` | Freigabelinks | Media Share Links | Deellinks |
| `margin_presets` | Margen-Vorgaben | Margin Presets | Marge-presets |
| `exchange_rate_presets` | Wechselkurs-Vorgaben | Exchange Rate Presets | Wisselkoers-presets |
| `batch_products` | Stapelimport | Batch Products | Batch-producten |
| `batch_hotel` | Hotels (Batch) | Hotels (Batch) | Hotels (batch) |
| `batch_vehicles` | Fahrzeuge (Batch) | Vehicles (Batch) | Voertuigen (batch) |
| `batch_tours` | Rundreisen (Batch) | Tours (Batch) | Rondreizen (batch) |
| `batch_excursions` | Tagestouren (Batch) | Excursions (Batch) | Excursies (batch) |

---

## Open / not yet reconciled with DEV

1. **Sub-levels** below Tier 1 are the v3 plan, not verified against the live DEV grouping.
2. **Pricing Presets** — plan foresees an own restricted (default-deny) area; in DEV it lives as `margin_preset` nested under Global Settings.
3. **`companies`** — plan grouping; no corresponding DEV folder yet.
4. **`*_periods`** modeling (rental: company-level vs. vehicle-level) — open, pending customer meeting.
5. **Tour Surcharges** — own collection vs. field repeater — open.
