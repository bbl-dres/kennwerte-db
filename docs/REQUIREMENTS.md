# kennwerte-db — Requirements

## Project Context

**kennwerte-db** is an open-source construction cost benchmark database for Swiss public buildings. It collects, structures, and presents cost Kennwerte (CHF/m² GF, CHF/m³ GV, BKP/eBKP-H breakdowns) from realised Bauprojekte to support early-stage cost estimation (Kostenschätzung, Kostenvoranschlag) and portfolio-level cost analysis.

Data is sourced from publicly available Bautendokumentationen published by Swiss federal, cantonal, and municipal building authorities (BBL, armasuisse, Stadt Zürich, and others). The application is designed as a no-build, static-hosted prototype (GitHub Pages + sql.js) with a path toward a production system.

**Related documents**: [DATAMODEL.md](DATAMODEL.md) (entity model and schema) · [SCRAPING.md](SCRAPING.md) (data sources and extraction pipeline)

---

## Purpose of This Document

Functional and non-functional requirements for the kennwerte-db application, organised by MoSCoW priority. Covers data entry, import/export, search, benchmarking, visualisation, data quality, access control, and system qualities.

---

## Overview

Primary purpose: supporting early-stage cost estimation through structured collection and presentation of construction cost Kennwerte from realised Bauprojekte.

**Entity model**: Two distinct entities aligned with the GWR (VGWR Art. 2):
- **Bauprojekt** — the primary benchmark entity; the permit-bound construction intervention for which a cost estimate is prepared
- **Gebäude** — the physical asset; optional parent entity linked from Bauprojekt (nullable for Neubauten at planning stage)

**MoSCoW key**: M = Must have (v1 core) · S = Should have (v1 extended) · C = Could have (v2) · W = Won't have (out of scope)

---

## 1. Functional Requirements (Funktionale Anforderungen)

### 1.1 Data Entry and Management (Datenpflege)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-DM-01 | Users can create a new Bauprojekt record with all required fields (project identity, Art der Arbeiten, location, classification, building characteristics as designed) | Benutzer·innen können einen neuen Bauprojekt-Datensatz mit allen Pflichtfeldern erfassen (Projektidentifikation, Art der Arbeiten, Standort, Klassifikation, Gebäudeeigenschaften gemäss Planung) | M |
| F-DM-02 | Users can optionally create a Gebäude record and link it to a Bauprojekt — required for Umbau and Abbruch projects; not required for Neubau at planning stage | Benutzer·innen können optional einen Gebäude-Datensatz erstellen und mit einem Bauprojekt verknüpfen — erforderlich für Umbau- und Abbruchprojekte; nicht erforderlich für Neubauten in der Planungsphase | M |
| F-DM-03 | The system enforces that Umbau and Abbruch Bauprojekte must be linked to an existing Gebäude record; Neubau Bauprojekte may have no Gebäude link | Das System erzwingt, dass Umbau- und Abbruchprojekte mit einem bestehenden Gebäude-Datensatz verknüpft sind; Neubau-Projekte dürfen keine Gebäude-Verknüpfung aufweisen | M |
| F-DM-04 | Users can edit any field of an existing Bauprojekt or Gebäude record | Benutzer·innen können beliebige Felder eines bestehenden Bauprojekt- oder Gebäude-Datensatzes bearbeiten | M |
| F-DM-05 | Users can deactivate a Bauprojekt or Gebäude record (soft delete with audit trail; no hard deletion of cost data) | Benutzer·innen können einen Bauprojekt- oder Gebäude-Datensatz deaktivieren (Soft Delete mit Änderungsprotokoll; keine physische Löschung von Kostendaten) | M |
| F-DM-06 | Users can attach multiple cost records to a Bauprojekt — one per project phase and cost system (BKP or eBKP-H) | Benutzer·innen können einem Bauprojekt mehrere Kostendatensätze zuordnen — je einen pro Projektphase und Kostenplansystem (BKP oder eBKP-H) | M |
| F-DM-07 | Each cost record carries explicit flags for: (a) MWSt included / excluded and MWSt rate, (b) Honorare (BKP 29 / eBKP-H V) included / excluded, (c) data confidence level (Schlussabrechnung / Kostenvoranschlag / Kostenschätzung / Schätzung) | Jeder Kostendatensatz enthält explizite Angaben zu: (a) MWSt inkl. / exkl. und MWSt-Satz, (b) Honorare (BKP 29 / eBKP-H V) inkl. / exkl., (c) Datenqualitätsstufe (Schlussabrechnung / Kostenvoranschlag / Kostenschätzung / Schätzung) | M |
| F-DM-08 | Users can record SIA 416 quantities (as-designed areas and volumes) for a Bauprojekt | Benutzer·innen können SIA-416-Mengen (geplante Flächen und Volumen) für ein Bauprojekt erfassen | M |
| F-DM-09 | Users can attach energy Bedarfswerte (SIA 380/1 calculated design values) to a Bauprojekt | Benutzer·innen können Energie-Bedarfswerte (berechnete Planwerte gemäss SIA 380/1) einem Bauprojekt zuordnen | M |
| F-DM-10 | Users can record the Verpflichtungskredit (VK) and approval authority for a Bauprojekt | Benutzer·innen können den Verpflichtungskredit (VK) und die Genehmigungsinstanz für ein Bauprojekt erfassen | S |
| F-DM-11 | Users can upload and attach images and documents (floor plans, sections, facade drawings) to a Bauprojekt record | Benutzer·innen können Bilder und Dokumente (Grundrisse, Schnitte, Fassadenpläne) einem Bauprojekt-Datensatz zuordnen | S |
| F-DM-12 | Users can attach FM operating cost records (DIN 18960 NKG) to a Gebäude record — v2 | Benutzer·innen können einem Gebäude-Datensatz Betriebskostendatensätze (DIN 18960 NKG) zuordnen — v2 | C |
| F-DM-13 | Users can record condition and lifecycle data (Zustandswert, Instandhaltungsrate, Bauteil-Lebensdauern per SIA 469) on a Gebäude record — v2 | Benutzer·innen können Zustands- und Lebenszyklusdaten (Zustandswert, Instandhaltungsrate, Bauteil-Lebensdauern gemäss SIA 469) auf einem Gebäude-Datensatz erfassen — v2 | C |
| F-DM-14 | All data changes are logged with user, timestamp, and previous value (Änderungsprotokoll) | Alle Datenänderungen werden mit Benutzer·in, Zeitstempel und Vorwert protokolliert | M |

