# kennwerte-db — Data Model

## Project Context

**kennwerte-db** is an open-source construction cost benchmark database for Swiss public buildings. It collects, structures, and presents cost Kennwerte (CHF/m² GF, CHF/m³ GV, BKP/eBKP-H breakdowns) from realised Bauprojekte to support early-stage cost estimation (Kostenschätzung, Kostenvoranschlag) and portfolio-level cost analysis.

Data is sourced from publicly available Bautendokumentationen published by Swiss federal, cantonal, and municipal building authorities (BBL, armasuisse, Stadt Zürich, and others). The application is designed as a no-build, static-hosted prototype (GitHub Pages + sql.js) with a path toward a production system.

**Related documents**: [REQUIREMENTS.md](REQUIREMENTS.md) (functional and non-functional requirements) · [SCRAPING.md](SCRAPING.md) (data sources and extraction pipeline)

---

## Purpose of This Document

Entity model, field definitions, reference data, and PostgreSQL schema for the kennwerte-db target data model. This is the **full production schema** — the current prototype implements a simplified subset (see `scripts/build_db.py`). Fields are prioritised using MoSCoW (M = Must, S = Should, C = Could, W = Won't).

---

## Overview

Two primary entities, aligned with the GWR (eidg. Gebäude- und Wohnungsregister) data model:

- **Gebäude** — the permanent physical asset (EGID, address, heritage classification). Optional: only required when a Bauprojekt can be linked to an existing building (Umbau projects). For Neubauten, no Gebäude record exists at planning time.
- **Bauprojekt** — the primary benchmark entity. A permit-bound construction intervention on which a cost estimate is prepared, a Verpflichtungskredit approved, and a Schlussabrechnung produced. Always present.

The link `bauprojekt.gebaeude_id` is **nullable**: a Neubau Bauprojekt has no Gebäude until the EGID is assigned (at or after Baubewilligung). An Umbau Bauprojekt links to the existing Gebäude being modified.

```
Gebäude (EGID, address, heritage)          [optional parent]
    │  0..1
    │ gebaeude_id FK (nullable)
    ▼
Bauprojekt ◄── cost_record ◄── benchmark_value
    │       ◄── sia416_bauprojekt
    │       ◄── energy_bedarfswerte
    │
Gebäude ◄── fm_cost              [v2, linked to Gebäude]
        ◄── lifecycle_cost        [v2, linked to Gebäude]
```

**Art der Arbeiten** (per GWR / VGWR): Neubau = complete new construction · Umbau = all other interventions (Erweiterung, Sanierung, Teilabbruch, Umbau) · Abbruch = complete demolition. Carried as a field on Bauprojekt.

**MoSCoW key** (sections 1–4): M = Must have (v1 core) · S = Should have (v1 extended) · C = Could have (v2) · W = Won't have (out of scope)

---

## 1. Gebäude (Physical Building Asset)

The permanent physical object as defined in VGWR Art. 2: a durable, roofed, ground-fixed structure that can accommodate persons. Identified by the eidg. Gebäudeidentifikator (EGID), which persists through all interventions — ownership changes, renovations, address changes. Many VBS military buildings (bunkers, fortifications, alpine facilities) are not registered in the GWR (non-residential buildings are optional); `egid` is therefore nullable.

*Das dauerhafte physische Objekt gemäss VGWR Art. 2. Identifiziert durch den EGID, der bei allen Interventionen — Eigentumsübergängen, Umbauten, Adressänderungen — unverändert bleibt.*

### 1.1 Identity and GWR Reference (Identifikation und GWR-Bezug)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **id** | UUID | Internal database identifier | Interner Datenbankschlüssel | M |
| **egid** | Integer | Federal building identifier (EGID, GWR) — nullable for non-residential VBS buildings | Eidg. Gebäudeidentifikator (EGID, GWR) — nullable für nicht-wohngenutzte VBS-Bauten | S |
| **egrid** | Text | Land parcel identifier (Amtliche Vermessung) | Grundstücksidentifikator (Amtliche Vermessung) | C |
| **baujahr** | Integer | Original year of construction (GWR attribute) | Erstbaujahr (GWR-Merkmal) | S |
| **created_at** | Timestamp | Record creation timestamp | Erfassungszeitpunkt | M |

### 1.2 Location (Standort)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **street** | Text | Street address | Strasse und Hausnummer | S |
| **postal_code** | Text | Postal code | Postleitzahl | M |
| **municipality** | Text | Municipality | Gemeinde | M |
| **canton** | Text | Canton (2-letter code) | Kanton (2-stellig) | M |
| **region** | Text | BFS Grossregion → ref_grossregion | BFS-Grossregion | M |
| **coord_e** | Decimal | LV95 Easting coordinate | LV95 Ostwert | S |
| **coord_n** | Decimal | LV95 Northing coordinate | LV95 Nordwert | S |

### 1.3 Portfolio Classification (Portfolio-Klassifikation)

These are the permanent classifications of the physical asset as managed in the federal portfolio. They may differ from the classification of an individual Bauprojekt (e.g. a building converted from office to laboratory use).

*Die dauerhaften Klassifikationen des physischen Objekts im Bundesportfolio.*

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **portfolio** | Enum | BBL / VBS / ETH → ref_portfolio | Bundesportfolio | M |
| **sub_portfolio** | Text | BBL sub-portfolio → ref_sub_portfolio | BBL-Teilportfolio | M |
| **federal_building_type** | Text | Federal building typology (current use) → ref_federal_building_type | Bundesgebäudetyp (aktuelle Nutzung) | M |
| **oag_code** | Text | CRB OAG classification (current state) → ref_oag | CRB-Objektart (aktueller Zustand) | S |
| **oag_name** | Text | CRB OAG name (denormalized) | CRB-Objektartname | S |
| **heritage_status** | Enum | Denkmalschutz / HOBIM / ADAB / Inventar / none | Schutzstufe | S |
| **building_series** | Text | Building series for standardised / repetitive typologies (Typengebäude) | Gebäudeserie für standardisierte / repetitive Typen | C |
| **urban_context** | Text | Urban / peri-urban / rural | Städtisch / Agglomeration / Ländlich | C |
| **altitude_masl** | Integer | Altitude in metres above sea level | Höhenlage in Metern über Meer | S |

### 1.4 Gebäude — v2 KPI Anchors

The following entities are linked to `gebaeude_id`. They are out of scope for v1 (cost benchmarking focus) but the Gebäude entity is the correct anchor for them.

| Entity | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|
| **fm_cost** | Annual FM / Betriebskosten records (DIN 18960 NKG), per reference year | Jährliche Betriebskostendatensätze (DIN 18960 NKG), pro Berichtsjahr | C |
| **lifecycle_cost** | Condition value (Zustandswert), maintenance rates, element lifespans (SIA 469) | Zustandswert, Instandhaltungsraten, Bauteil-Lebensdauern (SIA 469) | C |
| **energy_verbrauchswerte** | Measured annual energy consumption (heat, electricity, water) — distinct from design Bedarfswerte | Gemessener jährlicher Energieverbrauch (Wärme, Strom, Wasser) — zu unterscheiden von berechneten Bedarfswerten | C |

---

## 2. Bauprojekt (Construction Project) — Primary Benchmark Entity

A Bauprojekt is an intervention for which a Baubewilligungsgesuch (VGWR Art. 2) is required, or a comparable intervention subject to notification. It is the entity for which a Kostenschätzung is prepared, a Verpflichtungskredit approved, and a Schlussabrechnung produced. **All cost benchmarking in kennwerte-db is at the Bauprojekt level.**

*Das Bauprojekt ist die primäre Benchmarkentität: das Objekt, für das ein Baubewilligungsgesuch gestellt wird, ein Verpflichtungskredit genehmigt und eine Schlussabrechnung erstellt wird.*

### 2.1 Project Identity (Projektidentifikation)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **id** | UUID | Internal project identifier | Interner Projektschlüssel | M |
| **gebaeude_id** | UUID FK | Link to Gebäude — nullable for Neubauten (no EGID at planning stage) | Verweis auf Gebäude — nullable für Neubauten (kein EGID in der Planungsphase) | S |
| **project_name** | Text | Name of the construction project | Name des Bauprojekts | M |
| **internal_id** | Text | Internal BBL / VBS project reference number | Interne BBL-/VBS-Projektreferenz | M |
| **data_source** | Text | Source of the data record (e.g. werk-material, BBL intern, Bauökonom·in) | Datenquelle (z.B. werk-material, BBL intern, Bauökonom·in) | M |
| **publication_date** | Date | Date the data record was published or submitted | Publikations- oder Einreichungsdatum des Datensatzes | M |
| **created_at** | Timestamp | Record creation timestamp | Erfassungszeitpunkt | M |

### 2.2 Art der Arbeiten and Project Classification (Art der Arbeiten / Projektklass.)

The **Art der Arbeiten** field aligns with the GWR definition: Neubau (complete new construction), Umbau (all other interventions — see subtypes), Abbruch (complete demolition). For kennwerte-db the practically relevant subtypes of Umbau are Erweiterung, Sanierung, and Umbau (interior conversion).

*Die Art der Arbeiten folgt der GWR-Definition (VGWR Art. 2).*

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **arbeiten_type** | Enum | Type of works → ref_arbeiten_type | Art der Arbeiten | M |
| **oag_code** | Text | CRB OAG Objektart as designed / renovated → ref_oag | CRB-Objektart des Bauprojekts (geplant / saniert) | M |
| **oag_name** | Text | OAG name (denormalized for display) | OAG-Bezeichnung | M |
| **work_category** | Text | CRB Werkkategorie | CRB-Werkkategorie | S |
| **portfolio** | Enum | BBL / VBS / ETH — may differ from Gebäude.portfolio for transferred assets | BBL / VBS / ETH — kann bei Übertragungen vom Gebäude.portfolio abweichen | M |
| **sub_portfolio** | Text | BBL sub-portfolio at time of project | BBL-Teilportfolio zum Zeitpunkt des Projekts | M |
| **federal_building_type** | Text | Federal building typology as designed | Bundesgebäudetyp gemäss Projektplanung | M |

Location fields are also on Bauprojekt (denormalized from Gebäude for Umbau; directly recorded for Neubau where no Gebäude exists yet):

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **municipality** | Text | Municipality where the project is located | Gemeinde des Bauprojekts | M |
| **postal_code** | Text | Postal code | Postleitzahl | M |
| **canton** | Text | Canton (2-letter code) | Kanton (2-stellig) | M |
| **region** | Text | BFS Grossregion → ref_grossregion | BFS-Grossregion | M |
| **altitude_masl** | Integer | Altitude in metres above sea level (affects cost benchmarking) | Höhenlage in Metern über Meer (relevant für Kostenvergleich) | S |

### 2.3 Building Characteristics as Designed (Gebäudeeigenschaften gemäss Planung)

These describe the building as planned or as realised through the project intervention — not the permanent state of the Gebäude.

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **construction_method** | Enum | Massivbau / Holzbau / Stahlbau / Mischbau / Holz-Beton | Bauweise | M |
| **procurement_model** | Enum | Unternehmereinsatzform: TU / GU / EU / GP | Unternehmereinsatzform | M |
| **roof_type** | Enum | Flat / pitched / shed / mono-pitch | Dachform | S |
| **facade_type** | Text | Facade type (mixed / glass / plaster / etc.) | Fassadentyp | S |
| **floors_above_ground** | Integer | Number of storeys above ground as designed | Anzahl Obergeschosse gemäss Planung | S |
| **basement_floors** | Integer | Number of basement levels as designed | Anzahl Untergeschosse gemäss Planung | C |
| **functional_units** | Integer | Count of functional units (e.g. planned workplaces, cells, lab benches) | Anzahl funktionale Einheiten (z.B. geplante Arbeitsplätze) | S |
| **intervention_scope_gf** | Decimal | For Umbau projects: the m² GF actually affected by the intervention (e.g. only one wing renovated); null for Neubau. Enables meaningful Umbau cost benchmarks by providing a scope-adjusted divisor | Für Umbauprojekte: die tatsächlich vom Eingriff betroffene m² GF (z.B. nur ein Flügel saniert); null bei Neubau. Ermöglicht aussagekräftige Umbau-Kostenkennwerte durch einen umfangbereinigten Divisor | S |
| **zoning_category** | Text | Zoning / land use at project location | Zonenart am Projektstandort | C |
| **classification_level** | Enum | Information classification per ISchV: INTERN / VERTRAULICH / GEHEIM / none — controls visibility restrictions for VBS military infrastructure data | Informationsklassifizierung gemäss ISchV: INTERN / VERTRAULICH / GEHEIM / Keine — steuert Sichtbarkeitseinschränkungen für militärische Infrastrukturdaten des VBS | S |

### 2.4 Project Dates and Duration (Termine und Bauzeit)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **completion_date** | Date | Completion / handover date | Fertigstellungsdatum / Inbetriebnahme | M |
| **construction_start** | Date | Construction start date | Baubeginn | S |
| **baubewilligung_date** | Date | Date Baubewilligung was granted | Datum der Baubewilligung | C |
| **planning_start** | Date | Planning start date | Planungsbeginn | C |
| **competition_date** | Date | Competition date (if applicable) | Wettbewerbsdatum | C |
| **construction_duration_months** | Integer | Duration from Baubeginn to Fertigstellung in months | Bauzeit von Baubeginn bis Fertigstellung in Monaten | S |
| **phase_at_recording** | Enum | Phase at which cost data was recorded | Projektphase bei Kostenerfassung | M |

### 2.5 Project Control (Projektsteuerung / Verpflichtungskredit)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **verpflichtungskredit_chf** | Decimal | Approved budget commitment (Verpflichtungskredit, VK) in CHF | Genehmigter Verpflichtungskredit (VK) in CHF | S |
| **vk_approval_authority** | Text | Authority that approved the VK (Bundesrat / Generalsekretariat / Abteilungsleitung) | Genehmigungsinstanz des VK | S |
| **vk_approval_date** | Date | Date of VK approval | Datum der VK-Genehmigung | S |
| **vk_index_year** | Integer | BPI reference year at VK approval — enables Teuerungsbereinigung of VK to completion date for multi-year projects | BPI-Bezugsjahr bei VK-Genehmigung — ermöglicht Teuerungsbereinigung des VK auf Fertigstellungsdatum | S |
| **vk_index_quarter** | Integer | BPI reference quarter (1–4) at VK approval | BPI-Bezugsquartal (1–4) bei VK-Genehmigung | S |
| **credit_utilisation** | Decimal | Kreditausschöpfung: Schlussabrechnung / VK (computed) | Kreditausschöpfung: Verhältnis Schlussabrechnung / VK (berechnet) | S |
| **credit_utilisation_indexed** | Decimal | Kreditausschöpfung teuerungsbereinigt: Schlussabrechnung / VK (both index-adjusted to completion date; computed) | Kreditausschöpfung teuerungsbereinigt: Schlussabrechnung / VK (beide auf Fertigstellungsdatum indexbereinigt; berechnet) | S |

### 2.6 Involved Parties (Beteiligte)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **client_type** | Enum | Public / private / mixed | Bauherrschaft (öffentlich / privat / gemischt) | M |
| **client_name** | Text | Client organisation name | Name der Bauherrschaft | S |
| **architect** | Text | Architecture firm | Architekturbüro | S |
| **general_planner** | Text | General planner (if applicable) | Generalplaner | C |
| **cost_planner** | Text | Bauökonomie / cost planning firm | Büro für Bauökonomie / Kostenplaner·in | C |
| **hvac_engineer** | Text | HVAC engineering firm | HLK-Planer | C |
| **electrical_engineer** | Text | Electrical engineering firm | Elektroplaner | C |
| **other_parties** | JSONB | Additional parties as key-value list | Weitere Beteiligte | C |

### 2.7 SIA 416 — Areas and Volumes as Designed (Flächen und Volumen gemäss Planung)

All measurements per SIA 416:2003. These are the **as-designed** quantities for the Bauprojekt — the divisors used for cost benchmark calculations. They reflect the programme as planned or realised through this intervention, not necessarily the current physical state of the Gebäude.

*Alle Mengen gemäss SIA 416:2003. Es handelt sich um die geplanten Mengen des Bauprojekts — die Divisoren für Kostenkennwertberechnungen.*

#### Plot areas (Grundstücksflächen)

| Field | Unit | Formula | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|---|
| **gsf** | m² | GSF = GGF + UF | Total plot area | Grundstücksfläche | S |
| **ggf** | m² | — | Building footprint | Gebäudegrundfläche | S |
| **uf** | m² | GSF − GGF | Surrounding area | Umgebungsfläche | C |
| **buf** | m² | Subset of UF | Developed surrounding area | Bearbeitete Umgebungsfläche | C |

#### Floor areas (Geschossflächen)

| Field | Unit | Formula | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|---|
| **gf** | m² | GF = NGF + KF | Gross floor area — primary cost divisor | Geschossfläche — primärer Kostendivisor | M |
| **ngf** | m² | NGF = NF + VF + FF | Net floor area | Nettogeschossfläche | M |
| **nf** | m² | NF = HNF + NNF | Usable area | Nutzfläche | M |
| **hnf** | m² | Sum HNF 1–6 | Primary usable area | Hauptnutzfläche | M |
| **hnf_1** | m² | — | Living and recreation | Wohnen und Aufenthalt | S |
| **hnf_2** | m² | — | Office work | Büroarbeit | M |
| **hnf_3** | m² | — | Production and workshop | Produktion, Hand- und Maschinenarbeit | S |
| **hnf_4** | m² | — | Storage, distribution, retail | Lagern, Verteilen, Verkaufen | S |
| **hnf_5** | m² | — | Education and culture | Bildung, Unterricht, Kultur | S |
| **hnf_6** | m² | — | Healthcare | Heilen und Pflegen | C |
| **nnf** | m² | NF − HNF | Secondary usable area | Nebennutzfläche | S |
| **vf** | m² | — | Circulation area | Verkehrsfläche | S |
| **ff** | m² | — | Technical / services area | Funktionsfläche | S |
| **kf** | m² | GF − NGF | Structural area | Konstruktionsfläche | S |
| **kft** | m² | Subset of KF | Load-bearing structural area | KF tragend | C |
| **kfn** | m² | Subset of KF | Non-load-bearing structural area | KF nicht tragend | C |
| **agf** | m² | — | Exterior floor area | Aussen-Geschossfläche | C |
| **faw** | m² | — | Exterior wall area (eBKP-H ref.) | Fassadenfläche Aussenwand | S |
| **fb** | m² | — | Roof area (eBKP-H ref.) | Fläche Bedachung | S |

#### Volumes (Gebäudevolumen)

| Field | Unit | Formula | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|---|
| **gv** | m³ | Σ(GF × storey height) | Gross building volume | Gebäudevolumen SIA 416 | M |
| **av** | m³ | Above-ground share | Above-ground volume | Aufgehendes Volumen | S |
| **uv** | m³ | Below-ground share | Below-ground volume | Unterirdisches Volumen | S |

#### Derived ratios (Kennzahlen / Formquotienten)

Stored for query performance; always derivable from raw quantities.

| Field | Formula | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **ratio_gv_gf** | GV / GF | Form quotient — primary shape indicator (m) | Formquotient GV/GF | M |
| **ratio_ngf_gf** | NGF / GF | Area efficiency | Flächeneffizienz NGF/GF | M |
| **ratio_nf_gf** | NF / GF | Usable area ratio | Nutzflächenanteil NF/GF | M |
| **ratio_hnf_gf** | HNF / GF | Primary usable area ratio | Hauptnutzflächenanteil HNF/GF | M |
| **ratio_faw_gf** | FAW / GF | Facade-to-floor ratio | Fassadenflächenanteil FAW/GF | S |
| **ratio_fb_gf** | FB / GF | Roof-to-floor ratio | Dachflächenanteil FB/GF | C |

### 2.8 Media and Documents (Medien und Dokumente)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **images** | Array | Photo references (exterior / interior at time of project) | Fotos zum Zeitpunkt des Projekts | S |
| **floor_plans** | Array | Floor plan documents (PDF / DWG / IFC) | Grundrisspläne | S |
| **sections** | Array | Section drawings | Schnittzeichnungen | C |
| **facade_drawings** | Array | Facade elevation drawings | Fassadenpläne | C |
| **bim_model** | URL | Link to IFC / BIM model | Verweis auf IFC/BIM-Modell | C |
| **project_description** | Text | Free-text project description | Projektbeschrieb | S |
| **space_programme** | Text | Space programme summary | Raumprogramm-Zusammenfassung | C |
| **structural_description** | Text | Structural system description | Konstruktionsbeschrieb | C |
| **building_services_description** | Text | Building services description | Gebäudetechnikbeschrieb | C |

---

## 3. Kennwerte (Cost and Performance KPIs)

All cost KPIs are anchored to a **Bauprojekt**. A Bauprojekt may have multiple cost records — one per project phase and cost system. Energy KPIs (Bedarfswerte) are also Bauprojekt-specific design values.

FM operating costs and measured energy consumption (Verbrauchswerte) are anchored to **Gebäude** (v2, out of scope for v1).

### 3.1 Cost Record Metadata (Kostendaten-Metadaten)

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **id** | UUID | Record identifier | Datensatzschlüssel | M |
| **bauprojekt_id** | UUID FK | Reference to Bauprojekt | Verweis auf Bauprojekt | M |
| **cost_system** | Enum | BKP / eBKP-H | Kostenplansystem | M |
| **cost_level** | Enum | Anlagekosten / Erstellungskosten / Gebäudekosten | Kostenstufe | M |
| **total_chf** | Decimal | Total cost in CHF as recorded (may be incl. or excl. MWSt — see mwst_included) | Gesamtkosten in CHF wie erfasst (inkl. oder exkl. MWSt — siehe mwst_included) | M |
| **index_year** | Integer | Reference year for BFS Baupreisindex (BPI) | Bezugsjahr des BFS Baupreisindex (BPI) | M |
| **index_quarter** | Integer | Reference quarter (1–4) for BPI adjustment | Bezugsquartal (1–4) für BPI-Bereinigung | M |
| **index_value** | Decimal | BPI value at recording → ref_baukostenindex | BPI-Indexstand bei Erfassung | M |
| **project_phase** | Enum | Kostenschätzung / Kostenvoranschlag / Kostenberechnung / Schlussabrechnung | Projektphase bei Kostenerfassung | M |
| **mwst_included** | Boolean | True if total_chf is recorded incl. MWSt; all benchmark calculations normalise to excl. MWSt | True wenn total_chf inkl. MWSt erfasst ist; Kennwertberechnungen werden auf exkl. MWSt normiert | M |
| **mwst_rate** | Decimal | MWSt rate if mwst_included = true (e.g. 0.081) | MWSt-Satz wenn mwst_included = true (z.B. 0,081) | S |
| **honorare_included** | Boolean | True if BKP 29 / eBKP-H V (Planungskosten / Honorare) are included in total_chf | True wenn BKP 29 / eBKP-H V (Honorare) in total_chf enthalten sind | M |
| **data_confidence** | Enum | Schlussabrechnung / Kostenvoranschlag / Kostenschätzung / Schätzung | Datenqualitätsstufe der Quelle | M |
| **exclude_from_benchmarks** | Boolean | If true, this cost record is excluded from Vergleichsmenge statistics and regression model training (e.g. outlier, known data quality issue) | Wenn true, wird dieser Kostendatensatz von Vergleichsmengenstatistiken und Regressionsmodellen ausgeschlossen (z.B. Ausreisser, bekanntes Datenqualitätsproblem) | S |
| **exclusion_reason** | Text | Mandatory justification when exclude_from_benchmarks = true | Obligatorische Begründung wenn exclude_from_benchmarks = true | S |

### 3.2 BKP Cost Breakdown (BKP-Kostenstruktur)

Stored as JSONB with 1-digit and 2-digit BKP codes as keys. Full hierarchy in ref_bkp. 3-digit BKP codes (e.g. 211, 221, 241) may optionally be included in the JSONB where available, enabling finer-grained cost analysis (Could have, v2).

| BKP | Name (DE) | Typical % of EK | MoSCoW |
|---|---|---|---|
| **0** | Grundstück | land cost | S |
| **1** | Vorbereitungsarbeiten | 3–8% | S |
| **2** | Gebäude (total) | 65–85% | M |
| **21** | Rohbau 1 | ~60% of BKP 2 | M |
| **22** | Rohbau 2 — Hülle | 8–12% of BKP 2 | M |
| **23** | Elektroanlagen | 8–10% of BKP 2 | M |
| **24** | HLK-Anlagen | 8–12% of BKP 2 | M |
| **25** | Sanitäranlagen | 5–7% of BKP 2 | M |
| **26** | Transportanlagen | ~3.5% of BKP 2 | S |
| **27** | Ausbau 1 | 5–8% of BKP 2 | S |
| **28** | Ausbau 2 | 5–8% of BKP 2 | S |
| **29** | Honorare | 15–20% of BKP 2 | M |
| **4** | Umgebung | 5–10% | S |
| **5** | Baunebenkosten | 5–10% | S |
| **9** | Ausstattung | 1–5% | C |

**Cost aggregation definitions**

| Term | Scope | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **Anlagekosten (AK)** | BKP 0–9 | Total investment incl. land | Gesamtinvestition inkl. Grundstück | M |
| **Erstellungskosten (EK)** | BKP 1–9 | Construction costs excl. land | Baukosten ohne Grundstück | M |
| **Gebäudekosten (GK)** | BKP 2 only | Building costs — primary benchmark base | Gebäudekosten — primäre Benchmarkbasis | M |

### 3.3 eBKP-H Cost Breakdown (eBKP-H-Kostenstruktur)

Stored as JSONB with element codes as keys. Reference quantities defined per element group in ref_ebkph.

| Code | Name (DE) | Reference quantity | MoSCoW |
|---|---|---|---|
| **C** | Konstruktion Gebäude | m² GF | M |
| **C01** | Fundament / Bodenplatte | m² GF | S |
| **C02** | Wandkonstruktion | m² GF | S |
| **C03** | Stützenkonstruktion | m² GF | S |
| **C04** | Decken- / Dachkonstruktion | m² GF | S |
| **D** | Technik Gebäude | m² GF | M |
| **D01** | Elektroanlage | m² GF | S |
| **D05** | Wärmetechnische Anlage | m² GF | S |
| **D07** | Lufttechnische Anlage | m² GF | S |
| **D08** | Wassertechnische Anlage | m² GF | S |
| **D12** | Beförderungsanlage | m² GF | C |
| **E** | Äussere Wandbekleidung | m² FAW | M |
| **E02** | Aussenwand über Terrain | m² FAW | S |
| **E03** | Elemente in Aussenwand (Fenster / Türen) | m² FAW | S |
| **F** | Bedachung | m² FB | S |
| **G** | Ausbau Gebäude | m² GF | M |
| **G01** | Trennwände / Innentüren | m² GF | S |
| **G02** | Bodenbeläge | m² GF | S |
| **V** | Planungskosten | Betrag B–J | S |
| **W** | Nebenkosten Erstellung | m² GF | S |
| **Z** | Mehrwertsteuer | Betrag B–Y | S |

**eBKP-H aggregations**

| Term | Scope | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **Erstellungskosten** | B–W | Total construction costs | Erstellungskosten | M |
| **Bauwerkskosten** | C–G | Core building element costs | Bauwerkskosten (Elemente) | M |

### 3.4 Benchmark Values (Kennwerte)

Derived from cost records and SIA 416 quantities of the Bauprojekt. Each row is one KPI for one cost scope.

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **id** | UUID | Record identifier | Datensatzschlüssel | M |
| **bauprojekt_id** | UUID FK | Reference to Bauprojekt | Verweis auf Bauprojekt | M |
| **cost_record_id** | UUID FK | Reference to cost record | Verweis auf Kostendatensatz | M |
| **benchmark_type** | Enum | CHF/m² GF / CHF/m³ GV / CHF/m² NGF / CHF/m² HNF / % GK / % EK | Kennwerttyp | M |
| **cost_scope** | Text | BKP or eBKP-H code (e.g. '2', 'C', '24') | Kostenposition | M |
| **scope_name** | Text | Human-readable label | Bezeichnung der Kostenposition | M |
| **value_chf** | Decimal | Benchmark value (normalised: excl. MWSt, toggle for Honorare) | Kennwertwert (normiert: exkl. MWSt, Honorare konfigurierbar) | M |
| **divisor_quantity** | Decimal | Reference quantity used as divisor | Bezugsgrösse (Divisor) | M |
| **divisor_unit** | Text | Unit of divisor (m2_GF / m3_GV / etc.) | Einheit des Divisors | M |
| **percentile_rank** | Decimal | Position within peer group (0–100) | Perzentilrang in der Vergleichsmenge | C |

### 3.5 Energy KPIs — Bedarfswerte (Linked to Bauprojekt)

Design / calculated values produced during the Bauprojekt planning and certification process (SIA 380/1 calculations, MINERGIE certificate application). These are project-specific and may differ substantially from actual measured consumption (Verbrauchswerte), which would be linked to Gebäude in v2.

*Berechnete Planwerte aus der Projektplanung und Zertifizierung. Vom tatsächlich gemessenen Verbrauch (Verbrauchswerte, Gebäude-Ebene, v2) zu unterscheiden.*

| Field | Unit | Standard | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|---|
| **bauprojekt_id** | — | — | Reference to Bauprojekt | Verweis auf Bauprojekt | M |
| **ebf** | m² | SIA 416/1 | Energy reference area | Energiebezugsfläche | M |
| **envelope_ratio** | Ath/AE | SIA 380/1 | Thermal envelope compactness (Gebäudehüllzahl) | Gebäudehüllzahl | M |
| **qh** | kWh/m²a | SIA 380/1 | Calculated heating energy demand | Berechneter Heizwärmebedarf | M |
| **qh_limit** | kWh/m²a | SIA 380/1 | Normative limit value for Qh | Grenzwert Heizwärmebedarf | S |
| **qww** | kWh/m²a | SIA 380/1 | Calculated domestic hot water demand | Berechneter Wärmebedarf Warmwasser | S |
| **minergie_index** | kWh/m²a | Minergie | Weighted end energy per m² EBF | Minergie-Kennzahl | S |
| **primary_energy** | kWh/m²a | SIA 2040 | Non-renewable primary energy (calculated) | Berechnete Primärenergie (nicht erneuerbar) | S |
| **ghg_operational** | kg CO₂eq/m²a | SIA 2040 | Calculated operational GHG emissions | Berechnete THG-Emissionen Betrieb | S |
| **ghg_embodied** | kg CO₂eq/m²a | SIA 2040 | Embodied CO₂ (calculated, amortized) | Graue Emissionen Erstellung (berechnet, amortisiert) | C |
| **heat_recovery_rate** | 0–1 | SIA 382/1 | Ventilation heat recovery efficiency | Wärmerückgewinnungskoeffizient Lüftung | S |
| **pv_share** | % | — | Photovoltaic share (designed) | Geplanter Anteil Fotovoltaik | S |
| **renewable_share** | % | — | Total renewable energy share (designed) | Geplanter Anteil erneuerbarer Energien | S |
| **energy_standard** | Enum | — | Minergie / P / A / ECO / Standard | Energiestandard | M |
| **geak_envelope** | A–G | GEAK | Envelope efficiency class (calculated) | GEAK-Klasse Gebäudehülle (berechnet) | S |
| **geak_overall** | A–G | GEAK | Overall energy class (calculated) | GEAK-Gesamtklasse (berechnet) | S |
| **energy_carrier** | Enum | — | Primary energy carrier as designed | Hauptenergieträger gemäss Planung | M |
| **heating_system** | Text | — | Heating system as designed | Heizsystem gemäss Planung | M |
| **sia380_category** | Enum | SIA 380/1 | Building category I–XII | SIA-380/1-Gebäudekategorie | S |

### 3.6 FM / Operating Costs (Betriebskosten) — v2, linked to Gebäude

Ongoing annual operating costs of the physical asset. Linked to `gebaeude_id`. Out of scope for v1.

*Jährliche Betriebskosten des physischen Objekts. Verknüpft mit gebaeude_id. Ausserhalb des v1-Scopes.*

| NKG | Name (DE) | Typical CHF/m² BGF/a | MoSCoW |
|---|---|---|---|
| **300** | Betriebskosten (total) | ~35 | C |
| **310** | Versorgung (Energie + Wasser) | ~8 | C |
| **316** | Strom | ~4.50 | C |
| **330** | Reinigung Gebäude (total) | ~9.50 | C |
| **350** | Wartung und Inspektion | ~11.80 | C |
| **360** | Sicherheitsdienste | ~3.50 | C |
| **400** | Instandsetzung (total) | ~12.00 | C |

### 3.7 Lifecycle and Condition Data (Lebenszyklusdaten) — v2, linked to Gebäude

Per SIA 469. Linked to `gebaeude_id`. Out of scope for v1.

| Field | Type | Description (EN) | Description (DE) | MoSCoW |
|---|---|---|---|---|
| **condition_value** | Decimal 0.2–1.0 | Overall condition per SIA 469 scale | Zustandswert nach SIA 469 | C |
| **last_inspection_date** | Date | Last formal condition survey | Datum letzte Zustandserhebung | C |
| **maintenance_rate** | Decimal % | Annual maintenance rate (% of replacement value) | Instandhaltungsrate (% Wiederbeschaffungswert) | C |
| **element_lifespans** | JSONB | Component lifespans in years (Tragwerk, Fenster, etc.) | Lebensdauer Bauteile in Jahren | C |

---

## 4. Reference Data (Referenzdaten)

Controlled vocabularies and lookup tables. All enumerated fields in sections 1–3 reference one of these lists.

### 4.1 ref_portfolio

| Code | Name (EN) | Name (DE) | Name (FR) |
|---|---|---|---|
| BBL | Federal Office for Buildings and Logistics | Bundesamt für Bauten und Logistik | Office fédéral des constructions et de la logistique |
| VBS | armasuisse Real Estate | armasuisse Immobilien | armasuisse Immobilier |
| ETH | ETH Domain | ETH-Bereich | Domaine des EPF |

### 4.2 ref_sub_portfolio (BBL)

| Code | Name (EN) | Name (DE) | Name (FR) | Share |
|---|---|---|---|---|
| ALLG | General Federal Administration | Allgemeine Bundesverwaltung | Administration fédérale générale | 55% |
| AUSL | Foreign (Embassies / Consulates) | Ausland | Étranger | 10% |
| ZOLL | Customs | Zoll | Douanes | 10% |
| KULT | Arts and Culture | Kunst und Kultur | Arts et culture | 7% |
| SPORT | Sport | Sport | Sport | 6% |
| FORSCH | Research | Forschung | Recherche | 5% |
| GERICHT | Courts | Gerichte | Tribunaux | 3% |
| INFRA | Infrastructure | Infrastruktur | Infrastructure | 3% |
| REPR | Domestic Representation | Repräsentation Inland | Représentation nationale | 1% |

### 4.3 ref_federal_building_type

| Code | Name (EN) | Name (DE) | Name (FR) | Portfolio | CRB OAG |
|---|---|---|---|---|---|
| VERW | Administrative building | Verwaltungsgebäude | Bâtiment administratif | BBL | 1.3.4 |
| REGIERUNG | Government building | Regierungsgebäude | Bâtiment gouvernemental | BBL | 1.3.4 |
| GERICHT | Court building | Gerichtsgebäude | Bâtiment judiciaire | BBL | 1.3.4 |
| BOTSCHAFT | Embassy / consulate | Botschaft / Konsulat | Ambassade / consulat | BBL | 1.3.4 |
| ZOLLANLAGE | Customs facility / border post | Zollanlage / Grenzwachtstützpunkt | Installation douanière / poste-frontière | BBL | (extension) |
| FORSCHUNG | Research institute | Forschungsanstalt | Institut de recherche | BBL | 1.2.5 |
| LABOR | Laboratory | Labor | Laboratoire | BBL/VBS | 1.2.5 |
| MUSEUM | Museum / cultural building | Museum / Kulturgebäude | Musée / bâtiment culturel | BBL | 1.5.x |
| SPORT | Sports facility | Sportanlage | Installation sportive | BBL | 1.5.x |
| BAZ | Federal asylum centre | Bundesasylzentrum | Centre fédéral pour requérants d'asile | BBL | 1.1.3 |
| WOHNEN | Staff residential building | Dienstwohngebäude | Immeuble d'habitation de service | BBL/VBS | 1.1.x |
| RZ | Data centre | Rechenzentrum | Centre de données | BBL/VBS | (extension) |
| HIST | Heritage / listed building | Historisches Gebäude / Denkmal | Bâtiment historique / monument | BBL/VBS | (heritage flag) |
| KASERNE | Barracks / military base | Kaserne / Waffenplatz | Caserne / place d'armes | VBS | (military ext.) |
| ZEUGHAUS | Armoury / depot | Zeughaus | Arsenal | VBS | 1.3.3 |
| WERKSTATT | Workshop | Werkstatt | Atelier | VBS | 1.3.2 |
| LAGER | Store / warehouse | Magazin / Lager | VBS | 1.3.3 |
| SCHUTZ | Protective structure / bunker | Schutzbauwerk / Bunker | Ouvrage de protection / bunker | VBS | (military ext.) |
| SIMULATOR | Simulator building | Simulatorgebäude | Bâtiment simulateur | VBS | 1.2.5 |
| FLUGPLATZ | Military airfield | Militärischer Flugplatz | Aérodrome militaire | VBS | (military ext.) |
| SCHIESS | Shooting range | Schiessanlage | Stand de tir | VBS | (military ext.) |
| HOEHEN | Alpine / high-altitude facility | Höhenanlage | Installation en altitude | VBS | (military ext.) |

### 4.4 ref_oag (CRB Objektartengliederung)

Key entries relevant to the federal portfolio:

| Code | Level | Name (EN) | Name (DE) | Name (FR) | Parent |
|---|---|---|---|---|---|
| 1 | 1 | Buildings | Gebäude | Bâtiments | — |
| 1.1 | 2 | Residential | Wohnen | Habitation | 1 |
| 1.1.2 | 3 | Multi-family house | Mehrfamilienhaus | Immeuble d'habitation | 1.1 |
| 1.1.3 | 3 | Residential home | Wohnheim | Foyer d'habitation | 1.1 |
| 1.2 | 2 | Education and research | Unterricht, Bildung, Forschung | Enseignement, formation, recherche | 1 |
| 1.2.2 | 3 | General school | Allgemeinbildende Schule | École d'enseignement général | 1.2 |
| 1.2.4 | 3 | University | Hochschule | Haute école | 1.2 |
| 1.2.5 | 3 | Laboratory / research building | Labor-/Forschungsgebäude | Laboratoire / bâtiment de recherche | 1.2 |
| 1.2.6 | 3 | Library / archive | Bibliothek / Archiv | Bibliothèque / archives | 1.2 |
| 1.3 | 2 | Industry, trade, administration | Industrie, Handel, Verwaltung | Industrie, commerce, administration | 1 |
| 1.3.2 | 3 | Workshop / commercial building | Werkstatt-/Gewerbegebäude | Atelier / bâtiment commercial | 1.3 |
| 1.3.3 | 3 | Storage building | Lagergebäude | Bâtiment de stockage | 1.3 |
| 1.3.4 | 3 | Office / administrative building | Büro-/Verwaltungsgebäude | Bâtiment de bureaux / administratif | 1.3 |
| 1.4 | 2 | Health and social care | Gesundheit, Soziales | Santé, affaires sociales | 1 |
| 1.5 | 2 | Leisure, sport, recreation | Freizeit, Sport, Erholung | Loisirs, sport, détente | 1 |
| 1.6 | 2 | Hospitality and tourism | Gastgewerbe, Tourismus | Hôtellerie, tourisme | 1 |
| 1.7 | 2 | Transport and traffic | Verkehr, Transport | Transports, circulation | 1 |

Table also stores: `func_unit_a`, `func_unit_b`.

### 4.5 ref_bkp (CRB Baukostenplan)

Fields: `code`, `level` (1–4), `name_de`, `name_fr`, `parent_code`.

| Code | Level | Name (DE) |
|---|---|---|
| 0–9 | 1 | Hauptgruppen (Grundstück, Gebäude, Umgebung, etc.) |
| 20–29 | 2 | BKP-2-Positionen (Baugrube, Rohbau 1–2, Elektroanlagen, HLK, Sanitär, etc.) |

### 4.6 ref_ebkph (CRB eBKP-H)

Fields: `code`, `level`, `name_de`, `name_fr`, `parent_code`, `reference_quantity_a`, `reference_quantity_b`.

| Code | Level | Name (DE) | Reference quantity A |
|---|---|---|---|
| C–Z | 1 | Hauptgruppen (Konstruktion, Technik, Wandbekleidung, etc.) | m² GF / m² FAW / m² FB / Betrag |
| C01–G06 | 2 | Elementgruppen | m² GF / m² FAW |

### 4.7 ref_arbeiten_type (Art der Arbeiten — GWR-aligned)

| Code | Name (EN) | Name (DE) | Name (FR) | GWR category |
|---|---|---|---|---|
| NEUBAU | New construction | Neubau | Construction nouvelle | Neubau |
| UMBAU_ERWEITERUNG | Extension / enlargement | Erweiterung | Agrandissement | Umbau |
| UMBAU_SANIERUNG | Refurbishment / renovation | Sanierung | Rénovation | Umbau |
| UMBAU_TEILABBRUCH | Partial demolition | Teilabbruch | Démolition partielle | Umbau |
| UMBAU | Interior conversion | Umbau (Innenumbau) | Transformation intérieure | Umbau |
| ABBRUCH | Complete demolition | Abbruch | Démolition | Abbruch |

### 4.8 ref_grossregion (BFS Grossregionen)

| Code | BFS code | Name (EN) | Name (DE) | Name (FR) |
|---|---|---|---|---|
| GEN | 1 | Lake Geneva region | Genferseeregion | Région lémanique |
| MIT | 2 | Espace Mittelland | Espace Mittelland | Espace Mittelland |
| NWS | 3 | Northwestern Switzerland | Nordwestschweiz | Suisse du Nord-Ouest |
| ZH | 4 | Zurich | Zürich | Zurich |
| OST | 5 | Eastern Switzerland | Ostschweiz | Suisse orientale |
| ZEN | 6 | Central Switzerland | Zentralschweiz | Suisse centrale |
| TI | 7 | Ticino | Tessin | Tessin |

### 4.9 ref_baukostenindex

Source: BFS Schweizerischer Baupreisindex (BPI), published quarterly.

| Field | Description (EN) | Description (DE) |
|---|---|---|
| **year** | Reference year | Bezugsjahr |
| **quarter** | Reference quarter (1–4) | Bezugsquartal (1–4) |
| **region** | BFS Grossregion → ref_grossregion | BFS-Grossregion |
| **index_value** | BPI index value (base year = 100) | BPI-Indexstand |
| **base_year** | Base year for this index series | Basisjahr der Indexreihe |

### 4.10 Enumerations (Wertelisten)

| Enumeration | Values (EN / DE) |
|---|---|
| **arbeiten_type** | New construction / Neubau · Extension / Umbau-Erweiterung · Renovation / Umbau-Sanierung · Partial demolition / Umbau-Teilabbruch · Interior conversion / Umbau · Demolition / Abbruch |
| **construction_method** | Solid / Massivbau · Timber / Holzbau · Steel / Stahlbau · Mixed / Mischbau · Timber-concrete / Holz-Beton |
| **procurement_model** | Totalunternehmer (TU) · Generalunternehmer (GU) · Einzelunternehmer (EU) · Generalplanervertrag (GP) |
| **roof_type** | Flat / Flachdach · Gabled / Satteldach · Mono-pitch / Pultdach · Hip / Walmdach · Shed / Sheddach · Barrel / Tonnendach |
| **urban_context** | Urban / Städtisch · Peri-urban / Agglomeration · Rural / Ländlich |
| **phase_at_recording** | Kostenschätzung · Kostenvoranschlag · Kostenberechnung · Schlussabrechnung |
| **client_type** | Public / Öffentlich · Private / Privat · Mixed / Gemischt |
| **heritage_status** | Listed / Denkmalschutz · HOBIM · ADAB · Inventory / Inventar · None / Keine |
| **data_confidence** | Schlussabrechnung · Kostenvoranschlag · Kostenschätzung · Schätzung |
| **energy_standard** | Minergie · Minergie-P · Minergie-A · Minergie-ECO · Standard |
| **energy_carrier** | Heat pump / Wärmepumpe · District heating / Fernwärme · Natural gas / Erdgas · Heating oil / Heizöl · Wood / Holz · Solar · Electric / Elektrisch · Mixed / Gemischt |
| **sia380_category** | I Residential MFH · II Residential SFH · III Office / Verwaltung · IV Schools / Schulen · V Retail / Verkauf · VIII Hospital / Spital · IX Industry / Industrie |
| **benchmark_type** | CHF/m²_GF · CHF/m³_GV · CHF/m²_NGF · CHF/m²_HNF · CHF/m²_EBF · pct_GK · pct_EK |
| **classification_level** | INTERN / VERTRAULICH / GEHEIM / None (per ISchV — Informationsschutzverordnung) |

---

## 5. SQL Schema

PostgreSQL implementation. **Bauprojekt** is the primary entity. **Gebäude** is a lightweight optional parent. All cost and KPI tables reference `bauprojekt_id`. FM and lifecycle tables reference `gebaeude_id` (v2).

### 5.1 Table: `gebaeude`

```sql
CREATE TABLE gebaeude (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- GWR reference
  egid                  INTEGER UNIQUE,          -- nullable: non-residential VBS buildings often absent
  egrid                 TEXT,
  baujahr               INTEGER,

  -- Permanent location
  street                TEXT,
  postal_code           TEXT NOT NULL,
  municipality          TEXT NOT NULL,
  canton                CHAR(2) NOT NULL,
  region                TEXT REFERENCES ref_grossregion(code),
  coord_e               DECIMAL(10,2),
  coord_n               DECIMAL(10,2),

  -- Portfolio classification (permanent, current state)
  portfolio             TEXT NOT NULL,
  sub_portfolio         TEXT,
  federal_building_type TEXT REFERENCES ref_federal_building_type(code),
  oag_code              TEXT REFERENCES ref_oag(code),
  oag_name              TEXT,
  heritage_status       TEXT,
  building_series       TEXT,
  urban_context         TEXT,
  altitude_masl         INTEGER,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Table: `bauprojekt`

```sql
CREATE TABLE bauprojekt (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Optional link to physical building (null for Neubau at planning stage)
  gebaeude_id           UUID REFERENCES gebaeude(id),

  -- Project identity
  project_name          TEXT NOT NULL,
  internal_id           TEXT,
  data_source           TEXT NOT NULL,
  publication_date      DATE,

  -- Art der Arbeiten (GWR-aligned)
  arbeiten_type         TEXT NOT NULL,       -- NEUBAU / UMBAU_ERWEITERUNG / UMBAU_SANIERUNG / UMBAU_TEILABBRUCH / UMBAU / ABBRUCH

  -- Classification as designed
  oag_code              TEXT REFERENCES ref_oag(code),
  oag_name              TEXT,
  work_category         TEXT,
  portfolio             TEXT NOT NULL,
  sub_portfolio         TEXT,
  federal_building_type TEXT REFERENCES ref_federal_building_type(code),

  -- Location (always on Bauprojekt; denormalized from Gebäude for Umbau, direct for Neubau)
  municipality          TEXT NOT NULL,
  postal_code           TEXT NOT NULL,
  canton                CHAR(2) NOT NULL,
  region                TEXT REFERENCES ref_grossregion(code),
  altitude_masl         INTEGER,

  -- Building characteristics as designed
  construction_method   TEXT,
  procurement_model     TEXT,
  roof_type             TEXT,
  facade_type           TEXT,
  floors_above_ground   INTEGER,
  basement_floors       INTEGER,
  functional_units      INTEGER,
  intervention_scope_gf DECIMAL(12,2),  -- Umbau only: m² GF affected by intervention
  zoning_category       TEXT,
  classification_level  TEXT,           -- ISchV: INTERN / VERTRAULICH / GEHEIM / NULL

  -- Project dates
  completion_date       DATE NOT NULL,
  construction_start    DATE,
  baubewilligung_date   DATE,
  planning_start        DATE,
  competition_date      DATE,
  construction_duration_months INTEGER,
  phase_at_recording    TEXT NOT NULL,

  -- Project control (Verpflichtungskredit)
  verpflichtungskredit_chf DECIMAL(14,2),
  vk_approval_authority TEXT,
  vk_approval_date      DATE,
  vk_index_year         INTEGER,           -- BPI year at VK approval (for Teuerungsbereinigung)
  vk_index_quarter      INTEGER CHECK (vk_index_quarter BETWEEN 1 AND 4),
  credit_utilisation    DECIMAL(6,4),      -- Schlussabrechnung / VK, computed
  credit_utilisation_indexed DECIMAL(6,4), -- Teuerungsbereinigt: both indexed to completion date

  -- Involved parties
  client_type           TEXT,
  client_name           TEXT,
  architect             TEXT,
  other_parties         JSONB,

  -- Media / documents
  project_description   TEXT,
  space_programme       TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_umbau_needs_gebaeude
    CHECK (arbeiten_type = 'NEUBAU' OR gebaeude_id IS NOT NULL)
);

COMMENT ON CONSTRAINT chk_umbau_needs_gebaeude ON bauprojekt
  IS 'Umbau and Abbruch projects must link to an existing Gebäude record; only Neubau may have gebaeude_id = NULL';
```

### 5.3 Table: `sia416_bauprojekt`

As-designed SIA 416 quantities for the Bauprojekt. These are the cost benchmark divisors.

```sql
CREATE TABLE sia416_bauprojekt (
  bauprojekt_id         UUID PRIMARY KEY REFERENCES bauprojekt(id),

  -- Plot areas (m²)
  gsf                   DECIMAL(12,2),
  ggf                   DECIMAL(12,2),
  uf                    DECIMAL(12,2),
  buf                   DECIMAL(12,2),

  -- Floor areas (m²)
  gf                    DECIMAL(12,2) NOT NULL,
  ngf                   DECIMAL(12,2),
  nf                    DECIMAL(12,2),
  hnf                   DECIMAL(12,2),
  hnf_1                 DECIMAL(12,2),
  hnf_2                 DECIMAL(12,2),
  hnf_3                 DECIMAL(12,2),
  hnf_4                 DECIMAL(12,2),
  hnf_5                 DECIMAL(12,2),
  hnf_6                 DECIMAL(12,2),
  nnf                   DECIMAL(12,2),
  vf                    DECIMAL(12,2),
  ff                    DECIMAL(12,2),
  kf                    DECIMAL(12,2),
  kft                   DECIMAL(12,2),
  kfn                   DECIMAL(12,2),
  agf                   DECIMAL(12,2),
  faw                   DECIMAL(12,2),
  fb                    DECIMAL(12,2),

  -- Volumes (m³)
  gv                    DECIMAL(14,2) NOT NULL,
  av                    DECIMAL(14,2),
  uv                    DECIMAL(14,2),

  -- Computed ratios (generated columns)
  floors_above_ground   INTEGER,
  ratio_gv_gf           DECIMAL(6,3) GENERATED ALWAYS AS (gv / NULLIF(gf, 0)) STORED,
  ratio_ngf_gf          DECIMAL(5,4) GENERATED ALWAYS AS (ngf / NULLIF(gf, 0)) STORED,
  ratio_nf_gf           DECIMAL(5,4) GENERATED ALWAYS AS (nf  / NULLIF(gf, 0)) STORED,
  ratio_hnf_gf          DECIMAL(5,4) GENERATED ALWAYS AS (hnf / NULLIF(gf, 0)) STORED,
  ratio_faw_gf          DECIMAL(6,3) GENERATED ALWAYS AS (faw / NULLIF(gf, 0)) STORED,

  CONSTRAINT chk_gf_positive   CHECK (gf > 0),
  CONSTRAINT chk_gv_positive   CHECK (gv > 0),
  CONSTRAINT chk_ngf_lte_gf    CHECK (ngf IS NULL OR ngf <= gf),
  CONSTRAINT chk_formquotient  CHECK (gv / NULLIF(gf, 0) BETWEEN 2.0 AND 12.0)
);
```

### 5.4 Table: `cost_record`

```sql
CREATE TABLE cost_record (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bauprojekt_id         UUID NOT NULL REFERENCES bauprojekt(id),
  cost_system           TEXT NOT NULL CHECK (cost_system IN ('BKP', 'eBKP-H')),
  cost_level            TEXT NOT NULL,
  total_chf             DECIMAL(14,2) NOT NULL,
  index_year            INTEGER NOT NULL,
  index_quarter         INTEGER CHECK (index_quarter BETWEEN 1 AND 4),
  index_value           DECIMAL(8,2),
  project_phase         TEXT NOT NULL,
  mwst_included         BOOLEAN NOT NULL DEFAULT FALSE,
  mwst_rate             DECIMAL(5,4),
  honorare_included     BOOLEAN NOT NULL DEFAULT FALSE,
  data_confidence       TEXT NOT NULL,
  exclude_from_benchmarks BOOLEAN NOT NULL DEFAULT FALSE,
  exclusion_reason      TEXT,             -- mandatory when exclude_from_benchmarks = true
  bkp_costs             JSONB,    -- {"2": 3500000, "21": 2100000, "24": 385000, ...}
  ebkph_costs           JSONB,    -- {"C": 1800000, "D": 650000, "E": 420000, ...}
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_exclusion_reason
    CHECK (exclude_from_benchmarks = FALSE OR exclusion_reason IS NOT NULL)
);
```

### 5.5 Table: `benchmark_value`

```sql
CREATE TABLE benchmark_value (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bauprojekt_id         UUID NOT NULL REFERENCES bauprojekt(id),
  cost_record_id        UUID NOT NULL REFERENCES cost_record(id),
  benchmark_type        TEXT NOT NULL,
  cost_scope            TEXT NOT NULL,
  scope_name            TEXT,
  value_chf             DECIMAL(12,2) NOT NULL,
  divisor_quantity      DECIMAL(14,2) NOT NULL,
  divisor_unit          TEXT NOT NULL,
  percentile_rank       DECIMAL(5,2)
);

CREATE INDEX idx_bv_scope     ON benchmark_value(cost_scope);
CREATE INDEX idx_bv_type      ON benchmark_value(benchmark_type);
CREATE INDEX idx_bv_project   ON benchmark_value(bauprojekt_id);
```

### 5.6 Table: `energy_bedarfswerte`

Design / calculated energy values linked to Bauprojekt.

```sql
CREATE TABLE energy_bedarfswerte (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bauprojekt_id         UUID NOT NULL REFERENCES bauprojekt(id),
  ebf                   DECIMAL(12,2),
  envelope_ratio        DECIMAL(6,3),
  qh                    DECIMAL(8,2),
  qh_limit              DECIMAL(8,2),
  qww                   DECIMAL(8,2),
  minergie_index        DECIMAL(8,2),
  primary_energy        DECIMAL(8,2),
  ghg_operational       DECIMAL(8,2),
  ghg_embodied          DECIMAL(8,2),
  heat_recovery_rate    DECIMAL(5,3),
  pv_share              DECIMAL(5,2),
  renewable_share       DECIMAL(5,2),
  energy_standard       TEXT,
  geak_envelope         CHAR(1),
  geak_overall          CHAR(1),
  energy_carrier        TEXT,
  heating_system        TEXT,
  sia380_category       TEXT
);
```

### 5.7 Table: `fm_cost` — v2, linked to Gebäude

```sql
CREATE TABLE fm_cost (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gebaeude_id           UUID NOT NULL REFERENCES gebaeude(id),
  reporting_year        INTEGER NOT NULL,
  reference_area        TEXT NOT NULL CHECK (reference_area IN ('BGF', 'NGF', 'NF', 'EBF')),
  reference_area_m2     DECIMAL(12,2) NOT NULL,
  currency              TEXT DEFAULT 'CHF',
  nkg_costs             JSONB,
  heat_kwh_per_m2       DECIMAL(8,2),
  elec_kwh_per_m2       DECIMAL(8,2),
  water_l_per_m2        DECIMAL(8,2),
  co2_kg_per_m2         DECIMAL(8,2)
);
```

### 5.8 Table: `lifecycle_cost` — v2, linked to Gebäude

```sql
CREATE TABLE lifecycle_cost (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gebaeude_id           UUID NOT NULL REFERENCES gebaeude(id),
  condition_value       DECIMAL(3,2) CHECK (condition_value BETWEEN 0.1 AND 1.0),
  last_inspection_date  DATE,
  next_inspection_date  DATE,
  maintenance_rate      DECIMAL(5,4),
  repair_rate           DECIMAL(5,4),
  lcc_horizon_years     INTEGER DEFAULT 50,
  element_lifespans     JSONB
);
```

### 5.9 Reference tables

```sql
CREATE TABLE ref_grossregion (
  code      TEXT PRIMARY KEY,
  bfs_code  INTEGER,
  name_en   TEXT NOT NULL,
  name_de   TEXT NOT NULL,
  name_fr   TEXT NOT NULL
);

CREATE TABLE ref_oag (
  code        TEXT PRIMARY KEY,
  level       INTEGER NOT NULL,
  name_en     TEXT NOT NULL,
  name_de     TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  parent      TEXT REFERENCES ref_oag(code),
  func_unit_a TEXT,
  func_unit_b TEXT
);

CREATE TABLE ref_federal_building_type (
  code          TEXT PRIMARY KEY,
  name_en       TEXT NOT NULL,
  name_de       TEXT NOT NULL,
  name_fr       TEXT NOT NULL,
  portfolio     TEXT NOT NULL,
  sub_portfolio TEXT,
  oag_mapping   TEXT REFERENCES ref_oag(code)
);

CREATE TABLE ref_arbeiten_type (
  code        TEXT PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_de     TEXT NOT NULL,
  name_fr     TEXT NOT NULL,
  gwr_category TEXT NOT NULL   -- Neubau / Umbau / Abbruch
);

CREATE TABLE ref_bkp (
  code    TEXT PRIMARY KEY,
  level   INTEGER NOT NULL,
  name_de TEXT NOT NULL,
  name_fr TEXT,
  parent  TEXT REFERENCES ref_bkp(code)
);

CREATE TABLE ref_ebkph (
  code                 TEXT PRIMARY KEY,
  level                INTEGER NOT NULL,
  name_de              TEXT NOT NULL,
  name_fr              TEXT,
  parent               TEXT REFERENCES ref_ebkph(code),
  reference_quantity_a TEXT,
  reference_quantity_b TEXT
);

CREATE TABLE ref_baukostenindex (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year        INTEGER NOT NULL,
  quarter     INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  region      TEXT REFERENCES ref_grossregion(code),
  index_value DECIMAL(8,2) NOT NULL,
  base_year   INTEGER NOT NULL,
  UNIQUE (year, quarter, region)
);
```
