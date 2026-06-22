# BOTG ContentHub — Navigation Tree (EN) · v3

New decisions applied: `vehicles` = one collection + two sub-bookmarks · `tours` = round trips, with "study trips" folded in (discriminated by `tour_type`) · `excursions` = aka "day trips". **Open:** how to model the `*_periods` collections — see recommendation below.

```text
PRODUCTS   (Tier 1 — blue icon + color; per-collection bookmarks "Africa / Asia / …")
├─ hotels        🔵   (already #0DA4DE — roll color out to all)
├─ tours         🔵   (= round trips / Rundreisen; study trips fold in via `tour_type`)
├─ excursions    🔵   (= day trips / Tagestouren; rename of today's rich `tours`)
├─ vehicles      🔵   (cars + campers in ONE collection, split via `rental_type`)
│   ├─ 🔖 Rental Cars     (bookmark: rental_type = car)
│   └─ 🔖 Campers         (bookmark: rental_type = camper)
└─ cruises       🔵
   ✗ remove stubs: roundtrips · daytrips · studytrips     ✗ delete test: campers · rentalcars · camper

master_data   ("Master Data" — folder keys carry _meta where they would clash with a product)
├─ geographies
│   ├─ continents            ← from media_helper (→ plural)
│   ├─ regions · countries · states
│   ├─ destination_clusters · destinations
│   └─ places · locations_tour32
├─ companies   (shared = Primarix "agencies", cross-product)
│   └─ partners · booking_partners · booking_details
├─ rentals   (NEW — rental sub-system)
│   ├─ rental_companies · rental_depots · rental_zones
│   ├─ rental_companies_price_periods · rental_companies_rental_periods    ⚠ periods modeling open
│   └─ camper_specs · camper_equipment
├─ hotels_meta   (display "Hotels" = today's Hotels_Metadata, minus currencies)
│   ├─ accommodation_types · room_categories · occupancies
│   ├─ hotel_groups · hotel_classifications · activities
│   └─ room_prices · price_dates · surcharges
├─ cruises_meta   (display "Cruises" = today's Cruises_Metadata)
│   ├─ cruise_types · departure_frequencies
│   ├─ cruise_prices · cruise_price_dates
│   └─ cabin_categories · cruise_occupancies
└─ trips_meta   (display "Tours & Excursions" = today's day_trips folder)
    ├─ travel_categories · trips_frequencies · excursion_categories
    └─ tour_prices · tour_room_occupancies · tour_price_dates
    ⚠ "Tour Surcharges": no own collection in schema — field repeater or new collection?

global_settings   ("Global Settings")
├─ currencies                ← from Hotels_Metadata (global, not hotel-specific!)
│   └─ rates
├─ seasons
├─ global_configuration
├─ mobility_advice_text
└─ media
    └─ albums · media_library_settings · media_share_links

pricing_presets   (backoffice / cost-price — own restrictive visibility, default-deny)
├─ margin_presets
├─ exchange_rate_presets
└─ batch_products   (batch_hotel · batch_vehicles · batch_tours · batch_excursions)

hidden, unchanged:        input_lists · media_helper · all *_translations + junctions · directus_*
remove before go-live:    Demo_Collections (geo_location, partner_filter, status_color, …)
```

---

## Display labels (DE / EN / NL)