### 1.2 Import and Export (Import und Export)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-IE-01 | Users can import Bauprojekt and cost records from a structured Excel / CSV template | Benutzer·innen können Bauprojekt- und Kostendatensätze über eine strukturierte Excel-/CSV-Vorlage importieren | M |
| F-IE-02 | The system provides a downloadable import template with column descriptions, allowed values, and field validation rules | Das System stellt eine herunterladbare Importvorlage mit Spaltenbeschreibungen, zulässigen Werten und Validierungsregeln bereit | M |
| F-IE-03 | Import validates required fields, data types, and controlled vocabulary values before committing any record | Der Import prüft Pflichtfelder, Datentypen und Wertelistenwerte vor der Übernahme in die Datenbank | M |
| F-IE-04 | Import reports validation errors row-by-row with precise field-level messages; valid rows can be committed independently | Importfehler werden zeilenweise mit präzisen feldgenauen Meldungen ausgegeben; gültige Zeilen können unabhängig übernommen werden | M |
| F-IE-05 | Users can export the full database or any filtered Bauprojekt subset to CSV / Excel | Benutzer·innen können die gesamte Datenbank oder eine gefilterte Bauprojekt-Teilmenge als CSV / Excel exportieren | M |
| F-IE-06 | Users can export a single Bauprojekt as a formatted PDF data sheet (Datenblatt) | Benutzer·innen können ein einzelnes Bauprojekt als formatiertes PDF-Datenblatt exportieren | S |
| F-IE-07 | Users can export a benchmark comparison report (Kennwertvergleich) as PDF, including Vergleichsmenge definition, peer group statistics, and index-adjusted values | Benutzer·innen können einen Kennwertvergleichsbericht als PDF exportieren, inkl. Definition der Vergleichsmenge, Statistiken und indexbereinigter Werte | S |
| F-IE-08 | Users can trigger a GWR EGID lookup to pre-fill Gebäude address fields for Umbau projects | Benutzer·innen können für Umbau-Projekte eine EGID-Abfrage auslösen, um Gebäude-Adressfelder vorzubefüllen | C |
| F-IE-09 | Users can export Bauprojekt and benchmark data as JSON | Benutzer·innen können Bauprojekt- und Kennwertdaten als JSON exportieren | C |

### 1.3 Search and Filter (Suche und Filter)

All search and filter operations are applied to **Bauprojekte** as the primary entity.

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-SF-01 | Users can search by project name, municipality, internal ID, or EGID (via linked Gebäude) | Benutzer·innen können nach Projektname, Gemeinde, interner Referenz oder EGID (via verknüpftes Gebäude) suchen | M |
| F-SF-02 | Users can filter by portfolio (BBL / VBS / ETH) | Benutzer·innen können nach Portfolio (BBL / VBS / ETH) filtern | M |
| F-SF-03 | Users can filter by sub-portfolio (Teilportfolio) | Benutzer·innen können nach Teilportfolio filtern | M |
| F-SF-04 | Users can filter by federal building type | Benutzer·innen können nach Bundesgebäudetyp filtern | M |
| F-SF-05 | Users can filter by CRB OAG Objektart | Benutzer·innen können nach CRB-Objektart (OAG) filtern | M |
| F-SF-06 | Users can filter by canton or BFS Grossregion | Benutzer·innen können nach Kanton oder BFS-Grossregion filtern | M |
| F-SF-07 | Users can filter by Art der Arbeiten (Neubau / Umbau subtypes / Abbruch) | Benutzer·innen können nach Art der Arbeiten (Neubau / Umbau-Untertypen / Abbruch) filtern | M |
| F-SF-08 | Users can filter by completion year range | Benutzer·innen können nach Fertigstellungsjahr (Bereich) filtern | M |
| F-SF-09 | Users can filter by procurement model / Unternehmereinsatzform (TU / GU / EU / GP) | Benutzer·innen können nach Unternehmereinsatzform (TU / GU / EU / GP) filtern | M |
| F-SF-10 | Users can filter by data confidence level (Schlussabrechnung / Kostenvoranschlag / Kostenschätzung) | Benutzer·innen können nach Datenqualitätsstufe filtern | M |
| F-SF-11 | Users can filter by GF range (m²) | Benutzer·innen können nach GF-Bereich (m²) filtern | S |
| F-SF-12 | Users can filter by cost range (CHF/m² GF) | Benutzer·innen können nach Kostenkennwert-Bereich (CHF/m² GF) filtern | S |
| F-SF-13 | Users can filter by Energiestandard (Minergie / Minergie-P / Standard) | Benutzer·innen können nach Energiestandard filtern | S |
| F-SF-14 | Multiple filters can be combined simultaneously with AND logic | Mehrere Filter können gleichzeitig mit UND-Logik kombiniert werden | M |
| F-SF-15 | The active filter state is preserved in the URL for sharing and bookmarking | Der aktive Filterzustand wird in der URL gespeichert | S |
| F-SF-16 | Users can save and name filter presets for reuse | Benutzer·innen können Filterkonfigurationen benennen und für die Wiederverwendung speichern | S |

### 1.4 Benchmarking and Analysis (Benchmarking und Auswertung)

