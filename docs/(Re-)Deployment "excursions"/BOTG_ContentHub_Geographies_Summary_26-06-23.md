# BOTG ContentHub — Geografien: Summary & Guidance

**Stand 26-06-23 · DE · Projektwissen (Chat-übergreifende Analyse-Referenz)**
Quellen: Schema-Snapshot `schema_26-06-19.json`, DEV-Brief v38 (Sheet `Geografies`), Datenliste `BOTG_Geographies_flat_26-06-23.xlsx`, Deploy `BOTG_Geo_Schema_Deploy_v38_26-06-23.yaml`. Datenhoheit & Media-Code-Autorität: **Inka van Baal** (BOTG).

Dieses Dokument fasst Datenmodell, Struktur, Codierungslogik, Status-Konzept und die getroffenen Entscheidungen zusammen, damit Analysen in beliebigen Chats ohne Wiederaufrollen darauf aufsetzen können.

---

## 1. Datenmodell

Die Geo-Collections liegen im Datenmodell unter dem Ordnerpfad **`Global_Data > Geographies`** (beide Ordner-Collections `schema: null`). Hierarchie der eigentlichen Collections:

```
destinations_cluster        (Gruppierung, z. B. Afrika, Asien …; KEIN Code, KEIN Status)
  └─ destinations           (Reiseziele, z. B. Karibik, Naher Osten; trägt media_code + status)
       └─ countries          (Länder; media_code + status + ISO)
            ├─ states         (Bundesstaaten/Subdivisionen; media_code + status + ISO 3166-2)
            └─ regions         (Regionen; M2M zu countries; status)
                 └─ places      (Orte; FKs auf country/state/region/locations_tour32; status)
                      └─ locations_tour32  (Legacy-Ortsmapping aus Tour32; status)
```

- **Namen sind übersetzbar**: je Collection existiert eine `<collection>_translations`-Companion mit `name` (DE/EN/NL), eingebunden über das `translations`-Interface der Eltern-Collection. Die `_translations` hängen im Datenmodell unter ihrer Eltern-Collection.
- **PKs**: Integer-Auto-Increment; FKs als Integer auf diese PKs.
- **Kennzahlen (Flat-Liste, 26-06-23)**: 280 Zeilen, 210 distinkte Länder, 51 Regionen; Status 270 active / 10 archived (review wird erst bei der Altdaten-Triage vergeben).

> Historie: Früher gab es zwei parallele Hierarchien — die inhaltliche (oben) und eine separate **Medien-Hierarchie** (`continent → media_country → media_region`, uuid-PKs). Diese wurde **konsolidiert**: Medien-Codes wandern als Feld in die Inhalts-Collections, die Medien-Hierarchie wird stillgelegt/abgebaut.

---

## 2. Cluster → Destination → Code

Acht Cluster (reine Navigations-/Gruppierungsebene). Destination-Kürzel in Klammern:

| Cluster | Destinationen (Code) |
|---|---|
| Afrika | Afrika (AFR), **Indischer Ozean (IOZ)** |
| Asien | Asien (ASI), **Naher Osten (NAH)** |
| Europa | Europa (EUR) |
| Lateinamerika | Karibik (KRB), Mittelamerika (MAM), Südamerika (SAM) |
| Nordamerika | Nordamerika (NA) |
| Ozeanien | Australien (AUS), Neuseeland (NZL), Südpazifik (SPC) |
| Polarregionen | **Antarktis (ANT)**, **Arktis (ARK)** — Kürzel provisorisch (gelb), von Inka/BOTG zu bestätigen |
| Sonstiges | Kreuzfahrten (SON_KFT), Reiseleiter (SON_RL), Weltweit/Round-the-World (SON_RTW), Sonstiges (SON) — alle nicht-geografisch |

Abu Dhabi und Dubai sind **Regionen** (Subdivisionen, ISO `AE-AZ` / `AE-DU`) unter dem Land *Vereinigte Arabische Emirate*, das unter Destination *Asien* geführt wird (nicht Naher Osten — so in Inkas Quelle).

---

## 3. Media-Code-Logik (Bild-Benennung)

- **Zweck**: Die Kürzel dienen primär der Bilddatei-Benennung und der schnellen geografischen Zuordnung (Fotoweb/Primarix-Gewohnheit der Teams). Bewusst **keine** ISO-Codes als Primär-Code — ISO wird nur als Referenz-/Info-Feld mitgeführt.
- **Pro Einheit ein Segment**: `destination_media_code`, `land_media_code`, `region_media_code` halten jeweils nur das eigene Kürzel.
- **Gesamtcode** = Pfad `destination_media_code [+ "_" + land [+ "_" + region]]`. Beispiele: `NAH_JO` (Jordanien im Nahen Osten), `KRB_BS` (Bahamas/Karibik), `IOZ_…` (Indischer Ozean).
- **Cluster steht NICHT im Code** (Lateinamerika/Ozeanien/Afrika sind nur Directus-Gruppierung). Ausnahme in den Altdaten: die *Sonstiges*-Destinationen tragen ein `SON_`-Präfix.
- **Legacy-Codes**: `media_code_legacy_botg` und `media_code_legacy_karawane` (read-only) bewahren die historischen Kürzel beider Systeme für Migration/Suche.

---

## 4. Status-Feld (active / review / archived)

Drei Werte, auf **sechs** Ebenen (countries, destinations, states, regions, places, locations_tour32 — **nicht** destinations_cluster):

| Wert | Farbe | Bedeutung |
|---|---|---|
| `active` | Grün `#2ECDA7` | Gültiger, korrekt eingeordneter Eintrag. Default für Neuanlagen. |
| `review` | **Orange `#F2994A`** | Altlast, die geprüft werden muss: Eintrag auf der falschen Ebene (z. B. ein Staat im Länder-Feld) **oder** wegen abweichender Schreibweise nicht eindeutig zuordenbar. |
| `archived` | Grau `#A2B5CD` | Stillgelegt, Datensatz bleibt erhalten (z. B. Dubletten). |