| Technical name | Label DE | Label EN | Label NL |
|---|---|---|---|
| `hotels` | Hotels | Hotels | Hotels |
| `tours` | Rundreisen | Tours | Rondreizen |
| `excursions` | Tagestouren | Excursions | Excursies |
| `cruises` | Kreuzfahrten | Cruises | Cruises |
| `vehicles` | Fahrzeuge | Vehicles | Voertuigen |
| `master_data` | Stammdaten | Master Data | Stamgegevens |
| `geographies` | Geografie | Geographies | Geografie |
| `continents` | Kontinente | Continents | Continenten |
| `regions` | Regionen | Regions | Regio's |
| `countries` | Länder | Countries | Landen |
| `states` | Bundesstaaten | States | Staten |
| `destination_clusters` | Zielgebietsgruppen | Destination Clusters | Bestemmingsclusters |
| `destinations` | Reiseziele | Destinations | Bestemmingen |
| `places` | Orte | Places | Plaatsen |
| `locations_tour32` | Orte (Tour32) | Locations (Tour32) | Locaties (Tour32) |
| `companies` | Unternehmen | Companies | Bedrijven |
| `partners` | Partner | Partners | Partners |
| `booking_partners` | Buchungsstellen | Booking Partners | Boekingspartners |
| `booking_details` | Buchungsdetails | Booking Details | Boekingsgegevens |
| `rentals` | Vermietung | Rentals | Verhuur |
| `rental_companies` | Vermieter | Rental Companies | Verhuurbedrijven |
| `rental_depots` | Mietstationen | Rental Depots | Depots |
| `rental_zones` | Mietzonen | Rental Zones | Verhuurzones |
| `rental_companies_price_periods` | Preiszeiträume | Price Periods | Prijsperiodes |
| `rental_companies_rental_periods` | Mietzeiträume | Rental Periods | Huurperiodes |
| `camper_specs` | Camper-Spezifikationen | Camper Specs | Camperspecificaties |
| `camper_equipment` | Camper-Ausstattung | Camper Equipment | Camperuitrusting |
| `hotels_meta` | Hotels | Hotels | Hotels |
| `accommodation_types` | Unterkunftsarten | Accommodation Types | Accommodatietypes |
| `room_categories` | Zimmerkategorien | Room Categories | Kamercategorieën |
| `occupancies` | Belegungen | Occupancies | Bezettingen |
| `hotel_groups` | Hotelgruppen | Hotel Groups | Hotelgroepen |
| `hotel_classifications` | Hotelklassifizierungen | Hotel Classifications | Hotelclassificaties |
| `activities` | Aktivitäten | Activities | Activiteiten |
| `room_prices` | Zimmerpreise | Room Prices | Kamerprijzen |
| `price_dates` | Preiszeiten | Price Periods | Prijsperiodes |
| `surcharges` | Zuschläge | Surcharges | Toeslagen |
| `cruises_meta` | Kreuzfahrten | Cruises | Cruises |
| `cruise_types` | Kreuzfahrt-Typen | Cruise Types | Cruisetypes |
| `departure_frequencies` | Abfahrtsfrequenzen | Departure Frequencies | Vertrekfrequenties |
| `cruise_prices` | Kreuzfahrtpreise | Cruise Prices | Cruiseprijzen |
| `cruise_price_dates` | Preiszeiten (Cruise) | Cruise Price Periods | Prijsperiodes (Cruise) |
| `cabin_categories` | Kabinenkategorien | Cabin Categories | Hutcategorieën |
| `cruise_occupancies` | Belegungen (Cruise) | Cruise Occupancies | Bezettingen (Cruise) |
| `trips_meta` | Rundreisen & Tagestouren | Tours & Excursions | Rondreizen & Excursies |
| `travel_categories` | Reisekategorien | Travel Categories | Reiscategorieën |
| `trips_frequencies` | Reisefrequenzen | Trip Frequencies | Reisfrequenties |
| `excursion_categories` | Tagestour-Kategorien | Excursion Categories | Excursiecategorieën |
| `tour_prices` | Preise | Prices | Prijzen |
| `tour_room_occupancies` | Belegungen | Room Occupancies | Bezettingen |
| `tour_price_dates` | Preiszeiten | Price Periods | Prijsperiodes |
| `(tour_surcharges?)` | Zuschläge | Surcharges | Toeslagen |
| `global_settings` | Globale Einstellungen | Global Settings | Globale instellingen |
| `currencies` | Währungen | Currencies | Valuta's |
| `rates` | Wechselkurse | Exchange Rates | Wisselkoersen |
| `seasons` | Saisons | Seasons | Seizoenen |
| `global_configuration` | Globale Konfiguration | Global Configuration | Globale configuratie |
| `mobility_advice_text` | Mobilitätshinweise | Mobility Advice | Mobiliteitsadvies |
| `media` | Medien | Media | Media |
| `albums` | Alben | Albums | Albums |
| `media_library_settings` | Medienbibliothek | Media Library Settings | Mediabibliotheek-instellingen |
| `media_share_links` | Freigabelinks | Media Share Links | Deellinks |
| `pricing_presets` | Preis-Vorgaben | Pricing Presets | Prijsinstellingen |
| `margin_presets` | Margen-Vorgaben | Margin Presets | Marge-presets |
| `exchange_rate_presets` | Wechselkurs-Vorgaben | Exchange Rate Presets | Wisselkoers-presets |
| `batch_products` | Stapelimport | Batch Products | Batch-producten |
| `batch_hotel` | Hotels (Batch) | Hotels (Batch) | Hotels (batch) |
| `batch_vehicles` | Fahrzeuge (Batch) | Vehicles (Batch) | Voertuigen (batch) |
| `batch_tours` | Rundreisen (Batch) | Tours (Batch) | Rondreizen (batch) |
| `batch_excursions` | Tagestouren (Batch) | Excursions (Batch) | Excursies (batch) |
