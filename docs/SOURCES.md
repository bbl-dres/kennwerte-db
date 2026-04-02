# kennwerte-db — Data Sources

## Project Context

**kennwerte-db** is an open-source construction cost benchmark database for Swiss public buildings. It collects, structures, and presents cost Kennwerte (CHF/m² GF, CHF/m³ GV, BKP/eBKP-H breakdowns) from realised Bauprojekte to support early-stage cost estimation (Kostenschätzung, Kostenvoranschlag) and portfolio-level cost analysis.

Data is sourced from publicly available Bautendokumentationen published by Swiss federal, cantonal, and municipal building authorities. The application is designed as a no-build, static-hosted prototype (GitHub Pages + sql.js) with a path toward a production system.

**Related documents**: [REQUIREMENTS.md](REQUIREMENTS.md) · [DATAMODEL.md](DATAMODEL.md) · [PIPELINE.md](PIPELINE.md) · [WIREFRAMES.md](WIREFRAMES.md)

---

## Purpose of This Document

Comprehensive inventory of Swiss construction cost data sources — current, confirmed future, and investigated but unsuitable. Focused exclusively on **publicly available data with realised construction costs** (Schlussabrechnungen). Commercial/licensed sources are listed for reference only.

---

## Current Sources (in pipeline)

### BBL Bautendokumentationen (Federal Civil Buildings)

| | |
|---|---|
| **Bauherr** | Bundesamt für Bauten und Logistik (BBL) |
| **URL** | https://www.bbl.admin.ch/de/bautendokumentationen |
| **Format** | PDF (2–30 MB each) |
| **Count** | ~142 documents |
| **Coverage** | 1999–2023 |
| **Categories** | Bundeshaus, Verwaltung, Kultur, Sport, Bildung, Justiz, Zoll, Ausland, Wohnen, Parkanlagen, Produktion, Technik |
| **BKP detail** | 1-digit + 2-digit (BKP 2) |
| **SIA 416** | GF, GV |
| **Content** | Project description, Bauherrschaft, Architekten, Fachplaner, BKP cost breakdown, SIA 416 quantities, Kennwerte (CHF/m², CHF/m³), Baukostenindex reference, photos, plans |
| **Download** | `bash data/pdfs/download.sh` |
| **Extraction quality** | Good — ~80% have extractable text with BKP costs and GF |

### armasuisse Bautendokumentationen (Military Buildings)

| | |
|---|---|
| **Bauherr** | armasuisse Immobilien (VBS) |
| **URL** | https://www.ar.admin.ch/de/bautendokumentationen |
| **Format** | PDF (2–16 MB each) |
| **Count** | ~52 documents |
| **Coverage** | ~2007–2025 |
| **Categories** | Industrie/Gewerbe, Handel/Verwaltung, Unterkunft/Verpflegung, Sport, Militärobjekte, Verkehr |
| **BKP detail** | Variable |
| **SIA 416** | Variable |
| **Content** | Similar to BBL but for military buildings — Kasernen, Waffenplätze, Flugplätze, Logistikzentren |
| **Download** | `bash data/pdfs/download_armasuisse.sh` |
| **Extraction quality** | Mixed — many image-only PDFs, different layout from BBL |

### Stadt Zürich Baudokumentation (Municipal Buildings)

| | |
|---|---|
| **Bauherr** | Stadt Zürich, Hochbaudepartement (HBD) |
| **URL** | https://www.stadt-zuerich.ch/de/aktuell/publikationen.html (search: Baudokumentation) |
| **Format** | PDF (1–28 MB each) |
| **Count** | ~36 documents |
| **Coverage** | ~2008–2026 |
| **Categories** | Schulanlagen, Wohnsiedlungen, Sportanlagen, Kulturbauten, Gesundheitszentren, Infrastruktur |
| **BKP detail** | Variable, often in prose |
| **SIA 416** | Variable |
| **Content** | Detailed project docs — often 20–60 pages, high quality photography, less structured cost data |
| **Download** | `bash data/pdfs/download_stadt_zuerich.sh` |
| **Extraction quality** | Low — many older PDFs are image-only (scanned brochures) |

---

## Tier 1: Confirmed New Sources (verified cost data)

### Stadt Bern — Richest Data Format

| | |
|---|---|
| **Bauherr** | Hochbau Stadt Bern |
| **URL** | https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/prd/hochbau-stadt-bern/publikationen |
| **Count** | ~50+ Bauflyer, 11 Baujahr annual reports (2014–2024) |
| **BKP detail** | **1-digit + 2-digit (BKP 2)** |
| **SIA 416** | **GF, HNF, GV** |
| **Kennwerte** | **3 pre-calculated: CHF/m² GF, CHF/m² HNF, CHF/m³ GV** |
| **Special** | Baupreisindex reference included, energy data, standardised format |
| **Building types** | Schools, care homes, fire stations, swimming pools, cultural, sports |
| **Priority** | **#1 — highest data quality of any new source** |

### Kanton Bern AGG — Deepest Archive

| | |
|---|---|
| **Bauherr** | Amt für Grundstücke und Gebäude (AGG), Kanton Bern |
| **URL** | https://www.bvd.be.ch/de/start/themen/immobilien/bauprojekte/abgeschlossene-bauprojekte.html |
| **Count** | 170+ total since 1974; ~30–50+ downloadable PDFs |
| **BKP detail** | **1-digit + 2-digit (BKP 2)** |
| **SIA 416** | **GF (Kostenkennwerte CHF/m² GF)** |
| **Building types** | Cantonal police, education, health, justice, administration |
| **Priority** | **HIGH** |

### Stadt St. Gallen — Largest Volume