All benchmark statistics are computed across filtered sets of **Bauprojekte**.

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-BA-01 | For any filtered set of Bauprojekte, the system computes min, P25, median, P75, max, and mean for all numeric KPIs | Für jede gefilterte Menge von Bauprojekten berechnet das System Min, P25, Median, P75, Max und Mittelwert für alle numerischen Kennwerte | M |
| F-BA-02 | The system always displays the number of Bauprojekte (n) in the active Vergleichsmenge alongside any statistical output | Das System zeigt die Anzahl Bauprojekte (n) in der aktiven Vergleichsmenge stets neben jeder Statistikausgabe an | M |
| F-BA-03 | The system displays a prominent warning when the Vergleichsmenge contains fewer than 5 Bauprojekte; statistical outputs are flagged as statistically unreliable | Das System gibt eine auffällige Warnung aus, wenn die Vergleichsmenge weniger als 5 Bauprojekte enthält | M |
| F-BA-04 | The system computes and displays cost benchmarks for all BKP and eBKP-H positions across the Vergleichsmenge, using the element-specific reference quantity defined in ref_ebkph (CHF/m² GF for C–D and G, CHF/m² FAW for E, CHF/m² FB for F) | Das System berechnet und zeigt Kostenkennwerte für alle BKP- und eBKP-H-Positionen innerhalb der Vergleichsmenge an, unter Verwendung der elementspezifischen Bezugsgrösse gemäss ref_ebkph (CHF/m² GF für C–D und G, CHF/m² FAW für E, CHF/m² FB für F) | M |
| F-BA-05 | The system computes and displays CHF/m³ GV benchmarks for all BKP and eBKP-H positions as an alternative divisor | Das System berechnet und zeigt CHF/m³ GV für alle BKP- und eBKP-H-Positionen als alternativen Divisor an | M |
| F-BA-06 | Users can switch the active Kennwerttyp (CHF/m² GF, CHF/m³ GV, CHF/m² NGF, CHF/m² HNF) for all displayed benchmarks simultaneously | Benutzer·innen können den aktiven Kennwerttyp für alle angezeigten Kennwerte gleichzeitig umschalten | M |
| F-BA-07 | Users can toggle benchmark displays between: (a) incl. Honorare (BKP 1–9), (b) excl. Honorare (BKP 1–9 without BKP 29), (c) Gebäudekosten only (BKP 2) | Benutzer·innen können zwischen Ansichten umschalten: (a) mit Honoraren BKP 1–9, (b) ohne Honorare, (c) nur Gebäudekosten BKP 2 | M |
| F-BA-08 | Users can toggle benchmark displays between costs including and excluding MWSt | Benutzer·innen können zwischen Ansichten mit und ohne MWSt umschalten | M |
| F-BA-09 | The system adjusts all cost benchmarks from their recorded BPI index quarter to a user-selected target quarter using the BFS Schweizerischer Baupreisindex (BPI) | Das System bereinigt alle Kostenkennwerte auf ein benutzerseitig gewähltes Zielquartal mittels BFS Baupreisindex (BPI) | M |
| F-BA-10 | The system applies regional BPI sub-indices for cross-regional cost comparison | Das System wendet regionale BPI-Teilindizes für den regionalen Kostenvergleich an | S |
| F-BA-11 | Users can define a Vergleichsmenge using filters, then view how a selected Bauprojekt ranks within that Vergleichsmenge for any KPI | Benutzer·innen können eine Vergleichsmenge definieren und den Rangplatz eines ausgewählten Bauprojekts innerhalb dieser Vergleichsmenge einsehen | M |
| F-BA-12 | The system displays the percentile rank of a selected Bauprojekt within its Vergleichsmenge for all numeric KPIs | Das System zeigt den Perzentilrang eines ausgewählten Bauprojekts für alle numerischen Kennwerte an | S |
| F-BA-13 | The system displays SIA 416 area ratio breakdowns from the Bauprojekt as-designed quantities | Das System zeigt SIA-416-Flächenverhältnisse aus den geplanten Bauprojekt-Mengen an | M |
| F-BA-14 | The system displays Formquotient (GV/GF) alongside cost benchmarks and flags Bauprojekte deviating more than ±1 standard deviation from the Vergleichsmenge mean | Das System zeigt den Formquotienten (GV/GF) neben den Kostenkennwerten an und markiert Bauprojekte mit Abweichungen von mehr als ±1 Standardabweichung | M |
| F-BA-15 | The system highlights individual KPI values that fall outside defined plausibility ranges for the given OAG Objektart | Das System hebt Kennwertwerte ausserhalb definierter Plausibilitätsbereiche für die jeweilige OAG-Objektart hervor | S |
| F-BA-16 | For Bauprojekte with cost records from multiple project phases, the system displays the Kostenentwicklung — the indexed CHF/m² GF at each recorded phase | Für Bauprojekte mit Kostendatensätzen aus mehreren Phasen zeigt das System die Kostenentwicklung — den indexbereinigten CHF/m²-GF-Wert je Phase | S |
| F-BA-17 | Where a Verpflichtungskredit is recorded, the system computes and displays the Kreditausschöpfung (Schlussabrechnung / VK), with an option to index-adjust the VK from its approval date to the completion date (Teuerungsbereinigung) for projects spanning multiple years | Sofern ein Verpflichtungskredit erfasst ist, berechnet und zeigt das System die Kreditausschöpfung an, mit der Option den VK vom Genehmigungsdatum auf das Fertigstellungsdatum teuerungsbereinigt umzurechnen (Teuerungsbereinigung) für mehrjährige Projekte | S |
| F-BA-18 | Users can compare up to 5 Bauprojekte side-by-side, with BKP positions deviating more than ±20% from the group mean highlighted | Benutzer·innen können bis zu 5 Bauprojekte nebeneinander vergleichen; abweichende BKP-Positionen werden hervorgehoben | S |
| F-BA-19 | The system can fit parametric regression models (e.g. regularised linear regression, gradient-boosted trees) to collected benchmarks and provide predicted cost ranges with confidence intervals for user-defined building parameters (OAG, GF, Formquotient, construction method, procurement model, region, altitude, energy standard), clearly labelled as model-based estimates; particularly useful when the Vergleichsmenge contains fewer than 5 Bauprojekte | Das System kann parametrische Regressionsmodelle auf die gesammelten Kennwerte anpassen und für benutzerdefinierte Gebäudeparameter vorhergesagte Kostenbandbreiten mit Konfidenzintervallen ausgeben, klar als modellbasierte Schätzungen gekennzeichnet; besonders nützlich bei weniger als 5 Bauprojekten in der Vergleichsmenge | C |
| F-BA-20 | The system can display feature importance analysis showing which building characteristics most influence cost for a given OAG Objektart, based on the regression model | Das System kann eine Merkmalswichtigkeitsanalyse anzeigen, die aufzeigt, welche Gebäudemerkmale die Kosten für eine bestimmte OAG-Objektart am stärksten beeinflussen | C |