`review` ist das Triage-Werkzeug für den großen Altbestand: Viele Einträge sind beim Import nicht sauber zuordenbar. Statt sie zu löschen oder zu raten, werden sie auf `review` gesetzt und später bereinigt. In der Liste rendert der Status als farbiges Label (`display: labels`).

---

## 5. Schema-Delta (v38 ggü. Bestand 26-06-19)

**Neue Felder**
- `status` (active/review/archived) — 6 Ebenen (s. o.)
- `media_code` — destinations, countries, states
- `media_code_legacy_botg`, `media_code_legacy_karawane` (read-only) — destinations, countries, states
- `is_non_geographic` (boolean) — nur destinations (markiert Kreuzfahrten, Weltweit, Reiseleiter …)

**Gelöscht** (bewusst, im Brief durchgestrichen → per Deploy gedroppt)
- `destinations.short_code`
- `destinations_cluster.short_code`
- `destinations_cluster.ISO_alpha_3_code`
(redundant geworden durch die Media-Code-Logik; ISO-Codes auf Cluster-Ebene sind ohnehin sachfremd)

**Geändert**
- Neues Formular-Layout über `section_*`-Gruppen (group-detail, open/closed) — keine Tabs (Regel „Tabs erst ab 2 Tabs"); Section-Header `#008CC0`. „Status & Zuordnung" als obere Section.
- Labels (DE/EN/NL) + Notes an Bestandsfeldern ergänzt; `name`-Label je Collection unterschiedlich („Name (Land)" …).
- ISO-Felder (`countries.ISO`, `countries.ISO_alpha_3_code`, `states.ISO`) read-only.

**ISO**: countries trägt Alpha-2 (`ISO`) + Alpha-3 (`ISO_alpha_3_code`); states trägt ISO 3166-2 (Subdivision). Nur Referenz, read-only.

---

## 6. Entscheidungs-Log (festgezurrt)

- **Indischer Ozean → Cluster Afrika** (nicht Asien).
- **Polarregionen bleibt** als Cluster mit Destinationen **Antarktis** und **Arktis** (Kürzel `ANT`/`ARK` provisorisch, gelb markiert, von BOTG zu bestätigen). (Inka hatte ursprünglich Polar streichen / Antarktis als SAM-Region vorgeschlagen — von Tommy überstimmt.)
- **Naher Osten = `NAH`** final; die 12 Länder darunter von `ASI_*` auf `NAH_*` umbasiert.
- **Lateinamerika** fasst Karibik/Mittelamerika/Südamerika zusammen.
- **Ozeanien** als Gruppierung; AUS/NZL/SPC tragen kein „OZ"-Präfix.
- **Cluster nicht im Bild-Code**; `destinations_cluster` bekommt weder media_code noch status.
- **Konsolidierung** der Medien-Hierarchie in die Inhalts-Collections.
- **Abu Dhabi/Dubai = Regionen** unter VAE.

---

## 7. Artefakte & Datenquellen

- **Datenliste**: `BOTG_Geographies_flat_26-06-23.xlsx` (eine Zeile je benannter Einheit; Spalten je Ebene + Codes + Status). Maßgebliche Datenquelle für den Import.
- **Deploy-YAML**: `BOTG_Geo_Schema_Deploy_v38_26-06-23.yaml` (Directus-Snapshot, fields-only, inkl. Sections/Labels/Notes/neue Felder + 3 Löschungen; 2-Space-Indent; merge → `schema apply`).
- **Anleitung (EN)**: `BOTG_ContentHub_Geo_Schema_Deploy_Guide_EN_26-06-23.md` (Deploy + manuelle Fallback-Checkliste + Translations-DEV-Fragen).
- **ERD**: `botg_schema_geographies_EN_26-06-23.drawio`.
- **Brief**: `BOTG_Brief_DEV_Set-up_Collections_…_v38` (Sheet `Geografies`).
- **Build-Regeln**: Build Spec v1.4 (§8.7 Packaging-Regeln aus dem ersten Tours/Excursions-Deploy).

---

## 8. Offene Punkte

- **Kürzel Antarktis/Arktis** (`ANT`/`ARK`) provisorisch — Bestätigung Inka/BOTG.
- **Translations-Architektur**: offene DEV-Frage — warum die Geo-Namen historisch nicht sauber als Translation-Tabelle gelöst sind und ob ein sauberes Verdrahten in den **Geo-Picker** größeren Umbau bedeutet (DEVs sollen schreiben, was zu ändern ist).
- **Altdaten-Triage**: `review`-Einträge (falsche Ebene, Schreibweisen) müssen nach dem Import bereinigt werden.
- **Stub „Arabien"** (kein echtes Land, archiviert) — entfernen oder belassen.
- **Dublette „Kreuzfahrt"/„Kreuzfahrten"** unter Sonstiges — konsolidieren.
- **`SON_`-Präfix** der Sonstiges-Codes weicht von „Cluster nicht im Code" ab — bei Bedarf vereinheitlichen.

---

## 9. Konventionen (Kurz)

- Namen snake_case en-GB; primäres Namensfeld übersetzbar via `_translations`.
- Layout: `section_*` (group-detail) direkt auf oberster Ebene; **Tabs erst ab 2 Tabs** (Naming-Konvention v1.8).
- Felder Standard Half-width; Full nur für Textarea/WYSIWYG/Repeater/Gallery/Translations.
- Status-Pille via `display: labels`; Section-Header `#008CC0`.