| | |
|---|---|
| **Bauherr** | Stadt St. Gallen |
| **URL** | https://www.stadt.sg.ch/home/raum-umwelt/staedtische-projekte/realisierte-projekte/baudokumentationen.html |
| **Count** | **217** (Nº 1–217) |
| **BKP detail** | 1-digit |
| **SIA 416** | GV (consistent), GF/HNF (inconsistent) |
| **Kennwerte** | CHF/m³ GV for BKP 2 (recent documents) |
| **Building types** | Schools, kindergartens, museums, sports, fire stations, cultural (Tonhalle), libraries |
| **Priority** | **HIGH — volume compensates for lower granularity** |

### Kanton Aargau — Consistent Numbered Series

| | |
|---|---|
| **Bauherr** | Immobilien Aargau |
| **URL** | https://www.ag.ch/de/themen/planen-bauen/immobilien/immobilienprojekte |
| **PDF directory** | https://www.ag.ch/media/kanton-aargau/dfr/dokumente/immobilien/projekte/baudokumentationen/ |
| **Count** | ~15 numbered PDFs (Nº 033–046+) |
| **BKP detail** | 1-digit |
| **SIA 416** | GF, GV |
| **Building types** | Cantonal administration, emergency services, education (FHNW), agriculture, justice |
| **Priority** | **HIGH** |

---

## Tier 2: Promising Sources (require PDF verification)

| Source | Bauherr | URL | Est. PDFs | Notes | Priority |
|---|---|---|---|---|---|
| **Kanton Solothurn** | Hochbauamt SO | https://so.ch/verwaltung/bau-und-justizdepartement/hochbauamt/realisierte-objekte/ | ~30–40 | Two PDF types (Baudokumentation / Broschüre); cost data unconfirmed | MEDIUM-HIGH |
| **Kanton St. Gallen** | Hochbauamt SG | https://www.sg.ch/bauen/hochbau/bauten/baudokumentation-neu.html | ~18 | Mandates eBKP-H (!) — potentially only source with element-based costs | MEDIUM-HIGH |
| **Kanton Graubünden** | Hochbauamt GR | https://www.gr.ch/DE/institutionen/verwaltung/diem/hba/planen-bauen/baudokumentationen/ | ~15–20 | Includes Bündner Kunstmuseum; blocked by robots.txt during research | MEDIUM |
| **Stadt Winterthur** | Hochbau Winterthur | https://stadt.winterthur.ch/themen/leben-in-winterthur/planen-und-bauen/wir-bauen-fuer-sie/staedtische-bauten | ~15–25 | Standardised template exists; cost data unconfirmed | MEDIUM-LOW |

---

## Sources Investigated — Limited or No Cost Data

| Source | Notes | Priority |
|---|---|---|
| **Kanton Basel-Stadt** | ~180 Projektdokumentationen since 1993 at bs.ch — primarily architectural Projektblätter without BKP breakdowns | LOW |
| **Kanton Zürich Hochbauamt** | 14 "Querschnitt" annual reports (2012–2025) — showcase publications, no cost data | NONE |
| **ETH Zürich / EPFL** | Zero project-level cost documentation. CHF 131M annual construction; data flows to ETH-Rat/EFK internally only | NONE |
| **SBB** | data.sbb.ch lists projects but no cost detail | NONE |
| **Swiss university hospitals** (USZ, Inselspital, USB, HUG) | Aggregate press release figures only (e.g. Inselspital CHF 670M) — no BKP documentation | NONE |
| **Wohnbaugenossenschaften** (ABZ, Wogeno) | Proprietary | NONE |
| **Romandie** (VD, GE, FR, NE, JU, VS) | Systemic absence — French-speaking cantons do not publish Bautendokumentationen | NONE |

---

## Structured APIs (for enrichment, not primary cost data)

| Source | Data | Format | URL | Notes |
|---|---|---|---|---|
| **BFS Baupreisindex (BPI)** | Semiannual construction price indices by Grossregion | CSV/XLS | https://opendata.swiss/de/dataset/schweizerischer-baupreisindex | Free. Essential for Teuerungsbereinigung |
| **GWR / GeoAdmin API** | Building register (EGID, address, Baujahr, floors, heating) | REST/WFS | https://api3.geo.admin.ch | Free. For EGID lookup |
| **Stadt Zürich GWZ** | Zurich building register (daily updates) | GeoJSON/WFS | https://data.stadt-zuerich.ch | Free |
| **GEAK** | Building energy certificates | Portal/Geo | https://opendata.swiss/de/dataset/gebaudeenergieausweis-der-kantone-geak-offentlich | Free, post-2019 |
| **BFE Gebäudeprogramm** | Subsidised energy renovation data | Portal | https://www.dasgebaeudeprogramm.ch/ | Free |

---

## Commercial Sources (not usable without licence)

| Source | Notes |
|---|---|
| **werk-material.online** | ~1000+ projects, full BKP/eBKP-H, SIA 416. Gold standard. Commercial licence (CRB/wbw) |
| **FPRE/PBK API** | REST API with eBKP-H structured cost data. Commercial |
| **ARCHITOOL / baukostendatenbank.ch** | Unit prices (subscription). Not project Schlussabrechnungen |

---

## Pipeline Capacity Summary

| Tier | Sources | Est. Documents | Status |
|---|---|---|---|
| **Current** | BBL, armasuisse, Stadt Zürich | ~230 | In pipeline |
| **Tier 1** | Stadt Bern, Kanton Bern, Stadt St. Gallen, Kanton Aargau | ~300+ | Verified, ready to scrape |
| **Tier 2** | Solothurn, Kanton SG, Graubünden, Winterthur | ~80–100 | Requires verification |
| **Total potential** | | **~600–700** | |

Adding Tier 1 sources would roughly **double** the database's document coverage.