### 1.5 Visualisation (Darstellung)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-VZ-01 | A sortable Bauprojekt list view shows key KPIs (OAG, Art der Arbeiten, GF, GV, CHF/m² GF BKP 2, completion year) | Eine sortierbare Bauprojektliste zeigt Schlüsselkennwerte auf einen Blick | M |
| F-VZ-02 | A Bauprojekt detail view displays all fields, SIA 416 as-designed quantities, full BKP / eBKP-H breakdown, and energy Bedarfswerte | Eine Bauprojekt-Detailansicht zeigt alle Felder, SIA-416-Planmengen, vollständige Kostenaufschlüsselung und Energie-Bedarfswerte | M |
| F-VZ-03 | A bar chart compares a selected Bauprojekt's BKP 2-digit breakdown (CHF/m² GF) against the Vergleichsmenge min / median / max | Ein Balkendiagramm vergleicht die BKP-2-stellige Kostenaufschlüsselung eines Bauprojekts mit dem Vergleichsmengen-Min/Median/Max | M |
| F-VZ-04 | A range / box plot shows the distribution of any numeric KPI across the Vergleichsmenge | Ein Range- bzw. Box-Plot zeigt die Verteilung eines Kennwerts in der Vergleichsmenge | S |
| F-VZ-05 | A stacked bar chart visualises the SIA 416 area structure (GF → NGF / KF → NF / VF / FF → HNF / NNF) as-designed | Ein gestapeltes Balkendiagramm visualisiert die SIA-416-Flächenstruktur gemäss Planung | S |
| F-VZ-06 | A map view renders Bauprojekt locations; for Umbau projects, the linked Gebäude coordinates are used; for Neubau projects, the project municipality centroid is used | Eine Kartenansicht zeigt Bauprojektstandorte; für Umbauprojekte werden die Gebäudekoordinaten verwendet | S |
| F-VZ-07 | A scatter plot allows plotting any two numeric KPIs against each other across the Vergleichsmenge | Ein Streudiagramm erlaubt die Gegenüberstellung beliebiger zwei Kennwerte | C |
| F-VZ-08 | A timeline chart shows the indexed median CHF/m² GF by completion year for a filtered Vergleichsmenge | Ein Zeitreihendiagramm zeigt den indexbereinigten Median-CHF/m²-GF nach Fertigstellungsjahr | C |
| F-VZ-09 | Bauprojekt images are displayed in a gallery in the detail view | Bauprojekt-Bilder werden als Galerie in der Detailansicht angezeigt | S |

### 1.6 Reference Data Management (Referenzdaten-Verwaltung)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-RD-01 | Admins can view all reference tables in a dedicated admin interface | Administrator·innen können alle Referenztabellen in einer dedizierten Administrationsoberfläche einsehen | M |
| F-RD-02 | Admins can add and update federal building types not covered by CRB OAG | Administrator·innen können Bundesgebäudetypen ausserhalb der CRB-OAG hinzufügen und aktualisieren | M |
| F-RD-03 | Admins can update the ref_baukostenindex table with new BPI quarterly releases from BFS | Administrator·innen können die BPI-Quartalswerte aus dem BFS-Datensatz aktualisieren | M |
| F-RD-04 | Admins can manage controlled vocabulary values | Administrator·innen können Wertelisten verwalten | S |
| F-RD-05 | All reference data changes are versioned and logged | Alle Referenzdatenänderungen werden versioniert und protokolliert | S |

### 1.7 Data Quality (Datenqualität)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-DQ-01 | The system calculates and displays a completeness score (0–100%) per Bauprojekt based on the proportion of Must and Should fields populated | Das System berechnet und zeigt einen Vollständigkeitswert (0–100%) pro Bauprojekt an | S |
| F-DQ-02 | The Bauprojekt list can be sorted and filtered by completeness score | Die Bauprojektliste kann nach Vollständigkeitswert sortiert und gefiltert werden | S |
| F-DQ-03 | Cost records with data_confidence below Kostenvoranschlag are flagged when appearing in benchmark statistics | Kostendatensätze mit Datenqualitätsstufe unterhalb des Kostenvoranschlags werden in Benchmarkstatistiken gekennzeichnet | M |
| F-DQ-04 | The system displays a plausibility warning if a Bauprojekt's Formquotient (GV/GF) falls outside 2.0–12.0 m | Das System zeigt eine Plausibilitätswarnung, wenn der Formquotient (GV/GF) eines Bauprojekts ausserhalb von 2,0–12,0 m liegt | S |
| F-DQ-05 | The system warns if an Umbau or Abbruch Bauprojekt is saved without a linked Gebäude record | Das System warnt, wenn ein Umbau- oder Abbruchprojekt ohne verknüpften Gebäude-Datensatz gespeichert wird | M |
| F-DQ-06 | The system validates temporal consistency of project phase dates: planning_start ≤ competition_date ≤ baubewilligung_date ≤ construction_start ≤ completion_date; cost record phase dates must not contradict the Bauprojekt phase sequence (e.g. a Schlussabrechnung cannot predate a Kostenschätzung) | Das System prüft die zeitliche Konsistenz der Projektphasendaten: Planungsbeginn ≤ Wettbewerbsdatum ≤ Baubewilligungsdatum ≤ Baubeginn ≤ Fertigstellung; Kostendatensatz-Phasendaten dürfen der Bauprojekt-Phasenfolge nicht widersprechen | S |
| F-DQ-07 | Users can flag individual cost records as outliers (exclude_from_benchmarks) with a mandatory justification note; flagged records are excluded from Vergleichsmenge statistics and regression model training but remain visible in the Bauprojekt detail view | Benutzer·innen können einzelne Kostendatensätze als Ausreisser kennzeichnen (exclude_from_benchmarks) mit obligatorischer Begründung; gekennzeichnete Datensätze werden von Vergleichsmengenstatistiken und Regressionsmodellen ausgeschlossen, bleiben aber in der Bauprojekt-Detailansicht sichtbar | S |

### 1.8 User and Access Management (Benutzer- und Zugriffsverwaltung)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| F-UA-01 | Users authenticate via federal eIAM (no local credentials stored) | Benutzer·innen authentifizieren sich über das eidg. eIAM | M |
| F-UA-02 | Role **Viewer**: read-only access to Bauprojekte and Gebäude within permitted portfolios | Rolle **Viewer**: Lesezugriff auf Bauprojekte und Gebäude innerhalb zulässiger Portfolios | M |
| F-UA-03 | Role **Editor**: can create, edit, and import Bauprojekte and Gebäude; cannot modify reference data | Rolle **Editor**: kann Bauprojekte und Gebäude erstellen, bearbeiten und importieren; keine Referenzdatenverwaltung | M |
| F-UA-04 | Role **Admin**: full access including reference data, user management, and access configuration | Rolle **Admin**: Vollzugriff inkl. Referenzdaten und Benutzerverwaltung | M |
| F-UA-05 | Portfolio-level access restrictions: BBL and VBS Bauprojekte are managed independently; a user may hold different roles per portfolio | Portfolio-Zugriffsbeschränkungen: BBL- und VBS-Bauprojekte werden unabhängig verwaltet | M |
| F-UA-06 | All user activity is logged with user ID and timestamp | Alle Benutzeraktivitäten werden mit Benutzer-ID und Zeitstempel protokolliert | M |

---

## 2. Non-Functional Requirements (Nicht-funktionale Anforderungen)

### 2.1 Performance (Leistung)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-PE-01 | Filtered Bauprojekt list loads within 2 seconds for up to 10,000 records | Gefilterte Bauprojektliste lädt bei bis zu 10.000 Datensätzen innerhalb von 2 Sekunden | M |
| NF-PE-02 | Vergleichsmenge statistics compute within 3 seconds | Vergleichsmengenstatistiken werden innerhalb von 3 Sekunden berechnet | M |
| NF-PE-03 | Single Bauprojekt detail view loads within 1 second | Einzelne Bauprojekt-Detailansicht lädt innerhalb von 1 Sekunde | M |
| NF-PE-04 | CSV / Excel export of up to 5,000 Bauprojekte completes within 10 seconds | CSV-/Excel-Export von bis zu 5.000 Bauprojekten wird innerhalb von 10 Sekunden abgeschlossen | S |
| NF-PE-05 | Map view renders up to 500 Bauprojekt markers without degraded interaction | Kartenansicht rendert bis zu 500 Bauprojekt-Marker ohne Beeinträchtigung | S |

### 2.2 Security and Data Protection (Sicherheit und Datenschutz)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-SE-01 | All data transmission encrypted via HTTPS / TLS 1.3 | Gesamte Datenübertragung via HTTPS / TLS 1.3 verschlüsselt | M |
| NF-SE-02 | Authentication exclusively via federal eIAM | Authentifizierung ausschliesslich via eidg. eIAM | M |
| NF-SE-03 | Role-based access control enforced server-side | Rollenbasierte Zugriffskontrolle serverseitig durchgesetzt | M |
| NF-SE-04 | No personal data of natural persons stored (firm names and role designations permitted) | Keine Personendaten natürlicher Personen gespeichert | M |
| NF-SE-05 | Operational database backups taken daily, retained for 30 days | Operative Backups täglich, 30 Tage aufbewahrt | M |
| NF-SE-06 | Cost and project data retained for a minimum of 10 years per GeBüV and BBL records management requirements | Kosten- und Projektdaten mindestens 10 Jahre aufbewahrt gemäss GeBüV und BBL-Aktenführung | M |
| NF-SE-07 | Application complies with ISB and ISDS federal information security directives | Anwendung entspricht ISB- und ISDS-Direktiven | M |
| NF-SE-08 | Data hosted exclusively within Switzerland or a CLOUD Act-safe EU jurisdiction | Daten ausschliesslich in der Schweiz oder CLOUD-Act-sicherer EU-Jurisdiktion | M |
| NF-SE-09 | Penetration test before go-live; repeated every 2 years | Penetrationstest vor Go-live; alle 2 Jahre wiederholt | S |

### 2.3 Usability (Gebrauchstauglichkeit)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-UX-01 | Interface available in German (primary) and French | Benutzeroberfläche auf Deutsch (primär) und Französisch | M |
| NF-UX-02 | Italian language support | Italienische Sprachunterstützung | C |
| NF-UX-03 | All forms provide inline field-level validation with precise error messages | Alle Formulare mit feldgenauer Inline-Validierung und präzisen Fehlermeldungen | M |
| NF-UX-04 | All tables sortable with configurable column visibility | Alle Tabellen sortierbar mit konfigurierbarer Spaltensichtbarkeit | S |
| NF-UX-05 | Fully usable on desktop (min. 1280 px); tablet usability desirable | Vollständig bedienbar auf Desktop (mind. 1280 px) | M |
| NF-UX-06 | Inline tooltips explain technical terms (SIA 416, BKP, eBKP-H, Art der Arbeiten, Unternehmereinsatzform) | Inline-Tooltips erläutern Fachbegriffe (SIA 416, BKP, eBKP-H, Art der Arbeiten, Unternehmereinsatzform) | S |
| NF-UX-07 | Empty states guide users on creating their first Bauprojekt or refining filters | Leerseiten leiten Benutzer·innen bei der Erstellung des ersten Bauprojekts oder bei der Filteranpassung an | S |
| NF-UX-08 | Conforms to WCAG 2.1 Level AA | Entspricht WCAG 2.1 Level AA | S |
| NF-UX-09 | Core workflows (filter, benchmark, compare, export) completable without documentation by trained professionals | Kernworkflows von ausgebildeten Fachpersonen ohne Dokumentation durchführbar | M |

### 2.4 Reliability and Availability (Zuverlässigkeit und Verfügbarkeit)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-RA-01 | Availability ≥ 99.5% during core business hours (07:00–19:00 CET, Mon–Fri) | Verfügbarkeit ≥ 99,5% während Kerngeschäftszeiten (07:00–19:00 MEZ, Mo–Fr) | M |
| NF-RA-02 | Planned maintenance communicated ≥ 48 hours in advance | Geplante Wartungsfenster ≥ 48 Stunden im Voraus kommuniziert | S |
| NF-RA-03 | Recovery Point Objective (RPO): max. 24 hours | RPO: max. 24 Stunden | M |
| NF-RA-04 | Recovery Time Objective (RTO): service restored within 4 hours of critical failure | RTO: Wiederherstellung innerhalb von 4 Stunden | S |

### 2.5 Maintainability (Wartbarkeit)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-MA-01 | Application source code open-source, hosted in bbl-dres GitHub organisation; project and cost data is explicitly excluded from the repository and must never be committed — the open-source scope covers code, schema, and configuration only | Anwendungs-Quellcode Open-Source, in GitHub-Organisation bbl-dres; Projekt- und Kostendaten sind explizit vom Repository ausgeschlossen und dürfen nicht eingecheckt werden — der Open-Source-Umfang umfasst ausschliesslich Code, Schema und Konfiguration | M |
| NF-MA-02 | Application containerised and deployable via Docker Compose | Anwendung containerisiert und via Docker Compose deploybar | M |
| NF-MA-03 | Schema migrations managed via versioned migration tool (Flyway or Liquibase) | Schema-Migrationen über versioniertes Migrationswerkzeug | M |
| NF-MA-04 | REST API documented via OpenAPI 3.x | REST-API via OpenAPI 3.x dokumentiert | S |
| NF-MA-05 | Core business logic (benchmark calculations, BPI index adjustment, plausibility checks) covered by automated unit tests | Kern-Geschäftslogik durch automatisierte Unit-Tests abgedeckt | S |
| NF-MA-06 | CI/CD pipeline with automated tests on every push | CI/CD-Pipeline mit automatisierten Tests bei jedem Push | S |
| NF-MA-07 | README contains complete local development setup instructions | README enthält vollständige Anweisungen zur lokalen Entwicklungsumgebung | M |

### 2.6 Interoperability (Interoperabilität)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-IO-01 | REST API provides authenticated read access to Bauprojekt and benchmark data | REST-API bietet authentifizierten Lesezugriff auf Bauprojekt- und Kennwertdaten | S |
| NF-IO-02 | GWR EGID lookup integration for Gebäude address pre-fill on Umbau projects | GWR-EGID-Abfrage-Integration für Gebäude-Adressvorvorbefüllung bei Umbauprojekten | C |
| NF-IO-03 | BPI quarterly index values importable from BFS open data | BPI-Quartalswerte aus BFS-Open-Data importierbar | S |
| NF-IO-04 | Export format compatible with SAP RE-FX field mapping | Exportformat für selektiven Datenaustausch mit SAP RE-FX feldkompatibel | C |
| NF-IO-05 | Data model aligned with applicable eCH standards | Datenmodell mit anwendbaren eCH-Normen abgeglichen | C |
| NF-IO-06 | Bauprojekt locations exportable as GeoJSON for GIS applications | Bauprojektstandorte als GeoJSON für GIS-Anwendungen exportierbar | C |

### 2.7 Scalability (Skalierbarkeit)

| ID | Requirement (EN) | Anforderung (DE) | MoSCoW |
|---|---|---|---|
| NF-SC-01 | System supports up to 10,000 Bauprojekt records without architectural changes | System unterstützt bis zu 10.000 Bauprojekte ohne architektonische Änderungen | M |
| NF-SC-02 | System supports up to 50 concurrent authenticated users | System unterstützt bis zu 50 gleichzeitig angemeldete Benutzer·innen | M |
| NF-SC-03 | Schema can accommodate additional KPI categories (FM costs, lifecycle) via Gebäude entity without breaking changes | Schema kann zusätzliche KPI-Kategorien (Betriebskosten, Lebenszyklusdaten) via Gebäude-Entität ohne Breaking Changes aufnehmen | M |

---

## 3. Constraints and Assumptions (Rahmenbedingungen und Annahmen)

| ID | Statement (EN) | Aussage (DE) | Category |
|---|---|---|---|
| C-01 | Primary users are trained professionals (Bauökonominnen/Bauökonomen, Projektleiter·innen, Portfoliomanager·innen) | Primäre Benutzer·innen sind ausgebildete Fachpersonen | Scope |
| C-02 | The application is a benchmarking and data presentation tool; it does not generate cost estimates | Die Anwendung ist ein Benchmarking-Werkzeug; sie generiert keine Kostenschätzungen | Scope |
| C-03 | The primary benchmark entity is the **Bauprojekt** (the construction intervention). The **Gebäude** (physical asset) is an optional parent used to link Umbau/Abbruch projects to an existing building and to anchor FM costs (v2) | Die primäre Benchmarkentität ist das **Bauprojekt**. Das **Gebäude** ist ein optionaler Eltern-Datensatz für Umbau-/Abbruchprojekte und Betriebskosten (v2) | Data |
| C-04 | For Neubau Bauprojekte, no Gebäude record is required at planning stage — the EGID is assigned at or after Baubewilligung and can be linked retroactively | Für Neubauten ist in der Planungsphase kein Gebäude-Datensatz erforderlich — der EGID kann nachträglich verknüpft werden | Data |
| C-05 | Non-residential VBS buildings (bunkers, fortifications, alpine facilities) frequently have no EGID; the data model accommodates Gebäude without EGID | Nicht-wohngenutzte VBS-Bauten (Bunker, Befestigungen, Höhenanlagen) haben häufig keinen EGID; das Datenmodell unterstützt Gebäude ohne EGID | Data |
| C-06 | Data entry is manual or via structured Excel/CSV import; no live integration with SAP, CAFM, or GWR in v1 | Dateneingabe manuell oder via Excel-/CSV-Import; keine Live-Integration in v1 | Scope |
| C-07 | The application is internal to BBL/VBS; no public access is planned | Interne Anwendung für BBL/VBS; kein öffentlicher Zugriff geplant | Scope |
| C-08 | All monetary values stored and displayed in CHF, excl. MWSt as the normalised base; cost records may be stored with or without MWSt but must carry an explicit flag | Alle Geldwerte in CHF, exkl. MWSt als Normierungsbasis; explizites MWSt-Flag erforderlich | Data |
| C-09 | Area and volume values follow SIA 416:2003; DIN 277 equivalences are informational only | Flächen- und Volumenwerte folgen SIA 416:2003 | Data |
| C-10 | Cost records require at minimum: total cost (CHF), index year, index quarter, project phase, and cost system (BKP or eBKP-H); GF is required only for CHF/m² GF benchmark computation | Kostendatensätze benötigen mindestens: Gesamtkosten, Indexjahr, Indexquartal, Projektphase und Kostenplansystem; GF nur für CHF/m²-GF erforderlich | Data |
| C-11 | Cost index adjustment uses the BFS Schweizerischer Baupreisindex (BPI) as the authoritative source; the applicable sub-index is configurable per record | Kostenindexbereinigung verwendet den BFS Baupreisindex (BPI) als massgebliche Quelle | Data |
| C-12 | FM costs (Betriebskosten) and energy Verbrauchswerte (measured consumption) are linked to the **Gebäude** entity, not to individual Bauprojekte; both are out of scope for v1 | Betriebskosten und Verbrauchswerte sind mit dem **Gebäude** verknüpft, nicht mit einzelnen Bauprojekten; beide ausserhalb v1 | Scope |
| C-13 | Hosting must comply with EMBAG, ISG, and ISB federal directives | Hosting muss EMBAG, ISG und ISB entsprechen | Technical |
| C-14 | Technology stack must be maintainable by a small team (2–3 developers) or a single senior developer | Technologie-Stack muss von einem kleinen Team wartbar sein | Technical |

---

## 4. User Stories (Benutzergeschichten)

| Role (EN) | Role (DE) | Primary goal |
|---|---|---|
| **Cost estimator** | **Bauökonom·in / Kostenplaner·in** | Derive defensible CHF/m² benchmarks from comparable Bauprojekte |
| **Federal project manager** | **Projektleiter·in BBL / Bauherrenvertreter·in** | Monitor Kostenentwicklung and Kreditausschöpfung |
| **Portfolio manager** | **Portfoliomanager·in / Immobilienstratege·in** | Strategic overview of cost and energy performance across Bauprojekte |
| **Data administrator** | **Datenadministrator·in** | Maintain data quality; import new Bauprojekte |

---

### US-01 — Peer Group Benchmark for Kostenschätzung

**Role**: Cost estimator / Bauökonom·in

**EN**: As a cost estimator preparing a Kostenschätzung for a new federal administrative building (Neubau) in Bern, I want to retrieve indexed CHF/m² GF benchmarks from comparable Bauprojekte (Neubau, Verwaltungsgebäude OAG 1.3.4, 2,000–8,000 m² GF, Espace Mittelland, completed 2010–2024) so that I can define a transparent and defensible cost range for the project brief.

**DE**: Als Bauökonom·in, der/die eine Kostenschätzung für ein neues Bundesverwaltungsgebäude (Neubau) in Bern vorbereitet, möchte ich indexbereinigte CHF/m²-GF-Kennwerte aus vergleichbaren Bauprojekten abrufen (Neubau, Verwaltungsgebäude OAG 1.3.4, 2.000–8.000 m² GF, Espace Mittelland, Fertigstellung 2010–2024), damit ich eine nachvollziehbare und vertretbare Kostenbandbreite für das Raumprogramm festlegen kann.

**Acceptance criteria**:
- Filter by Art der Arbeiten = Neubau, OAG, GF range, Grossregion, completion year
- n displayed prominently; warning if n < 5
- CHF/m² GF shown for BKP 2, BKP 1–9 excl. Honorare, BKP 1–9 incl. Honorare (switchable)
- All values adjusted to current BPI quarter by default; source index and target index shown
- Statistics: min, P25, median, P75, max

**MoSCoW**: M

---

### US-02 — BKP Cost Breakdown Calibration

**Role**: Cost estimator / Bauökonom·in

**EN**: As a cost estimator, I want to see the full BKP 2-digit breakdown (Rohbau 1, Rohbau 2, Elektroanlagen, HLK-Anlagen, Sanitäranlagen, Ausbau 1, Ausbau 2, Honorare) as CHF/m² GF with P25, median, and P75 from the Vergleichsmenge so that I can calibrate the internal cost structure of my Kostenvoranschlag against realised Bauprojekte.

**DE**: Als Bauökonom·in möchte ich die vollständige BKP-2-stellige Aufschlüsselung als CHF/m² GF mit P25, Median und P75 aus der Vergleichsmenge einsehen, damit ich die Kostenstruktur meines Kostenvoranschlags an realisierten Bauprojekten kalibrieren kann.

**Acceptance criteria**:
- All BKP 2-digit positions shown as CHF/m² GF from the Vergleichsmenge
- Selected Bauprojekt's own values overlaid on the range bar
- BKP positions deviating > ±20% from peer median highlighted
- Honorare incl./excl. toggle available

**MoSCoW**: M

---

### US-03 — Procurement Model Filtering

**Role**: Cost estimator / Bauökonom·in

**EN**: As a cost estimator, I want to filter the Vergleichsmenge by Unternehmereinsatzform (Totalunternehmer vs. Einzelunternehmer) so that I compare only Bauprojekte with a matching procurement structure, avoiding systematic cost distortions caused by differing fee and coordination cost bundling.

**DE**: Als Bauökonom·in möchte ich die Vergleichsmenge nach Unternehmereinsatzform (Totalunternehmer vs. Einzelunternehmer) filtern, damit ich ausschliesslich Bauprojekte mit vergleichbarer Beschaffungsstruktur vergleiche.

**Acceptance criteria**:
- Unternehmereinsatzform is a required filter in all benchmark views
- If a selected Bauprojekt's Unternehmereinsatzform differs from the Vergleichsmenge majority, a flag is displayed

**MoSCoW**: M

---

### US-04 — BPI Index Adjustment

**Role**: Cost estimator / Bauökonom·in

**EN**: As a cost estimator, I want all benchmark values to be automatically adjusted to the current BPI quarter so that cost data from Bauprojekte completed at different times is directly comparable without manual calculation.

**DE**: Als Bauökonom·in möchte ich, dass alle Kennwerte automatisch auf das aktuelle BPI-Quartal bereinigt werden, damit Kostendaten von zu unterschiedlichen Zeitpunkten abgeschlossenen Bauprojekten direkt vergleichbar sind.

**Acceptance criteria**:
- Default display adjusted to most recent available BPI quarter
- Users can change the target quarter; all values update immediately
- Base and target BPI values shown transparently
- Bauprojekte missing an index year/quarter are excluded and flagged

**MoSCoW**: M

---

### US-05 — Kostenentwicklung Across Project Phases

**Role**: Federal project manager / Projektleiter·in BBL

**EN**: As a federal project manager, I want to view the Kostenentwicklung of a completed Bauprojekt — the indexed CHF/m² GF at Kostenschätzung, Kostenvoranschlag, and Schlussabrechnung — in a single timeline view so that I can assess whether early-phase estimates were accurate.

**DE**: Als Projektleiter·in BBL möchte ich die Kostenentwicklung eines abgeschlossenen Bauprojekts — den indexbereinigten CHF/m²-GF-Wert bei Kostenschätzung, Kostenvoranschlag und Schlussabrechnung — in einer Zeitreihenansicht einsehen.

**Acceptance criteria**:
- All cost records shown chronologically by project phase
- Each phase value index-adjusted to a common reference quarter
- Delta between Kostenschätzung and Schlussabrechnung shown as percentage
- Accessible from the Bauprojekt detail view

**MoSCoW**: S

---

### US-06 — Kreditausschöpfung Tracking

**Role**: Federal project manager / Projektleiter·in BBL

**EN**: As a federal project manager, I want to record the approved Verpflichtungskredit (VK) for a Bauprojekt and have the system compute the Kreditausschöpfung (Schlussabrechnung / VK) so that budget adherence is documented and comparable across the portfolio.

**DE**: Als Projektleiter·in BBL möchte ich den genehmigten Verpflichtungskredit (VK) für ein Bauprojekt erfassen und die Kreditausschöpfung (Schlussabrechnung / VK) automatisch berechnen lassen.

**Acceptance criteria**:
- VK amount and approval authority stored per Bauprojekt
- Kreditausschöpfung computed and displayed where both VK and Schlussabrechnung are available
- Portfolio managers can view Kreditausschöpfung distribution across a filtered Bauprojekt set

**MoSCoW**: S

---

### US-07 — Linking a Neubau Bauprojekt to the Completed Gebäude

**Role**: Data administrator / Datenadministrator·in

**EN**: As a data administrator, once a Neubau Bauprojekt has been completed and the EGID has been assigned by the GWR, I want to create a Gebäude record with the EGID and link it to the existing Bauprojekt so that the physical asset and the construction intervention are properly connected in the database.

**DE**: Als Datenadministrator·in möchte ich nach Abschluss eines Neubau-Bauprojekts und Zuweisung des EGID einen Gebäude-Datensatz erstellen und mit dem bestehenden Bauprojekt verknüpfen, damit physisches Objekt und Bauintervention in der Datenbank korrekt verbunden sind.

**Acceptance criteria**:
- A Gebäude record can be created independently and linked to an existing Bauprojekt via gebaeude_id
- The link can be added retroactively to a Bauprojekt that was created without a Gebäude
- The system validates that the Gebäude EGID is unique

**MoSCoW**: M

---

### US-08 — Energy Benchmark for Project Brief

**Role**: Portfolio manager / Portfoliomanager·in

**EN**: As a portfolio manager setting energy targets for an upcoming federal laboratory building (Neubau), I want to view Gebäudehüllzahl, Qh, and Energiestandard Bedarfswerte from comparable realised Bauprojekte (Laborgebäude, Neubau) so that I can define realistic energy targets in the project brief.

**DE**: Als Portfoliomanager·in möchte ich Gebäudehüllzahl, Qh und Energiestandard-Bedarfswerte aus vergleichbaren realisierten Bauprojekten (Laborgebäude, Neubau) einsehen, damit ich im Raumprogramm realistische Energieziele definieren kann.

**Acceptance criteria**:
- Energy Bedarfswerte from Bauprojekte are filterable by OAG, Art der Arbeiten, and completion year
- Energiestandard distribution shown as frequency table for the Vergleichsmenge
- All values are clearly labelled as Bedarfswerte (calculated design values)

**MoSCoW**: S

---

### US-09 — Batch Import of Completed Bauprojekte

**Role**: Data administrator / Datenadministrator·in

**EN**: As a data administrator onboarding a batch of completed Bauprojekte from annual project closing reports, I want to import up to 200 records from an Excel template with full field-level validation so that only consistent, complete data enters the benchmark database.

**DE**: Als Datenadministrator·in möchte ich bis zu 200 Bauprojekte aus einer Excel-Vorlage mit vollständiger feldgenauer Validierung importieren, damit nur konsistente und vollständige Daten in die Benchmarkdatenbank gelangen.

**Acceptance criteria**:
- Import template covers all Must and Should fields with dropdown validation for controlled vocabularies
- Validation runs before any record is committed; errors listed by row and field
- Valid rows committed independently; post-import summary shows created / rejected / warnings
- Records with Art der Arbeiten ≠ Neubau and no gebaeude_id are flagged as requiring a Gebäude link

**MoSCoW**: M

---

### US-10 — Side-by-Side Comparison of Similar Bauprojekte

**Role**: Cost estimator / Bauökonom·in

**EN**: As a cost estimator, I want to select up to 5 Bauprojekte and compare their BKP 2-digit cost breakdowns, SIA 416 area ratios as-designed, and Formquotienten side-by-side so that I can identify which cost positions drive divergence and inform the cost structure of a new project.

**DE**: Als Bauökonom·in möchte ich bis zu 5 Bauprojekte auswählen und deren BKP-2-stellige Kostenaufschlüsselung, SIA-416-Flächenverhältnisse (gemäss Planung) und Formquotienten nebeneinander vergleichen.

**Acceptance criteria**:
- Up to 5 Bauprojekte selectable from any list or search result
- BKP positions with deviation > ±20% from group mean highlighted
- All values index-adjusted to a common reference quarter
- Comparison table exportable as PDF

**MoSCoW**: S

---

### US-11 — PDF Benchmark Report for Project Submission

**Role**: Federal project manager / Projektleiter·in BBL

**EN**: As a federal project manager preparing a Verpflichtungskreditantrag, I want to export a structured PDF benchmark report showing the Vergleichsmenge definition, Bauprojekt peer group statistics, BPI adjustment basis, and the planned project's position within the peer group so that cost assumptions are fully documented for internal review and EFK scrutiny.

**DE**: Als Projektleiter·in BBL möchte ich für einen Verpflichtungskreditantrag einen strukturierten PDF-Kennwertbericht exportieren, der die Definition der Vergleichsmenge, Statistiken, die BPI-Bereinigungsbasis und die Position des geplanten Projekts innerhalb der Vergleichsmenge aufzeigt.

**Acceptance criteria**:
- Report includes: filter definition (Vergleichsmenge), n, BPI reference quarter, statistical table (min/P25/median/P75/max/mean), planned project's values with percentile rank
- Report includes timestamp and exporting user's role (not name)
- Report clearly marked "Benchmarkauswertung — nicht als Kostenschätzung zu verwenden"

**MoSCoW**: S
